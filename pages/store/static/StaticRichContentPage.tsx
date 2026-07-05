import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { SiteConfig } from '../../../types';
import { sanitizeRichText } from '../../../utils/richText';

type StaticRichContentPageProps = {
  eyebrow: string;
  title: string;
  intro?: string;
  content: string;
  siteConfig: SiteConfig;
  ctaLabel?: string;
  ctaHref?: string;
};

const StaticRichContentPage: React.FC<StaticRichContentPageProps> = ({
  eyebrow,
  title,
  intro,
  content,
  siteConfig,
  ctaLabel,
  ctaHref
}) => {
  const supportEmail = siteConfig.footerEmail || 'support@tunibots.tn';
  const brandName = siteConfig.siteName || 'TuniBots';
  const safeContent = sanitizeRichText(content || '<p>Contenu indisponible.</p>');

  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur">
              <ShieldCheck size={14} />
              {eyebrow}
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-6xl">{title}</h1>
            {intro && <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">{intro}</p>}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div
              className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-950 prose-p:text-slate-600 prose-p:leading-8 prose-li:text-slate-600 prose-li:leading-8"
              dangerouslySetInnerHTML={{ __html: safeContent }}
            />
          </article>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Support {brandName}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Pour une question liée à une commande, à un paiement ou à une activation, contactez l’équipe avec votre numéro de commande.
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                {ctaLabel || 'Contacter le support'}
                <ArrowRight size={16} />
              </a>
            </div>

            {ctaHref && (
              <a
                href={ctaHref}
                className="block rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-sm leading-7 text-emerald-950 shadow-sm"
              >
                <div className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Accès rapide</div>
                <div className="mt-2 font-black">Besoin d’un accompagnement plus direct ?</div>
                <div className="mt-2">Passez sur WhatsApp pour nous envoyer votre contexte en un clic.</div>
              </a>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default StaticRichContentPage;
