import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';

describe('Auth integration', () => {
  let prisma: Awaited<ReturnType<typeof loadPrisma>>;
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    resetTestDatabase();
    prisma = await loadPrisma();
    app = await createTestApp();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('gere register, verification OTP, login et refresh', async () => {
    const client = request.agent(app);
    const email = `auth-${crypto.randomUUID()}@test.tn`;
    const password = 'ChangeMe123!';

    const registerResponse = await client
      .post('/api/auth/register')
      .send({
        email,
        password,
        username: 'auth-user',
        fullName: 'Auth User',
        address: 'Rue Auth',
        phone: '+21611111111',
      });

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body.verificationRequired).toBe(true);

    const pendingUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(pendingUser.emailVerified).toBe(false);
    expect(pendingUser.emailVerificationCode).toMatch(/^\d{6}$/);

    const verifyResponse = await client
      .post('/api/auth/register/verify-otp')
      .send({ email, otp: pendingUser.emailVerificationCode });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.token).toEqual(expect.any(String));
    expect(verifyResponse.headers['set-cookie']).toBeTruthy();

    const verifiedUser = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(verifiedUser.emailVerified).toBe(true);

    const wrongPasswordResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.11')
      .send({ email, password: 'BadPassword123!' });

    expect(wrongPasswordResponse.status).toBe(400);
    expect(wrongPasswordResponse.body.error).toBe('Invalide');

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.12')
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.email).toBe(email);
    expect(loginResponse.headers['set-cookie']).toBeTruthy();

    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', loginResponse.headers['set-cookie']);

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.token).toEqual(expect.any(String));
    expect(refreshResponse.body.user.email).toBe(email);
    expect(refreshResponse.headers['set-cookie']).toBeTruthy();
  });

  it('applique le rate limit sur les endpoints auth', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({
          email: 'nobody@test.tn',
          password: 'ChangeMe123!',
        });

      expect(response.status).toBe(400);
    }

    const limitedResponse = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({
        email: 'nobody@test.tn',
        password: 'ChangeMe123!',
      });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error).toContain('Too many authentication attempts');
  });
});
