import express from 'express';
import { getListings, createListing, updateListing, deleteListing, getCategories, createCategory, updateCategory, deleteCategory, createSubCategory, deleteSubCategory, updateSubCategory } from '../controllers/productController.js';
import { createReview, getListingReviews } from '../controllers/reviewController.js';
import { authenticate, isStaff, isAdmin } from '../middleware/auth.js';
import {
  categoryParamsSchema,
  createCategoryBodySchema,
  createListingBodySchema,
  createSubCategoryBodySchema,
  listingParamsSchema,
  subCategoryParamsSchema,
  updateCategoryBodySchema,
  updateListingBodySchema,
  updateSubCategoryBodySchema
} from '../validation/productSchemas.js';
import { createReviewBodySchema, listingReviewParamsSchema } from '../validation/reviewSchemas.js';
import { listingsQuerySchema } from '../validation/listSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();

// Listings
router.get('/listings', validate({ query: listingsQuerySchema }), getListings);
router.get('/listings/:id/reviews', validate({ params: listingReviewParamsSchema }), getListingReviews);
router.post('/listings', authenticate, isStaff, validate({ body: createListingBodySchema }), createListing);
router.patch('/listings/:id', authenticate, isStaff, validate({ params: listingParamsSchema, body: updateListingBodySchema }), updateListing);
router.delete('/listings/:id', authenticate, isStaff, validate({ params: listingParamsSchema }), deleteListing);
router.post('/reviews', authenticate, validate({ body: createReviewBodySchema }), createReview);

// Categories
router.get('/categories', getCategories);
router.post('/categories', authenticate, isAdmin, validate({ body: createCategoryBodySchema }), createCategory);
router.patch('/categories/:id', authenticate, isAdmin, validate({ params: categoryParamsSchema, body: updateCategoryBodySchema }), updateCategory);
router.delete('/categories/:id', authenticate, isAdmin, validate({ params: categoryParamsSchema }), deleteCategory);

// SubCategories
router.post('/subcategories', authenticate, isAdmin, validate({ body: createSubCategoryBodySchema }), createSubCategory);
router.patch('/subcategories/:id', authenticate, isAdmin, validate({ params: subCategoryParamsSchema, body: updateSubCategoryBodySchema }), updateSubCategory); // Update
router.delete('/subcategories/:id', authenticate, isAdmin, validate({ params: subCategoryParamsSchema }), deleteSubCategory);

export default router;
