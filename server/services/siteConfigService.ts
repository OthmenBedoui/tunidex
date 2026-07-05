import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_EMAIL_TEMPLATES } from '../utils/email.js';
import prisma from '../prisma.js';
import { isInlineImageDataUrl } from './imageStorageService.js';

const SITE_CONFIG_KEY = 'site';
const legacySiteConfigPath = path.join(process.cwd(), 'server', 'data', 'site-config.json');

export type SiteConfigData = {
  logoUrl: string;
  siteName: string;
  logoSize: number;
  faviconUrl: string;
  startupLoaderEnabled: boolean;
  startupLoaderImageUrl: string;
  startupLoaderBackground: string;
  primaryColor: string;
  heroSlides: unknown[];
  heroPromoBanners: unknown[];
  floatingBrandCards: unknown[];
  heroSlideHeight: number;
  coverBackgroundUrl: string;
  coverListingIds: string[];
  storeSections: Array<{ id: string; enabled: boolean; order?: number }>;
  accentColor: string;
  accentHoverColor: string;
  accentSoftColor: string;
  accentTextColor: string;
  fontFamily: string;
  customFonts?: Array<{ id: string; name: string; family: string; dataUrl: string; format: string }>;
  headerAnnouncement: string;
  headerSearchPlaceholder: string;
  headerCtaLabel: string;
  footerTagline: string;
  footerDescription: string;
  footerEmail: string;
  footerPhone: string;
  footerWhatsapp: string;
  whatsappContactNumber: string;
  whatsappFloatingButtonEnabled: boolean;
  footerAddress: string;
  footerCopyright: string;
  cgvPageTitle: string;
  cgvPageContent: string;
  refundPageTitle: string;
  refundPageContent: string;
  howItWorksPageTitle: string;
  howItWorksPageContent: string;
  faqPageTitle: string;
  faqPageIntro: string;
  faqItems: Array<{ question: string; answer: string }>;
  invoiceIssuerName: string;
  invoiceLegalMentions: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoCanonicalUrl: string;
  seoOgImageUrl: string;
  seoRobots: string;
  seoSitemapEnabled: boolean;
  seoOrganizationName: string;
  seoGoogleAnalyticsId: string;
  seoGoogleAdsConversionId: string;
  seoFacebookPixelId: string;
  smtpMailerName: string;
  smtpHost: string;
  smtpDriver: string;
  smtpPort: string;
  smtpUsername: string;
  smtpEmailId: string;
  smtpEncryption: string;
  smtpPassword: string;
  paymentMethods?: Array<{
    id: string;
    label: string;
    instructions: string;
    accountDetails: string;
    isActive: boolean;
    sortOrder?: number;
  }>;
  emailTemplates?: Record<string, { subject: string; html: string }>;
  adminNotificationsEnabled: boolean;
  adminNotificationSound: boolean;
  adminNotificationPollSeconds: number;
  paymentReviewReminderHours: number;
  loyaltyPointsPerDinar: number;
  loyaltyMaxDiscountPercent: number;
  whatsappNotificationsEnabled: boolean;
  whatsappNotificationWebhookUrl: string;
  telegramNotificationsEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  messengerNotificationsEnabled: boolean;
  messengerNotificationWebhookUrl: string;
  click2payEnabled: boolean;
  click2payMerchantId: string;
  click2payApiKey: string;
  authProviders?: Record<string, { enabled: boolean; lastUpdatedAt?: string }>;
};

export const DEFAULT_PAYMENT_METHODS: NonNullable<SiteConfigData['paymentMethods']> = [
  {
    id: 'bank_transfer',
    label: 'Virement bancaire',
    instructions: 'Effectuez le virement exact puis ajoutez votre preuve ou la reference de transaction. Mentionnez toujours votre numero de commande comme reference.',
    accountDetails: 'Titulaire: TuniBots\nRIB: 00000 00000 000000000000 00\nBanque: A configurer',
    isActive: true,
    sortOrder: 10
  },
  {
    id: 'd17',
    label: 'D17',
    instructions: 'Payez via D17, puis envoyez la capture ou la reference D17 avec votre numero de commande.',
    accountDetails: 'Numero D17: +216 00 000 000',
    isActive: true,
    sortOrder: 20
  },
  {
    id: 'flouci_manual',
    label: 'Flouci manuel',
    instructions: 'Payez via Flouci puis envoyez la capture ou la reference de transaction. Indiquez votre numero de commande dans le message.',
    accountDetails: 'Numero Flouci: +216 00 000 000',
    isActive: true,
    sortOrder: 30
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp / support',
    instructions: 'Confirmez votre commande puis contactez le support WhatsApp avec votre numero de commande pour finaliser le paiement manuel.',
    accountDetails: 'Support WhatsApp: +216 00 000 000',
    isActive: true,
    sortOrder: 40
  }
];

