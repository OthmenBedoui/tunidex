import express from 'express';
import { getListings, createListing, updateListing, deleteListing, getCategories, createCategory, updateCategory, deleteCategory, createSubCategory, deleteSubCategory, updateSubCategory } from '../controllers/productController.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Listings
router.get('/listings', getListings);
router.post('/listings', authenticate, isStaff, createListing);
router.patch('/listings/:id', authenticate, isStaff, updateListing);
router.delete('/listings/:id', authenticate, isStaff, deleteListing);

// Categories
router.get('/categories', getCategories);
router.post('/categories', authenticate, isAdmin, createCategory);
router.patch('/categories/:id', authenticate, isAdmin, updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, deleteCategory);

// SubCategories
router.post('/subcategories', authenticate, isAdmin, createSubCategory);
router.patch('/subcategories/:id', authenticate, isAdmin, updateSubCategory); // Update
router.delete('/subcategories/:id', authenticate, isAdmin, deleteSubCategory);

export default router;
