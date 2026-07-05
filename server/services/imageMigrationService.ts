import prisma from '../prisma.js';
import { readSiteConfig, type SiteConfigData, writeSiteConfig } from './siteConfigService.js';
import { isInlineImageDataUrl, migrateInlineImageValue } from './imageStorageService.js';

type MigrationSummary = {
  listingsUpdated: number;
  categoriesUpdated: number;
  siteConfigFieldsUpdated: number;
};

const migrateGallery = async (galleryRaw: string, listingSlug: string) => {
  let gallery: unknown;

  try {
    gallery = JSON.parse(galleryRaw || '[]');
  } catch {
    return { galleryRaw, updated: 0 };
  }

  if (!Array.isArray(gallery)) {
    return { galleryRaw, updated: 0 };
  }

  let updated = 0;
  const nextGallery = await Promise.all(gallery.map(async (value, index) => {
    if (!isInlineImageDataUrl(value)) {
      return value;
    }

    updated += 1;
    return migrateInlineImageValue(value, {
      subdir: 'migrations/listings/gallery',
      fileNamePrefix: `${listingSlug || 'listing'}-${index + 1}`
    });
  }));

  return { galleryRaw: JSON.stringify(nextGallery), updated };
};

const migrateSiteConfigImages = async (config: SiteConfigData) => {
  let updated = 0;
  const migrateField = async (value: string, subdir: string, fileNamePrefix: string) => {
    if (!isInlineImageDataUrl(value)) {
      return value;
    }

    updated += 1;
    return migrateInlineImageValue(value, { subdir, fileNamePrefix });
  };

  const heroSlides = await Promise.all((config.heroSlides || []).map(async (item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const current = item as Record<string, unknown>;
    return {
      ...current,
      imageUrl: await migrateField(
        typeof current.imageUrl === 'string' ? current.imageUrl : '',
        'migrations/site-config/hero-slides',
        `hero-slide-${index + 1}`
      )
    };
  }));

  const heroPromoBanners = await Promise.all((config.heroPromoBanners || []).map(async (item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const current = item as Record<string, unknown>;
    return {
      ...current,
      imageUrl: await migrateField(
        typeof current.imageUrl === 'string' ? current.imageUrl : '',
        'migrations/site-config/hero-banners',
        `hero-banner-${index + 1}`
      )
    };
  }));

  const floatingBrandCards = await Promise.all((config.floatingBrandCards || []).map(async (item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const current = item as Record<string, unknown>;
    return {
      ...current,
      imageUrl: await migrateField(
        typeof current.imageUrl === 'string' ? current.imageUrl : '',
        'migrations/site-config/floating-brand-cards',
        `brand-card-${index + 1}`
      )
    };
  }));

  return {
    updated,
    config: {
      ...config,
      logoUrl: await migrateField(config.logoUrl, 'migrations/site-config/logo', 'site-logo'),
      faviconUrl: await migrateField(config.faviconUrl, 'migrations/site-config/favicon', 'site-favicon'),
      startupLoaderImageUrl: await migrateField(config.startupLoaderImageUrl, 'migrations/site-config/startup-loader', 'startup-loader'),
      coverBackgroundUrl: await migrateField(config.coverBackgroundUrl, 'migrations/site-config/store-cover', 'store-cover'),
      seoOgImageUrl: await migrateField(config.seoOgImageUrl, 'migrations/site-config/seo-og', 'seo-og'),
      heroSlides,
      heroPromoBanners,
      floatingBrandCards
    }
  };
};

export const migrateInlineImagesInDatabase = async (): Promise<MigrationSummary> => {
  let listingsUpdated = 0;
  let categoriesUpdated = 0;

  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      slug: true,
      imageUrl: true,
      logoUrl: true,
      gallery: true
    }
  });

  for (const listing of listings) {
    const nextImageUrl = await migrateInlineImageValue(listing.imageUrl, {
      subdir: 'migrations/listings/main',
      fileNamePrefix: listing.slug || 'listing'
    });
    const nextLogoUrl = await migrateInlineImageValue(listing.logoUrl, {
      subdir: 'migrations/listings/logos',
      fileNamePrefix: `${listing.slug || 'listing'}-logo`
    });
    const nextGallery = await migrateGallery(listing.gallery, listing.slug);

    if (
      nextImageUrl !== listing.imageUrl
      || nextLogoUrl !== (listing.logoUrl || '')
      || nextGallery.galleryRaw !== listing.gallery
    ) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          imageUrl: nextImageUrl,
          logoUrl: nextLogoUrl || null,
          gallery: nextGallery.galleryRaw
        }
      });
      listingsUpdated += 1;
    }
  }

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      imageUrl: true
    }
  });

  for (const category of categories) {
    const nextImageUrl = await migrateInlineImageValue(category.imageUrl, {
      subdir: 'migrations/categories',
      fileNamePrefix: category.slug || 'category'
    });

    if (nextImageUrl !== (category.imageUrl || '')) {
      await prisma.category.update({
        where: { id: category.id },
        data: { imageUrl: nextImageUrl || null }
      });
      categoriesUpdated += 1;
    }
  }

  const currentConfig = await readSiteConfig();
  const migratedConfig = await migrateSiteConfigImages(currentConfig);
  if (migratedConfig.updated > 0) {
    await writeSiteConfig(migratedConfig.config);
  }

  return {
    listingsUpdated,
    categoriesUpdated,
    siteConfigFieldsUpdated: migratedConfig.updated
  };
};

export const auditInlineImageStorage = async () => {
  const [listings, categories, siteConfig] = await Promise.all([
    prisma.listing.findMany({ select: { id: true, imageUrl: true, logoUrl: true, gallery: true } }),
    prisma.category.findMany({ select: { id: true, imageUrl: true } }),
    readSiteConfig()
  ]);

  const listingBase64Count = listings.reduce((count, listing) => {
    let nextCount = count;
    if (isInlineImageDataUrl(listing.imageUrl)) nextCount += 1;
    if (isInlineImageDataUrl(listing.logoUrl)) nextCount += 1;

    try {
      const gallery = JSON.parse(listing.gallery || '[]');
      if (Array.isArray(gallery)) {
        nextCount += gallery.filter((value) => isInlineImageDataUrl(value)).length;
      }
    } catch {
      // Ignore malformed historical gallery payloads during audit.
    }

    return nextCount;
  }, 0);

  const categoryBase64Count = categories.filter((category) => isInlineImageDataUrl(category.imageUrl)).length;
  const configCandidates = [
    siteConfig.logoUrl,
    siteConfig.faviconUrl,
    siteConfig.startupLoaderImageUrl,
    siteConfig.coverBackgroundUrl,
    siteConfig.seoOgImageUrl,
    ...siteConfig.heroSlides.map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? (item as { imageUrl?: unknown }).imageUrl : '')),
    ...siteConfig.heroPromoBanners.map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? (item as { imageUrl?: unknown }).imageUrl : '')),
    ...siteConfig.floatingBrandCards.map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? (item as { imageUrl?: unknown }).imageUrl : ''))
  ];

  return {
    listings: listingBase64Count,
    categories: categoryBase64Count,
    siteConfig: configCandidates.filter((value) => isInlineImageDataUrl(value)).length
  };
};
