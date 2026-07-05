import express from 'express';
import { confirmEmailChange, deleteAccount, requestEmailChange, updateProfile, updateSubscription } from '../../controllers/authController.js';
import { getMyLoyalty } from '../../controllers/loyaltyController.js';
import { authenticate } from '../../middleware/auth.js';
import { deleteAccountBodySchema, emailChangeConfirmBodySchema, emailChangeRequestBodySchema, updateProfileBodySchema, updateSubscriptionBodySchema } from '../../validation/authSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.patch('/users/profile', authenticate, validate({ body: updateProfileBodySchema }), updateProfile);
router.get('/users/me/loyalty', authenticate, getMyLoyalty);
router.post('/users/subscribe', authenticate, validate({ body: updateSubscriptionBodySchema }), updateSubscription);
router.post('/users/email-change/request', authenticate, validate({ body: emailChangeRequestBodySchema }), requestEmailChange);
router.post('/users/email-change/confirm', authenticate, validate({ body: emailChangeConfirmBodySchema }), confirmEmailChange);
router.delete('/users/me', authenticate, validate({ body: deleteAccountBodySchema }), deleteAccount);

export default router;
