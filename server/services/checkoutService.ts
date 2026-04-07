import prisma from '../prisma.js';

type CheckoutItemInput = {
  listingId: string;
  quantity: number;
};

export type GuestCheckoutInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  paymentMethod?: string;
  items: CheckoutItemInput[];
  userId?: string;
  source?: 'GUEST' | 'AUTHENTICATED';
};

type CheckoutLine = {
  listingId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  titleSnapshot: string;
};

const getListingFinalPrice = (listing: { price: number; discountType?: string | null; discountValue?: number | null; discountPercent?: number | null }) => {
  if (listing.discountType === 'PERCENT') {
    return Math.max(0, listing.price * (1 - (Number(listing.discountValue ?? listing.discountPercent ?? 0) / 100)));
  }
  if (listing.discountType === 'AMOUNT') {
    return Math.max(0, listing.price - Number(listing.discountValue ?? 0));
  }
  if ((listing.discountPercent ?? 0) > 0) {
    return Math.max(0, listing.price * (1 - (Number(listing.discountPercent) / 100)));
  }
  return listing.price;
};

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.trim().replace(/\s+/g, '');

export const validateGuestCheckoutInput = (input: GuestCheckoutInput) => {
  const firstName = normalizeText(input.firstName);
  const lastName = normalizeText(input.lastName);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const items = (input.items || [])
    .filter((item) => item && typeof item.listingId === 'string')
    .map((item) => ({
      listingId: item.listingId.trim(),
      quantity: Number(item.quantity || 0)
    }))
    .filter((item) => item.listingId && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!firstName || firstName.length < 2) {
    throw new Error('Le prénom est obligatoire.');
  }
  if (!lastName || lastName.length < 2) {
    throw new Error('Le nom est obligatoire.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Adresse email invalide.');
  }
  if (!/^[+\d][\d\s()-]{7,}$/.test(input.phone || '')) {
    throw new Error('Numéro de téléphone invalide.');
  }
  if (items.length === 0) {
    throw new Error('Votre panier est vide.');
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    paymentMethod: input.paymentMethod?.trim() || null,
    items,
    userId: input.userId,
    source: input.source || 'GUEST'
  };
};

const nextSequenceValue = async (tx: typeof prisma, key: string) => {
  await tx.sequence.upsert({
    where: { key },
    create: { key, value: 0 },
    update: {}
  });

  const updated = await tx.sequence.update({
    where: { key },
    data: { value: { increment: 1 } }
  });

  return updated.value;
};

const formatDocumentNumber = (prefix: string, year: number, value: number) => `${prefix}-${year}-${String(value).padStart(6, '0')}`;

const buildCheckoutLines = async (items: CheckoutItemInput[]): Promise<CheckoutLine[]> => {
  const listingIds = [...new Set(items.map((item) => item.listingId))];
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, isArchived: false }
  });

  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));

  return items.map((item) => {
    const listing = listingMap.get(item.listingId);
    if (!listing) {
      throw new Error('Un ou plusieurs produits du panier sont introuvables.');
    }
    const unitPrice = getListingFinalPrice(listing);
    return {
      listingId: listing.id,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      titleSnapshot: listing.title
    };
  });
};

export const createCheckoutOrder = async (rawInput: GuestCheckoutInput) => {
  const input = validateGuestCheckoutInput(rawInput);
  const lines = await buildCheckoutLines(input.items);
  const totalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const now = new Date();
  const year = now.getUTCFullYear();

  const order = await prisma.$transaction(async (tx) => {
    const orderSequence = await nextSequenceValue(tx, `ORDER-${year}`);
    const invoiceSequence = await nextSequenceValue(tx, `INVOICE-${year}`);
    const orderNumber = formatDocumentNumber('CMD', year, orderSequence);
    const invoiceNumber = formatDocumentNumber('FAC', year, invoiceSequence);

    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        status: 'REGISTERED',
        amount: totalAmount,
        currency: 'TND',
        source: input.source,
        customerFirstName: input.firstName,
        customerLastName: input.lastName,
        customerEmail: input.email,
        customerPhone: input.phone,
        paymentMethod: input.paymentMethod,
        items: {
          create: lines.map((line) => ({
            listingId: line.listingId,
            quantity: line.quantity,
            priceSnapshot: line.unitPrice,
            titleSnapshot: line.titleSnapshot
          }))
        }
      },
      include: { items: true }
    });

    const orderItemsByListingId = new Map(createdOrder.items.map((item) => [item.listingId, item]));

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        orderId: createdOrder.id,
        type: 'PROFORMA',
        status: 'PENDING_PAYMENT',
        currency: 'TND',
        orderNumber,
        customerFirstName: input.firstName,
        customerLastName: input.lastName,
        customerEmail: input.email,
        customerPhone: input.phone,
        totalAmount,
        items: {
          create: lines.map((line) => ({
            orderItemId: orderItemsByListingId.get(line.listingId)?.id,
            listingId: line.listingId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            titleSnapshot: line.titleSnapshot
          }))
        }
      }
    });

    return tx.order.findUniqueOrThrow({
      where: { id: createdOrder.id },
      include: {
        items: true,
        invoice: { include: { items: true } },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });
  });

  return {
    ...order,
    buyerId: order.userId || order.id,
    buyer: order.user
  };
};

export const clearUserCart = async (userId: string) => {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
};
