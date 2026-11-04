import mongoose, { Schema, Document } from 'mongoose';
import { IMemory } from '../types';

export interface IMemoryDocument extends IMemory, Document {}

const MemorySchema = new Schema<IMemoryDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    mediaType: { type: String, enum: ['photo', 'video', 'audio'], default: 'photo' },
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
      default: 'Favourite Moments',
    },
    albumId: { type: Schema.Types.ObjectId, ref: 'Album' },
    mediaUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    s3Key: { type: String },
    dateTaken: { type: Date },
    location: { type: String, trim: true },
    isFavorite: { type: Boolean, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
  },
  { timestamps: true }
);

MemorySchema.index({ category: 1 });
MemorySchema.index({ albumId: 1 });
MemorySchema.index({ isFavorite: 1 });
MemorySchema.index({ createdAt: -1 });

export const Memory = mongoose.model<IMemoryDocument>('Memory', MemorySchema);
