import ImageKit from '@imagekit/nodejs';
import { MediaFileType } from '../models/Media';

const SIGNED_URL_SECONDS = 12 * 60 * 60;
const IMAGEKIT_URL = /^https:\/\/ik\.imagekit\.io\/[^/]+/;

export class MediaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let client: ImageKit | null = null;

function getClient(): ImageKit {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || !process.env.IMAGEKIT_PUBLIC_KEY) {
    throw new MediaError(503, 'Media uploads are not configured on the server');
  }
  if (!client) client = new ImageKit({ privateKey });
  return client;
}

/** The configured endpoint, or the one at the start of an ImageKit file URL. */
function endpointOf(url: string): string | null {
  const configured = process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, '');
  if (configured && url.startsWith(`${configured}/`)) return configured;
  return IMAGEKIT_URL.exec(url)?.[0] ?? null;
}

export function isImageKitUrl(url: unknown): url is string {
  return typeof url === 'string' && endpointOf(url) !== null;
}

/** One-time upload credentials for the mobile app (valid for 20 minutes). */
export function getUploadAuth() {
  const expire = Math.floor(Date.now() / 1000) + 20 * 60;
  return {
    ...getClient().helper.getAuthenticationParameters(undefined, expire),
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
  };
}

const FOLDERS: Record<string, MediaFileType> = {
  images: 'image',
  videos: 'video',
  audio: 'audio',
};

export function userFolder(userId: string, type: MediaFileType): string {
  return `/users/${userId}/${type === 'audio' ? 'audio' : `${type}s`}`;
}

/**
 * Look an upload up in ImageKit and check that it is private and sits in this user's folder.
 * Nothing the phone says about the file is trusted.
 */
export async function getVerifiedUpload(fileId: string, userId: string) {
  let file;
  try {
    file = await getClient().files.get(fileId);
  } catch (error: any) {
    if (error?.status === 404 || error?.status === 400) {
      throw new MediaError(404, 'Uploaded file was not found');
    }
    throw error;
  }

  const [, users, owner, folder] = (file.filePath || '').split('/');
  const fileType = FOLDERS[folder];
  if (users !== 'users' || owner !== userId || !fileType || !file.url) {
    throw new MediaError(403, 'This file does not belong to your account');
  }
  if (!file.isPrivateFile) {
    throw new MediaError(400, 'Memorial files must be uploaded as private');
  }
  const mimeType = file.mime || '';
  if (mimeType && !mimeType.startsWith(`${fileType}/`)) {
    throw new MediaError(400, `Invalid file type: ${mimeType}`);
  }

  const url = file.url.split('?')[0];
  const endpoint = endpointOf(url);
  let thumbnailUrl: string | undefined;
  if (endpoint && fileType === 'image') {
    thumbnailUrl = `${endpoint}/tr:w-600,h-600,c-at_max${url.slice(endpoint.length)}`;
  } else if (fileType === 'video') {
    thumbnailUrl = `${url}/ik-thumbnail.jpg`;
  }

  return { fileId, url, thumbnailUrl, fileType, mimeType, size: file.size || 0, name: file.name || 'Untitled' };
}

export async function deleteImageKitFile(fileId: string): Promise<void> {
  try {
    await getClient().files.delete(fileId);
  } catch (error: any) {
    if (error?.status !== 404) throw error; // already gone is fine
  }
}

/** Expiring link for a private ImageKit file; any other URL is returned unchanged. */
export function signUrl(url: string): string {
  const urlEndpoint = endpointOf(url);
  if (!urlEndpoint || !process.env.IMAGEKIT_PRIVATE_KEY) return url;
  return getClient().helper.buildSrc({
    urlEndpoint,
    src: url,
    signed: true,
    expiresIn: SIGNED_URL_SECONDS,
  });
}
