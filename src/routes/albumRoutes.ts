import { Router, Response } from 'express';
import { Album } from '../models/Album';
import { Memory } from '../models/Memory';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';

const router = Router();

// GET /api/albums
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = category;
    }

    const albums = await Album.find(filter)
      .populate('createdBy', 'name relationship')
      .sort({ createdAt: -1 });

    res.json({ albums, count: albums.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching albums' });
  }
});

// GET /api/albums/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    const photos = await Memory.find({ albumId: album._id, mediaType: 'photo' })
      .populate('uploadedBy', 'name')
      .sort({ dateTaken: -1 });

    res.json({ album, photos, count: photos.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error retrieving album details' });
  }
});

// POST /api/albums
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, coverImageUrl } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Album title is required' });
      return;
    }

    const newAlbum = await Album.create({
      title,
      description,
      category: category || 'Family',
      coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
      createdBy: req.user!._id,
      itemCount: 0,
    });

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'CREATE_ALBUM',
        'Album',
        newAlbum._id.toString(),
        { title: newAlbum.title }
      );
    }

    res.status(201).json({ album: newAlbum, message: 'Album created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error creating album' });
  }
});

// DELETE /api/albums/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    // Unlink memories
    await Memory.updateMany({ albumId: album._id }, { $unset: { albumId: 1 } });
    await Album.findByIdAndDelete(req.params.id);

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'DELETE_ALBUM',
        'Album',
        String(req.params.id),
        { title: album.title }
      );
    }

    res.json({ message: 'Album deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error deleting album' });
  }
});

export default router;
