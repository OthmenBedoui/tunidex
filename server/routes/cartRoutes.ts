
import express from 'express';
import { getCart, addToCart, removeFromCart, checkout, guestCheckout, getMyOrders } from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkout/guest', guestCheckout);

router.use(authenticate); // Apply auth to protected cart routes only

router.get('/cart', getCart);
router.post('/cart', addToCart);
router.delete('/cart/:itemId', removeFromCart);
router.post('/checkout', checkout);
router.get('/orders/my', getMyOrders);

export default router;
