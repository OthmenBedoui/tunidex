
import express from 'express';
import { login, logout, refreshSession, register, verifyRegistrationOtp, resendRegistrationOtp, sendVerificationEmail, getMe } from '../controllers/authController.js';
import { getPublicAuthProviders } from '../controllers/authProviderController.js';
import { handleSocialAuthCallback, startSocialAuth } from '../controllers/socialAuthController.js';
import { authenticate } from '../middleware/auth.js';
import { loginBodySchema, registerBodySchema, resendOtpBodySchema, verifyOtpBodySchema } from '../validation/authSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();

router.post('/login', validate({ body: loginBodySchema }), login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);
router.post('/register', validate({ body: registerBodySchema }), register);
router.post('/register/verify-otp', validate({ body: verifyOtpBodySchema }), verifyRegistrationOtp);
router.post('/register/resend-otp', validate({ body: resendOtpBodySchema }), resendRegistrationOtp);
router.get('/providers', getPublicAuthProviders);
router.get('/oauth/:provider/start', startSocialAuth);
router.get('/oauth/:provider/callback', handleSocialAuthCallback);
router.post('/oauth/:provider/callback', handleSocialAuthCallback);
router.get('/callback/:provider', handleSocialAuthCallback);
router.post('/callback/:provider', handleSocialAuthCallback);
router.post('/verify-email', authenticate, sendVerificationEmail);
router.get('/me', authenticate, getMe);

export default router;
