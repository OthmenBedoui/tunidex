
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { clearRefreshTokenCookie, issueAuthSession, revokeRefreshTokenFromRequest, rotateRefreshToken } from '../services/authTokenService.js';
import { queueEmail } from '../services/emailService.js';
import { notifyStaff } from '../services/notificationService.js';
import { buildWelcomeMessage, isSupportedWhatsappBot, sendWhatsappWelcomeMessage } from '../services/whatsappBotService.js';
import logger from '../logger.js';

const OTP_EXPIRY_MINUTES = 10;

const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const logNotificationFailure = (event: string, error: unknown, details: Record<string, unknown>) => {
  logger.error({ event, ...details, err: error }, 'notification_event_failed');
};

const sanitizeUser = <T extends { password?: string }>(user: T) => {
  const result = { ...user };
  delete result.password;
  return result;
};

const sendOtpEmail = async (email: string, username: string, otpCode: string) => {
  await queueEmail({
    to: email,
    template: 'registrationOtp',
    payload: { username, otpCode, otpExpiryMinutes: OTP_EXPIRY_MINUTES }
  });
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
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalide' });
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Confirmez votre adresse email avec le code OTP avant de vous connecter.' });
  }
  const { accessToken } = await issueAuthSession(req, res, { id: user.id, role: user.role });
  const token = accessToken;
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
  const {
    email,
    password,
    username,
    fullName,
    address,
    phone,
    paymentMethod,
    whatsappNumber,
    whatsappBotId,
    whatsappOptIn
  } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser?.emailVerified) return res.status(400).json({ error: 'Email pris' });

  if (!normalizedEmail || !password || !username || !fullName || !address || !phone) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent etre remplis.' });
  }

  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedWhatsappNumber = typeof whatsappNumber === 'string' ? whatsappNumber.trim() : '';
  const normalizedWhatsappBotId = typeof whatsappBotId === 'string' ? whatsappBotId.trim() : '';
  const hasWhatsappConfig = whatsappOptIn !== undefined || normalizedWhatsappNumber || normalizedWhatsappBotId;
  const wantsWhatsappWelcome = Boolean(whatsappOptIn);

  if (hasWhatsappConfig && wantsWhatsappWelcome && !normalizedWhatsappNumber) {
    return res.status(400).json({ error: 'Le numero WhatsApp est obligatoire pour recevoir le message de bienvenue.' });
  }

  if (hasWhatsappConfig && wantsWhatsappWelcome && !isSupportedWhatsappBot(normalizedWhatsappBotId)) {
    return res.status(400).json({ error: 'Bot WhatsApp invalide.' });
  }

  if (existingUser && !existingUser.emailVerified) {
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        username: username.trim(),
        password: passwordHash,
        fullName: fullName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        paymentMethod: paymentMethod || null,
        whatsappNumber: normalizedWhatsappNumber || null,
        whatsappBotId: normalizedWhatsappBotId || null,
        whatsappOptIn: wantsWhatsappWelcome,
        whatsappWelcomeStatus: hasWhatsappConfig && wantsWhatsappWelcome ? 'PENDING' : 'NOT_REQUESTED',
        whatsappWelcomeSentAt: null,
        whatsappWelcomeError: null,
        emailVerificationCode: otpCode,
        emailVerificationExpiresAt: otpExpiresAt,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      }
    });
  } else {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        username: username.trim(),
        role: 'USER',
        fullName: fullName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        paymentMethod: paymentMethod || null,
        whatsappNumber: normalizedWhatsappNumber || null,
        whatsappBotId: normalizedWhatsappBotId || null,
        whatsappOptIn: wantsWhatsappWelcome,
        whatsappWelcomeStatus: hasWhatsappConfig && wantsWhatsappWelcome ? 'PENDING' : 'NOT_REQUESTED',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        emailVerified: false,
        emailVerificationCode: otpCode,
        emailVerificationExpiresAt: otpExpiresAt
      }
    });
  }

  await sendOtpEmail(normalizedEmail, username, otpCode);
  res.json({ verificationRequired: true, email: normalizedEmail, message: 'Un code OTP a ete envoye par email.' });
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

  try {
    await notifyStaff({
      type: 'USER_REGISTERED',
      title: 'Nouvel utilisateur verifie',
      message: `Le compte ${verifiedUser.username} (${verifiedUser.email}) vient d'etre verifie.`,
      metadata: {
        userId: verifiedUser.id,
        email: verifiedUser.email,
        username: verifiedUser.username
      },
      dedupeKey: `USER_REGISTERED:${verifiedUser.id}`,
      targetTab: 'users'
    });
  } catch (error) {
    logNotificationFailure('USER_REGISTERED', error, { userId: verifiedUser.id });
  }

  const { accessToken } = await issueAuthSession(req, res, { id: verifiedUser.id, role: verifiedUser.role });
  const token = accessToken;
  res.json({ token, user: sanitizeUser(verifiedUser) });
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const { accessToken, user } = await rotateRefreshToken(req, res);
    res.json({ token: accessToken, user: sanitizeUser(user) });
  } catch (error) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unable to refresh session.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  await revokeRefreshTokenFromRequest(req, res);
  res.status(204).send();
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

