
import express from 'express';
import { getStats, getAllUsers, updateUserRole } from '../controllers/adminController.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin/stats', authenticate, isStaff, getStats);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.patch('/users/:id/role', authenticate, isAdmin, updateUserRole);

export default router;
