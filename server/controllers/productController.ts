import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { buildUniqueProductSlug } from '../utils/productSlug.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-g2g-tunisie';

const normalizeDiscountPercent = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(95, Math.round(parsed)));
};

const normalizeDiscountType = (value: unknown) => {
  return value === 'AMOUNT' || value === 'PERCENT' ? value : 'NONE';
};

const normalizeDiscountAmount = (value: unknown, price: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(price, parsed));
};

const normalizePackageItems = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  const aggregated = new Map<string, number>();

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const includedListingId = typeof (item as { includedListingId?: unknown }).includedListingId === 'string'
      ? (item as { includedListingId: string }).includedListingId.trim()
      : '';
    const quantity = Number((item as { quantity?: unknown }).quantity);

    if (!includedListingId) continue;
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    aggregated.set(includedListingId, (aggregated.get(includedListingId) || 0) + quantity);
  }

  return Array.from(aggregated.entries()).map(([includedListingId, quantity]) => ({
    includedListingId,
    quantity
  }));
};

const normalizeVariants = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((variant, index) => {
      if (!variant || typeof variant !== 'object') return null;
      const name = typeof (variant as { name?: unknown }).name === 'string'
        ? (variant as { name: string }).name.trim()
        : '';
      const price = Number((variant as { price?: unknown }).price);
      const order = Number((variant as { order?: unknown }).order);

      if (!name || !Number.isFinite(price) || price < 0) return null;

      return {
        name,
        price,
        order: Number.isInteger(order) ? order : index + 1
      };
    })
    .filter((variant): variant is { name: string; price: number; order: number } => Boolean(variant));
};

const normalizeSourceUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Le lien source doit utiliser http ou https.');
    }
    return parsed.toString();
  } catch {
    throw new Error('Le champ source doit etre un lien valide.');
  }
};

const isAdminRequest = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return false;

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { role?: string };
    return decoded.role === 'ADMIN';
  } catch {
    return false;
  }
};

const computePackageStock = (packageItems: Array<{ quantity: number; includedListing: { stock: number } }>) => {
  if (packageItems.length === 0) return 0;

  return packageItems.reduce((minStock, item) => {
    const availableUnits = Math.floor((item.includedListing.stock || 0) / item.quantity);
    return Math.min(minStock, availableUnits);
  }, Number.POSITIVE_INFINITY);
};

const serializeNestedListing = (listing: {
  gallery: string | null;
  stock: number;
  [key: string]: unknown;
}) => ({
  ...listing,
  gallery: JSON.parse(listing.gallery || '[]')
});

const serializeListing = (listing: {
  gallery: string | null;
  isPackage?: boolean | null;
  source?: string | null;
  packageItems?: Array<{
    id: string;
    packageListingId: string;
    includedListingId: string;
    quantity: number;
    includedListing: {
      gallery: string | null;
      stock: number;
      [key: string]: unknown;
    };
  }>;
  [key: string]: unknown;
}, options?: { includeSource?: boolean }) => {
  const serializedPackageItems = Array.isArray(listing.packageItems)
    ? listing.packageItems.map((item) => ({
        ...item,
        includedListing: serializeNestedListing(item.includedListing)
      }))
    : [];

  const serializedListing = {
    ...listing,
    gallery: JSON.parse(listing.gallery || '[]'),
    stock: listing.isPackage ? computePackageStock(serializedPackageItems) : listing.stock,
    packageItems: serializedPackageItems
  };

  if (!options?.includeSource) {
    delete (serializedListing as { source?: string | null }).source;
  }

  return serializedListing;
};

