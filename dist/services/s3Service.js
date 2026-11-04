"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
exports.generatePresignedUploadUrl = generatePresignedUploadUrl;
exports.generatePresignedViewUrl = generatePresignedViewUrl;
exports.initiateMultipartUpload = initiateMultipartUpload;
exports.signMultipartPartUrl = signMultipartPartUrl;
exports.completeMultipartUpload = completeMultipartUpload;
exports.deleteS3Object = deleteS3Object;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'memorial-until-we-meet-again';
const hasAwsCredentials = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
exports.s3Client = hasAwsCredentials
    ? new client_s3_1.S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    })
    : null;
const PRESIGNED_EXPIRES = Number(process.env.AWS_S3_PRESIGNED_EXPIRES_IN) || 3600;
/**
 * Generates a presigned PUT URL for client-direct uploads to AWS S3.
 * If AWS credentials are missing, returns local server upload path.
 */
async function generatePresignedUploadUrl(filename, contentType, folder = 'photos') {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `memorial/${folder}/${timestamp}-${sanitized}`;
    if (exports.s3Client && hasAwsCredentials) {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            ContentType: contentType,
            // Private bucket access
            Metadata: {
                uploadedAt: new Date().toISOString(),
            },
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
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
async function generatePresignedViewUrl(s3Key) {
    if (!s3Key)
        return '';
    // If it's already an http(s) URL and not an s3Key, return as is
    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
        return s3Key;
    }
    if (exports.s3Client && hasAwsCredentials) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
    }
    return `/uploads/${s3Key}`;
}
/**
 * Initiates multipart upload for large video files.
 */
async function initiateMultipartUpload(filename, contentType) {
    const s3Key = `memorial/videos/multipart-${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    if (exports.s3Client && hasAwsCredentials) {
        const command = new client_s3_1.CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: s3Key,
            ContentType: contentType,
        });
        const response = await exports.s3Client.send(command);
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
async function signMultipartPartUrl(s3Key, uploadId, partNumber) {
    if (exports.s3Client && hasAwsCredentials) {
        const command = new client_s3_1.UploadPartCommand({
            Bucket: bucketName,
            Key: s3Key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });
        const signedPartUrl = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn: PRESIGNED_EXPIRES });
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
async function completeMultipartUpload(s3Key, uploadId, parts) {
    if (exports.s3Client && hasAwsCredentials) {
        const command = new client_s3_1.CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: s3Key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts,
            },
        });
        await exports.s3Client.send(command);
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
async function deleteS3Object(s3Key) {
    if (exports.s3Client && hasAwsCredentials) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
            });
            await exports.s3Client.send(command);
            return true;
        }
        catch {
            return false;
        }
    }
    // Local fallback deletion
    try {
        const localPath = path_1.default.join(process.cwd(), 'uploads', s3Key);
        if (fs_1.default.existsSync(localPath)) {
            fs_1.default.unlinkSync(localPath);
        }
        return true;
    }
    catch {
        return false;
    }
}
