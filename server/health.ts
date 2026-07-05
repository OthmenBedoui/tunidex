import prisma from './prisma.js';

export const getHealthStatus = async () => {
  await prisma.$queryRawUnsafe('SELECT 1');

  return {
    status: 'ok',
    uptime: process.uptime(),
    db: 'ok'
  } as const;
};
