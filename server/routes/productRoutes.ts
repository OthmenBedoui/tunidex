import express from 'express';
import { getListings, createListing, getCategories, createCategory, deleteCategory, createSubCategory, deleteSubCategory, updateSubCategory } from '../controllers/productController.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Listings
router.get('/listings', getListings);
router.post('/listings', authenticate, isStaff, createListing);

// Categories
router.get('/categories', getCategories);
router.post('/categories', authenticate, isAdmin, createCategory);
router.delete('/categories/:id', authenticate, isAdmin, deleteCategory);

// SubCategories
router.post('/subcategories', authenticate, isAdmin, createSubCategory);
router.patch('/subcategories/:id', authenticate, isAdmin, updateSubCategory); // Update
router.delete('/subcategories/:id', authenticate, isAdmin, deleteSubCategory);

export default router;