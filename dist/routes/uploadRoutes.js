"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const s3Service_1 = require("../services/s3Service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Ensure local upload directories exist for fallback
const uploadsBaseDir = path_1.default.join(process.cwd(), 'uploads');
const folders = ['photos', 'videos', 'audio', 'thumbnails'];
folders.forEach((f) => {
    const dir = path_1.default.join(uploadsBaseDir, 'memorial', f);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Multer storage for direct fallback
const storage = multer_1.default.diskStorage({
    destination: (_req, file, cb) => {
        let sub = 'photos';
        if (file.mimetype.startsWith('video/'))
            sub = 'videos';
        else if (file.mimetype.startsWith('audio/'))
            sub = 'audio';
        cb(null, path_1.default.join(uploadsBaseDir, 'memorial', sub));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});
// File validation
const fileFilter = (_req, file, cb) => {
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
    }
    else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only memorial photos, videos, and audio are allowed.`));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 500, // 500MB
    },
});
// POST /api/upload/presign - Request AWS S3 Presigned URL for direct upload
router.post('/presign', auth_1.requireAuth, async (req, res) => {
    try {
        const { filename, contentType, folder } = req.body;
        if (!filename || !contentType) {
            res.status(400).json({ error: 'filename and contentType are required' });
            return;
        }
        const presigned = await (0, s3Service_1.generatePresignedUploadUrl)(filename, contentType, folder || 'photos');
        res.json(presigned);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error generating presigned URL' });
    }
});
// POST /api/upload/direct-fallback - Fallback when running without AWS S3
router.post('/direct-fallback', auth_1.requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No media file provided' });
            return;
        }
        let sub = 'photos';
        if (req.file.mimetype.startsWith('video/'))
            sub = 'videos';
        else if (req.file.mimetype.startsWith('audio/'))
            sub = 'audio';
        const s3Key = `memorial/${sub}/${req.file.filename}`;
        const mediaUrl = `/uploads/${s3Key}`;
        res.status(201).json({
            message: 'File uploaded successfully',
            mediaUrl,
            s3Key,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Direct upload failed' });
    }
});
// POST /api/upload/multipart/initiate
router.post('/multipart/initiate', auth_1.requireAuth, async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        if (!filename || !contentType) {
            res.status(400).json({ error: 'filename and contentType are required' });
            return;
        }
        const init = await (0, s3Service_1.initiateMultipartUpload)(filename, contentType);
        res.json(init);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Multipart initiation failed' });
    }
});
// POST /api/upload/multipart/sign-part
router.post('/multipart/sign-part', auth_1.requireAuth, async (req, res) => {
    try {
        const { s3Key, uploadId, partNumber } = req.body;
        if (!s3Key || !uploadId || !partNumber) {
            res.status(400).json({ error: 's3Key, uploadId, and partNumber are required' });
            return;
        }
        const part = await (0, s3Service_1.signMultipartPartUrl)(s3Key, uploadId, Number(partNumber));
        res.json(part);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to sign multipart part' });
    }
});
// POST /api/upload/multipart/complete
router.post('/multipart/complete', auth_1.requireAuth, async (req, res) => {
    try {
        const { s3Key, uploadId, parts } = req.body;
        if (!s3Key || !uploadId || !parts) {
            res.status(400).json({ error: 's3Key, uploadId, and parts array are required' });
            return;
        }
        const complete = await (0, s3Service_1.completeMultipartUpload)(s3Key, uploadId, parts);
        res.json(complete);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to complete multipart upload' });
    }
});
exports.default = router;
