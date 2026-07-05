
import express from 'express';
import multer from 'multer';
import { getCart, addToCart, removeFromCart, checkout, guestCheckout, getMyOrders, confirmCheckout, trackOrder, getOrderDelivery, downloadOrderInvoicePdf, submitOrderPaymentProof, validateCheckoutCoupon } from '../controllers/cartController.js';
import { uploadPaymentProofImage } from '../controllers/uploadController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { addToCartBodySchema, cartItemParamsSchema, checkoutBodySchema, confirmCheckoutBodySchema, guestCheckoutBodySchema, submitPaymentProofBodySchema, validateCouponBodySchema } from '../validation/cartSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

router.post('/checkout/guest', validate({ body: guestCheckoutBodySchema }), guestCheckout);
router.post('/checkout/confirm', optionalAuthenticate, validate({ body: confirmCheckoutBodySchema }), confirmCheckout);
router.post('/checkout/coupon/validate', validate({ body: validateCouponBodySchema }), validateCheckoutCoupon);
router.post('/uploads/payment-proof', optionalAuthenticate, upload.single('file'), uploadPaymentProofImage);
router.post('/orders/:orderNumber/payment-proof', optionalAuthenticate, validate({ body: submitPaymentProofBodySchema }), submitOrderPaymentProof);
router.get('/orders/:orderNumber/track', optionalAuthenticate, trackOrder);
router.get('/orders/:orderNumber/delivery', optionalAuthenticate, getOrderDelivery);
router.get('/orders/:id/invoice.pdf', authenticate, downloadOrderInvoicePdf);

router.get('/cart', authenticate, getCart);
router.post('/cart', authenticate, validate({ body: addToCartBodySchema }), addToCart);
router.delete('/cart/:itemId', authenticate, validate({ params: cartItemParamsSchema }), removeFromCart);
router.post('/checkout', authenticate, validate({ body: checkoutBodySchema }), checkout);
router.get('/orders/my', authenticate, getMyOrders);

export default router;
