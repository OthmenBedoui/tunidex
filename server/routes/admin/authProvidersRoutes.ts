import express from 'express';
import { getAuthProviders, updateAuthProvider } from '../../controllers/authProviderController.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';
import { authProviderKeyParamsSchema, updateAuthProviderBodySchema } from '../../validation/authProviderSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/auth-providers', authenticate, isAdmin, getAuthProviders);
router.patch(
  '/admin/auth-providers/:providerKey',
  authenticate,
  isAdmin,
  validate({ params: authProviderKeyParamsSchema, body: updateAuthProviderBodySchema }),
  updateAuthProvider
);

export default router;
