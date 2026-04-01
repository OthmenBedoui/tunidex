import { Request, Response } from 'express';
import prisma from '../prisma.js';

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
 *     summary: Get all listings
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: List of products
 */
export const getListings = async (_req: Request, res: Response) => {
  if (!prisma?.listing) return res.status(500).json({ error: 'Prisma not initialized' });
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
 *     responses:
 *       200:
 *         description: Listing created
 */
export const createListing = async (req: Request, res: Response) => {
  const { metaTitle, metaDesc, keywords, gallery, isInstant, preparationTime, ...data } = req.body;
  if (!prisma?.listing) return res.status(500).json({ error: 'Prisma not initialized' });
  const listing = await prisma.listing.create({
    data: { 
      ...data, 
      metaTitle, 
      metaDesc, 
      keywords, 
      isInstant: isInstant === undefined ? true : Boolean(isInstant),
      preparationTime: preparationTime || null,
      gallery: Array.isArray(gallery) ? JSON.stringify(gallery) : (gallery || '[]'),
      stock: Number(data.stock), 
      price: Number(data.price), 
      deliveryTimeHours: Number(data.deliveryTimeHours) 
    }
  });
  res.json(listing);
};

// --- CATEGORIES ---

export const getCategories = async (_req: Request, res: Response) => { 
    if (!prisma?.category) return res.status(500).json({ error: 'Prisma not initialized' });
    res.json(await prisma.category.findMany({ 
        include: { subCategories: { orderBy: { order: 'asc' } } } 
    })); 
};

export const createCategory = async (req: Request, res: Response) => { 
    if (!prisma?.category) return res.status(500).json({ error: 'Prisma not initialized' });
    res.json(await prisma.category.create({ data: req.body })); 
};

export const updateCategory = async (req: Request, res: Response) => {
    if (!prisma?.category) return res.status(500).json({ error: 'Prisma not initialized' });
    const { id } = req.params;
    res.json(await prisma.category.update({ where: { id }, data: req.body }));
};

export const deleteCategory = async (req: Request, res: Response) => { 
    if (!prisma?.category) return res.status(500).json({ error: 'Prisma not initialized' });
    await prisma.category.delete({ where: { id: req.params.id } }); 
    res.json({ success: true }); 
};

// --- SUB CATEGORIES ---

export const createSubCategory = async (req: Request, res: Response) => { 
    if (!prisma?.subCategory) return res.status(500).json({ error: 'Prisma not initialized' });
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

export const updateSubCategory = async (req: Request, res: Response) => {
    if (!prisma?.subCategory) return res.status(500).json({ error: 'Prisma not initialized' });
    const { id } = req.params;
    const { name, slug, icon, description, order } = req.body;
    res.json(await prisma.subCategory.update({
        where: { id },
        data: { name, slug, icon, description, order: order ? Number(order) : undefined }
    }));
};

export const deleteSubCategory = async (req: Request, res: Response) => { 
    if (!prisma?.subCategory) return res.status(500).json({ error: 'Prisma not initialized' });
    await prisma.subCategory.delete({ where: { id: req.params.id } }); 
    res.json({ success: true }); 
};