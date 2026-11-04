"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Video_1 = require("../models/Video");
const auth_1 = require("../middleware/auth");
const s3Service_1 = require("../services/s3Service");
const router = (0, express_1.Router)();
// GET /api/videos
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { category, search } = req.query;
        const filter = {};
        if (category && category !== 'All') {
            filter.category = category;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { caption: { $regex: search, $options: 'i' } },
            ];
        }
        const videos = await Video_1.Video.find(filter)
            .populate('uploadedBy', 'name relationship avatarUrl')
            .sort({ createdAt: -1 });
        res.json({ videos, count: videos.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching video memories' });
    }
});
// GET /api/videos/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const video = await Video_1.Video.findById(req.params.id).populate('uploadedBy', 'name relationship');
        if (!video) {
            res.status(404).json({ error: 'Video memory not found' });
            return;
        }
        res.json({ video });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error retrieving video' });
    }
});
// POST /api/videos
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, caption, category, mediaUrl, thumbnailUrl, s3Key, duration, fileSize } = req.body;
        if (!title || !mediaUrl) {
            res.status(400).json({ error: 'Title and video URL are required' });
            return;
        }
        const newVideo = await Video_1.Video.create({
            title,
            caption,
            category: category || 'Favourite Moments',
            mediaUrl,
            thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80',
            s3Key,
            duration: duration || 0,
            fileSize,
            uploadedBy: req.user._id,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'UPLOAD_VIDEO', 'Video', newVideo._id.toString(), { title: newVideo.title, category: newVideo.category });
        }
        res.status(201).json({ video: newVideo, message: 'Video preserved in memorial vault' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error preserving video memory' });
    }
});
// DELETE /api/videos/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const video = await Video_1.Video.findById(req.params.id);
        if (!video) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }
        if (video.s3Key) {
            await (0, s3Service_1.deleteS3Object)(video.s3Key);
        }
        await Video_1.Video.findByIdAndDelete(req.params.id);
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_VIDEO', 'Video', String(req.params.id), { title: video.title });
        }
        res.json({ message: 'Video memory removed' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error deleting video' });
    }
});
exports.default = router;
