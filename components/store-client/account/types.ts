import { SiteConfig, User } from '../../../types';

export type AuthMode = 'login' | 'register' | 'otp';
export type AuthAudience = 'client' | 'admin';

export interface StoreLoginPageProps {
  onLoginSuccess: (token: string, user: User, redirectPath?: string) => void;
  navigateTo: (page: string) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
  siteConfig: SiteConfig;
  initialMode?: AuthMode;
  audience?: AuthAudience;
  socialNextPath?: string;
}

export interface StoreProfilePageProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onDeleteAccountSuccess: () => void;
  navigateTo: (page: string) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}
