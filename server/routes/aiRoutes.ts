
import express from 'express';
import { generateBlogDraft, generateDescription } from '../controllers/aiController.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { generateBlogDraftBodySchema, generateDescriptionBodySchema } from '../validation/aiSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();

router.post('/ai/generate-description', authenticate, isStaff, validate({ body: generateDescriptionBodySchema }), generateDescription);
router.post('/ai/generate-blog-draft', authenticate, isStaff, validate({ body: generateBlogDraftBodySchema }), generateBlogDraft);

export default router;
