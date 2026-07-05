import { Request, Response } from 'express';
import { createAdminCoupon, deleteAdminCoupon, getAdminCoupons, updateAdminCoupon } from '../services/couponService.js';

export const getCoupons = async (_req: Request, res: Response) => {
  const coupons = await getAdminCoupons();
  res.json(coupons);
};

export const createCoupon = async (req: Request, res: Response) => {
  const coupon = await createAdminCoupon(req.body);
  res.status(201).json(coupon);
};

export const updateCoupon = async (req: Request, res: Response) => {
  const coupon = await updateAdminCoupon(req.params.id, req.body);
  res.json(coupon);
};

export const deleteCoupon = async (req: Request, res: Response) => {
  const result = await deleteAdminCoupon(req.params.id);
  res.json(result);
};
