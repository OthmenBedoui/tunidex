import express from 'express';
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../../controllers/couponAdminController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';
import { couponBodySchema, couponIdParamsSchema } from '../../validation/adminSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/coupons', authenticate, isStaff, getCoupons);
router.post('/admin/coupons', authenticate, isStaff, validate({ body: couponBodySchema }), createCoupon);
router.patch('/admin/coupons/:id', authenticate, isStaff, validate({ params: couponIdParamsSchema, body: couponBodySchema }), updateCoupon);
router.delete('/admin/coupons/:id', authenticate, isStaff, validate({ params: couponIdParamsSchema }), deleteCoupon);

export default router;
