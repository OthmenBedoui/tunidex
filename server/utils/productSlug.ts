import prisma from '../prisma.js';

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const makeProductSlugBase = (title: string, fallback?: string | null) => {
  const base = slugify(title);
  if (base) return base;
  const fallbackBase = slugify(fallback || '');
  return fallbackBase || 'product';
};

export const buildUniqueProductSlug = async (
  title: string,
  options?: { fallback?: string | null; excludeId?: string }
) => {
  const base = makeProductSlugBase(title, options?.fallback);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await prisma.listing.findFirst({
      where: {
        slug: candidate,
        ...(options?.excludeId ? { id: { not: options.excludeId } } : {})
      },
      select: { id: true }
    });

    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
};

export const buildUniqueProductSlugFromInput = async (
  value: string,
  options?: { fallback?: string | null; excludeId?: string }
) => buildUniqueProductSlug(makeProductSlugBase(value, options?.fallback), options);
