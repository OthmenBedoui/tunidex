import React, { useState } from 'react';
import { ArrowRight, Building2, Headphones, Mail, MapPin, MessageCircle, Phone, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { SiteConfig } from '../types';
import { buildStoreWhatsappUrl, getStoreWhatsappNumber } from '../utils/whatsapp';

interface ContactProps {
  siteConfig: SiteConfig;
  navigateTo: (page: string, slug?: string) => void;
}

const supportTopics = [
  'Suivi de commande',
  'Facture et email',
  'Activation produit',
  'Partenariat fournisseur'
];

const Contact: React.FC<ContactProps> = ({ siteConfig, navigateTo }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Suivi de commande');
  const [message, setMessage] = useState('');
  const supportEmail = siteConfig.footerEmail || 'support@tunibots.tn';
  const supportPhone = siteConfig.footerPhone || '+216 00 000 000';
  const whatsappNumber = getStoreWhatsappNumber(siteConfig) || supportPhone;
  const address = siteConfig.footerAddress || 'Tunis, Tunisie';
  const brandName = siteConfig.siteName || 'TuniBots';
  const whatsappLink = buildStoreWhatsappUrl(siteConfig, 'Bonjour TuniBots, j ai besoin d aide.');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = [`Nom: ${name || 'Client TuniBots'}`, '', message || 'Bonjour, je souhaite avoir plus d’informations.'].join('\n');
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(`[${brandName}] ${subject}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=85"
          alt="Espace de support professionnel"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="relative mx-auto grid min-h-[470px] max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur">
              <Sparkles size={14} />
              Support TuniBots
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">Un contact direct pour chaque commande digitale.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Question sur une facture, une activation, un pack ou une commande en cours? L’équipe {brandName} vous accompagne depuis Tunis avec un suivi clair et rapide.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="theme-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-xl">
                  WhatsApp
                  <MessageCircle size={18} />
                </a>
              )}
              <button onClick={() => navigateTo('home')} className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur hover:bg-white/15">
                Retour boutique
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/10 p-6 backdrop-blur-md">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950">
                <Headphones size={24} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">Canal principal</div>
                <div className="text-xl font-black text-white">Support client</div>
              </div>
            </div>
            <div className="grid gap-3">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white hover:bg-white/15">
                <Mail size={18} />
                {supportEmail}
              </a>
              <a href={`tel:${supportPhone.replace(/\s+/g, '')}`} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white hover:bg-white/15">
                <Phone size={18} />
                {supportPhone}
              </a>
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm font-bold text-white">
                <MapPin size={18} />
                {address}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-[0.24em] theme-text-accent">Nous écrire</div>
          <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">Préparez votre demande, nous la recevons avec le bon contexte.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Pour les commandes, indiquez si possible le numéro de commande, l’email utilisé et le produit concerné. Cela permet un traitement plus rapide.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: 'Commandes suivies', text: 'Chaque commande déclenche une notification admin.' },
              { icon: Building2, title: 'Basé en Tunisie', text: 'Support local avec compréhension du marché digital tunisien.' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <item.icon className="mb-4 theme-text-accent" size={24} />
                <h3 className="font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nom</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none focus:border-indigo-500" placeholder="Votre nom" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sujet</label>
              <select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-900 outline-none focus:border-indigo-500">
                {supportTopics.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">Message</label>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 outline-none focus:border-indigo-500" placeholder="Expliquez votre besoin..." />
            </div>
            <button type="submit" className="theme-btn inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black shadow-lg">
              Envoyer la demande
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>

      <section className="pb-16">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white lg:p-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-400">Demandes fréquentes</div>
              <h2 className="text-2xl font-black">Ce que le support peut traiter rapidement</h2>
            </div>
            <ArrowRight className="hidden text-slate-500 sm:block" size={28} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {supportTopics.map((topic) => (
              <div key={topic} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-black text-white">{topic}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
