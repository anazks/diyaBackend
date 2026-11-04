"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Contribution_1 = require("../models/Contribution");
const Memory_1 = require("../models/Memory");
const Video_1 = require("../models/Video");
const AudioMemory_1 = require("../models/AudioMemory");
const Letter_1 = require("../models/Letter");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/contributions
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (req.user.role !== 'admin') {
            filter.submittedBy = req.user._id;
        }
        else if (status) {
            filter.status = status;
        }
        const contributions = await Contribution_1.Contribution.find(filter)
            .populate('submittedBy', 'name email relationship avatarUrl')
            .populate('reviewedBy', 'name')
            .sort({ createdAt: -1 });
        res.json({ contributions, count: contributions.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching contributions' });
    }
});
// POST /api/contributions (Submit contribution)
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { type, title, note, mediaUrl, s3Key, letterBody, category, } = req.body;
        if (!type || !title) {
            res.status(400).json({ error: 'Contribution type and title are required' });
            return;
        }
        const newContribution = await Contribution_1.Contribution.create({
            contributorName: req.user.name,
            relationship: req.user.relationship,
            type,
            title,
            note,
            mediaUrl,
            s3Key,
            letterBody,
            category: category || 'Family',
            status: 'pending',
            submittedBy: req.user._id,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'SUBMIT_CONTRIBUTION', 'Contribution', newContribution._id.toString(), { title, type });
        }
        res.status(201).json({
            contribution: newContribution,
            message: 'Memory submitted with love. An administrator will review and add it to the memorial album.',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error submitting contribution' });
    }
});
// PATCH /api/contributions/:id/review (Admin review - approve or reject)
router.patch('/:id/review', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { status, reviewNotes } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            res.status(400).json({ error: 'Status must be approved or rejected' });
            return;
        }
        const contribution = await Contribution_1.Contribution.findById(req.params.id);
        if (!contribution) {
            res.status(404).json({ error: 'Contribution not found' });
            return;
        }
        contribution.status = status;
        contribution.reviewNotes = reviewNotes;
        contribution.reviewedBy = req.user._id;
        contribution.reviewedAt = new Date();
        await contribution.save();
        // If approved, automatically convert and publish to the main memorial collections
        if (status === 'approved') {
            if (contribution.type === 'photo' && contribution.mediaUrl) {
                await Memory_1.Memory.create({
                    title: contribution.title,
                    description: contribution.note || `Contributed with love by ${contribution.contributorName} (${contribution.relationship})`,
                    mediaType: 'photo',
                    category: contribution.category || 'Family',
                    mediaUrl: contribution.mediaUrl,
                    s3Key: contribution.s3Key,
                    isFavorite: false,
                    uploadedBy: contribution.submittedBy,
                });
            }
            else if (contribution.type === 'video' && contribution.mediaUrl) {
                await Video_1.Video.create({
                    title: contribution.title,
                    caption: contribution.note,
                    category: contribution.category || 'Family',
                    mediaUrl: contribution.mediaUrl,
                    s3Key: contribution.s3Key,
                    uploadedBy: contribution.submittedBy,
                });
            }
            else if (contribution.type === 'audio' && contribution.mediaUrl) {
                await AudioMemory_1.AudioMemory.create({
                    title: contribution.title,
                    description: contribution.note,
                    mediaUrl: contribution.mediaUrl,
                    s3Key: contribution.s3Key,
                    duration: 30,
                    uploadedBy: contribution.submittedBy,
                });
            }
            else if (contribution.type === 'letter' && contribution.letterBody) {
                await Letter_1.Letter.create({
                    senderName: contribution.contributorName,
                    relationship: contribution.relationship,
                    title: contribution.title,
                    body: contribution.letterBody,
                    paperStyle: 'cream',
                    isPrivate: false,
                    isDraft: false,
                    createdBy: contribution.submittedBy,
                });
            }
        }
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), `REVIEW_CONTRIBUTION_${status.toUpperCase()}`, 'Contribution', contribution._id.toString(), { status, title: contribution.title });
        }
        res.json({
            contribution,
            message: status === 'approved' ? 'Contribution approved and published to the album' : 'Contribution rejected',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error reviewing contribution' });
    }
});
exports.default = router;
