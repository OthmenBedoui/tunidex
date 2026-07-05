import { PrismaClient } from '@prisma/client';
import env from './config/env.js';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: []
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
