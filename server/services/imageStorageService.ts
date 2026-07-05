import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';
import env from '../config/env.js';

const INLINE_IMAGE_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml'
]);

export type StoredImageResult = {
  url: string;
  absoluteUrl: string;
  relativePath: string;
  contentType: 'image/webp';
  width: number;
  height: number;
  size: number;
};

type StoreImageOptions = {
  subdir?: string;
  fileNamePrefix?: string;
};

const normalizeSubdir = (subdir?: string) => (
  (subdir || 'general')
    .split(/[\\/]+/)
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9_-]/g, '-'))
    .filter(Boolean)
    .join(path.sep)
);

const ensureUploadsDir = async (subdir?: string) => {
  const targetDir = path.join(env.uploadsDir, normalizeSubdir(subdir));
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
};

const buildStoredImageUrl = (relativePath: string) => {
  const normalizedPath = relativePath.split(path.sep).join('/');
  const url = `/uploads/${normalizedPath}`;
  return {
    url,
    absoluteUrl: new URL(url, env.authUrl).toString()
  };
};

const optimizeImageBuffer = async (buffer: Buffer) => {
  const transformer = sharp(buffer, { animated: false }).rotate().resize({
    width: 1600,
    height: 1600,
    fit: 'inside',
    withoutEnlargement: true
  });

  const metadata = await transformer.metadata();
  const outputBuffer = await transformer.webp({ quality: 82 }).toBuffer();
  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    width: outputMetadata.width || metadata.width || 0,
    height: outputMetadata.height || metadata.height || 0
  };
};

export const isInlineImageDataUrl = (value: unknown): value is string => (
  typeof value === 'string' && INLINE_IMAGE_PATTERN.test(value)
);

export const storeOptimizedImageBuffer = async (
  buffer: Buffer,
  options: StoreImageOptions = {}
): Promise<StoredImageResult> => {
  const uploadDir = await ensureUploadsDir(options.subdir);
  const optimized = await optimizeImageBuffer(buffer);
  const relativeDir = normalizeSubdir(options.subdir);
  const fileName = `${options.fileNamePrefix || 'asset'}-${crypto.randomUUID()}.webp`;
  const absolutePath = path.join(uploadDir, fileName);

  await fs.writeFile(absolutePath, optimized.buffer, { flag: 'wx' });

  const relativePath = path.join(relativeDir, fileName);
  const publicUrls = buildStoredImageUrl(relativePath);

  return {
    ...publicUrls,
    relativePath,
    contentType: 'image/webp',
    width: optimized.width,
    height: optimized.height,
    size: optimized.buffer.length
  };
};

export const storeInlineImageDataUrl = async (
  dataUrl: string,
  options: StoreImageOptions = {}
): Promise<StoredImageResult> => {
  const match = dataUrl.match(INLINE_IMAGE_PATTERN);

  if (!match) {
    throw new Error('Inline image format is invalid.');
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported inline image format.');
  }

  const inputBuffer = Buffer.from(match[2], 'base64');
  return storeOptimizedImageBuffer(inputBuffer, options);
};

export const migrateInlineImageValue = async (
  value: unknown,
  options: StoreImageOptions = {}
) => {
  if (!isInlineImageDataUrl(value)) {
    return typeof value === 'string' ? value : '';
  }

  const stored = await storeInlineImageDataUrl(value, options);
  return stored.url;
};

export const hasAllowedUploadMimeType = (mimeType: string) => ALLOWED_UPLOAD_MIME_TYPES.has(mimeType.toLowerCase());
