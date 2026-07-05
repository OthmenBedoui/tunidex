import env from '../config/env.js';

type WelcomeMessagePayload = {
  botId: string;
  phone: string;
  fullName?: string | null;
  tier?: string | null;
  message: string;
};

export const WHATSAPP_BOTS = [
  { id: 'tunibots-welcome', name: 'TuniBots Welcome' },
  { id: 'tunibots-support', name: 'TuniBots Support' },
  { id: 'vip-assistant', name: 'VIP Assistant' }
] as const;

export const isSupportedWhatsappBot = (botId: string) => WHATSAPP_BOTS.some((bot) => bot.id === botId);

export const buildWelcomeMessage = (fullName?: string | null, tier?: string | null) => {
  const displayName = fullName?.trim() || 'cher client';
  const subscription = tier && tier !== 'Free' ? ` Votre abonnement ${tier} est actif.` : '';
  return `Bienvenue chez TuniBots, ${displayName}.${subscription} Nous sommes ravis de vous accueillir sur la plateforme.`;
};

export const sendWhatsappWelcomeMessage = async (payload: WelcomeMessagePayload) => {
  const webhookUrl = env.whatsappBotWebhookUrl;
  const webhookToken = env.whatsappBotWebhookToken;

  if (!webhookUrl) {
    return {
      status: 'PENDING_CONFIGURATION',
      error: 'WHATSAPP_BOT_WEBHOOK_URL is not configured.'
    };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    return {
      status: 'FAILED',
      error: responseText || `WhatsApp bot webhook failed with status ${response.status}.`
    };
  }

  return { status: 'SENT', error: null };
};

export const sendWhatsappWebhookEvent = async (payload: Record<string, unknown>) => {
  const webhookUrl = env.whatsappBotWebhookUrl;
  const webhookToken = env.whatsappBotWebhookToken;

  if (!webhookUrl) {
    return {
      status: 'PENDING_CONFIGURATION',
      error: 'WHATSAPP_BOT_WEBHOOK_URL is not configured.'
    };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    return {
      status: 'FAILED',
      error: responseText || `WhatsApp bot webhook failed with status ${response.status}.`
    };
  }

  return { status: 'SENT', error: null };
};
