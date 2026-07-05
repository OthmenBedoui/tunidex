import type { Request, Response } from 'express';
import { hasAllowedUploadMimeType, storeOptimizedImageBuffer } from '../services/imageStorageService.js';

/**
 * @swagger
 * /api/uploads:
 *   post:
 *     summary: Upload and optimize an image
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Uploaded image metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadAsset'
 */
export const uploadImage = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required.' });
  }

  if (!hasAllowedUploadMimeType(req.file.mimetype)) {
    return res.status(400).json({ error: 'Unsupported image format. Use JPG, PNG, WEBP, GIF, AVIF or SVG.' });
  }

  const uploaded = await storeOptimizedImageBuffer(req.file.buffer, {
    subdir: 'admin',
    fileNamePrefix: 'upload'
  });

  res.status(201).json(uploaded);
};

export const uploadPaymentProofImage = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Payment proof image is required.' });
  }

  if (!hasAllowedUploadMimeType(req.file.mimetype)) {
    return res.status(400).json({ error: 'Unsupported proof image format. Use JPG, PNG, WEBP, GIF, AVIF or SVG.' });
  }

  const uploaded = await storeOptimizedImageBuffer(req.file.buffer, {
    subdir: 'payment-proofs',
    fileNamePrefix: 'payment-proof'
  });

  res.status(201).json(uploaded);
};
