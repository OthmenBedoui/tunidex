import type { Response } from 'express';
import { getMyLoyaltySummary } from '../services/loyaltyService.js';

type AuthRequest = {
  user?: {
    id: string;
  };
};

export const getMyLoyalty = async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  res.json(await getMyLoyaltySummary(req.user.id));
};
