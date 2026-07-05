import type { Request } from 'express';

export type AdminRequest = Request & {
  user?: {
    id?: string;
    role?: string;
  };
};

export const sanitizeUser = <T extends { password?: string }>(user: T) => {
  const result = { ...user };
  delete result.password;
  return result;
};

export const requestMeta = (req: Request) => ({
  ipAddress: (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || req.socket.remoteAddress || '').trim(),
  userAgent: req.headers['user-agent'] || ''
});

export const getActor = (req: AdminRequest) => ({
  actorType: req.user?.role === 'ADMIN' ? 'ADMIN' : 'AGENT',
  actorId: req.user?.id || null
});

export const serializeAdminOrder = (order: any) => ({
  ...order,
  buyerId: order.userId || order.id,
  buyer: order.user,
  buyerDisplayName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
  deliveries: (order.deliveries || []).map(({ deliveryContentEncrypted, ...delivery }: any) => delivery)
});
