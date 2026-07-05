import crypto from 'crypto';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import env from '../config/env.js';

const ACCESS_TOKEN_TTL = '2h';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_COOKIE = 'tunibots_refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

type AccessTokenPayload = {
  id: string;
  role: string;
};

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProduction,
  path: REFRESH_TOKEN_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_MS
});

const hashRefreshToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createRefreshTokenValue = () => crypto.randomBytes(48).toString('base64url');

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const getRequestMetadata = (req: Request) => ({
  userAgent: req.get('user-agent') || null,
  ipAddress: req.ip || null
});

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE, token, buildCookieOptions());
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, buildCookieOptions());
};

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.jwtSecret) as AccessTokenPayload;

export const issueAuthSession = async (
  req: Request,
  res: Response,
  payload: AccessTokenPayload
) => {
  const refreshToken = createRefreshTokenValue();
  const metadata = getRequestMetadata(req);

  await prisma.refreshToken.create({
    data: {
      userId: payload.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress
    }
  });

  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken: signAccessToken(payload)
  };
};

export const revokeRefreshTokenFromRequest = async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE];

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  clearRefreshTokenCookie(res);
};

export const rotateRefreshToken = async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE];

  if (!refreshToken) {
    clearRefreshTokenCookie(res);
    throw new Error('Refresh token missing.');
  }

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: true }
  });

  if (!existing || existing.revokedAt || existing.expiresAt.getTime() <= Date.now()) {
    if (existing && !existing.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() }
      });
    }
    clearRefreshTokenCookie(res);
    throw new Error('Refresh token invalid or expired.');
  }

  const nextRefreshToken = createRefreshTokenValue();
  const metadata = getRequestMetadata(req);

  const nextRecord = await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashRefreshToken(nextRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress
      }
    });

    await tx.refreshToken.update({
      where: { id: existing.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: created.id
      }
    });

    return created;
  });

  void nextRecord;
  setRefreshTokenCookie(res, nextRefreshToken);

  return {
    accessToken: signAccessToken({ id: existing.user.id, role: existing.user.role }),
    user: existing.user
  };
};
