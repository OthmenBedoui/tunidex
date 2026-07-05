import type { Request, Response } from 'express';
import { listFailedOutboxEmails, resendFailedOutboxEmail, sendAdminTestEmail } from '../services/adminEmailService.js';

export const sendTestEmail = async (req: Request, res: Response) => {
  res.json(await sendAdminTestEmail(req.body?.to));
};

export const getFailedEmails = async (_req: Request, res: Response) => {
  res.json(await listFailedOutboxEmails());
};

export const retryFailedEmail = async (req: Request, res: Response) => {
  res.json(await resendFailedOutboxEmail(req.params.id));
};
