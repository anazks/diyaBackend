import { Router, Response } from 'express';
import { Video } from '../models/Video';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';
import { deleteS3Object } from '../services/s3Service';

const router = Router();

// GET /api/videos
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    const filter: any = {};

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { caption: { $regex: search as string, $options: 'i' } },
      ];
    }

    const videos = await Video.find(filter)
      .populate('uploadedBy', 'name relationship avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ videos, count: videos.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching video memories' });
  }
});

// GET /api/videos/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const video = await Video.findById(req.params.id).populate('uploadedBy', 'name relationship');
    if (!video) {
      res.status(404).json({ error: 'Video memory not found' });
      return;
    }
    res.json({ video });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error retrieving video' });
  }
});

// POST /api/videos
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, caption, category, mediaUrl, thumbnailUrl, s3Key, duration, fileSize } = req.body;

    if (!title || !mediaUrl) {
      res.status(400).json({ error: 'Title and video URL are required' });
      return;
    }

    const newVideo = await Video.create({
      title,
      caption,
      category: category || 'Favourite Moments',
      mediaUrl,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80',
      s3Key,
      duration: duration || 0,
      fileSize,
      uploadedBy: req.user!._id,
    });

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'UPLOAD_VIDEO',
        'Video',
        newVideo._id.toString(),
        { title: newVideo.title, category: newVideo.category }
      );
    }

    res.status(201).json({ video: newVideo, message: 'Video preserved in memorial vault' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error preserving video memory' });
  }
});

// DELETE /api/videos/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (video.s3Key) {
      await deleteS3Object(video.s3Key);
    }

    await Video.findByIdAndDelete(req.params.id);

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'DELETE_VIDEO',
        'Video',
        String(req.params.id),
        { title: video.title }
      );
    }

    res.json({ message: 'Video memory removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error deleting video' });
  }
});

export default router;