const getListingInclude = () => ({
  category: true,
  subCategory: true,
  variants: {
    orderBy: [{ order: 'asc' as const }, { price: 'asc' as const }]
  },
  packageItems: {
    include: {
      includedListing: {
        include: {
          category: true,
          subCategory: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc' as const
    }
  }
});

const validatePackageItems = async (listingId: string | null, packageItems: Array<{ includedListingId: string; quantity: number }>) => {
  if (packageItems.length === 0) {
    throw new Error('Un package doit contenir au moins un produit.');
  }

  if (listingId && packageItems.some((item) => item.includedListingId === listingId)) {
    throw new Error('Un package ne peut pas se contenir lui-même.');
  }

  const includedListings = await prisma.listing.findMany({
    where: {
      id: { in: packageItems.map((item) => item.includedListingId) },
      isArchived: false,
      isPackage: false
    },
    select: {
      id: true
    }
  });

  if (includedListings.length !== packageItems.length) {
    throw new Error('Chaque package doit contenir des produits existants et non archivés.');
  }
};

/**
 * @swagger
 * tags:
 *   - name: Listings
 *     description: Product management
 *   - name: Categories
 *     description: Category management
 */

// --- LISTINGS ---

/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Get all products
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 */
export const getListings = async (req: Request, res: Response) => {
  const includeSource = isAdminRequest(req);
  const listings = await prisma.listing.findMany({
    include: getListingInclude(),
    orderBy: { createdAt: 'desc' }
  });
  res.json(listings.map((listing) => serializeListing(listing, { includeSource })));
};

/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Create a new listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Listing'
 *     responses:
 *       200:
 *         description: Listing created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 */
export const createListing = async (req: Request, res: Response) => {
  const includeSource = isAdminRequest(req);
  const {
    game,
    title,
    categoryId,
    subCategoryId,
    description,
    price,
    source,
    variantLabel,
    discountPercent,
    discountType,
    discountValue,
    imageUrl,
    cardTemplate,
    logoUrl,
    stock,
    isPackage,
    packageItems,
    deliveryTimeHours,
    metaTitle,
    metaDesc,
    keywords,
    gallery,
    isInstant,
    preparationTime,
    platform,
    region,
    activationCountry,
    activationGuideTitle,
    activationGuideContent,
    restrictionsTitle,
    restrictionsContent,
    regionTitle,
    regionContent,
    systemRequirementsEnabled,
    systemRequirementsPlatform,
    minimumOs,
    minimumMemory,
    minimumStorage,
    minimumProcessor,
    minimumGraphics,
    recommendedOs,
    recommendedMemory,
    recommendedStorage,
    recommendedProcessor,
    recommendedGraphics,
    variants
  } = req.body;

  const numericPrice = Number(price);
  const normalizedPackageItems = normalizePackageItems(packageItems);
  const normalizedVariants = normalizeVariants(variants);
  const nextIsPackage = Boolean(isPackage);
  const normalizedSource = includeSource ? normalizeSourceUrl(source) : null;
  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedDiscountValue =
    normalizedDiscountType === 'PERCENT'
      ? normalizeDiscountPercent(discountValue ?? discountPercent)
      : normalizedDiscountType === 'AMOUNT'
        ? normalizeDiscountAmount(discountValue, numericPrice)
        : 0;

  if (nextIsPackage) {
    await validatePackageItems(null, normalizedPackageItems);
  }

  const slug = await buildUniqueProductSlug(title, { fallback: game });

  const listing = await prisma.listing.create({
    data: {
      game: game || null,
      slug,
      platform: platform || null,
      region: region || null,
      source: normalizedSource,
      activationCountry: activationCountry || null,
      activationGuideTitle: activationGuideTitle || null,
      activationGuideContent: activationGuideContent || null,
      restrictionsTitle: restrictionsTitle || null,
      restrictionsContent: restrictionsContent || null,
      regionTitle: regionTitle || null,
      regionContent: regionContent || null,
      systemRequirementsEnabled: Boolean(systemRequirementsEnabled),
      systemRequirementsPlatform: systemRequirementsEnabled ? (systemRequirementsPlatform || null) : null,
      minimumOs: systemRequirementsEnabled ? (minimumOs || null) : null,
      minimumMemory: systemRequirementsEnabled ? (minimumMemory || null) : null,
      minimumStorage: systemRequirementsEnabled ? (minimumStorage || null) : null,
      minimumProcessor: systemRequirementsEnabled ? (minimumProcessor || null) : null,
      minimumGraphics: systemRequirementsEnabled ? (minimumGraphics || null) : null,
      recommendedOs: systemRequirementsEnabled ? (recommendedOs || null) : null,
      recommendedMemory: systemRequirementsEnabled ? (recommendedMemory || null) : null,
      recommendedStorage: systemRequirementsEnabled ? (recommendedStorage || null) : null,
      recommendedProcessor: systemRequirementsEnabled ? (recommendedProcessor || null) : null,
      recommendedGraphics: systemRequirementsEnabled ? (recommendedGraphics || null) : null,
      title,
      categoryId,
      subCategoryId: subCategoryId || null,
      description,
      price: numericPrice,
      isPackage: nextIsPackage,
      variantLabel: nextIsPackage ? null : (typeof variantLabel === 'string' && variantLabel.trim() ? variantLabel.trim() : null),
      discountPercent: normalizedDiscountType === 'PERCENT' ? normalizeDiscountPercent(discountValue ?? discountPercent) : 0,
      discountType: normalizedDiscountType,
      discountValue: normalizedDiscountValue,
      imageUrl,
      cardTemplate: typeof cardTemplate === 'string' && cardTemplate.trim() ? cardTemplate.trim() : 'default',
      logoUrl: logoUrl || null,
      stock: nextIsPackage ? 0 : Number(stock),
      deliveryTimeHours: Number(deliveryTimeHours),
      metaTitle,
      metaDesc,
      keywords,
      isInstant: isInstant === undefined ? true : Boolean(isInstant),
      preparationTime: preparationTime || null,
      gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
      packageItems: nextIsPackage
        ? {
            create: normalizedPackageItems.map((item) => ({
              includedListingId: item.includedListingId,
              quantity: item.quantity
            }))
          }
        : undefined,
      variants: !nextIsPackage && normalizedVariants.length > 0
        ? {
            create: normalizedVariants
          }
        : undefined,
    },
    include: getListingInclude()
  });
  res.json(serializeListing(listing, { includeSource }));
};

/**
 * @swagger
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
export const deleteListing = async (req: Request, res: Response) => {
  const listingId = req.params.id;

  try {
    const packageUsageCount = await prisma.packageItem.count({ where: { includedListingId: listingId } });
    if (packageUsageCount > 0) {
      return res.status(400).json({
        error: 'Suppression impossible: ce produit est utilise dans un package existant.'
      });
    }

    const orderItemsCount = await prisma.orderItem.count({ where: { listingId } });
    if (orderItemsCount > 0) {
      const archivedListing = await prisma.listing.update({
        where: { id: listingId },
        data: { isArchived: true, stock: 0 }
      });

      return res.json({
        success: true,
        archived: true,
        message: "Produit archive. L'historique des commandes est conserve.",
        listing: serializeListing(archivedListing)
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { listingId } });
      await tx.packageItem.deleteMany({ where: { packageListingId: listingId } });
      await tx.listing.deleteMany({ where: { id: listingId } });
    });

    res.json({ success: true, archived: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(400).json({
        error: "Suppression impossible: ce produit est encore relie a des donnees existantes."
      });
    }

    throw error;
  }
};

/**
 * @swagger
 * /api/listings/{id}:
 *   patch:
 *     summary: Update a product
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Listing'
 *     responses:
 *       200:
 *         description: Product updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 */
export const updateListing = async (req: Request, res: Response) => {
  const includeSource = isAdminRequest(req);
  const { id } = req.params;
  const {
    game,
    title,
    categoryId,
    subCategoryId,
    description,
    price,
    source,
    variantLabel,
    discountPercent,
    discountType,
    discountValue,
    imageUrl,
    cardTemplate,
    logoUrl,
    stock,
    isPackage,
    packageItems,
    deliveryTimeHours,
    metaTitle,
    metaDesc,
    keywords,
    gallery,
    isInstant,
    preparationTime,
    platform,
    region,
    activationCountry,
    activationGuideTitle,
    activationGuideContent,
    restrictionsTitle,
    restrictionsContent,
    regionTitle,
    regionContent,
    systemRequirementsEnabled,
    systemRequirementsPlatform,
    minimumOs,
    minimumMemory,
    minimumStorage,
    minimumProcessor,
    minimumGraphics,
    recommendedOs,
    recommendedMemory,
    recommendedStorage,
    recommendedProcessor,
    recommendedGraphics,
    variants
  } = req.body;

  const numericPrice = Number(price);
  const normalizedPackageItems = normalizePackageItems(packageItems);
  const normalizedVariants = normalizeVariants(variants);
  const nextIsPackage = Boolean(isPackage);
  const normalizedSource = includeSource ? normalizeSourceUrl(source) : null;
  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedDiscountValue =
    normalizedDiscountType === 'PERCENT'
      ? normalizeDiscountPercent(discountValue ?? discountPercent)
      : normalizedDiscountType === 'AMOUNT'
        ? normalizeDiscountAmount(discountValue, numericPrice)
        : 0;

  if (nextIsPackage) {
    await validatePackageItems(id, normalizedPackageItems);
  }

  const existingListing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, game: true }
  });

  if (!existingListing) {
    return res.status(404).json({ error: 'Produit introuvable.' });
  }

  const nextTitle = typeof title === 'string' ? title : existingListing.title;
  const nextGame = typeof game === 'string' ? game : existingListing.game;
  const slug = await buildUniqueProductSlug(nextTitle, { fallback: nextGame, excludeId: id });

  const listing = await prisma.listing.update({
    where: { id },
    data: {
      game: game || null,
      slug,
      platform: platform || null,
      region: region || null,
      ...(includeSource ? { source: normalizedSource } : {}),
      activationCountry: activationCountry || null,
      activationGuideTitle: activationGuideTitle || null,
      activationGuideContent: activationGuideContent || null,
      restrictionsTitle: restrictionsTitle || null,
      restrictionsContent: restrictionsContent || null,
      regionTitle: regionTitle || null,
      regionContent: regionContent || null,
      systemRequirementsEnabled: Boolean(systemRequirementsEnabled),
      systemRequirementsPlatform: systemRequirementsEnabled ? (systemRequirementsPlatform || null) : null,
      minimumOs: systemRequirementsEnabled ? (minimumOs || null) : null,
      minimumMemory: systemRequirementsEnabled ? (minimumMemory || null) : null,
      minimumStorage: systemRequirementsEnabled ? (minimumStorage || null) : null,
      minimumProcessor: systemRequirementsEnabled ? (minimumProcessor || null) : null,
      minimumGraphics: systemRequirementsEnabled ? (minimumGraphics || null) : null,
      recommendedOs: systemRequirementsEnabled ? (recommendedOs || null) : null,
      recommendedMemory: systemRequirementsEnabled ? (recommendedMemory || null) : null,
      recommendedStorage: systemRequirementsEnabled ? (recommendedStorage || null) : null,
      recommendedProcessor: systemRequirementsEnabled ? (recommendedProcessor || null) : null,
      recommendedGraphics: systemRequirementsEnabled ? (recommendedGraphics || null) : null,
      title,
      categoryId,
      subCategoryId: subCategoryId || null,
      description,
      price: numericPrice,
      isPackage: nextIsPackage,
      variantLabel: nextIsPackage ? null : (typeof variantLabel === 'string' && variantLabel.trim() ? variantLabel.trim() : null),
      discountPercent: normalizedDiscountType === 'PERCENT' ? normalizeDiscountPercent(discountValue ?? discountPercent) : 0,
      discountType: normalizedDiscountType,
      discountValue: normalizedDiscountValue,
      imageUrl,
      cardTemplate: typeof cardTemplate === 'string' && cardTemplate.trim() ? cardTemplate.trim() : 'default',
      logoUrl: logoUrl || null,
      stock: nextIsPackage ? 0 : Number(stock),
      deliveryTimeHours: Number(deliveryTimeHours),
      metaTitle,
      metaDesc,
      keywords,
      isInstant: isInstant === undefined ? true : Boolean(isInstant),
      preparationTime: preparationTime || null,
      gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
      packageItems: {
        deleteMany: {},
        ...(nextIsPackage
          ? {
              create: normalizedPackageItems.map((item) => ({
                includedListingId: item.includedListingId,
                quantity: item.quantity
              }))
            }
          : {})
      },
      variants: {
        deleteMany: {},
        ...(!nextIsPackage && normalizedVariants.length > 0
          ? {
              create: normalizedVariants
            }
          : {})
      }
    },
    include: getListingInclude()
  });

  res.json(serializeListing(listing, { includeSource }));
};

