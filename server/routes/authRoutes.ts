
import express from 'express';
import { login, register, verifyRegistrationOtp, resendRegistrationOtp, sendVerificationEmail, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/register/resend-otp', resendRegistrationOtp);
router.post('/verify-email', authenticate, sendVerificationEmail);
router.get('/me', authenticate, getMe);

export default router;
