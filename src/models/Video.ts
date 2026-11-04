import mongoose, { Schema, Document } from 'mongoose';
import { IVideo } from '../types';

export interface IVideoDocument extends IVideo, Document {}

const VideoSchema = new Schema<IVideoDocument>(
  {
    title: { type: String, required: true, trim: true },
    caption: { type: String, trim: true },
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
    mediaUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    s3Key: { type: String },
    duration: { type: Number, default: 0 },
    fileSize: { type: Number },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Video = mongoose.model<IVideoDocument>('Video', VideoSchema);
