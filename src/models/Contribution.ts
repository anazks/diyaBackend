import mongoose, { Schema, Document } from 'mongoose';
import { IContribution } from '../types';

export interface IContributionDocument extends IContribution, Document {}

const ContributionSchema = new Schema<IContributionDocument>(
  {
    contributorName: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['photo', 'video', 'audio', 'letter'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    mediaUrl: { type: String },
    s3Key: { type: String },
    letterBody: { type: String },
    category: {
      type: String,
      enum: [
        'Childhood',
        'Family',
        'Friends',
        'Celebrations',
        'Travel',
        'Favourite Moments',
        'Special Occasions',
      ],
      default: 'Family',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true },
    reviewedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ContributionSchema.index({ status: 1 });
ContributionSchema.index({ createdAt: -1 });

export const Contribution = mongoose.model<IContributionDocument>(
  'Contribution',
  ContributionSchema
);
