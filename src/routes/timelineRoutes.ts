import { Router, Response } from 'express';
import { TimelineEvent } from '../models/TimelineEvent';
import { requireAuth, requireAdmin, AuthenticatedRequest, recordAudit } from '../middleware/auth';

const router = Router();

// GET /api/timeline
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const events = await TimelineEvent.find()
      .populate('createdBy', 'name relationship')
      .sort({ year: 1, order: 1 });

    res.json({ events, count: events.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error fetching life timeline' });
  }
});

// POST /api/timeline (Admin only or authorized family)
router.post('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { year, date, title, description, location, photos, videos, order } = req.body;

    if (!year || !title || !description) {
      res.status(400).json({ error: 'Year, title, and description are required for a milestone' });
      return;
    }

    const event = await TimelineEvent.create({
      year,
      date,
      title,
      description,
      location,
      photos: photos || [],
      videos: videos || [],
      order: order || 0,
      createdBy: req.user!._id,
    });

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'CREATE_TIMELINE_EVENT',
        'TimelineEvent',
        event._id.toString(),
        { title: event.title, year: event.year }
      );
    }

    res.status(201).json({ event, message: 'Timeline milestone added' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error creating timeline milestone' });
  }
});

// PUT /api/timeline/:id
router.put('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { year, date, title, description, location, photos, videos, order } = req.body;

    const event = await TimelineEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    if (year !== undefined) event.year = year;
    if (date !== undefined) event.date = date;
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (location !== undefined) event.location = location;
    if (photos !== undefined) event.photos = photos;
    if (videos !== undefined) event.videos = videos;
    if (order !== undefined) event.order = order;

    await event.save();

    res.json({ event, message: 'Milestone updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error updating milestone' });
  }
});

// DELETE /api/timeline/:id
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const event = await TimelineEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }

    if (req.user) {
      await recordAudit(
        req.user._id.toString(),
        'DELETE_TIMELINE_EVENT',
        'TimelineEvent',
        String(req.params.id),
        { title: event.title }
      );
    }

    res.json({ message: 'Timeline milestone removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error removing milestone' });
  }
});

export default router;
