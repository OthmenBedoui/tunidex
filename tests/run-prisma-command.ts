import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL_TEST est requise pour executer les commandes Prisma de test.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Aucune commande Prisma fournie.');
  process.exit(1);
}

const result = spawnSync(command, ['prisma', ...args], {
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
  },
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
