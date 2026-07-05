import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import prisma from '../prisma.js';
import { buildUniqueProductSlug, buildUniqueProductSlugFromInput } from '../utils/productSlug.js';
import { HttpError } from './httpError.js';

const variantString = (variants: Array<{ name: string; price: number; order: number }>) =>
  variants.map((variant) => `${variant.name}|${variant.price}|${variant.order}`).join('; ');

const parseVariantString = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(';')
    .map((entry, index) => {
      const [name, price, order] = entry.split('|').map((part) => part?.trim());
      const parsedPrice = Number(price);
      const parsedOrder = Number(order);
      if (!name || !Number.isFinite(parsedPrice)) return null;
      return { name, price: parsedPrice, order: Number.isInteger(parsedOrder) ? parsedOrder : index + 1 };
    })
    .filter((entry): entry is { name: string; price: number; order: number } => Boolean(entry));
};

const cellText = (value: ExcelJS.CellValue) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in value) return String(value.text || '').trim();
  if (typeof value === 'object' && 'result' in value) return String(value.result || '').trim();
  return String(value).trim();
};

const readSheetRows = (worksheet?: ExcelJS.Worksheet) => {
  if (!worksheet) return [];
  const headers = (worksheet.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((value) => cellText(value));
  const rows: Record<string, string>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as ExcelJS.CellValue[];
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cellText(values[index + 1]);
    });
    if (Object.values(record).some(Boolean)) rows.push(record);
  });

  return rows;
};

const styleSheet = (worksheet: ExcelJS.Worksheet) => {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
  worksheet.columns.forEach((column) => {
    column.width = Math.min(Math.max((column.header?.toString().length || 12) + 4, 14), 42);
  });
};

