import type { Response } from 'express';
import {
  approveAdminOrderPayment,
  createAdminOrderDelivery,
  getAdminOrders,
  rejectAdminOrderPayment,
  resendAdminOrderDeliveryEmail,
  resendAdminOrderInvoiceEmail,
  sendAdminOrderDelivery,
  updateAdminOrderStatus
} from '../services/adminOrderService.js';
import type { AdminRequest } from '../services/adminSharedService.js';

/**
 * @swagger
 * /api/orders/admin:
 *   get:
 *     summary: Get paginated admin orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, amount-desc, amount-asc]
 *     responses:
 *       200:
 *         description: Paginated orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOrdersResponse'
 */
export const getAllOrders = async (req: AdminRequest, res: Response) => {
  res.json(await getAdminOrders(req.query));
};

export const updateOrderStatus = async (req: AdminRequest, res: Response) => {
  res.json(await updateAdminOrderStatus(req.params.id, req.body.status, req));
};

export const approveOrderPayment = async (req: AdminRequest, res: Response) => {
  res.json(await approveAdminOrderPayment(req.params.id, req));
};

export const rejectOrderPayment = async (req: AdminRequest, res: Response) => {
  res.json(await rejectAdminOrderPayment(req.params.id, req.body.reason, req));
};

export const createOrderDelivery = async (req: AdminRequest, res: Response) => {
  res.status(201).json(await createAdminOrderDelivery(req.params.id, req.body || {}, req));
};

export const sendOrderDelivery = async (req: AdminRequest, res: Response) => {
  res.json(await sendAdminOrderDelivery(req.params.id, req));
};

export const resendOrderInvoiceEmail = async (req: AdminRequest, res: Response) => {
  res.json(await resendAdminOrderInvoiceEmail(req.params.id, req));
};

export const resendOrderDeliveryEmail = async (req: AdminRequest, res: Response) => {
  res.json(await resendAdminOrderDeliveryEmail(req.params.id, req));
};