export const updateProfile = async (req: Request & { user?: { id: string } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No token' });

  const { username, avatarUrl, password, fullName, address, phone, paymentMethod, whatsappNumber } = req.body;
  const data: {
    username?: string;
    avatarUrl?: string;
    password?: string;
    fullName?: string | null;
    address?: string | null;
    phone?: string | null;
    paymentMethod?: string | null;
    whatsappNumber?: string | null;
  } = {};

  if (typeof username === 'string' && username.trim()) data.username = username.trim();
  if (typeof avatarUrl === 'string') data.avatarUrl = avatarUrl;
  if (typeof password === 'string' && password.length > 0) data.password = await bcrypt.hash(password, 10);
  if (typeof fullName === 'string') data.fullName = fullName.trim() || null;
  if (typeof address === 'string') data.address = address.trim() || null;
  if (typeof phone === 'string') data.phone = phone.trim() || null;
  if (typeof paymentMethod === 'string') data.paymentMethod = paymentMethod.trim() || null;
  if (typeof whatsappNumber === 'string') data.whatsappNumber = whatsappNumber.trim() || null;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data
  });

  res.json(sanitizeUser(updatedUser));
};

export const updateSubscription = async (req: Request & { user?: { id: string } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No token' });

  const { tier, fullName, address, phone, paymentMethod, whatsappNumber, whatsappBotId, whatsappOptIn } = req.body;
  const normalizedWhatsappNumber = typeof whatsappNumber === 'string' ? whatsappNumber.trim() : '';
  const normalizedWhatsappBotId = typeof whatsappBotId === 'string' ? whatsappBotId.trim() : '';
  const hasWhatsappConfig = whatsappOptIn !== undefined || normalizedWhatsappNumber || normalizedWhatsappBotId;
  const wantsWhatsappWelcome = Boolean(whatsappOptIn);

  if (hasWhatsappConfig && wantsWhatsappWelcome && !normalizedWhatsappNumber) {
    return res.status(400).json({ error: 'Le numero WhatsApp est obligatoire pour recevoir le message de bienvenue.' });
  }

  if (hasWhatsappConfig && wantsWhatsappWelcome && !isSupportedWhatsappBot(normalizedWhatsappBotId)) {
    return res.status(400).json({ error: 'Bot WhatsApp invalide.' });
  }

  let whatsappWelcomeStatus = wantsWhatsappWelcome ? 'PENDING' : 'NOT_REQUESTED';
  let whatsappWelcomeError: string | null = null;
  let whatsappWelcomeSentAt: Date | null = null;

  if (hasWhatsappConfig && wantsWhatsappWelcome) {
    try {
      const welcomeMessage = buildWelcomeMessage(fullName, tier);
      const result = await sendWhatsappWelcomeMessage({
        botId: normalizedWhatsappBotId,
        phone: normalizedWhatsappNumber,
        fullName,
        tier,
        message: welcomeMessage
      });

      whatsappWelcomeStatus = result.status;
      whatsappWelcomeError = result.error;
      whatsappWelcomeSentAt = result.status === 'SENT' ? new Date() : null;
    } catch (error) {
      whatsappWelcomeStatus = 'FAILED';
      whatsappWelcomeError = error instanceof Error ? error.message : 'Erreur inconnue lors de l envoi WhatsApp.';
    }
  }

  const subscriptionData: {
    subscriptionTier: string;
    fullName: string | null;
    address: string | null;
    phone: string | null;
    paymentMethod: string | null;
    whatsappNumber?: string | null;
    whatsappBotId?: string | null;
    whatsappOptIn?: boolean;
    whatsappWelcomeStatus?: string;
    whatsappWelcomeSentAt?: Date | null;
    whatsappWelcomeError?: string | null;
  } = {
    subscriptionTier: tier || 'Free',
    fullName: fullName || null,
    address: address || null,
    phone: phone || null,
    paymentMethod: paymentMethod || null
  };

  if (hasWhatsappConfig) {
    subscriptionData.whatsappNumber = normalizedWhatsappNumber || null;
    subscriptionData.whatsappBotId = normalizedWhatsappBotId || null;
    subscriptionData.whatsappOptIn = wantsWhatsappWelcome;
    subscriptionData.whatsappWelcomeStatus = whatsappWelcomeStatus;
    subscriptionData.whatsappWelcomeSentAt = whatsappWelcomeSentAt;
    subscriptionData.whatsappWelcomeError = whatsappWelcomeError;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: subscriptionData
  });

  res.json(sanitizeUser(updatedUser));
};

