import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Category, SiteConfig } from '../../../types';
import StoreDynamicIcon from './StoreDynamicIcon';

interface StoreFooterProps {
  categories: Category[];
  navigateTo: (page: string, slug?: string) => void;
  siteConfig: SiteConfig;
}

const StoreFooter: React.FC<StoreFooterProps> = ({ categories, navigateTo, siteConfig }) => {
  const logoSize = Math.min(80, Math.max(24, Number(siteConfig.logoSize || 32)));
  const footerLogoSize = Math.min(88, Math.max(32, logoSize + 8));

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-slate-800 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_30%)]" />
      <div className="relative max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              {siteConfig.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig.siteName}
                  className="w-auto rounded-lg bg-white/5 p-1 object-contain"
                  style={{ height: `${footerLogoSize}px` }}
                />
              ) : (
                <div
                  className="theme-bg-accent flex items-center justify-center rounded-2xl font-black text-white shadow-lg"
                  style={{ height: `${footerLogoSize}px`, width: `${footerLogoSize}px` }}
                >
                  {siteConfig.siteName.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
                  {siteConfig.footerTagline || 'Marketplace digitale premium'}
                </div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-300">
              {siteConfig.footerDescription || 'La destination premium pour vos comptes, licences, abonnements, outils IA et services digitaux en Tunisie.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Paiement sécurisé', 'Livraison rapide', 'Support local'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Navigation</h4>
            <div className="space-y-3 text-sm text-slate-300">
              <button onClick={() => navigateTo('home')} className="block hover:text-white">Accueil</button>
              <button onClick={() => navigateTo('about')} className="block hover:text-white">À propos</button>
              <button onClick={() => navigateTo('contact')} className="block hover:text-white">Contact</button>
              <button onClick={() => navigateTo('privacy-policy')} className="block hover:text-white">Privacy Policy</button>
              <button onClick={() => navigateTo('terms')} className="block hover:text-white">Terms of Service</button>
              <button onClick={() => navigateTo('data-deletion')} className="block hover:text-white">Data Deletion</button>
              <button onClick={() => navigateTo('cart')} className="block hover:text-white">Panier</button>
              <button onClick={() => navigateTo('login')} className="block hover:text-white">Connexion</button>
              <button onClick={() => navigateTo('register')} className="block hover:text-white">
                {siteConfig.headerCtaLabel || "S'inscrire"}
              </button>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Catégories</h4>
            <div className="space-y-3 text-sm text-slate-300">
              {categories.slice(0, 5).map((category) => (
                <button key={category.id} onClick={() => navigateTo('category', category.slug)} className="flex items-center gap-2 hover:text-white">
                  <StoreDynamicIcon name={category.icon} />
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Contact</h4>
            <div className="space-y-3 text-sm text-slate-300">
              <button onClick={() => navigateTo('contact')} className="flex items-center gap-2 hover:text-white">
                <LucideIcons.Headphones size={16} className="theme-text-accent" />
                Centre de contact
              </button>
              {siteConfig.footerEmail && (
                <a href={`mailto:${siteConfig.footerEmail}`} className="flex items-center gap-2 hover:text-white">
                  <LucideIcons.Mail size={16} className="theme-text-accent" />
                  {siteConfig.footerEmail}
                </a>
              )}
              {siteConfig.footerPhone && (
                <a href={`tel:${siteConfig.footerPhone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-white">
                  <LucideIcons.Phone size={16} className="theme-text-accent" />
                  {siteConfig.footerPhone}
                </a>
              )}
              {siteConfig.footerWhatsapp && (
                <a
                  href={`https://wa.me/${siteConfig.footerWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <LucideIcons.MessageCircle size={16} className="theme-text-accent" />
                  WhatsApp
                </a>
              )}
              {siteConfig.footerAddress && (
                <div className="flex items-center gap-2">
                  <LucideIcons.MapPin size={16} className="theme-text-accent" />
                  {siteConfig.footerAddress}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} {siteConfig.footerCopyright || 'Tous droits réservés.'}</div>
          <div className="font-bold uppercase tracking-[0.24em] text-slate-600">Plateforme premium</div>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooter;
