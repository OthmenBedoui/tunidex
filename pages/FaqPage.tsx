import React from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { SiteConfig } from '../types';
import { sanitizeRichText } from '../utils/richText';

type FaqPageProps = {
  siteConfig: SiteConfig;
};

const FaqPage: React.FC<FaqPageProps> = ({ siteConfig }) => {
  const brandName = siteConfig.siteName || 'TuniBots';
  const title = siteConfig.faqPageTitle || 'Questions frequentes';
  const intro = siteConfig.faqPageIntro || 'Retrouvez ici les réponses rapides aux questions les plus fréquentes sur le paiement, la livraison et le support.';
  const items = (siteConfig.faqItems || []).filter((item) => item.question?.trim() && item.answer?.trim());

  const faqSchema = items.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
    }))
  } : null;

  return (
    <div className="animate-in fade-in duration-500">
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur">
              <MessageCircleQuestion size={14} />
              FAQ
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">{intro}</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="space-y-4">
          {items.map((item, index) => (
            <details
              key={`${item.question}-${index}`}
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm open:border-slate-300"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <div className="text-lg font-black text-slate-950">{item.question}</div>
                <ChevronDown className="shrink-0 text-slate-400 transition group-open:rotate-180" size={20} />
              </summary>
              <div
                className="prose prose-slate mt-4 max-w-none prose-p:text-slate-600 prose-p:leading-8 prose-li:text-slate-600"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.answer) }}
              />
            </details>
          ))}

          {items.length === 0 && (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm leading-7 text-slate-600 shadow-sm">
              La FAQ de {brandName} n’a pas encore été configurée.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default FaqPage;
