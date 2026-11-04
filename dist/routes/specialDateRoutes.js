"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SpecialDate_1 = require("../models/SpecialDate");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/special-dates
router.get('/', auth_1.requireAuth, async (_req, res) => {
    try {
        const dates = await SpecialDate_1.SpecialDate.find().sort({ month: 1, day: 1 });
        res.json({ dates });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error fetching special dates' });
    }
});
// POST /api/special-dates (Admin only)
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { title, date, month, day, year, type, notes, iconName } = req.body;
        if (!title || !date || month === undefined || day === undefined) {
            res.status(400).json({ error: 'Title, date, month, and day are required' });
            return;
        }
        const newDate = await SpecialDate_1.SpecialDate.create({
            title,
            date,
            month,
            day,
            year,
            type: type || 'custom',
            notes,
            iconName: iconName || 'calendar-heart',
        });
        res.status(201).json({ date: newDate, message: 'Special date added' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error creating special date' });
    }
});
// DELETE /api/special-dates/:id
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        await SpecialDate_1.SpecialDate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Special date removed' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Error removing special date' });
    }
});
exports.default = router;
