import express from 'express';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPosts,
  updateAdminBlogPost
} from '../../controllers/blogController.js';
import { authenticate, isStaff } from '../../middleware/auth.js';
import { blogAdminIdParamsSchema, blogPostBodySchema, blogPostsQuerySchema } from '../../validation/blogSchemas.js';
import validate from '../../validation/validate.js';

const router = express.Router();

router.get('/admin/blog', authenticate, isStaff, validate({ query: blogPostsQuerySchema }), getAdminBlogPosts);
router.post('/admin/blog', authenticate, isStaff, validate({ body: blogPostBodySchema }), createAdminBlogPost);
router.patch('/admin/blog/:id', authenticate, isStaff, validate({ params: blogAdminIdParamsSchema, body: blogPostBodySchema }), updateAdminBlogPost);
router.delete('/admin/blog/:id', authenticate, isStaff, validate({ params: blogAdminIdParamsSchema }), deleteAdminBlogPost);

export default router;
