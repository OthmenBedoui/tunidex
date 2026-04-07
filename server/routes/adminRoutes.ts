
import express from 'express';
import { getStats, getAllUsers, getAllOrders, getSiteConfig, updateSiteConfig, updateUserRole, updateOrderStatus } from '../controllers/adminController.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin/stats', authenticate, isStaff, getStats);
router.get('/orders/admin', authenticate, isStaff, getAllOrders);
router.patch('/orders/:id/status', authenticate, isStaff, updateOrderStatus);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.patch('/users/:id/role', authenticate, isAdmin, updateUserRole);
router.get('/config', getSiteConfig);
router.patch('/config', authenticate, isAdmin, updateSiteConfig);

export default router;
