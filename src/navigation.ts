import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAdminTabFromSlug } from '../pages/admin';

export type LegacyPage =
  | 'home'
  | 'login'
  | 'register'
  | 'cart'
  | 'order-track'
  | 'subscription'
  | 'about'
  | 'contact'
  | 'blog'
  | 'blog-post'
  | 'cgv'
  | 'refund-policy'
  | 'how-it-works'
  | 'faq'
  | 'privacy-policy'
  | 'data-deletion'
  | 'terms'
  | 'profile'
  | 'auth-callback'
  | 'user-dashboard'
  | 'category'
  | 'product'
  | 'admin-dashboard'
  | 'admin-login'
  | 'admin-register-authentication'
  | 'admin-not-found'
  | 'not-found';

const LEGACY_PAGES = new Set<string>([
  'home',
  'login',
  'register',
  'cart',
  'order-track',
  'subscription',
  'about',
  'contact',
  'blog',
  'blog-post',
  'cgv',
  'refund-policy',
  'how-it-works',
  'faq',
  'privacy-policy',
  'data-deletion',
  'terms',
  'profile',
  'auth-callback',
  'user-dashboard',
  'category',
  'product',
  'admin-dashboard',
  'admin-login',
  'admin-register-authentication',
  'admin-not-found',
  'not-found'
]);

export const getPathForPage = (page: LegacyPage, slug?: string) => {
  switch (page) {
    case 'admin-dashboard':
      return slug ? `/admin/${slug.split('/').map((part) => encodeURIComponent(part)).join('/')}` : '/admin';
    case 'admin-login':
      return '/admin/login';
    case 'admin-register-authentication':
      return '/admin/register-authentication';
    case 'login':
      return '/account/login';
    case 'register':
      return '/account/register';
    case 'cart':
      return '/cart';
    case 'order-track':
      return slug ? `/track/${encodeURIComponent(slug)}` : '/track';
    case 'subscription':
      return '/subscription';
    case 'about':
      return '/about';
    case 'contact':
      return '/contact';
    case 'blog':
      return '/blog';
    case 'blog-post':
      return slug ? `/blog/${encodeURIComponent(slug)}` : '/blog';
    case 'cgv':
      return '/cgv';
    case 'refund-policy':
      return '/remboursement';
    case 'how-it-works':
      return '/comment-ca-marche';
    case 'faq':
      return '/faq';
    case 'privacy-policy':
      return '/privacy-policy';
    case 'data-deletion':
      return '/data-deletion';
    case 'terms':
      return '/terms';
    case 'profile':
      return '/account/profile';
    case 'auth-callback':
      return '/auth/callback';
    case 'user-dashboard':
      return '/account';
    case 'category':
      return slug ? `/category/${encodeURIComponent(slug)}` : '/';
    case 'product':
      return slug ? `/product/${encodeURIComponent(slug)}` : '/';
    case 'home':
      return '/';
    case 'admin-not-found':
      return '/admin/unknown';
    case 'not-found':
    default:
      return '/404';
  }
};

export const getLegacyPageFromPathname = (pathname: string): LegacyPage => {
  if (pathname.startsWith('/admin/login')) return 'admin-login';
  if (pathname.startsWith('/admin/register-authentication')) return 'admin-register-authentication';
  if (pathname.startsWith('/admin/')) {
    const slug = pathname.replace(/^\/admin\/?/, '');
    return getAdminTabFromSlug(slug) ? 'admin-dashboard' : 'admin-not-found';
  }
  if (pathname === '/admin') return 'admin-dashboard';
  if (pathname.startsWith('/account/login')) return 'login';
  if (pathname.startsWith('/account/register')) return 'register';
  if (pathname.startsWith('/account/profile')) return 'profile';
  if (pathname === '/account' || pathname.startsWith('/account/')) return 'user-dashboard';
  if (pathname === '/cart') return 'cart';
  if (pathname.startsWith('/track')) return 'order-track';
  if (pathname === '/subscription') return 'subscription';
  if (pathname === '/about') return 'about';
  if (pathname === '/contact') return 'contact';
  if (pathname === '/blog') return 'blog';
  if (pathname.startsWith('/blog/')) return 'blog-post';
  if (pathname === '/cgv') return 'cgv';
  if (pathname === '/remboursement') return 'refund-policy';
  if (pathname === '/comment-ca-marche') return 'how-it-works';
  if (pathname === '/faq') return 'faq';
  if (pathname === '/privacy-policy') return 'privacy-policy';
  if (pathname === '/data-deletion') return 'data-deletion';
  if (pathname === '/terms') return 'terms';
  if (pathname === '/auth/callback') return 'auth-callback';
  if (pathname.startsWith('/category/')) return 'category';
  if (pathname.startsWith('/product/')) return 'product';
  if (pathname === '/') return 'home';
  return 'not-found';
};

export const useLegacyNavigate = () => {
  const navigate = useNavigate();

  return useCallback((page: string, slug?: string, options?: { replace?: boolean }) => {
    const nextPath = LEGACY_PAGES.has(page)
      ? getPathForPage(page as LegacyPage, slug)
      : page;
    navigate(nextPath, { replace: options?.replace });
    window.scrollTo(0, 0);
  }, [navigate]);
};

export const useCurrentLegacyPage = () => {
  const location = useLocation();
  return getLegacyPageFromPathname(location.pathname);
};
