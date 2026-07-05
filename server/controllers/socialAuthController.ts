import crypto from 'crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import env from '../config/env.js';
import { issueAuthSession } from '../services/authTokenService.js';
import { readSiteConfig } from '../services/siteConfigService.js';
import { readEnvValues } from '../utils/authProviders.js';

const DEFAULT_REDIRECT_PATH = '/dashboard';

type SupportedProvider = 'google' | 'apple';

type SocialProfile = {
  email: string;
  name: string;
  avatarUrl?: string;
  providerUserId: string;
};

const getBaseUrl = async (req: Request) => {
  const config = await readSiteConfig().catch(() => null);
  const canonicalUrl = typeof config?.seoCanonicalUrl === 'string' ? config.seoCanonicalUrl.trim() : '';
  const authUrl = env.authUrl.trim();
  const fromConfig = canonicalUrl || authUrl;
  if (fromConfig) return fromConfig.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

const sanitizeRedirectPath = (value: unknown) => {
  if (typeof value !== 'string') return DEFAULT_REDIRECT_PATH;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return DEFAULT_REDIRECT_PATH;
  return trimmed;
};

const signState = (provider: SupportedProvider, nextPath: string) =>
  jwt.sign({ provider, nextPath }, env.authSecret, { expiresIn: '15m' });

const verifyState = (state: string, provider: SupportedProvider) => {
  const payload = jwt.verify(state, env.authSecret) as { provider?: string; nextPath?: string };
  if (payload.provider !== provider) {
    throw new Error('Invalid OAuth state.');
  }
  return sanitizeRedirectPath(payload.nextPath);
};

const slugFromEmail = (email: string) => email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user';

const buildUniqueUsername = async (email: string, fallbackName?: string) => {
  const preferred = (fallbackName || slugFromEmail(email)).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'user';
  let candidate = preferred;
  let counter = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    counter += 1;
    candidate = `${preferred.slice(0, Math.max(1, 24 - String(counter).length - 1))}_${counter}`;
  }
  return candidate;
};

const buildCallbackRedirect = (baseUrl: string, token: string, nextPath: string) =>
  `${baseUrl}/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;

const buildErrorRedirect = (baseUrl: string, error: string) =>
  `${baseUrl}/auth/callback?error=${encodeURIComponent(error)}`;

const decodeJwtPayload = (token: string) => {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid token payload.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
};

const upsertSocialUser = async (provider: SupportedProvider, profile: SocialProfile) => {
  const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, 10);
  const generatedUsername = await buildUniqueUsername(profile.email, profile.name);

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        username: existingByEmail.username || generatedUsername,
        avatarUrl: profile.avatarUrl || existingByEmail.avatarUrl,
        fullName: existingByEmail.fullName || profile.name || null,
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null
      }
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      username: generatedUsername,
      password: passwordHash,
      role: 'USER',
      avatarUrl: profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name || profile.email)}`,
      fullName: profile.name || null,
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpiresAt: null
    }
  });
};

const ensureProviderIsEnabled = async (provider: SupportedProvider) => {
  const [siteConfig, envValues] = await Promise.all([readSiteConfig(), readEnvValues()]);
  const metadata = siteConfig.authProviders?.[provider];
  const requiredFields = provider === 'google'
    ? ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL']
    : ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'APPLE_CALLBACK_URL'];
  const configured = requiredFields.every((field) => (envValues[field] || '').trim().length > 0);

  if (!metadata?.enabled || !configured) {
    throw new Error(`${provider} authentication is not available.`);
  }

  return envValues;
};

