export const ROLES = ['GUEST', 'USER', 'AGENT', 'ADMIN'] as const;

export type Role = typeof ROLES[number];

export const STAFF_ROLES: Role[] = ['AGENT', 'ADMIN'];

export const ADMIN_ROLES: Role[] = ['ADMIN'];

export const isRole = (value: unknown): value is Role => {
  return typeof value === 'string' && ROLES.includes(value as Role);
};

export const isStaffRole = (value: unknown): value is Role => {
  return typeof value === 'string' && STAFF_ROLES.includes(value as Role);
};
