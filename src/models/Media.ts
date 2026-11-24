import mongoose, { Schema, Document, Types } from 'mongoose';

export type MediaFileType = 'image' | 'video' | 'audio';

export interface IMediaDocument extends Document {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  fileType: MediaFileType;
  mimeType?: string;
  size: number;
  name: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const MediaSchema = new Schema<IMediaDocument>(
  {
    fileId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    fileType: { type: String, enum: ['image', 'video', 'audio'], required: true },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    name: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MediaSchema.index({ userId: 1, fileType: 1, createdAt: -1 });
MediaSchema.index({ url: 1 });

export const Media = mongoose.model<IMediaDocument>('Media', MediaSchema);
