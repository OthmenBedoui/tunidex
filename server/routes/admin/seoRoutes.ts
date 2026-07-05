import express from 'express';
import { getSeoAnalytics, trackSiteVisit } from '../../controllers/seoController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';
import { trackVisitBodySchema } from '../../validation/seoSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/seo/analytics', authenticate, isStaff, getSeoAnalytics);
router.post('/analytics/visit', validate({ body: trackVisitBodySchema }), trackSiteVisit);

export default router;
