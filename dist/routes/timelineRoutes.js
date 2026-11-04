"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TimelineEvent_1 = require("../models/TimelineEvent");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/timeline
router.get('/', auth_1.requireAuth, async (_req, res) => {
    try {
        const events = await TimelineEvent_1.TimelineEvent.find()
            .populate('createdBy', 'name relationship')
            .sort({ year: 1, order: 1 });
        res.json({ events, count: events.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching life timeline' });
    }
});
// POST /api/timeline (Admin only or authorized family)
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { year, date, title, description, location, photos, videos, order } = req.body;
        if (!year || !title || !description) {
            res.status(400).json({ error: 'Year, title, and description are required for a milestone' });
            return;
        }
        const event = await TimelineEvent_1.TimelineEvent.create({
            year,
            date,
            title,
            description,
            location,
            photos: photos || [],
            videos: videos || [],
            order: order || 0,
            createdBy: req.user._id,
        });
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'CREATE_TIMELINE_EVENT', 'TimelineEvent', event._id.toString(), { title: event.title, year: event.year });
        }
        res.status(201).json({ event, message: 'Timeline milestone added' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error creating timeline milestone' });
    }
});
// PUT /api/timeline/:id
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { year, date, title, description, location, photos, videos, order } = req.body;
        const event = await TimelineEvent_1.TimelineEvent.findById(req.params.id);
        if (!event) {
            res.status(404).json({ error: 'Milestone not found' });
            return;
        }
        if (year !== undefined)
            event.year = year;
        if (date !== undefined)
            event.date = date;
        if (title !== undefined)
            event.title = title;
        if (description !== undefined)
            event.description = description;
        if (location !== undefined)
            event.location = location;
        if (photos !== undefined)
            event.photos = photos;
        if (videos !== undefined)
            event.videos = videos;
        if (order !== undefined)
            event.order = order;
        await event.save();
        res.json({ event, message: 'Milestone updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error updating milestone' });
    }
});
// DELETE /api/timeline/:id
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const event = await TimelineEvent_1.TimelineEvent.findByIdAndDelete(req.params.id);
        if (!event) {
            res.status(404).json({ error: 'Milestone not found' });
            return;
        }
        if (req.user) {
            await (0, auth_1.recordAudit)(req.user._id.toString(), 'DELETE_TIMELINE_EVENT', 'TimelineEvent', String(req.params.id), { title: event.title });
        }
        res.json({ message: 'Timeline milestone removed' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error removing milestone' });
    }
});
exports.default = router;