export const requestEmailChange = async (req: Request & { user?: { id: string } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No token' });

  const newEmail = typeof req.body.newEmail === 'string' ? req.body.newEmail.trim().toLowerCase() : '';
  if (!newEmail) return res.status(400).json({ error: 'Nouvelle adresse email obligatoire.' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (newEmail === user.email.toLowerCase()) return res.status(400).json({ error: 'Cette adresse email est déjà liée à votre compte.' });

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) return res.status(400).json({ error: 'Cette adresse email est déjà utilisée.' });

  const otpCode = generateOtpCode();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationCode: otpCode,
      emailVerificationExpiresAt: otpExpiresAt
    }
  });

  await sendOtpEmail(newEmail, user.username, otpCode);
  res.json({ success: true, message: 'Code de confirmation envoyé au nouveau email.' });
};

export const confirmEmailChange = async (req: Request & { user?: { id: string } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No token' });

  const newEmail = typeof req.body.newEmail === 'string' ? req.body.newEmail.trim().toLowerCase() : '';
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
  if (!newEmail || !otp) return res.status(400).json({ error: 'Email et code OTP obligatoires.' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.emailVerificationCode || user.emailVerificationCode !== otp) return res.status(400).json({ error: 'Code OTP invalide.' });
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) return res.status(400).json({ error: 'Code OTP expiré. Demandez un nouveau code.' });

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) return res.status(400).json({ error: 'Cette adresse email est déjà utilisée.' });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      email: newEmail,
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiresAt: null
    }
  });

  res.json(sanitizeUser(updatedUser));
};

export const deleteAccount = async (req: Request & { user?: { id: string } }, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No token' });

  const { confirmation } = req.body as { confirmation?: string };
  if (confirmation !== 'SUPPRIMER') {
    return res.status(400).json({ error: 'Veuillez saisir SUPPRIMER pour confirmer la suppression du compte.' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (['ADMIN', 'AGENT'].includes(user.role)) {
    return res.status(403).json({ error: 'La suppression des comptes staff doit être effectuée par un administrateur.' });
  }

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({ where: { userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.delete({ where: { id: cart.id } });
    }

    await tx.order.updateMany({
      where: { userId },
      data: { userId: null, source: 'DELETED_ACCOUNT' }
    });
    await tx.payment.updateMany({ where: { userId }, data: { userId: null } });
    await tx.siteVisit.updateMany({ where: { userId }, data: { userId: null } });
    await tx.loyaltyPoint.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  res.json({ success: true });
};
