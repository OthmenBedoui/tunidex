import prisma from '../prisma.js';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_EMAIL_TEMPLATES } from './email.js';
import env from '../config/env.js';
import { type Role } from '../constants/roles.js';
import logger from '../logger.js';

const SITE_CONFIG_KEY = 'site';
const legacySiteConfigPath = path.join(process.cwd(), 'server', 'data', 'site-config.json');
const defaultSiteConfig = {
  logoUrl: '',
  siteName: 'TuniBots',
  logoSize: 32,
  faviconUrl: '',
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
  cgvPageContent: '<p>Les commandes passées sur TuniBots concernent des produits et services digitaux. Le client doit vérifier la fiche produit, la compatibilité, la région et les conditions d’activation avant achat.</p>',
  refundPageTitle: 'Politique de remboursement',
  refundPageContent: '<p>Les produits digitaux déjà livrés, activés ou consultés peuvent devenir non remboursables.</p>',
  howItWorksPageTitle: 'Comment ça marche',
  howItWorksPageContent: '<p>Choisissez votre produit, confirmez votre commande, envoyez votre preuve de paiement si nécessaire, puis recevez votre livraison digitale.</p>',
  faqPageTitle: 'Questions fréquentes',
  faqPageIntro: 'Retrouvez ici les réponses rapides aux questions les plus fréquentes sur le paiement, la livraison et le support.',
  faqItems: [
    {
      question: 'Combien de temps prend la vérification du paiement ?',
      answer: '<p>La vérification manuelle prend généralement quelques heures.</p>'
    }
  ],
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
  emailTemplates: DEFAULT_EMAIL_TEMPLATES,
  adminNotificationsEnabled: true,
  adminNotificationSound: true,
  adminNotificationPollSeconds: 15,
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
  click2payApiKey: ''
};

const asInputJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const seedSiteConfig = async () => {
  const existing = await prisma.siteConfig.findUnique({ where: { key: SITE_CONFIG_KEY } });
  if (existing) return;

  let config: unknown = defaultSiteConfig;

  try {
    const raw = await fs.readFile(legacySiteConfigPath, 'utf8');
    config = {
      ...defaultSiteConfig,
      ...JSON.parse(raw)
    };
    logger.info('site_config_json_migration_started');
  } catch {
    logger.info('site_config_default_creation_started');
  }

  await prisma.siteConfig.create({
    data: {
      key: SITE_CONFIG_KEY,
      data: asInputJson(config)
    }
  });
};

