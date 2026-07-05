import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SiteConfig } from '../../../types';
import { buildStoreWhatsappUrl } from '../../../utils/whatsapp';

type StoreWhatsAppFloatingButtonProps = {
  siteConfig: SiteConfig;
};

const StoreWhatsAppFloatingButton: React.FC<StoreWhatsAppFloatingButtonProps> = ({ siteConfig }) => {
  const href = buildStoreWhatsappUrl(siteConfig, 'Bonjour TuniBots, j ai besoin d aide pour ma commande ou un produit.');

  if (!siteConfig.whatsappFloatingButtonEnabled || !href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contacter TuniBots sur WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:bg-emerald-700"
    >
      <MessageCircle size={18} />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
};

export default StoreWhatsAppFloatingButton;
