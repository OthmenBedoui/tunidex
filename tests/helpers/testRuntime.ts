import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const defaultUploadsDir = path.join(process.cwd(), 'tests', 'tmp', 'uploads');

export const getTestEnv = () => {
  const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST est obligatoire pour les tests.');
  }

  return {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    DATABASE_URL_TEST: databaseUrl,
    JWT_SECRET: process.env.JWT_SECRET || '12345678901234567890123456789012',
    AUTH_SECRET: process.env.AUTH_SECRET || 'abcdefghijklmnopqrstuvwxyz123456',
    AUTH_URL: process.env.AUTH_URL || 'http://127.0.0.1:3000',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000',
    UPLOADS_DIR: process.env.UPLOADS_DIR || defaultUploadsDir
  };
};

export const resetTestDatabase = () => {
  rmSync(defaultUploadsDir, { recursive: true, force: true });
  execFileSync(
    prismaCommand,
    ['prisma', 'migrate', 'reset', '--force', '--skip-seed', '--schema', 'server/schema.prisma'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: getTestEnv(),
    }
  );
};

export const loadPrisma = async (): Promise<PrismaClient> => {
  const module = await import('../../server/prisma.js');
  return module.default;
};

export const createTestApp = async () => {
  const { createApp } = await import('../../server/app.js');
  return createApp();
};

export const loadAuthTools = async () => {
  return import('../../server/services/authTokenService.js');
};

export const loadNotificationTools = async () => {
  return import('../../server/services/notificationService.js');
};

export const hashPassword = async (password = 'ChangeMe123!') => bcrypt.hash(password, 10);
