import express from 'express';
import { getAllUsers, sendClientNotification, updateUserBalance, updateUserRole } from '../../controllers/userAdminController.js';
import { authenticate, isAdmin } from '../../middleware/auth.js';
import { sendClientNotificationBodySchema, updateUserBalanceBodySchema, updateUserBalanceParamsSchema, updateUserRoleBodySchema, updateUserRoleParamsSchema } from '../../validation/adminSchemas.js';
import { adminUsersQuerySchema } from '../../validation/listSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/users', authenticate, isAdmin, validate({ query: adminUsersQuerySchema }), getAllUsers);
router.patch('/users/:id/role', authenticate, isAdmin, validate({ params: updateUserRoleParamsSchema, body: updateUserRoleBodySchema }), updateUserRole);
router.patch('/users/:id/balance', authenticate, isAdmin, validate({ params: updateUserBalanceParamsSchema, body: updateUserBalanceBodySchema }), updateUserBalance);
router.post('/admin/notifications/clients', authenticate, isAdmin, validate({ body: sendClientNotificationBodySchema }), sendClientNotification);

export default router;
