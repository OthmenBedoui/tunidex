
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { sendEmail } from '../utils/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-g2g-tunisie';
const OTP_EXPIRY_MINUTES = 10;

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sanitizeUser = <T extends { password?: string }>(user: T) => {
  const result = { ...user };
  delete result.password;
  return result;
};

const sendOtpEmail = async (email: string, username: string, otpCode: string) => {
  await sendEmail(
    email,
    'Code de verification Tunidex',
    `
      <div style="font-family:Arial,sans-serif;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 16px">Confirmez votre inscription</h2>
        <p>Bonjour ${username},</p>
        <p>Utilisez ce code OTP pour confirmer votre adresse email sur Tunidex :</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;margin:24px 0;color:#4f46e5">${otpCode}</div>
        <p>Ce code expire dans ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `
  );
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalide' });
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Confirmez votre adresse email avec le code OTP avant de vous connecter.' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ token, user: sanitizeUser(user) });
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
export const register = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.emailVerified) return res.status(400).json({ error: 'Email pris' });

  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 10);

  if (existingUser && !existingUser.emailVerified) {
    await prisma.user.update({
      where: { email },
      data: {
        username,
        password: passwordHash,
        emailVerificationCode: otpCode,
        emailVerificationExpiresAt: otpExpiresAt,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      }
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        username,
        role: 'CLIENT',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        emailVerified: false,
        emailVerificationCode: otpCode,
        emailVerificationExpiresAt: otpExpiresAt
      }
    });
  }

  await sendOtpEmail(email, username, otpCode);
  res.json({ verificationRequired: true, email, message: 'Un code OTP a ete envoye par email.' });
};

export const verifyRegistrationOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
  if (user.emailVerified) return res.status(400).json({ error: 'Ce compte est deja verifie.' });
  if (!user.emailVerificationCode || user.emailVerificationCode !== otp) return res.status(400).json({ error: 'Code OTP invalide.' });
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Code OTP expire. Demandez un nouveau code.' });

  const verifiedUser = await prisma.user.update({
    where: { email },
    data: {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiresAt: null
    }
  });

  const token = jwt.sign({ id: verifiedUser.id, role: verifiedUser.role }, JWT_SECRET);
  res.json({ token, user: sanitizeUser(verifiedUser) });
};

export const resendRegistrationOtp = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
  if (user.emailVerified) return res.status(400).json({ error: 'Ce compte est deja verifie.' });

  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: {
      emailVerificationCode: otpCode,
      emailVerificationExpiresAt: otpExpiresAt
    }
  });

  await sendOtpEmail(email, user.username, otpCode);
  res.json({ success: true, message: 'Un nouveau code OTP a ete envoye.' });
};

export const sendVerificationEmail = async (req: Request & { user?: { id: string } }, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Adresse email deja verifiee.' });

  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationCode: otpCode,
      emailVerificationExpiresAt: otpExpiresAt
    }
  });

  await sendOtpEmail(user.email, user.username, otpCode);
  res.json({ success: true, message: 'OTP envoye par email.' });
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
export const getMe = async (req: Request & { user?: { id: string; role: string } }, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
};
