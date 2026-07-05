import { SiteConfig } from '../types';

const sanitizeWhatsappNumber = (value?: string | null) => (value || '').replace(/\D/g, '');

export const getStoreWhatsappNumber = (siteConfig: SiteConfig) =>
  sanitizeWhatsappNumber(siteConfig.whatsappContactNumber || siteConfig.footerWhatsapp || siteConfig.footerPhone || '');

export const buildWhatsappUrl = (phone: string, message: string) => {
  const sanitized = sanitizeWhatsappNumber(phone);
  if (!sanitized) return null;
  return `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
};

export const buildStoreWhatsappUrl = (siteConfig: SiteConfig, message: string) =>
  buildWhatsappUrl(getStoreWhatsappNumber(siteConfig), message);
