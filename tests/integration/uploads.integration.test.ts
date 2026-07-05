import { existsSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCategory, createListing, createUser } from '../helpers/fixtures.js';
import { createTestApp, loadAuthTools, loadPrisma, resetTestDatabase } from '../helpers/testRuntime.js';
import { migrateInlineImagesInDatabase } from '../../server/services/imageMigrationService.js';
import { readSiteConfig, writeSiteConfig } from '../../server/services/siteConfigService.js';

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5WfXQAAAAASUVORK5CYII=';
const tinyPngDataUrl = `data:image/png;base64,${tinyPngBase64}`;
const tinyPngBuffer = Buffer.from(tinyPngBase64, 'base64');

describe('Uploads and inline-image migration', () => {
  let prisma: Awaited<ReturnType<typeof loadPrisma>>;
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let signAccessToken: Awaited<ReturnType<typeof loadAuthTools>>['signAccessToken'];

  beforeAll(async () => {
    resetTestDatabase();
    prisma = await loadPrisma();
    app = await createTestApp();
    ({ signAccessToken } = await loadAuthTools());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('upload un fichier image optimisé et le sert publiquement', async () => {
    const admin = await createUser(prisma, {
      email: 'upload-admin@test.tn',
      username: 'upload-admin',
      role: 'ADMIN'
    });
    const adminToken = signAccessToken({ id: admin.id, role: admin.role });

    const response = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', tinyPngBuffer, {
        filename: 'tiny.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/^\/uploads\/.+\.webp$/);
    expect(response.body.contentType).toBe('image/webp');

    const served = await request(app).get(response.body.url);
    expect(served.status).toBe(200);
    expect(served.headers['cache-control']).toContain('immutable');
    expect(served.headers['content-type']).toContain('image/webp');
  });

  it('migre les images inline historiques vers /uploads', async () => {
    const category = await createCategory(prisma, 'Base64 Category');
    const listing = await createListing(prisma, category.id, {
      title: 'Base64 Listing',
      slug: 'base64-listing',
      imageUrl: tinyPngDataUrl
    });

    await prisma.category.update({
      where: { id: category.id },
      data: {
        imageUrl: tinyPngDataUrl
      }
    });

    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        logoUrl: tinyPngDataUrl,
        gallery: JSON.stringify([tinyPngDataUrl])
      }
    });

    const currentConfig = await readSiteConfig();
    await writeSiteConfig({
      ...currentConfig,
      logoUrl: tinyPngDataUrl,
      faviconUrl: tinyPngDataUrl,
      heroSlides: [{
        id: 'hero-1',
        imageUrl: tinyPngDataUrl,
        title: 'Hero'
      }]
    });

    const summary = await migrateInlineImagesInDatabase();
    expect(summary.listingsUpdated).toBeGreaterThan(0);
    expect(summary.categoriesUpdated).toBeGreaterThan(0);
    expect(summary.siteConfigFieldsUpdated).toBeGreaterThan(0);

    const migratedListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    const migratedCategory = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    const migratedConfig = await readSiteConfig();

    expect(migratedListing.imageUrl).toMatch(/^\/uploads\/.+\.webp$/);
    expect(migratedListing.logoUrl).toMatch(/^\/uploads\/.+\.webp$/);
    expect(JSON.parse(migratedListing.gallery)[0]).toMatch(/^\/uploads\/.+\.webp$/);
    expect(migratedCategory.imageUrl).toMatch(/^\/uploads\/.+\.webp$/);
    expect(migratedConfig.logoUrl).toMatch(/^\/uploads\/.+\.webp$/);
    expect(migratedConfig.faviconUrl).toMatch(/^\/uploads\/.+\.webp$/);
    expect((migratedConfig.heroSlides[0] as { imageUrl: string }).imageUrl).toMatch(/^\/uploads\/.+\.webp$/);

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'tests', 'tmp', 'uploads');
    expect(existsSync(uploadsDir)).toBe(true);
  });
});
