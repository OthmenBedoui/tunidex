
import express from 'express';
import accountRoutes from './admin/accountRoutes.js';
import blogRoutes from './admin/blogRoutes.js';
import couponRoutes from './admin/couponRoutes.js';
import authProvidersRoutes from './admin/authProvidersRoutes.js';
import configRoutes from './admin/configRoutes.js';
import dataRoutes from './admin/dataRoutes.js';
import emailRoutes from './admin/emailRoutes.js';
import ordersRoutes from './admin/ordersRoutes.js';
import seoRoutes from './admin/seoRoutes.js';
import statsRoutes from './admin/statsRoutes.js';
import uploadRoutes from './admin/uploadRoutes.js';
import usersRoutes from './admin/usersRoutes.js';
import reviewsRoutes from './admin/reviewsRoutes.js';

const router = express.Router();

router.use(statsRoutes);
router.use(seoRoutes);
router.use(ordersRoutes);
router.use(reviewsRoutes);
router.use(blogRoutes);
router.use(couponRoutes);
router.use(accountRoutes);
router.use(usersRoutes);
router.use(configRoutes);
router.use(uploadRoutes);
router.use(authProvidersRoutes);
router.use(emailRoutes);
router.use(dataRoutes);

export default router;
