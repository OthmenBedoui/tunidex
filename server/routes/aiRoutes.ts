
import express from 'express';
import { generateDescription } from '../controllers/aiController.js';
import { authenticate, isStaff } from '../middleware/auth.js';

const router = express.Router();

router.post('/ai/generate-description', authenticate, isStaff, generateDescription);

export default router;
