import express from 'express';
import { getStats } from '../../controllers/statsController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';

const router = express.Router();

router.get('/admin/stats', authenticate, isStaff, getStats);

export default router;
