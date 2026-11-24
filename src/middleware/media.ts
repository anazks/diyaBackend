import { Request, Response, NextFunction } from 'express';
import { Media } from '../models/Media';
import { isImageKitUrl, signUrl } from '../services/imagekitService';
import { AuthenticatedRequest } from './auth';

const URL_FIELDS = new Set(['url', 'mediaUrl', 'thumbnailUrl']);

function signDeep(value: any): any {
  if (Array.isArray(value)) return value.map(signDeep);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const field = value[key];
      value[key] = URL_FIELDS.has(key) && typeof field === 'string' ? signUrl(field) : signDeep(field);
    }
  }
  return value;
}

/** Replaces private ImageKit URLs in JSON responses with expiring signed links. */
export function signMediaUrls(_req: Request, res: Response, next: NextFunction): void {
  const json = res.json.bind(res);
  res.json = (body?: any) => json(signDeep(JSON.parse(JSON.stringify(body ?? null))));
  next();
}

/**
 * For routes that publish media: swaps `fileId` for the URL of a file this user uploaded.
 * Raw ImageKit URLs are refused, otherwise a caller could have someone else's private file signed.
 */
export async function resolveUploadedMedia(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { fileId, mediaUrl, thumbnailUrl, type } = req.body;
    if (fileId) {
      const media = await Media.findOne({ fileId: String(fileId), userId: req.user!._id });
      if (!media) {
        res.status(400).json({ error: 'Uploaded file was not found' });
        return;
      }
      const mediaType = media.fileType === 'image' ? 'photo' : media.fileType;
      const expected =
        type ||
        (req.baseUrl.endsWith('/videos') ? 'video' : req.baseUrl.endsWith('/audio') ? 'audio' : 'photo');
      if (mediaType !== expected) {
        res.status(400).json({ error: `This file is not a ${expected}` });
        return;
      }
      req.body.mediaUrl = media.url;
      req.body.thumbnailUrl = media.thumbnailUrl;
      req.body.fileSize = media.size;
      req.body.mimeType = media.mimeType;
    } else if (isImageKitUrl(mediaUrl) || isImageKitUrl(thumbnailUrl)) {
      res.status(400).json({ error: 'Please attach uploaded media by fileId' });
      return;
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error attaching media' });
  }
}
