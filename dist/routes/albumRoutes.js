"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Album_1 = require("../models/Album");
const Memory_1 = require("../models/Memory");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/albums
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { category } = req.query;
        const filter = {};
        if (category && category !== 'All') {
            filter.category = category;
        }
        const albums = await Album_1.Album.find(filter)
            .populate('createdBy', 'name relationship')
            .sort({ createdAt: -1 });
        res.json({ albums, count: albums.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching albums' });
    }
});
// GET /api/albums/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const album = await Album_1.Album.findById(req.params.id);
        if (!album) {
            res.status(404).json({ error: 'Album not found' });
            return;
        }
        const photos = await Memory_1.Memory.find({ albumId: album._id, mediaType: 'photo' })
            .populate('uploadedBy', 'name')
            .sort({ dateTaken: -1 });
        res.json({ album, photos, count: photos.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error retrieving album details' });
    }
});
// POST /api/albums
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, description, category, coverImageUrl } = req.body;
        if (!title) {
            res.status(400).json({ error: 'Album title is required' });
            return;
        }
        const newAlbum = await Album_1.Album.create({
            title,
            description,
            category: category || 'Family',
            coverImageUrl: coverImageUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
            createdBy: req.user._id,
            itemCount: 0,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'CREATE_ALBUM', 'Album', newAlbum._id.toString(), { title: newAlbum.title });
        }
        res.status(201).json({ album: newAlbum, message: 'Album created successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error creating album' });
    }
});
// DELETE /api/albums/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const album = await Album_1.Album.findById(req.params.id);
        if (!album) {
            res.status(404).json({ error: 'Album not found' });
            return;
        }
        // Unlink memories
        await Memory_1.Memory.updateMany({ albumId: album._id }, { $unset: { albumId: 1 } });
        await Album_1.Album.findByIdAndDelete(req.params.id);
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_ALBUM', 'Album', String(req.params.id), { title: album.title });
        }
        res.json({ message: 'Album deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error deleting album' });
    }
});
exports.default = router;
