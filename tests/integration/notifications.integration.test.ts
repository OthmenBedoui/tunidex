import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadNotificationTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Notifications integration', () => {
  let prisma: Awaited<ReturnType<typeof loadPrisma>>;
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let signAccessToken: Awaited<ReturnType<typeof loadAuthTools>>['signAccessToken'];
  let notifyUser: Awaited<ReturnType<typeof loadNotificationTools>>['notifyUser'];

  beforeAll(async () => {
    resetTestDatabase();
    prisma = await loadPrisma();
    app = await createTestApp();
    ({ signAccessToken } = await loadAuthTools());
    ({ notifyUser } = await loadNotificationTools());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cree, scope et persiste la lecture des notifications par utilisateur', async () => {
    const firstUser = await createUser(prisma, {
      email: 'notif-1@test.tn',
      username: 'notif-1',
    });
    const secondUser = await createUser(prisma, {
      email: 'notif-2@test.tn',
      username: 'notif-2',
    });

    await notifyUser({
      userId: firstUser.id,
      type: 'SYSTEM',
      title: 'Notification 1',
      message: 'Visible pour le premier utilisateur',
      dedupeKey: `notif-${firstUser.id}`,
    });
    await notifyUser({
      userId: secondUser.id,
      type: 'SYSTEM',
      title: 'Notification 2',
      message: 'Visible pour le second utilisateur',
      dedupeKey: `notif-${secondUser.id}`,
    });

    const firstUserToken = signAccessToken({ id: firstUser.id, role: firstUser.role });
    const secondUserToken = signAccessToken({ id: secondUser.id, role: secondUser.role });

    const firstUserNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${firstUserToken}`);
    expect(firstUserNotifications.status).toBe(200);
    expect(firstUserNotifications.body).toHaveLength(1);
    expect(firstUserNotifications.body[0].message).toContain('premier utilisateur');

    const secondUserNotifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${secondUserToken}`);
    expect(secondUserNotifications.status).toBe(200);
    expect(secondUserNotifications.body).toHaveLength(1);
    expect(secondUserNotifications.body[0].message).toContain('second utilisateur');

    const firstNotificationId = firstUserNotifications.body[0].id;

    const forbiddenRead = await request(app)
      .patch(`/api/notifications/${firstNotificationId}/read`)
      .set('Authorization', `Bearer ${secondUserToken}`);
    expect(forbiddenRead.status).toBe(404);

    const unreadBefore = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${firstUserToken}`);
    expect(unreadBefore.body.count).toBe(1);

    const markReadResponse = await request(app)
      .patch(`/api/notifications/${firstNotificationId}/read`)
      .set('Authorization', `Bearer ${firstUserToken}`);

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.read).toBe(true);
    expect(markReadResponse.body.readAt).toEqual(expect.any(String));

    const persistedNotification = await prisma.notification.findUniqueOrThrow({
      where: { id: firstNotificationId },
    });
    expect(persistedNotification.readAt).not.toBeNull();

    const unreadAfter = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${firstUserToken}`);
    expect(unreadAfter.body.count).toBe(0);
  });
});
