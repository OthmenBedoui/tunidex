import type { Request, Response } from 'express';
import {
  createBlogPost,
  deleteBlogPost,
  getPublicBlogPostBySlug,
  listAdminBlogPosts,
  listPublicBlogPosts,
  updateBlogPost
} from '../services/blogService.js';

type AuthRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

export const getBlogPosts = async (req: Request, res: Response) => {
  const result = await listPublicBlogPosts(req.query as {
    page?: number | string;
    cursor?: string;
    limit?: number | string;
    tag?: string;
    sort?: 'newest' | 'oldest';
  });
  res.json(result);
};

export const getBlogPostBySlug = async (req: Request, res: Response) => {
  const post = await getPublicBlogPostBySlug(req.params.slug);
  if (!post) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }
  res.json(post);
};

export const getAdminBlogPosts = async (req: Request, res: Response) => {
  const result = await listAdminBlogPosts(req.query as {
    page?: number | string;
    cursor?: string;
    limit?: number | string;
    status?: 'PUBLISHED' | 'DRAFT' | 'all';
    q?: string;
    sort?: 'newest' | 'oldest';
  });
  res.json(result);
};

export const createAdminBlogPost = async (req: AuthRequest, res: Response) => {
  const post = await createBlogPost(req.user?.id || '', req.body);
  res.status(201).json(post);
};

export const updateAdminBlogPost = async (req: Request, res: Response) => {
  const post = await updateBlogPost(req.params.id, req.body);
  if (!post) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }
  res.json(post);
};

export const deleteAdminBlogPost = async (req: Request, res: Response) => {
  const deleted = await deleteBlogPost(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Article introuvable.' });
  }
  res.json({ success: true });
};
