import express from 'express';
import { getPendingReviews, moderateReview } from '../../controllers/reviewController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';
import { reviewIdParamsSchema, moderateReviewBodySchema, reviewPaginationQuerySchema } from '../../validation/reviewSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/reviews/pending', authenticate, isStaff, validate({ query: reviewPaginationQuerySchema }), getPendingReviews);
router.patch('/admin/reviews/:id', authenticate, isStaff, validate({ params: reviewIdParamsSchema, body: moderateReviewBodySchema }), moderateReview);

export default router;
