import express from 'express';
import multer from 'multer';
import { uploadImage } from '../../controllers/uploadController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

router.post('/uploads', authenticate, isStaff, upload.single('file'), uploadImage);

export default router;
