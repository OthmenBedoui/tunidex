import prisma from '../prisma.js';
import { notifyUser } from './notificationService.js';
import { sanitizeUser } from './adminSharedService.js';
import { HttpError } from './httpError.js';
import { buildNextCursor, resolvePagination, type PaginationQuery } from '../utils/pagination.js';

export const getUsersForAdmin = async (query: PaginationQuery & {
  role?: string;
  q?: string;
  sort?: string;
}) => {
  const { page, limit, skip } = resolvePagination(query);
  const search = typeof query.q === 'string' ? query.q.trim() : '';

  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {})
  };

  const orderBy =
    query.sort === 'oldest'
      ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
      : query.sort === 'email-asc'
        ? [{ email: 'asc' as const }, { createdAt: 'desc' as const }]
        : query.sort === 'email-desc'
          ? [{ email: 'desc' as const }, { createdAt: 'desc' as const }]
          : query.sort === 'balance-desc'
            ? [{ balance: 'desc' as const }, { createdAt: 'desc' as const }]
            : query.sort === 'balance-asc'
              ? [{ balance: 'asc' as const }, { createdAt: 'desc' as const }]
              : [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return {
    items: users.map(sanitizeUser),
    total,
    nextCursor: buildNextCursor(page, limit, total)
  };
};

export const updateAdminUserRole = async (userId: string, role: string) => {
  const user = await prisma.user.update({ where: { id: userId }, data: { role } });
  return sanitizeUser(user);
};

export const updateAdminUserBalance = async (userId: string, nextBalance: unknown) => {
  const balance = Number(nextBalance);
  if (!Number.isFinite(balance)) {
    throw new HttpError(400, 'Balance invalide');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { balance }
  });

  return sanitizeUser(user);
};

export const sendClientSystemNotification = async (payload: {
  title: unknown;
  message: unknown;
  targetUserIds: unknown;
  actorId?: string;
}) => {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const targetUserIds = Array.isArray(payload.targetUserIds)
    ? payload.targetUserIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  if (!title) throw new HttpError(400, 'Le titre de la notification est obligatoire.');
  if (!message) throw new HttpError(400, 'Le message de la notification est obligatoire.');

  const candidateUsers = targetUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { id: true }
      })
    : await prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true }
      });

  await Promise.all(candidateUsers.map((user) => notifyUser({
    userId: user.id,
    type: 'SYSTEM',
    title,
    message,
    metadata: payload.actorId ? { actorId: payload.actorId } : undefined
  })));

  return {
    success: true,
    recipients: candidateUsers.length,
    message: candidateUsers.length > 0
      ? `Notification envoyee a ${candidateUsers.length} client(s).`
      : 'Aucun client correspondant pour cette notification.'
  };
};
