import { NotificationType, Prisma } from '@prisma/client';
import prisma from '../prisma.js';
import { notifyUser } from './notificationService.js';

const STATUS_LABELS: Record<string, string> = {
  DRAFT_CART: 'Panier brouillon',
  IN_PROGRESS: 'En cours',
  PAID: 'Payee',
  DELIVERED: 'Livree',
  REGISTERED: 'Enregistree',
  PENDING_PAYMENT: 'Paiement en attente',
  PAYMENT_UNDER_REVIEW: 'Paiement en verification',
  PAYMENT_APPROVED: 'Paiement approuve',
  PAYMENT_REJECTED: 'Paiement rejete',
  IN_DELIVERY: 'En livraison',
  PAYMENT_RECEIVED: 'Paiement recu',
  COMPLETED: 'Terminee',
  CANCELLED: 'Annulee',
  REFUNDED: 'Remboursee'
};

const buildStatusNotificationContent = (orderNumber: string, status: string, previousStatus?: string | null) => {
  const currentLabel = STATUS_LABELS[status] || status;
  const previousLabel = previousStatus ? (STATUS_LABELS[previousStatus] || previousStatus) : null;

  switch (status) {
    case 'PAYMENT_UNDER_REVIEW':
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Commande enregistree',
        message: `Votre commande ${orderNumber} a bien ete enregistree et votre paiement est en cours de verification.`
      };
    case 'PAYMENT_APPROVED':
    case 'PAID':
      return {
        type: 'PAYMENT_APPROVED' as NotificationType,
        title: 'Paiement approuve',
        message: `Le paiement de votre commande ${orderNumber} a ete approuve. ${status === 'PAID' ? 'La commande est maintenant reglee.' : 'Preparation en cours.'}`
      };
    case 'PAYMENT_REJECTED':
      return {
        type: 'PAYMENT_REJECTED' as NotificationType,
        title: 'Paiement rejete',
        message: `Le paiement de votre commande ${orderNumber} a ete rejete. Veuillez verifier vos informations et recontacter le support si besoin.`
      };
    case 'IN_DELIVERY':
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Livraison en preparation',
        message: `Votre commande ${orderNumber} est en cours de preparation pour la livraison.`
      };
    case 'DELIVERED':
      return {
        type: 'ORDER_DELIVERED' as NotificationType,
        title: 'Commande livree',
        message: `Votre commande ${orderNumber} a ete livree. Consultez votre espace client pour voir le contenu.`
      };
    case 'COMPLETED':
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Commande terminee',
        message: `Votre commande ${orderNumber} est terminee. Merci pour votre confiance.`
      };
    case 'CANCELLED':
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Commande annulee',
        message: `Votre commande ${orderNumber} a ete annulee.`
      };
    case 'REFUNDED':
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Commande remboursee',
        message: `Votre commande ${orderNumber} a ete remboursee.`
      };
    default:
      return {
        type: 'SYSTEM' as NotificationType,
        title: 'Statut de commande mis a jour',
        message: previousLabel
          ? `Votre commande ${orderNumber} est passee de "${previousLabel}" a "${currentLabel}".`
          : `Le statut de votre commande ${orderNumber} est maintenant "${currentLabel}".`
      };
  }
};

export const getOrderStatusNotificationContent = (orderNumber: string, status: string, previousStatus?: string | null) =>
  buildStatusNotificationContent(orderNumber, status, previousStatus);

export const notifyClientOrderStatus = async (params: {
  orderId: string;
  status: string;
  previousStatus?: string | null;
  force?: boolean;
}) => {
  if (
    !params.force
    && (params.status === 'PAYMENT_APPROVED' || params.status === 'PAYMENT_REJECTED' || params.status === 'DELIVERED' || params.status === 'PAID')
  ) {
    return null;
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      id: true,
      orderNumber: true,
      userId: true
    }
  });

  if (!order?.userId) return null;

  const content = buildStatusNotificationContent(order.orderNumber, params.status, params.previousStatus);
  return notifyUser({
    userId: order.userId,
    orderId: order.id,
    type: content.type,
    title: content.title,
    message: content.message,
    metadata: {
      status: params.status,
      previousStatus: params.previousStatus || null
    } as Prisma.InputJsonValue,
    dedupeKey: `${content.type}:${order.id}:${params.status}`
  });
};