export const exportAdminSiteData = async () => {
  const [categories, subCategories, listings] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.subCategory.findMany({ include: { category: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.listing.findMany({
      include: {
        category: true,
        subCategory: true,
        variants: { orderBy: [{ order: 'asc' }, { price: 'asc' }] }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TuniBots Admin';
  workbook.created = new Date();

  const categorySheet = workbook.addWorksheet('Categories');
  categorySheet.columns = [
    { header: 'id', key: 'id' },
    { header: 'name', key: 'name' },
    { header: 'slug', key: 'slug' },
    { header: 'icon', key: 'icon' },
    { header: 'imageUrl', key: 'imageUrl' },
    { header: 'gradient', key: 'gradient' },
    { header: 'description', key: 'description' },
    { header: 'order', key: 'order' }
  ];
  categories.forEach((category) => categorySheet.addRow(category));
  styleSheet(categorySheet);

  const subCategorySheet = workbook.addWorksheet('SubCategories');
  subCategorySheet.columns = [
    { header: 'id', key: 'id' },
    { header: 'name', key: 'name' },
    { header: 'slug', key: 'slug' },
    { header: 'categoryId', key: 'categoryId' },
    { header: 'categorySlug', key: 'categorySlug' },
    { header: 'icon', key: 'icon' },
    { header: 'description', key: 'description' },
    { header: 'order', key: 'order' }
  ];
  subCategories.forEach((subCategory) => subCategorySheet.addRow({
    ...subCategory,
    categorySlug: subCategory.category.slug
  }));
  styleSheet(subCategorySheet);

  const productSheet = workbook.addWorksheet('Products');
  productSheet.columns = [
    { header: 'id', key: 'id' },
    { header: 'title', key: 'title' },
    { header: 'slug', key: 'slug' },
    { header: 'description', key: 'description' },
    { header: 'price', key: 'price' },
    { header: 'categoryId', key: 'categoryId' },
    { header: 'categorySlug', key: 'categorySlug' },
    { header: 'subCategoryId', key: 'subCategoryId' },
    { header: 'subCategorySlug', key: 'subCategorySlug' },
    { header: 'game', key: 'game' },
    { header: 'source', key: 'source' },
    { header: 'imageUrl', key: 'imageUrl' },
    { header: 'logoUrl', key: 'logoUrl' },
    { header: 'gallery', key: 'gallery' },
    { header: 'stock', key: 'stock' },
    { header: 'isInstant', key: 'isInstant' },
    { header: 'preparationTime', key: 'preparationTime' },
    { header: 'discountType', key: 'discountType' },
    { header: 'discountValue', key: 'discountValue' },
    { header: 'variantLabel', key: 'variantLabel' },
    { header: 'variants', key: 'variants' },
    { header: 'isArchived', key: 'isArchived' },
    { header: 'metaTitle', key: 'metaTitle' },
    { header: 'metaDesc', key: 'metaDesc' },
    { header: 'keywords', key: 'keywords' }
  ];
  listings.forEach((listing) => productSheet.addRow({
    ...listing,
    categorySlug: listing.category.slug,
    subCategorySlug: listing.subCategory?.slug || '',
    gallery: listing.gallery,
    variants: variantString(listing.variants)
  }));
  styleSheet(productSheet);

  return workbook.xlsx.writeBuffer();
};

export const importAdminSiteData = async (fileBase64Input: unknown) => {
  const rawFile = typeof fileBase64Input === 'string' ? fileBase64Input : '';
  if (!rawFile) throw new HttpError(400, 'Fichier Excel manquant.');

  const base64 = rawFile.includes(',') ? rawFile.split(',').pop() || '' : rawFile;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(base64, 'base64'));

  const categoryRows = readSheetRows(workbook.getWorksheet('Categories'));
  const subCategoryRows = readSheetRows(workbook.getWorksheet('SubCategories'));
  const productRows = readSheetRows(workbook.getWorksheet('Products'));

  let categoriesImported = 0;
  let subCategoriesImported = 0;
  let productsImported = 0;

  for (const row of categoryRows) {
    if (!row.name || !row.slug) continue;
    await prisma.category.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        icon: row.icon || 'Package',
        imageUrl: row.imageUrl || null,
        gradient: row.gradient || null,
        description: row.description || null,
        order: Number(row.order) || 0
      },
      update: {
        name: row.name,
        icon: row.icon || 'Package',
        imageUrl: row.imageUrl || null,
        gradient: row.gradient || null,
        description: row.description || null,
        order: Number(row.order) || 0
      }
    });
    categoriesImported += 1;
  }

  for (const row of subCategoryRows) {
    if (!row.name || !row.slug) continue;
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          ...(row.categoryId ? [{ id: row.categoryId }] : []),
          ...(row.categorySlug ? [{ slug: row.categorySlug }] : [])
        ]
      }
    });
    if (!category) continue;
    await prisma.subCategory.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        categoryId: category.id,
        icon: row.icon || 'Package',
        description: row.description || '',
        order: Number(row.order) || 0
      },
      update: {
        name: row.name,
        categoryId: category.id,
        icon: row.icon || 'Package',
        description: row.description || '',
        order: Number(row.order) || 0
      }
    });
    subCategoriesImported += 1;
  }

  for (const row of productRows) {
    if (!row.title) continue;
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          ...(row.categoryId ? [{ id: row.categoryId }] : []),
          ...(row.categorySlug ? [{ slug: row.categorySlug }] : [])
        ]
      }
    });
    if (!category) continue;

    const subCategory = row.subCategoryId || row.subCategorySlug
      ? await prisma.subCategory.findFirst({
          where: {
            OR: [
              ...(row.subCategoryId ? [{ id: row.subCategoryId }] : []),
              ...(row.subCategorySlug ? [{ slug: row.subCategorySlug }] : [])
            ]
          }
        })
      : null;

    const variants = parseVariantString(row.variants);
    const slug = row.slug
      ? await buildUniqueProductSlugFromInput(row.slug, { fallback: row.title || row.game || null, excludeId: row.id || undefined })
      : await buildUniqueProductSlug(row.title, { fallback: row.game || null, excludeId: row.id || undefined });

    const data = {
      title: row.title,
      slug,
      description: row.description || '',
      price: Number(row.price) || 0,
      categoryId: category.id,
      subCategoryId: subCategory?.id || null,
      game: row.game || null,
      source: row.source || null,
      imageUrl: row.imageUrl || '',
      logoUrl: row.logoUrl || null,
      gallery: row.gallery || '[]',
      stock: Number(row.stock) || 0,
      isInstant: row.isInstant ? row.isInstant.toLowerCase() !== 'false' : true,
      preparationTime: row.preparationTime || 'Immédiat',
      deliveryTimeHours: 24,
      discountType: row.discountType || 'NONE',
      discountValue: Number(row.discountValue) || 0,
      discountPercent: row.discountType === 'PERCENT' ? Number(row.discountValue) || 0 : 0,
      variantLabel: variants.length > 0 ? (row.variantLabel || 'Variante') : null,
      isArchived: row.isArchived ? row.isArchived.toLowerCase() === 'true' : false,
      metaTitle: row.metaTitle || null,
      metaDesc: row.metaDesc || null,
      keywords: row.keywords || null
    };

    const existing = row.id ? await prisma.listing.findUnique({ where: { id: row.id } }) : null;
    if (existing) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          ...data,
          variants: {
            deleteMany: {},
            ...(variants.length > 0 ? { create: variants } : {})
          }
        }
      });
    } else {
      await prisma.listing.create({
        data: {
          ...data,
          variants: variants.length > 0 ? { create: variants } : undefined
        }
      });
    }
    productsImported += 1;
  }

  return { success: true, categoriesImported, subCategoriesImported, productsImported };
};