export const defaultSiteConfig: SiteConfigData = {
  logoUrl: '',
  siteName: 'TuniBots',
  logoSize: 32,
  faviconUrl: '',
  startupLoaderEnabled: false,
  startupLoaderImageUrl: '',
  startupLoaderBackground: '#020617',
  primaryColor: '',
  heroSlides: [],
  heroPromoBanners: [],
  floatingBrandCards: [],
  heroSlideHeight: 440,
  coverBackgroundUrl: '',
  coverListingIds: [],
  storeSections: [
    { id: 'store-cover', enabled: true, order: 10 },
    { id: 'hero-slider', enabled: true, order: 20 },
    { id: 'floating-brand-cards', enabled: true, order: 25 },
    { id: 'collections', enabled: true, order: 30 },
    { id: 'packages', enabled: true, order: 40 },
    { id: 'top-products', enabled: true, order: 50 },
    { id: 'gift-cards', enabled: true, order: 60 },
    { id: 'trending', enabled: true, order: 70 },
    { id: 'discounts', enabled: true, order: 80 },
    { id: 'trust-badges', enabled: true, order: 90 }
  ],
  accentColor: '#4f46e5',
  accentHoverColor: '#4338ca',
  accentSoftColor: '#e0e7ff',
  accentTextColor: '#312e81',
  fontFamily: '"Albeit Grotesk Caps", "Albeit Grotesk", "Arial Narrow", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  customFonts: [],
  headerAnnouncement: 'Bienvenue sur la première plateforme digitale en Tunisie !',
  headerSearchPlaceholder: 'Rechercher jeux, items, comptes...',
  headerCtaLabel: "S'inscrire",
  footerTagline: 'Marketplace digitale premium',
  footerDescription: 'La destination premium pour vos comptes, licences, abonnements, outils IA et services digitaux en Tunisie.',
  footerEmail: 'support@tunibots.tn',
  footerPhone: '+216 00 000 000',
  footerWhatsapp: '+216 00 000 000',
  whatsappContactNumber: '+216 00 000 000',
  whatsappFloatingButtonEnabled: true,
  footerAddress: 'Tunis, Tunisie',
  footerCopyright: 'Tous droits réservés.',
  cgvPageTitle: 'Conditions générales de vente',
  cgvPageContent: '<p>Les commandes passées sur TuniBots concernent des produits et services digitaux. Le client doit vérifier la fiche produit, la compatibilité, la région et les conditions d’activation avant achat.</p><h2>Commande et paiement</h2><p>Une commande est enregistrée après validation du panier. Le paiement peut être vérifié manuellement avant livraison.</p><h2>Livraison</h2><p>Les produits instantanés sont livrés automatiquement dès validation. Les autres commandes peuvent nécessiter un traitement support.</p><h2>Support</h2><p>En cas de difficulté, contactez notre support avec votre numéro de commande pour un traitement rapide.</p>',
  refundPageTitle: 'Politique de remboursement',
  refundPageContent: '<p>Les produits digitaux déjà livrés, activés ou consultés peuvent devenir non remboursables.</p><h2>Cas étudiés</h2><p>Un remboursement peut être étudié si la commande n’a pas été livrée, si le produit reçu est manifestement invalide ou si un doublon de paiement est confirmé.</p><h2>Délai de demande</h2><p>Toute demande doit être envoyée rapidement avec le numéro de commande, la preuve de paiement et l’explication du problème rencontré.</p>',
  howItWorksPageTitle: 'Comment ça marche',
  howItWorksPageContent: '<h2>1. Choisissez votre produit</h2><p>Parcourez le store et ajoutez le bon produit à votre panier.</p><h2>2. Confirmez votre commande</h2><p>Sélectionnez votre méthode de paiement, puis validez la commande.</p><h2>3. Envoyez votre preuve</h2><p>Si le paiement est manuel, envoyez votre capture ou référence de transaction avec votre numéro de commande.</p><h2>4. Réception et livraison</h2><p>Dès validation du paiement, votre livraison digitale est envoyée automatiquement ou finalisée par le support.</p>',
  faqPageTitle: 'Questions fréquentes',
  faqPageIntro: 'Retrouvez ici les réponses rapides aux questions les plus fréquentes sur le paiement, la livraison et le support.',
  faqItems: [
    {
      question: 'Combien de temps prend la verification du paiement ?',
      answer: '<p>La vérification manuelle prend généralement quelques heures, selon l’heure d’envoi de votre preuve et l’affluence du support.</p>'
    },
    {
      question: 'Comment envoyer ma preuve de paiement ?',
      answer: '<p>Depuis l’écran de confirmation ou la page de suivi, joignez une capture et/ou une référence de transaction avec votre numéro de commande.</p>'
    },
    {
      question: 'Puis-je contacter le support sur WhatsApp ?',
      answer: '<p>Oui. Un bouton WhatsApp est disponible sur les pages clés du store pour accélérer la prise en charge avec le bon contexte de commande.</p>'
    }
  ],
  invoiceIssuerName: 'TuniBots',
  invoiceLegalMentions: 'Facture emise pour des produits digitaux. Toute reproduction ou partage non autorise des contenus livres est interdit.',
  seoTitle: 'TuniBots | Marketplace digitale en Tunisie',
  seoDescription: 'Achetez des produits digitaux, comptes, licences, abonnements et services numériques en Tunisie avec livraison rapide et support local.',
  seoKeywords: 'marketplace digitale tunisie, comptes gaming, abonnements, licences, services digitaux, TuniBots',
  seoCanonicalUrl: '',
  seoOgImageUrl: '',
  seoRobots: 'index,follow',
  seoSitemapEnabled: true,
  seoOrganizationName: 'TuniBots',
  seoGoogleAnalyticsId: '',
  seoGoogleAdsConversionId: '',
  seoFacebookPixelId: '',
  smtpMailerName: '',
  smtpHost: '',
  smtpDriver: 'smtp',
  smtpPort: '',
  smtpUsername: '',
  smtpEmailId: '',
  smtpEncryption: 'tls',
  smtpPassword: '',
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  emailTemplates: DEFAULT_EMAIL_TEMPLATES,
  adminNotificationsEnabled: true,
  adminNotificationSound: true,
  adminNotificationPollSeconds: 15,
  paymentReviewReminderHours: 4,
  loyaltyPointsPerDinar: 10,
  loyaltyMaxDiscountPercent: 25,
  whatsappNotificationsEnabled: false,
  whatsappNotificationWebhookUrl: '',
  telegramNotificationsEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  messengerNotificationsEnabled: false,
  messengerNotificationWebhookUrl: '',
  click2payEnabled: false,
  click2payMerchantId: '',
  click2payApiKey: '',
  authProviders: {}
};

