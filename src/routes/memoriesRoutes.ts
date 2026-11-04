import { Router, Response } from 'express';
import { Memory } from '../models/Memory';
import { Album } from '../models/Album';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';
import { deleteS3Object } from '../services/s3Service';

const router = Router();

// GET /api/memories (Photo Gallery)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, albumId, favorite, search } = req.query;
    const filter: any = { mediaType: 'photo' };

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (albumId) {
      filter.albumId = albumId;
    }
    if (favorite === 'true') {
      filter.isFavorite = true;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { location: { $regex: search as string, $options: 'i' } },
      ];
    }

    const memories = await Memory.find(filter)
      .populate('uploadedBy', 'name relationship avatarUrl')
      .populate('albumId', 'title category')
      .sort({ createdAt: -1 });

    res.json({ memories, count: memories.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error retrieving photo gallery' });
  }
});

// GET /api/memories/highlights (For Home Screen)
router.get('/highlights', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const favorites = await Memory.find({ mediaType: 'photo', isFavorite: true })
      .populate('uploadedBy', 'name')
      .limit(6);
    
    const recent = await Memory.find({ mediaType: 'photo' })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({ favorites, recent });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching highlights' });
  }
});

// GET /api/memories/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findById(req.params.id)
      .populate('uploadedBy', 'name relationship avatarUrl')
      .populate('albumId', 'title category');
    
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    res.json({ memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error retrieving memory' });
  }
});

// POST /api/memories
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      category,
      albumId,
      mediaUrl,
      thumbnailUrl,
      s3Key,
      dateTaken,
      location,
      isFavorite,
      fileSize,
      mimeType,
    } = req.body;

    if (!title || !mediaUrl) {
      res.status(400).json({ error: 'Title and media URL are required' });
      return;
    }

    const newMemory = await Memory.create({
      title,
      description,
      mediaType: 'photo',
      category: category || 'Favourite Moments',
      albumId: albumId || undefined,
      mediaUrl,
      thumbnailUrl: thumbnailUrl || mediaUrl,
      s3Key,
      dateTaken: dateTaken ? new Date(dateTaken) : new Date(),
      location,
      isFavorite: Boolean(isFavorite),
      uploadedBy: req.user!._id,
      fileSize,
      mimeType,
    });

    if (albumId) {
      await Album.findByIdAndUpdate(albumId, { $inc: { itemCount: 1 } });
    }

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'CREATE_PHOTO_MEMORY',
        'Memory',
        newMemory._id.toString(),
        { title: newMemory.title, category: newMemory.category }
      );
    }

    res.status(201).json({ memory: newMemory, message: 'Memory preserved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error preserving memory' });
  }
});

// PATCH /api/memories/:id/favorite
router.patch('/:id/favorite', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    memory.isFavorite = !memory.isFavorite;
    await memory.save();

    res.json({ isFavorite: memory.isFavorite, message: 'Favorite status updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating favorite' });
  }
});

// PUT /api/memories/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, albumId, dateTaken, location, isFavorite } = req.body;

    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    if (title) memory.title = title;
    if (description !== undefined) memory.description = description;
    if (category) memory.category = category;
    if (albumId !== undefined) memory.albumId = albumId;
    if (dateTaken) memory.dateTaken = new Date(dateTaken);
    if (location !== undefined) memory.location = location;
    if (isFavorite !== undefined) memory.isFavorite = isFavorite;

    await memory.save();

    res.json({ memory, message: 'Memory details updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating memory' });
  }
});

// DELETE /api/memories/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }

    if (memory.s3Key) {
      await deleteS3Object(memory.s3Key);
    }

    if (memory.albumId) {
      await Album.findByIdAndUpdate(memory.albumId, { $inc: { itemCount: -1 } });
    }

    await Memory.findByIdAndDelete(req.params.id);

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'DELETE_MEMORY',
        'Memory',
        String(req.params.id),
        { title: memory.title }
      );
    }

    res.json({ message: 'Memory deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error deleting memory' });
  }
});

export default router;