const cleanOrders = async (tx: Prisma.TransactionClient) => {
  await tx.invoiceItem.deleteMany({});
  await tx.invoice.deleteMany({});
  await tx.payment.deleteMany({});
  await tx.loyaltyPoint.deleteMany({});
  await tx.orderItem.deleteMany({});
  await tx.order.deleteMany({});
  await tx.dailyStat.deleteMany({});
};

const cleanProducts = async (tx: Prisma.TransactionClient) => {
  await cleanOrders(tx);
  await tx.cartItem.deleteMany({});
  await tx.packageItem.deleteMany({});
  await tx.productVariant.deleteMany({});
  await tx.listing.deleteMany({});
};

const cleanCategories = async (tx: Prisma.TransactionClient) => {
  await cleanProducts(tx);
  await tx.subCategory.deleteMany({});
  await tx.category.deleteMany({});
};

export const cleanAdminSiteData = async (payload: { table?: unknown; confirmation?: unknown }) => {
  const table = String(payload.table || '');
  const confirmation = String(payload.confirmation || '');
  if (confirmation !== 'CONFIRM CLEAN') {
    throw new HttpError(400, 'Confirmation invalide. Tapez CONFIRM CLEAN.');
  }

  const before = {
    categories: await prisma.category.count(),
    subCategories: await prisma.subCategory.count(),
    products: await prisma.listing.count(),
    orders: await prisma.order.count(),
    users: await prisma.user.count()
  };

  await prisma.$transaction(async (tx) => {
    if (table === 'orders') {
      await cleanOrders(tx);
    } else if (table === 'products') {
      await cleanProducts(tx);
    } else if (table === 'categories') {
      await cleanCategories(tx);
    } else if (table === 'users') {
      await cleanOrders(tx);
      await tx.cartItem.deleteMany({});
      await tx.cart.deleteMany({});
      await tx.user.deleteMany({ where: { role: { notIn: ['ADMIN', 'AGENT'] } } });
    } else if (table === 'all') {
      await cleanCategories(tx);
      await tx.cartItem.deleteMany({});
      await tx.cart.deleteMany({});
      await tx.sequence.deleteMany({});
      await tx.user.deleteMany({ where: { role: { notIn: ['ADMIN', 'AGENT'] } } });
    } else {
      throw new Error('Table non supportée.');
    }
  });

  const after = {
    categories: await prisma.category.count(),
    subCategories: await prisma.subCategory.count(),
    products: await prisma.listing.count(),
    orders: await prisma.order.count(),
    users: await prisma.user.count()
  };

  return { success: true, table, before, after };
};
