import mongoose, { Schema, Document } from 'mongoose';
import { ISpecialDate } from '../types';

export interface ISpecialDateDocument extends ISpecialDate, Document {}

const SpecialDateSchema = new Schema<ISpecialDateDocument>(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    month: { type: Number, required: true },
    day: { type: Number, required: true },
    year: { type: Number },
    type: {
      type: String,
      enum: ['birthday', 'anniversary', 'remembrance', 'holiday', 'custom'],
      default: 'custom',
    },
    notes: { type: String, trim: true },
    iconName: { type: String, default: 'calendar-heart' },
  },
  { timestamps: true }
);

export const SpecialDate = mongoose.model<ISpecialDateDocument>(
  'SpecialDate',
  SpecialDateSchema
);
