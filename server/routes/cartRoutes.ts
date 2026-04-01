
import express from 'express';
import { getCart, addToCart, removeFromCart, checkout, getMyOrders } from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate); // Apply auth to all cart routes

router.get('/cart', getCart);
router.post('/cart', addToCart);
router.delete('/cart/:itemId', removeFromCart);
router.post('/checkout', checkout);
router.get('/orders/my', getMyOrders);

export default router;
