
import React from 'react';
import { Listing, Category } from '../types';
import { ArrowRight, Zap, Star, Shield, Package } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface HomeProps {
  listings: Listing[];
  categories: Category[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string, slug?: string) => void;
}

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: any = LucideIcons;
  const IconComponent = icons[name] || icons[name.trim()] || icons.Package;
  return <IconComponent size={24} className={className} />;
};

const Home: React.FC<HomeProps> = ({ listings, categories, onViewProduct, navigateTo }) => {
  // Filter featured or popular items (mock logic: take first 8)
  const featuredListings = listings.slice(0, 8);

  return (
    <div className="space-y-16 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="relative px-8 py-20 md:px-16 md:py-24 max-w-4xl">
          <div className="inline-flex items-center space-x-2 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
            <Zap size={14} fill="currentColor" />
            <span>Livraison Instantanée</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Première plateforme digitale <span className="text-indigo-600">en Tunisie</span>
          </h1>
          <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
            Achetez vos crédits de jeux, abonnements streaming, logiciels et comptes premium en toute sécurité avec D17, Flouci ou Carte Bancaire.
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/50 flex items-center">
              Explorer le catalogue <ArrowRight size={20} className="ml-2" />
            </button>
            <button className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition backdrop-blur-md border border-white/10">
              Comment ça marche ?
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <section id="collections">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Collections Populaires</h2>
            <p className="text-slate-500">Découvrez nos catégories les plus visitées</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => navigateTo('category', cat.slug)}
              className="group cursor-pointer relative rounded-2xl overflow-hidden aspect-[4/5] shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Background Image */}
              {cat.imageUrl ? (
                 <img src={cat.imageUrl} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                 <div className={`absolute inset-0 ${cat.gradient || 'bg-slate-800'}`}></div>
              )}
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 opacity-60 transition-opacity group-hover:opacity-70 ${cat.gradient || 'bg-gradient-to-t from-black/80 to-transparent'}`}></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-white z-10">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md mb-3 border border-white/30 group-hover:scale-110 transition-transform duration-300">
                  <DynamicIcon name={cat.icon} className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg leading-tight mb-1">{cat.name}</h3>
                <span className="text-[10px] uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity bg-black/20 px-2 py-1 rounded">Explorer</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section>
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-3xl font-black text-slate-900">Tendances du Moment</h2>
           <button className="text-indigo-600 font-bold hover:underline flex items-center">Tout voir <ArrowRight size={16} className="ml-1" /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col group h-full">
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">{listing.game}</div>
                {listing.logoUrl && <img src={listing.logoUrl} className="absolute bottom-2 right-2 w-8 h-8 rounded bg-white p-1 shadow-sm" />}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center space-x-1 mb-2">
                   <div className="flex text-yellow-400">
                     {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                   </div>
                   <span className="text-xs text-slate-400">(4.9)</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => onViewProduct(listing)}>{listing.title}</h3>
                
                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black text-slate-900">{listing.price.toFixed(2)} <span className="text-xs font-normal text-slate-500">TND</span></span>
                  </div>
                  <button onClick={() => onViewProduct(listing)} className="bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white p-2 rounded-lg transition-colors">
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
         <div>
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
               <Zap size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Livraison Instantanée</h3>
            <p className="text-sm text-slate-500">Recevez vos codes et comptes automatiquement par email en quelques secondes.</p>
         </div>
         <div>
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
               <Shield size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Paiement Sécurisé</h3>
            <p className="text-sm text-slate-500">Transactions cryptées et sécurisées. Support D17, Flouci et cartes bancaires.</p>
         </div>
         <div>
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
               <Star size={32} />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Service Client 24/7</h3>
            <p className="text-sm text-slate-500">Une équipe dédiée disponible à tout moment pour vous assister.</p>
         </div>
      </section>
    </div>
  );
};

export default Home;