export const seedDatabase = async () => {
  try {
    await seedSiteConfig();

    const ensureStaffAccount = async ({
      email,
      username,
      role,
      subscriptionTier,
      avatarUrl,
      password
    }: {
      email: string;
      username: string;
      role: Role;
      subscriptionTier: string;
      avatarUrl: string;
      password: string;
    }) => {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });
      const hashedPwd = await bcrypt.hash(password, 10);

      if (!existing) {
        logger.info({ role, email }, 'default_staff_account_creation_started');
        await prisma.user.create({
          data: {
            email,
            username,
            password: hashedPwd,
            role,
            subscriptionTier,
            avatarUrl,
            emailVerified: true,
            emailVerificationCode: null,
            emailVerificationExpiresAt: null
          }
        });
        return;
      }

      // Staff accounts must remain usable even when SMTP/OTP is not configured yet.
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          username,
          password: hashedPwd,
          role,
          subscriptionTier,
          avatarUrl,
          emailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpiresAt: null
        }
      });
    };

    // 1. Users (Admin & Agent)
    if (env.isProduction) {
      logger.info('production_detected_skipping_default_staff_seed');
    } else {
      if (env.defaultAdminEmail && env.defaultAdminPassword) {
        await ensureStaffAccount({
          email: env.defaultAdminEmail,
          username: "SuperAdmin",
          role: "ADMIN",
          subscriptionTier: "Elite",
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
          password: env.defaultAdminPassword
        });
      } else {
        logger.warn('default_admin_credentials_missing_seed_skipped');
      }

      if (env.defaultAgentEmail && env.defaultAgentPassword) {
        await ensureStaffAccount({
          email: env.defaultAgentEmail,
          username: "SupportAgent",
          role: "AGENT",
          subscriptionTier: "Pro",
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Agent",
          password: env.defaultAgentPassword
        });
      }
    }

    // 2. Categories & SubCategories
    if (await prisma.category.count() === 0) {
        logger.info('default_categories_seed_started');
        const categoriesData = [
            { name: 'Monnaie Jeu', slug: 'game-coins', icon: 'Coins', gradient: 'bg-gradient-to-r from-yellow-500 to-amber-600', imageUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&q=80', description: 'Gold, Credits, Coins & Tokens', order: 1 },
            { name: 'Comptes', slug: 'accounts', icon: 'User', gradient: 'bg-gradient-to-r from-blue-600 to-indigo-700', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80', description: 'Comptes Haut Niveau & Smurfs', order: 2 },
            { name: 'Software & Apps', slug: 'software', icon: 'MonitorPlay', gradient: 'bg-gradient-to-r from-cyan-600 to-blue-700', imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80', description: 'Windows, Office, Adobe, VPNs', order: 3 },
            { name: 'IA & Tools', slug: 'ai-tools', icon: 'Bot', gradient: 'bg-gradient-to-r from-violet-600 to-purple-700', imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80', description: 'ChatGPT, Gemini, Midjourney', order: 4 },
            { name: 'Streaming', slug: 'streaming', icon: 'PlayCircle', gradient: 'bg-gradient-to-r from-red-600 to-rose-700', imageUrl: 'https://images.unsplash.com/photo-1522869635100-1f4d0684d91f?auto=format&fit=crop&q=80', description: 'Netflix, Spotify, IPTV', order: 5 }
        ];
        
        for (const cat of categoriesData) { await prisma.category.create({ data: cat }); }
        
        // --- SEEDING SUB-CATEGORIES ---
        
        // 1. Software
        const softCat = await prisma.category.findUnique({ where: { slug: 'software' } });
        if(softCat) {
            await prisma.subCategory.createMany({ 
                data: [
                    {name:'Comptes & Sécurité', slug:'comptes', categoryId:softCat.id, icon: 'Shield', description: 'VPN, Antivirus et Comptes sécurisés', order: 1}, 
                    {name:'Licences Officielles', slug:'licences', categoryId:softCat.id, icon: 'Key', description: 'Clés Windows, Office, IDM', order: 2}, 
                    {name:'Boost Réseaux Sociaux', slug:'platforme', categoryId:softCat.id, icon: 'Globe', description: 'Followers, Likes, Vues', order: 3}
                ] 
            });
        }

        // 2. AI & Tools
        const aiCat = await prisma.category.findUnique({ where: { slug: 'ai-tools' } });
        if(aiCat) {
            await prisma.subCategory.createMany({ 
                data: [
                    {name:'Chatbots & Assistants', slug:'chatbots', categoryId:aiCat.id, icon: 'Bot', description: 'ChatGPT Plus, Gemini Advanced, Claude', order: 1}, 
                    {name:'Génération d\'Images', slug:'image-gen', categoryId:aiCat.id, icon: 'Sparkles', description: 'Midjourney, DALL-E, Leonardo AI', order: 2}, 
                    {name:'Outils Développeurs', slug:'dev-tools', categoryId:aiCat.id, icon: 'Code', description: 'GitHub Copilot, JetBrains AI', order: 3}, 
                    {name:'Productivité', slug:'productivity', categoryId:aiCat.id, icon: 'BrainCircuit', description: 'Notion AI, Jasper, Copy.ai', order: 4}
                ] 
            });
        }
    }

    // 3. Listings (Produits) - Removed for clean state
    logger.info('catalog_ready_for_new_products');

    // 4. Analytics - Removed for clean state
    logger.info('database_ready');
  } catch (e) { logger.error({ err: e }, 'database_seed_error'); }
};
