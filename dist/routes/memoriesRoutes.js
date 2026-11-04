"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Memory_1 = require("../models/Memory");
const Album_1 = require("../models/Album");
const auth_1 = require("../middleware/auth");
const s3Service_1 = require("../services/s3Service");
const router = (0, express_1.Router)();
// GET /api/memories (Photo Gallery)
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { category, albumId, favorite, search } = req.query;
        const filter = { mediaType: 'photo' };
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
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
            ];
        }
        const memories = await Memory_1.Memory.find(filter)
            .populate('uploadedBy', 'name relationship avatarUrl')
            .populate('albumId', 'title category')
            .sort({ createdAt: -1 });
        res.json({ memories, count: memories.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error retrieving photo gallery' });
    }
});
// GET /api/memories/highlights (For Home Screen)
router.get('/highlights', auth_1.requireAuth, async (_req, res) => {
    try {
        const favorites = await Memory_1.Memory.find({ mediaType: 'photo', isFavorite: true })
            .populate('uploadedBy', 'name')
            .limit(6);
        const recent = await Memory_1.Memory.find({ mediaType: 'photo' })
            .populate('uploadedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(8);
        res.json({ favorites, recent });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching highlights' });
    }
});
// GET /api/memories/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const memory = await Memory_1.Memory.findById(req.params.id)
            .populate('uploadedBy', 'name relationship avatarUrl')
            .populate('albumId', 'title category');
        if (!memory) {
            res.status(404).json({ error: 'Memory not found' });
            return;
        }
        res.json({ memory });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error retrieving memory' });
    }
});
// POST /api/memories
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, description, category, albumId, mediaUrl, thumbnailUrl, s3Key, dateTaken, location, isFavorite, fileSize, mimeType, } = req.body;
        if (!title || !mediaUrl) {
            res.status(400).json({ error: 'Title and media URL are required' });
            return;
        }
        const newMemory = await Memory_1.Memory.create({
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
            uploadedBy: req.user._id,
            fileSize,
            mimeType,
        });
        if (albumId) {
            await Album_1.Album.findByIdAndUpdate(albumId, { $inc: { itemCount: 1 } });
        }
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'CREATE_PHOTO_MEMORY', 'Memory', newMemory._id.toString(), { title: newMemory.title, category: newMemory.category });
        }
        res.status(201).json({ memory: newMemory, message: 'Memory preserved successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error preserving memory' });
    }
});
// PATCH /api/memories/:id/favorite
router.patch('/:id/favorite', auth_1.requireAuth, async (req, res) => {
    try {
        const memory = await Memory_1.Memory.findById(req.params.id);
        if (!memory) {
            res.status(404).json({ error: 'Memory not found' });
            return;
        }
        memory.isFavorite = !memory.isFavorite;
        await memory.save();
        res.json({ isFavorite: memory.isFavorite, message: 'Favorite status updated' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error updating favorite' });
    }
});
// PUT /api/memories/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, description, category, albumId, dateTaken, location, isFavorite } = req.body;
        const memory = await Memory_1.Memory.findById(req.params.id);
        if (!memory) {
            res.status(404).json({ error: 'Memory not found' });
            return;
        }
        if (title)
            memory.title = title;
        if (description !== undefined)
            memory.description = description;
        if (category)
            memory.category = category;
        if (albumId !== undefined)
            memory.albumId = albumId;
        if (dateTaken)
            memory.dateTaken = new Date(dateTaken);
        if (location !== undefined)
            memory.location = location;
        if (isFavorite !== undefined)
            memory.isFavorite = isFavorite;
        await memory.save();
        res.json({ memory, message: 'Memory details updated' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error updating memory' });
    }
});
// DELETE /api/memories/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const memory = await Memory_1.Memory.findById(req.params.id);
        if (!memory) {
            res.status(404).json({ error: 'Memory not found' });
            return;
        }
        if (memory.s3Key) {
            await (0, s3Service_1.deleteS3Object)(memory.s3Key);
        }
        if (memory.albumId) {
            await Album_1.Album.findByIdAndUpdate(memory.albumId, { $inc: { itemCount: -1 } });
        }
        await Memory_1.Memory.findByIdAndDelete(req.params.id);
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_MEMORY', 'Memory', String(req.params.id), { title: memory.title });
        }
        res.json({ message: 'Memory deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error deleting memory' });
    }
});
exports.default = router;