// --- CATEGORIES ---

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
export const getCategories = async (_req: Request, res: Response) => { 
    res.json(await prisma.category.findMany({ 
        include: { subCategories: { orderBy: { order: 'asc' } } },
        orderBy: [{ order: 'asc' }, { name: 'asc' }]
    })); 
};

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Category created
 */
export const createCategory = async (req: Request, res: Response) => { 
    const { name, slug, icon, imageUrl, gradient, description, order } = req.body;
    res.json(await prisma.category.create({
        data: {
            name,
            slug,
            icon,
            imageUrl,
            gradient,
            description,
            order: order ? Number(order) : 0
        }
    })); 
};

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category updated
 */
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, slug, icon, imageUrl, gradient, description, order } = req.body;
    res.json(await prisma.category.update({
        where: { id },
        data: {
            name,
            slug,
            icon,
            imageUrl,
            gradient,
            description,
            order: order !== undefined ? Number(order) : undefined
        }
    }));
};

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 */
export const deleteCategory = async (req: Request, res: Response) => { 
    await prisma.category.delete({ where: { id: req.params.id } }); 
    res.json({ success: true }); 
};

// --- SUB CATEGORIES ---

/**
 * @swagger
 * /api/subcategories:
 *   post:
 *     summary: Create a subcategory
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubCategory'
 *     responses:
 *       200:
 *         description: Subcategory created
 */
export const createSubCategory = async (req: Request, res: Response) => { 
    // Handle new fields: icon, description, order
    const { name, slug, categoryId, icon, description, order } = req.body;
    res.json(await prisma.subCategory.create({ 
        data: { 
            name, 
            slug, 
            categoryId, 
            icon: icon || 'Package', 
            description: description || '',
            order: order ? Number(order) : 0
        } 
    })); 
};

/**
 * @swagger
 * /api/subcategories/{id}:
 *   patch:
 *     summary: Update a subcategory
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subcategory updated
 */
export const updateSubCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, slug, icon, description, order } = req.body;
    res.json(await prisma.subCategory.update({
        where: { id },
        data: { name, slug, icon, description, order: order ? Number(order) : undefined }
    }));
};

/**
 * @swagger
 * /api/subcategories/{id}:
 *   delete:
 *     summary: Delete a subcategory
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subcategory deleted
 */
export const deleteSubCategory = async (req: Request, res: Response) => { 
    await prisma.subCategory.delete({ where: { id: req.params.id } }); 
    res.json({ success: true }); 
};
