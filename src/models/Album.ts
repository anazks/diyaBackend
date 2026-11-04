import mongoose, { Schema, Document } from 'mongoose';
import { IAlbum } from '../types';

export interface IAlbumDocument extends IAlbum, Document {}

const AlbumSchema = new Schema<IAlbumDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
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
    coverImageUrl: { type: String },
    itemCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Album = mongoose.model<IAlbumDocument>('Album', AlbumSchema);
