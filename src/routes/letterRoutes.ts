import { Router, Response } from 'express';
import { Letter } from '../models/Letter';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';

const router = Router();

// GET /api/letters
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!._id;
    const isAdmin = req.user!.role === 'admin';

    // Show public letters + user's own private/draft letters
    const filter = isAdmin
      ? { $or: [{ isDraft: false }, { createdBy: currentUserId }] }
      : {
          $or: [
            { isPrivate: false, isDraft: false },
            { createdBy: currentUserId },
          ],
        };

    const letters = await Letter.find(filter)
      .populate('createdBy', 'name relationship avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ letters, count: letters.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching letters' });
  }
});

// GET /api/letters/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const letter = await Letter.findById(req.params.id);
    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    const isOwner = String(letter.createdBy) === req.user?._id.toString();
    if (letter.isPrivate && !isOwner && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'This letter is marked private to the author' });
      return;
    }

    res.json({ letter });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching letter' });
  }
});

// POST /api/letters
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, body, paperStyle, isPrivate, isDraft, relationship } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: 'Title and letter contents are required' });
      return;
    }

    const newLetter = await Letter.create({
      senderName: req.user!.name,
      relationship: relationship || req.user!.relationship,
      title,
      body,
      paperStyle: paperStyle || 'cream',
      isPrivate: Boolean(isPrivate),
      isDraft: Boolean(isDraft),
      createdBy: req.user!._id,
    });

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'WRITE_LETTER',
        'Letter',
        newLetter._id.toString(),
        { title: newLetter.title, isPrivate: newLetter.isPrivate, isDraft: newLetter.isDraft }
      );
    }

    res.status(201).json({ letter: newLetter, message: isDraft ? 'Draft saved' : 'Letter written and folded with love' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error saving letter' });
  }
});

// PUT /api/letters/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const letter = await Letter.findById(req.params.id);
    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    const isOwner = String(letter.createdBy) === req.user?._id.toString();
    if (!isOwner && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'You may only edit your own letters' });
      return;
    }

    const { title, body, paperStyle, isPrivate, isDraft } = req.body;
    if (title !== undefined) letter.title = title;
    if (body !== undefined) letter.body = body;
    if (paperStyle !== undefined) letter.paperStyle = paperStyle;
    if (isPrivate !== undefined) letter.isPrivate = isPrivate;
    if (isDraft !== undefined) letter.isDraft = isDraft;

    await letter.save();

    res.json({ letter, message: 'Letter updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating letter' });
  }
});

// DELETE /api/letters/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const letter = await Letter.findById(req.params.id);
    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    const isOwner = String(letter.createdBy) === req.user?._id.toString();
    if (!isOwner && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'You may only delete your own letters' });
      return;
    }

    await Letter.findByIdAndDelete(req.params.id);

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'DELETE_LETTER',
        'Letter',
        String(req.params.id),
        { title: letter.title }
      );
    }

    res.json({ message: 'Letter deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error deleting letter' });
  }
});

export default router;
