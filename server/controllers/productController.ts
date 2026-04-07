import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';

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
export const getListings = async (_req: Request, res: Response) => {
  const listings = await prisma.listing.findMany({ include: { category: true, subCategory: true }, orderBy: { createdAt: 'desc' } });
  res.json(listings.map((l: { gallery: string | null }) => ({ ...l, gallery: JSON.parse(l.gallery || '[]') })));
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
  const {
    game,
    title,
    categoryId,
    subCategoryId,
    description,
    price,
    discountPercent,
    discountType,
    discountValue,
    imageUrl,
    logoUrl,
    stock,
    deliveryTimeHours,
    metaTitle,
    metaDesc,
    keywords,
    gallery,
    isInstant,
    preparationTime
  } = req.body;

  const numericPrice = Number(price);
  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedDiscountValue =
    normalizedDiscountType === 'PERCENT'
      ? normalizeDiscountPercent(discountValue ?? discountPercent)
      : normalizedDiscountType === 'AMOUNT'
        ? normalizeDiscountAmount(discountValue, numericPrice)
        : 0;

  const listing = await prisma.listing.create({
    data: {
      game: game || null,
      title,
      categoryId,
      subCategoryId: subCategoryId || null,
      description,
      price: numericPrice,
      discountPercent: normalizedDiscountType === 'PERCENT' ? normalizeDiscountPercent(discountValue ?? discountPercent) : 0,
      discountType: normalizedDiscountType,
      discountValue: normalizedDiscountValue,
      imageUrl,
      logoUrl: logoUrl || null,
      stock: Number(stock),
      deliveryTimeHours: Number(deliveryTimeHours),
      metaTitle,
      metaDesc,
      keywords,
      isInstant: isInstant === undefined ? true : Boolean(isInstant),
      preparationTime: preparationTime || null,
      gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
    }
  });
  res.json({ ...listing, gallery: JSON.parse(listing.gallery || '[]') });
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
        listing: { ...archivedListing, gallery: JSON.parse(archivedListing.gallery || '[]') }
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { listingId } });
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
  const { id } = req.params;
  const {
    game,
    title,
    categoryId,
    subCategoryId,
    description,
    price,
    discountPercent,
    discountType,
    discountValue,
    imageUrl,
    logoUrl,
    stock,
    deliveryTimeHours,
    metaTitle,
    metaDesc,
    keywords,
    gallery,
    isInstant,
    preparationTime
  } = req.body;

  const numericPrice = Number(price);
  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedDiscountValue =
    normalizedDiscountType === 'PERCENT'
      ? normalizeDiscountPercent(discountValue ?? discountPercent)
      : normalizedDiscountType === 'AMOUNT'
        ? normalizeDiscountAmount(discountValue, numericPrice)
        : 0;

  const listing = await prisma.listing.update({
    where: { id },
    data: {
      game: game || null,
      title,
      categoryId,
      subCategoryId: subCategoryId || null,
      description,
      price: numericPrice,
      discountPercent: normalizedDiscountType === 'PERCENT' ? normalizeDiscountPercent(discountValue ?? discountPercent) : 0,
      discountType: normalizedDiscountType,
      discountValue: normalizedDiscountValue,
      imageUrl,
      logoUrl: logoUrl || null,
      stock: Number(stock),
      deliveryTimeHours: Number(deliveryTimeHours),
      metaTitle,
      metaDesc,
      keywords,
      isInstant: isInstant === undefined ? true : Boolean(isInstant),
      preparationTime: preparationTime || null,
      gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
    }
  });

  res.json({ ...listing, gallery: JSON.parse(listing.gallery || '[]') });
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
        include: { subCategories: { orderBy: { order: 'asc' } } } 
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
    res.json(await prisma.category.create({ data: req.body })); 
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
    res.json(await prisma.category.update({ where: { id }, data: req.body }));
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
