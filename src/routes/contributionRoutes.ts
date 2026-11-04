import { Router, Response } from 'express';
import { Contribution } from '../models/Contribution';
import { Memory } from '../models/Memory';
import { Video } from '../models/Video';
import { AudioMemory } from '../models/AudioMemory';
import { Letter } from '../models/Letter';
import { requireAuth, requireAdmin, AuthenticatedRequest, recordAudit } from '../middleware/auth';

const router = Router();

// GET /api/contributions
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (req.user!.role !== 'admin') {
      filter.submittedBy = req.user!._id;
    } else if (status) {
      filter.status = status;
    }

    const contributions = await Contribution.find(filter)
      .populate('submittedBy', 'name email relationship avatarUrl')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ contributions, count: contributions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching contributions' });
  }
});

// POST /api/contributions (Submit contribution)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      type,
      title,
      note,
      mediaUrl,
      s3Key,
      letterBody,
      category,
    } = req.body;

    if (!type || !title) {
      res.status(400).json({ error: 'Contribution type and title are required' });
      return;
    }

    const newContribution = await Contribution.create({
      contributorName: req.user!.name,
      relationship: req.user!.relationship,
      type,
      title,
      note,
      mediaUrl,
      s3Key,
      letterBody,
      category: category || 'Family',
      status: 'pending',
      submittedBy: req.user!._id,
    });

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'SUBMIT_CONTRIBUTION',
        'Contribution',
        newContribution._id.toString(),
        { title, type }
      );
    }

    res.status(201).json({
      contribution: newContribution,
      message: 'Memory submitted with love. An administrator will review and add it to the memorial album.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error submitting contribution' });
  }
});

// PATCH /api/contributions/:id/review (Admin review - approve or reject)
router.patch('/:id/review', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be approved or rejected' });
      return;
    }

    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      res.status(404).json({ error: 'Contribution not found' });
      return;
    }

    contribution.status = status;
    contribution.reviewNotes = reviewNotes;
    contribution.reviewedBy = req.user!._id;
    contribution.reviewedAt = new Date();
    await contribution.save();

    // If approved, automatically convert and publish to the main memorial collections
    if (status === 'approved') {
      if (contribution.type === 'photo' && contribution.mediaUrl) {
        await Memory.create({
          title: contribution.title,
          description: contribution.note || `Contributed with love by ${contribution.contributorName} (${contribution.relationship})`,
          mediaType: 'photo',
          category: contribution.category || 'Family',
          mediaUrl: contribution.mediaUrl,
          s3Key: contribution.s3Key,
          isFavorite: false,
          uploadedBy: contribution.submittedBy,
        });
      } else if (contribution.type === 'video' && contribution.mediaUrl) {
        await Video.create({
          title: contribution.title,
          caption: contribution.note,
          category: contribution.category || 'Family',
          mediaUrl: contribution.mediaUrl,
          s3Key: contribution.s3Key,
          uploadedBy: contribution.submittedBy,
        });
      } else if (contribution.type === 'audio' && contribution.mediaUrl) {
        await AudioMemory.create({
          title: contribution.title,
          description: contribution.note,
          mediaUrl: contribution.mediaUrl,
          s3Key: contribution.s3Key,
          duration: 30,
          uploadedBy: contribution.submittedBy,
        });
      } else if (contribution.type === 'letter' && contribution.letterBody) {
        await Letter.create({
          senderName: contribution.contributorName,
          relationship: contribution.relationship,
          title: contribution.title,
          body: contribution.letterBody,
          paperStyle: 'cream',
          isPrivate: false,
          isDraft: false,
          createdBy: contribution.submittedBy,
        });
      }
    }

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        `REVIEW_CONTRIBUTION_${status.toUpperCase()}`,
        'Contribution',
        contribution._id.toString(),
        { status, title: contribution.title }
      );
    }

    res.json({
      contribution,
      message: status === 'approved' ? 'Contribution approved and published to the album' : 'Contribution rejected',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error reviewing contribution' });
  }
});

export default router;
