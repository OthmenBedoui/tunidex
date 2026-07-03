import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CategoryHeroProps {
  title: string;
  subtitle: string;
  heroGradient: string;
  heroImage: string;
  icon: React.ReactNode;
  navigateTo: (page: string, slug?: string) => void;
}

const CategoryHero: React.FC<CategoryHeroProps> = ({ title, subtitle, heroGradient, heroImage, icon, navigateTo }) => (
  <div className={`relative overflow-hidden rounded-3xl border border-slate-200 shadow-xl ${heroGradient.includes('bg-') ? heroGradient : 'bg-slate-900'}`}>
    <div className="absolute inset-0 opacity-20">
      <img src={heroImage} alt={title} className="h-full w-full object-cover" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40" />
    <div className="relative max-w-4xl px-8 py-12 text-white md:px-12 md:py-16">
      <button onClick={() => navigateTo('home')} className="mb-6 flex items-center text-sm font-medium text-slate-300 hover:text-white">
        <ArrowLeft size={16} className="mr-2" /> Retour a l'accueil
      </button>
      <div className="mb-4 flex items-center space-x-3">
        <div className="rounded-lg border border-white/20 bg-white/10 p-2 backdrop-blur-sm">{icon}</div>
        <span className="text-sm font-bold uppercase tracking-wider text-slate-200 opacity-80">{subtitle}</span>
      </div>
      <h1 className="text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
    </div>
  </div>
);

export default CategoryHero;
