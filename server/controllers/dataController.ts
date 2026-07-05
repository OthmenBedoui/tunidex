import type { Request, Response } from 'express';
import { cleanAdminSiteData, exportAdminSiteData, importAdminSiteData } from '../services/adminDataService.js';

export const exportSiteData = async (_req: Request, res: Response) => {
  const buffer = await exportAdminSiteData();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="tunibots-data-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(Buffer.from(buffer));
};

export const importSiteData = async (req: Request, res: Response) => {
  res.json(await importAdminSiteData(req.body.fileBase64));
};

export const cleanSiteData = async (req: Request, res: Response) => {
  res.json(await cleanAdminSiteData({
    table: req.body.table,
    confirmation: req.body.confirmation
  }));
};
