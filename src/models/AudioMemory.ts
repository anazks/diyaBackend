import mongoose, { Schema, Document } from 'mongoose';
import { IAudioMemory } from '../types';

export interface IAudioMemoryDocument extends IAudioMemory, Document {}

const AudioMemorySchema = new Schema<IAudioMemoryDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    mediaUrl: { type: String, required: true },
    s3Key: { type: String },
    duration: { type: Number, required: true, default: 0 },
    waveformPoints: [{ type: Number }],
    isFavorite: { type: Boolean, default: false },
    recordedDate: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const AudioMemory = mongoose.model<IAudioMemoryDocument>('AudioMemory', AudioMemorySchema);
