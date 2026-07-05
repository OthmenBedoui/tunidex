import type { Request, Response } from 'express';
import { assertNoInlineImagesInSiteConfig, readSiteConfig, writeSiteConfig } from '../services/siteConfigService.js';
import logger from '../logger.js';

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get site configuration
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Site configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteConfig'
 */
export const getSiteConfig = async (_req: Request, res: Response) => {
  logger.debug('site_config_read');
  res.json(await readSiteConfig());
};

/**
 * @swagger
 * /api/config:
 *   patch:
 *     summary: Update site configuration
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SiteConfig'
 *     responses:
 *       200:
 *         description: Site configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteConfig'
 */
export const updateSiteConfig = async (req: Request, res: Response) => {
  logger.info({
    keys: Object.keys(req.body || {}),
    siteName: req.body.siteName || ''
  }, 'site_config_update_requested');

  const currentConfig = await readSiteConfig();
  assertNoInlineImagesInSiteConfig(req.body || {});
  const nextConfig = {
    ...currentConfig,
    ...req.body,
    click2payEnabled: Boolean(req.body.click2payEnabled ?? currentConfig.click2payEnabled)
  };

  await writeSiteConfig(nextConfig);
  logger.info({ siteName: nextConfig.siteName }, 'site_config_updated');
  res.json(nextConfig);
};