const exchangeGoogleCode = async (code: string, envValues: Record<string, string>) => {
  const params = new URLSearchParams({
    code,
    client_id: envValues.GOOGLE_CLIENT_ID || '',
    client_secret: envValues.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: envValues.GOOGLE_CALLBACK_URL || '',
    grant_type: 'authorization_code'
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const tokenData = await tokenResponse.json() as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || 'Google token exchange failed.');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = await profileResponse.json() as { id?: string; email?: string; verified_email?: boolean; name?: string; picture?: string };

  if (!profileResponse.ok || !profile.email || profile.verified_email === false || !profile.id) {
    throw new Error('Google account email is unavailable or unverified.');
  }

  return {
    email: profile.email.toLowerCase(),
    name: profile.name || slugFromEmail(profile.email),
    avatarUrl: profile.picture,
    providerUserId: profile.id
  } satisfies SocialProfile;
};

const createAppleClientSecret = (envValues: Record<string, string>) => {
  const header = { alg: 'ES256', kid: envValues.APPLE_KEY_ID };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: envValues.APPLE_TEAM_ID,
    iat: now,
    exp: now + 60 * 60 * 24 * 180,
    aud: 'https://appleid.apple.com',
    sub: envValues.APPLE_CLIENT_ID
  };

  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signer = crypto.createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const privateKey = (envValues.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
};

const exchangeAppleCode = async (code: string, envValues: Record<string, string>) => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: envValues.APPLE_CLIENT_ID || '',
    client_secret: createAppleClientSecret(envValues),
    redirect_uri: envValues.APPLE_CALLBACK_URL || ''
  });

  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const tokenData = await tokenResponse.json() as { id_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenData.id_token) {
    throw new Error(tokenData.error || 'Apple token exchange failed.');
  }

  const payload = decodeJwtPayload(tokenData.id_token) as {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    iss?: string;
    aud?: string;
  };

  if (payload.iss !== 'https://appleid.apple.com' || payload.aud !== envValues.APPLE_CLIENT_ID) {
    throw new Error('Apple identity token audience mismatch.');
  }

  if (!payload.email || !payload.sub || String(payload.email_verified) !== 'true') {
    throw new Error('Apple account email is unavailable or unverified.');
  }

  return {
    email: payload.email.toLowerCase(),
    name: slugFromEmail(payload.email),
    providerUserId: payload.sub
  } satisfies SocialProfile;
};

export const startSocialAuth = async (req: Request, res: Response) => {
  const provider = req.params.provider as SupportedProvider;
  if (provider !== 'google' && provider !== 'apple') {
    return res.status(404).json({ error: 'Unsupported OAuth provider.' });
  }

  try {
    const envValues = await ensureProviderIsEnabled(provider);
    const baseUrl = await getBaseUrl(req);
    const nextPath = sanitizeRedirectPath(req.query.next);
    const state = signState(provider, nextPath);

    if (provider === 'google') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', envValues.GOOGLE_CLIENT_ID || '');
      authUrl.searchParams.set('redirect_uri', envValues.GOOGLE_CALLBACK_URL || '');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', envValues.GOOGLE_SCOPES || 'openid email profile');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('prompt', 'select_account');
      return res.redirect(authUrl.toString());
    }

    const authUrl = new URL('https://appleid.apple.com/auth/authorize');
    authUrl.searchParams.set('client_id', envValues.APPLE_CLIENT_ID || '');
    authUrl.searchParams.set('redirect_uri', envValues.APPLE_CALLBACK_URL || '');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', envValues.APPLE_SCOPES || 'name email');
    authUrl.searchParams.set('state', state);
    return res.redirect(authUrl.toString());
  } catch (error) {
    const baseUrl = await getBaseUrl(req);
    const message = error instanceof Error ? error.message : 'Unable to start social authentication.';
    return res.redirect(buildErrorRedirect(baseUrl, message));
  }
};

export const handleSocialAuthCallback = async (req: Request, res: Response) => {
  const provider = req.params.provider as SupportedProvider;
  if (provider !== 'google' && provider !== 'apple') {
    return res.status(404).json({ error: 'Unsupported OAuth provider.' });
  }

  const baseUrl = await getBaseUrl(req);

  try {
    const stateValue = typeof req.body?.state === 'string' ? req.body.state : typeof req.query.state === 'string' ? req.query.state : '';
    const code = typeof req.body?.code === 'string' ? req.body.code : typeof req.query.code === 'string' ? req.query.code : '';
    const providerError = typeof req.body?.error === 'string' ? req.body.error : typeof req.query.error === 'string' ? req.query.error : '';

    if (providerError) {
      throw new Error(providerError);
    }
    if (!stateValue || !code) {
      throw new Error('Missing OAuth callback data.');
    }

    const nextPath = verifyState(stateValue, provider);
    const envValues = await ensureProviderIsEnabled(provider);
    const profile = provider === 'google'
      ? await exchangeGoogleCode(code, envValues)
      : await exchangeAppleCode(code, envValues);
    const user = await upsertSocialUser(provider, profile);
    const { accessToken: token } = await issueAuthSession(req, res, { id: user.id, role: user.role });
    return res.redirect(buildCallbackRedirect(baseUrl, token, nextPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Social login failed.';
    return res.redirect(buildErrorRedirect(baseUrl, message));
  }
};
