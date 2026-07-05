import express from 'express';
import { getBlogPostBySlug, getBlogPosts } from '../controllers/blogController.js';
import { blogPostParamsSchema, blogPostsQuerySchema } from '../validation/blogSchemas.js';
import validate from '../validation/validate.js';

const router = express.Router();

router.get('/blog', validate({ query: blogPostsQuerySchema }), getBlogPosts);
router.get('/blog/:slug', validate({ params: blogPostParamsSchema }), getBlogPostBySlug);

export default router;
