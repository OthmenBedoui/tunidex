import express from 'express';
import {
  approveOrderPayment,
  createOrderDelivery,
  getAllOrders,
  rejectOrderPayment,
  resendOrderDeliveryEmail,
  resendOrderInvoiceEmail,
  sendOrderDelivery,
  updateOrderStatus
} from '../../controllers/orderAdminController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';
import { createOrderDeliveryBodySchema, orderIdParamsSchema, rejectOrderPaymentBodySchema, updateOrderStatusBodySchema } from '../../validation/adminSchemas.js';
import { adminOrdersQuerySchema } from '../../validation/listSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/orders/admin', authenticate, isStaff, validate({ query: adminOrdersQuerySchema }), getAllOrders);
router.patch('/orders/:id/status', authenticate, isStaff, validate({ params: orderIdParamsSchema, body: updateOrderStatusBodySchema }), updateOrderStatus);
router.post('/orders/:id/email/resend', authenticate, isStaff, validate({ params: orderIdParamsSchema }), resendOrderInvoiceEmail);
router.post('/admin/orders/:id/payment/approve', authenticate, isStaff, validate({ params: orderIdParamsSchema }), approveOrderPayment);
router.post('/admin/orders/:id/payment/reject', authenticate, isStaff, validate({ params: orderIdParamsSchema, body: rejectOrderPaymentBodySchema }), rejectOrderPayment);
router.post('/admin/orders/:id/delivery', authenticate, isStaff, validate({ params: orderIdParamsSchema, body: createOrderDeliveryBodySchema }), createOrderDelivery);
router.post('/admin/orders/:id/delivery/send', authenticate, isStaff, validate({ params: orderIdParamsSchema }), sendOrderDelivery);
router.post('/admin/orders/:id/emails/resend-invoice', authenticate, isStaff, validate({ params: orderIdParamsSchema }), resendOrderInvoiceEmail);
router.post('/admin/orders/:id/emails/resend-delivery', authenticate, isStaff, validate({ params: orderIdParamsSchema }), resendOrderDeliveryEmail);

export default router;