const asInputJson = (value: SiteConfigData): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const mergeSiteConfig = (value: unknown): SiteConfigData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultSiteConfig };
  }

  return {
    ...defaultSiteConfig,
    ...(value as Partial<SiteConfigData>)
  };
};

const loadInitialSiteConfig = async () => {
  try {
    const raw = await fs.readFile(legacySiteConfigPath, 'utf8');
    return mergeSiteConfig(JSON.parse(raw));
  } catch {
    return { ...defaultSiteConfig };
  }
};

export const estimateBase64Size = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('data:')) return 0;
  const base64 = value.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
};

const assertNoInlineImage = (value: unknown, field: string) => {
  if (isInlineImageDataUrl(value)) {
    throw new Error(`Inline image data is no longer allowed for ${field}. Upload the file first and store its URL.`);
  }
};

export const assertNoInlineImagesInSiteConfig = (config: Partial<SiteConfigData>) => {
  assertNoInlineImage(config.logoUrl, 'logoUrl');
  assertNoInlineImage(config.faviconUrl, 'faviconUrl');
  assertNoInlineImage(config.startupLoaderImageUrl, 'startupLoaderImageUrl');
  assertNoInlineImage(config.coverBackgroundUrl, 'coverBackgroundUrl');
  assertNoInlineImage(config.seoOgImageUrl, 'seoOgImageUrl');

  (config.heroSlides || []).forEach((item, index) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      assertNoInlineImage((item as { imageUrl?: unknown }).imageUrl, `heroSlides[${index}].imageUrl`);
    }
  });

  (config.heroPromoBanners || []).forEach((item, index) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      assertNoInlineImage((item as { imageUrl?: unknown }).imageUrl, `heroPromoBanners[${index}].imageUrl`);
    }
  });

  (config.floatingBrandCards || []).forEach((item, index) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      assertNoInlineImage((item as { imageUrl?: unknown }).imageUrl, `floatingBrandCards[${index}].imageUrl`);
    }
  });
};

export const readSiteConfig = async () => {
  const record = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });

  if (record) {
    return mergeSiteConfig(record.data);
  }

  const initialConfig = await loadInitialSiteConfig();
  const created = await prisma.siteConfig.create({
    data: {
      key: SITE_CONFIG_KEY,
      data: asInputJson(initialConfig)
    }
  });

  return mergeSiteConfig(created.data);
};

export const writeSiteConfig = async (config: SiteConfigData) => {
  await prisma.siteConfig.upsert({
    where: { key: SITE_CONFIG_KEY },
    create: {
      key: SITE_CONFIG_KEY,
      data: asInputJson(config)
    },
    update: {
      data: asInputJson(config)
    }
  });
};
