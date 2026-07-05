import express from 'express';
import { getSiteConfig, updateSiteConfig } from '../../controllers/configController.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';
import { updateSiteConfigBodySchema } from '../../validation/adminSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/config', getSiteConfig);
router.patch('/config', authenticate, isAdmin, validate({ body: updateSiteConfigBodySchema }), updateSiteConfig);

export default router;
