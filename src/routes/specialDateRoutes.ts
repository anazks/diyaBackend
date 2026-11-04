import { Router, Response } from 'express';
import { SpecialDate } from '../models/SpecialDate';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/special-dates
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const dates = await SpecialDate.find().sort({ month: 1, day: 1 });
    res.json({ dates });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching special dates' });
  }
});

// POST /api/special-dates (Admin only)
router.post('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, date, month, day, year, type, notes, iconName } = req.body;

    if (!title || !date || month === undefined || day === undefined) {
      res.status(400).json({ error: 'Title, date, month, and day are required' });
      return;
    }

    const newDate = await SpecialDate.create({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error creating special date' });
  }
});

// DELETE /api/special-dates/:id
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await SpecialDate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Special date removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error removing special date' });
  }
});

export default router;
