import mongoose, { Schema, Document } from 'mongoose';
import { ITimelineEvent } from '../types';

export interface ITimelineEventDocument extends ITimelineEvent, Document {}

const TimelineEventSchema = new Schema<ITimelineEventDocument>(
  {
    year: { type: Number, required: true },
    date: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    photos: [{ type: String }],
    videos: [{ type: String }],
    order: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

TimelineEventSchema.index({ year: 1, order: 1 });

export const TimelineEvent = mongoose.model<ITimelineEventDocument>(
  'TimelineEvent',
  TimelineEventSchema
);
