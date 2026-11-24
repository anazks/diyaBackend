import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Media } from '../models/Media';
import { Memory } from '../models/Memory';
import { Video } from '../models/Video';
import { AudioMemory } from '../models/AudioMemory';
import { Contribution } from '../models/Contribution';
import { requireAuth, AuthenticatedRequest, recordAudit } from '../middleware/auth';
import {
  getUploadAuth,
  getVerifiedUpload,
  deleteImageKitFile,
  userFolder,
  MediaError,
} from '../services/imagekitService';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Please wait a few minutes and try again.' },
});

function sendError(res: Response, error: any, fallback: string) {
  if (error instanceof MediaError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(fallback, error?.message);
  res.status(500).json({ error: fallback });
}

// GET /api/media/auth - One-time credentials for a direct upload to ImageKit
router.get('/auth', authLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user!._id);
    res.json({
      ...getUploadAuth(),
      folders: {
        image: userFolder(userId, 'image'),
        video: userFolder(userId, 'video'),
        audio: userFolder(userId, 'audio'),
      },
    });
  } catch (error: any) {
    sendError(res, error, 'Error preparing upload');
  }
});

// POST /api/media - Save a finished upload
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId, name } = req.body;
    if (!fileId || typeof fileId !== 'string') {
      res.status(400).json({ error: 'fileId is required' });
      return;
    }

    const userId = req.user!._id;
    const upload = await getVerifiedUpload(fileId, String(userId));
    const media = await Media.findOneAndUpdate(
      { fileId },
      { ...upload, name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 200) : upload.name, userId },
      { upsert: true, new: true }
    );

    await recordAudit(String(userId), 'UPLOAD_MEDIA', 'Media', String(media._id), { fileType: media.fileType });
    res.status(201).json({ media, message: 'File uploaded successfully' });
  } catch (error: any) {
    sendError(res, error, 'Error saving uploaded file');
  }
});

// GET /api/media?type=image|video|audio&page=&limit= - The current user's files
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
    const filter: any = { userId: req.user!._id };
    if (['image', 'video', 'audio'].includes(String(req.query.type))) {
      filter.fileType = req.query.type;
    }

    const [media, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Media.countDocuments(filter),
    ]);
    res.json({ media, total, page, limit, hasMore: page * limit < total });
  } catch (error: any) {
    sendError(res, error, 'Error retrieving your files');
  }
});

// GET /api/media/:fileId
router.get('/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const media = await Media.findOne({ fileId: String(req.params.fileId), userId: req.user!._id });
    if (!media) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.json({ media });
  } catch (error: any) {
    sendError(res, error, 'Error retrieving file');
  }
});

// DELETE /api/media/:fileId - Owner only
router.delete('/:fileId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const media = await Media.findOne({ fileId: String(req.params.fileId), userId: req.user!._id });
    if (!media) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const usedBy = { mediaUrl: media.url };
    const inUse = await Promise.all([
      Memory.exists(usedBy),
      Video.exists(usedBy),
      AudioMemory.exists(usedBy),
      Contribution.exists({ ...usedBy, status: 'pending' }),
    ]);
    if (inUse.some(Boolean)) {
      res.status(409).json({ error: 'This file is part of the memorial album. Remove it there first.' });
      return;
    }

    await deleteImageKitFile(media.fileId);
    await media.deleteOne();
    await recordAudit(String(req.user!._id), 'DELETE_MEDIA', 'Media', String(media._id), { name: media.name });
    res.json({ message: 'File deleted' });
  } catch (error: any) {
    sendError(res, error, 'Error deleting file');
  }
});

export default router;
