import express from 'express';
import { cleanSiteData, exportSiteData, importSiteData } from '../../controllers/dataController.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';
import { cleanSiteDataBodySchema, importSiteDataBodySchema } from '../../validation/adminSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/data/export', authenticate, isAdmin, exportSiteData);
router.post('/admin/data/import', authenticate, isAdmin, validate({ body: importSiteDataBodySchema }), importSiteData);
router.post('/admin/data/clean', authenticate, isAdmin, validate({ body: cleanSiteDataBodySchema }), cleanSiteData);

export default router;
