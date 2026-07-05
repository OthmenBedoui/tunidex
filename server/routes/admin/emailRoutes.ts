import express from 'express';
import { getFailedEmails, retryFailedEmail, sendTestEmail } from '../../controllers/emailController.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';
import { idParamsSchema, sendTestEmailBodySchema } from '../../validation/adminSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.post('/admin/email/test', authenticate, isAdmin, validate({ body: sendTestEmailBodySchema }), sendTestEmail);
router.get('/admin/email/outbox/failed', authenticate, isAdmin, getFailedEmails);
router.post('/admin/email/outbox/:id/retry', authenticate, isAdmin, validate({ params: idParamsSchema }), retryFailedEmail);

export default router;
