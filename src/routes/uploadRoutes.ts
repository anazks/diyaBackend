import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  generatePresignedUploadUrl,
  initiateMultipartUpload,
  signMultipartPartUrl,
  completeMultipartUpload,
} from '../services/s3Service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Ensure local upload directories exist for fallback
const uploadsBaseDir = path.join(process.cwd(), 'uploads');
const folders = ['photos', 'videos', 'audio', 'thumbnails'];
folders.forEach((f) => {
  const dir = path.join(uploadsBaseDir, 'memorial', f);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage for direct fallback
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let sub = 'photos';
    if (file.mimetype.startsWith('video/')) sub = 'videos';
    else if (file.mimetype.startsWith('audio/')) sub = 'audio';
    cb(null, path.join(uploadsBaseDir, 'memorial', sub));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File validation
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'audio/mpeg',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/x-m4a',
    'audio/aac',
    'audio/ogg',
  ];

  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only memorial photos, videos, and audio are allowed.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB
  },
});

// POST /api/upload/presign - Request AWS S3 Presigned URL for direct upload
router.post('/presign', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename, contentType, folder } = req.body;

    if (!filename || !contentType) {
      res.status(400).json({ error: 'filename and contentType are required' });
      return;
    }

    const presigned = await generatePresignedUploadUrl(
      filename,
      contentType,
      folder || 'photos'
    );

    res.json(presigned);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error generating presigned URL' });
  }
});

// POST /api/upload/direct-fallback - Fallback when running without AWS S3
router.post(
  '/direct-fallback',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No media file provided' });
        return;
      }

      let sub = 'photos';
      if (req.file.mimetype.startsWith('video/')) sub = 'videos';
      else if (req.file.mimetype.startsWith('audio/')) sub = 'audio';

      const s3Key = `memorial/${sub}/${req.file.filename}`;
      const mediaUrl = `/uploads/${s3Key}`;

      res.status(201).json({
        message: 'File uploaded successfully',
        mediaUrl,
        s3Key,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Direct upload failed' });
    }
  }
);

// POST /api/upload/multipart/initiate
router.post('/multipart/initiate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      res.status(400).json({ error: 'filename and contentType are required' });
      return;
    }

    const init = await initiateMultipartUpload(filename, contentType);
    res.json(init);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Multipart initiation failed' });
  }
});

// POST /api/upload/multipart/sign-part
router.post('/multipart/sign-part', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { s3Key, uploadId, partNumber } = req.body;
    if (!s3Key || !uploadId || !partNumber) {
      res.status(400).json({ error: 's3Key, uploadId, and partNumber are required' });
      return;
    }

    const part = await signMultipartPartUrl(s3Key, uploadId, Number(partNumber));
    res.json(part);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sign multipart part' });
  }
});

// POST /api/upload/multipart/complete
router.post('/multipart/complete', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { s3Key, uploadId, parts } = req.body;
    if (!s3Key || !uploadId || !parts) {
      res.status(400).json({ error: 's3Key, uploadId, and parts array are required' });
      return;
    }

    const complete = await completeMultipartUpload(s3Key, uploadId, parts);
    res.json(complete);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete multipart upload' });
  }
});

export default router;
