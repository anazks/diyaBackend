"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Letter_1 = require("../models/Letter");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/letters
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const isAdmin = req.user.role === 'admin';
        // Show public letters + user's own private/draft letters
        const filter = isAdmin
            ? { $or: [{ isDraft: false }, { createdBy: currentUserId }] }
            : {
                $or: [
                    { isPrivate: false, isDraft: false },
                    { createdBy: currentUserId },
                ],
            };
        const letters = await Letter_1.Letter.find(filter)
            .populate('createdBy', 'name relationship avatarUrl')
            .sort({ createdAt: -1 });
        res.json({ letters, count: letters.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching letters' });
    }
});
// GET /api/letters/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const letter = await Letter_1.Letter.findById(req.params.id);
        if (!letter) {
            res.status(404).json({ error: 'Letter not found' });
            return;
        }
        const isOwner = String(letter.createdBy) === req.user?._id.toString();
        if (letter.isPrivate && !isOwner && req.user?.role !== 'admin') {
            res.status(403).json({ error: 'This letter is marked private to the author' });
            return;
        }
        res.json({ letter });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching letter' });
    }
});
// POST /api/letters
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, body, paperStyle, isPrivate, isDraft, relationship } = req.body;
        if (!title || !body) {
            res.status(400).json({ error: 'Title and letter contents are required' });
            return;
        }
        const newLetter = await Letter_1.Letter.create({
            senderName: req.user.name,
            relationship: relationship || req.user.relationship,
            title,
            body,
            paperStyle: paperStyle || 'cream',
            isPrivate: Boolean(isPrivate),
            isDraft: Boolean(isDraft),
            createdBy: req.user._id,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'WRITE_LETTER', 'Letter', newLetter._id.toString(), { title: newLetter.title, isPrivate: newLetter.isPrivate, isDraft: newLetter.isDraft });
        }
        res.status(201).json({ letter: newLetter, message: isDraft ? 'Draft saved' : 'Letter written and folded with love' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error saving letter' });
    }
});
// PUT /api/letters/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const letter = await Letter_1.Letter.findById(req.params.id);
        if (!letter) {
            res.status(404).json({ error: 'Letter not found' });
            return;
        }
        const isOwner = String(letter.createdBy) === req.user?._id.toString();
        if (!isOwner && req.user?.role !== 'admin') {
            res.status(403).json({ error: 'You may only edit your own letters' });
            return;
        }
        const { title, body, paperStyle, isPrivate, isDraft } = req.body;
        if (title !== undefined)
            letter.title = title;
        if (body !== undefined)
            letter.body = body;
        if (paperStyle !== undefined)
            letter.paperStyle = paperStyle;
        if (isPrivate !== undefined)
            letter.isPrivate = isPrivate;
        if (isDraft !== undefined)
            letter.isDraft = isDraft;
        await letter.save();
        res.json({ letter, message: 'Letter updated' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error updating letter' });
    }
});
// DELETE /api/letters/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const letter = await Letter_1.Letter.findById(req.params.id);
        if (!letter) {
            res.status(404).json({ error: 'Letter not found' });
            return;
        }
        const isOwner = String(letter.createdBy) === req.user?._id.toString();
        if (!isOwner && req.user?.role !== 'admin') {
            res.status(403).json({ error: 'You may only delete your own letters' });
            return;
        }
        await Letter_1.Letter.findByIdAndDelete(req.params.id);
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_LETTER', 'Letter', String(req.params.id), { title: letter.title });
        }
        res.json({ message: 'Letter deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error deleting letter' });
    }
});
exports.default = router;
