import mongoose, { Schema, Document } from 'mongoose';
import { ILetter } from '../types';

export interface ILetterDocument extends ILetter, Document {}

const LetterSchema = new Schema<ILetterDocument>(
  {
    senderName: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    paperStyle: {
      type: String,
      enum: ['cream', 'linen', 'parchment', 'lavender'],
      default: 'cream',
    },
    isPrivate: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LetterSchema.index({ createdAt: -1 });

export const Letter = mongoose.model<ILetterDocument>('Letter', LetterSchema);
