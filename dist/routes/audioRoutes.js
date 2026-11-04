"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AudioMemory_1 = require("../models/AudioMemory");
const auth_1 = require("../middleware/auth");
const s3Service_1 = require("../services/s3Service");
const router = (0, express_1.Router)();
// GET /api/audio
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { favorite, search } = req.query;
        const filter = {};
        if (favorite === 'true') {
            filter.isFavorite = true;
        }
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        const audioList = await AudioMemory_1.AudioMemory.find(filter)
            .populate('uploadedBy', 'name relationship avatarUrl')
            .sort({ isFavorite: -1, recordedDate: -1 });
        res.json({ audioList, count: audioList.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching voice memories' });
    }
});
// POST /api/audio
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, description, mediaUrl, s3Key, duration, waveformPoints, recordedDate, isFavorite } = req.body;
        if (!title || !mediaUrl) {
            res.status(400).json({ error: 'Title and audio recording URL are required' });
            return;
        }
        const defaultWaveform = [30, 45, 60, 80, 55, 90, 75, 40, 65, 85, 95, 70, 50, 60, 40, 30];
        const newAudio = await AudioMemory_1.AudioMemory.create({
            title,
            description,
            mediaUrl,
            s3Key,
            duration: duration || 45,
            waveformPoints: waveformPoints && waveformPoints.length > 0 ? waveformPoints : defaultWaveform,
            recordedDate: recordedDate ? new Date(recordedDate) : new Date(),
            isFavorite: Boolean(isFavorite),
            uploadedBy: req.user._id,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'UPLOAD_AUDIO', 'AudioMemory', newAudio._id.toString(), { title: newAudio.title });
        }
        res.status(201).json({ audio: newAudio, message: 'Voice memory preserved' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error preserving voice memory' });
    }
});
// PATCH /api/audio/:id/favorite
router.patch('/:id/favorite', auth_1.requireAuth, async (req, res) => {
    try {
        const audio = await AudioMemory_1.AudioMemory.findById(req.params.id);
        if (!audio) {
            res.status(404).json({ error: 'Audio memory not found' });
            return;
        }
        audio.isFavorite = !audio.isFavorite;
        await audio.save();
        res.json({ isFavorite: audio.isFavorite, message: 'Audio favorite status updated' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error updating favorite' });
    }
});
// DELETE /api/audio/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const audio = await AudioMemory_1.AudioMemory.findById(req.params.id);
        if (!audio) {
            res.status(404).json({ error: 'Audio memory not found' });
            return;
        }
        if (audio.s3Key) {
            await (0, s3Service_1.deleteS3Object)(audio.s3Key);
        }
        await AudioMemory_1.AudioMemory.findByIdAndDelete(req.params.id);
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_AUDIO', 'AudioMemory', String(req.params.id), { title: audio.title });
        }
        res.json({ message: 'Voice memory deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error deleting audio memory' });
    }
});
exports.default = router;
