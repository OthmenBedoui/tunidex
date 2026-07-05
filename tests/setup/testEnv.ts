import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';

if (!databaseUrl) {
  throw new Error('DATABASE_URL_TEST (ou DATABASE_URL) est obligatoire pour lancer les tests.');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_TEST = databaseUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'abcdefghijklmnopqrstuvwxyz123456';
process.env.AUTH_URL = process.env.AUTH_URL || 'http://127.0.0.1:3000';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3000,http://localhost:3000';
