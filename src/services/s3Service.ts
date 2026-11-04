import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'memorial-until-we-meet-again';
const hasAwsCredentials = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export const s3Client = hasAwsCredentials
  ? new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const PRESIGNED_EXPIRES = Number(process.env.AWS_S3_PRESIGNED_EXPIRES_IN) || 3600;

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Key: string;
  finalPublicOrPresignedUrl: string;
  isMock: boolean;
}

/**
 * Generates a presigned PUT URL for client-direct uploads to AWS S3.
 * If AWS credentials are missing, returns local server upload path.
 */
export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: 'photos' | 'videos' | 'audio' | 'thumbnails' = 'photos'
): Promise<PresignedUploadResponse> {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `memorial/${folder}/${timestamp}-${sanitized}`;

  if (s3Client && hasAwsCredentials) {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      // Private bucket access
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
    const finalUrl = await generatePresignedViewUrl(s3Key);

    return {
      uploadUrl,
      s3Key,
      finalPublicOrPresignedUrl: finalUrl,
      isMock: false,
    };
  }

  // Graceful local development fallback
  const mockUploadUrl = `/api/upload/direct-fallback?key=${encodeURIComponent(s3Key)}`;
  const mockViewUrl = `/uploads/${s3Key}`;

  return {
    uploadUrl: mockUploadUrl,
    s3Key,
    finalPublicOrPresignedUrl: mockViewUrl,
    isMock: true,
  };
}

/**
 * Generates a secure temporary signed GET URL to view private media.
 */
export async function generatePresignedViewUrl(s3Key: string): Promise<string> {
  if (!s3Key) return '';
  // If it's already an http(s) URL and not an s3Key, return as is
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
    return s3Key;
  }

  if (s3Client && hasAwsCredentials) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });
    return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
  }

  return `/uploads/${s3Key}`;
}

/**
 * Initiates multipart upload for large video files.
 */
export async function initiateMultipartUpload(filename: string, contentType: string) {
  const s3Key = `memorial/videos/multipart-${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  if (s3Client && hasAwsCredentials) {
    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
    });
    const response = await s3Client.send(command);
    return {
      uploadId: response.UploadId,
      s3Key,
      isMock: false,
    };
  }

  return {
    uploadId: `mock-upload-${Date.now()}`,
    s3Key,
    isMock: true,
  };
}

/**
 * Signs an individual part of a multipart upload.
 */
export async function signMultipartPartUrl(s3Key: string, uploadId: string, partNumber: number) {
  if (s3Client && hasAwsCredentials) {
    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const signedPartUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
    return { signedPartUrl, partNumber };
  }

  return {
    signedPartUrl: `/api/upload/multipart-mock-part?key=${s3Key}&part=${partNumber}`,
    partNumber,
  };
}

/**
 * Completes a multipart upload.
 */
export async function completeMultipartUpload(
  s3Key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
) {
  if (s3Client && hasAwsCredentials) {
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });
    await s3Client.send(command);
    const viewUrl = await generatePresignedViewUrl(s3Key);
    return { s3Key, mediaUrl: viewUrl };
  }

  return {
    s3Key,
    mediaUrl: `/uploads/${s3Key}`,
  };
}

/**
 * Deletes an object from S3.
 */
export async function deleteS3Object(s3Key: string): Promise<boolean> {
  if (s3Client && hasAwsCredentials) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      await s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  // Local fallback deletion
  try {
    const localPath = path.join(process.cwd(), 'uploads', s3Key);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch {
    return false;
  }
}
