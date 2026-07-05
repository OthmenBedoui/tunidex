import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'tests', 'tmp', 'uploads');

if (!databaseUrl) {
  console.error('DATABASE_URL_TEST est requise pour executer npm test.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = process.argv.slice(2);
const vitestArgs =
  args.length === 0
    ? ['vitest', 'run']
    : args[0] === 'vitest'
      ? args
      : ['vitest', ...args];

const result = spawnSync(command, vitestArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    DATABASE_URL_TEST: databaseUrl,
    JWT_SECRET: process.env.JWT_SECRET || '12345678901234567890123456789012',
    AUTH_SECRET: process.env.AUTH_SECRET || 'abcdefghijklmnopqrstuvwxyz123456',
    AUTH_URL: process.env.AUTH_URL || 'http://127.0.0.1:3000',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000',
    UPLOADS_DIR: uploadsDir
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
