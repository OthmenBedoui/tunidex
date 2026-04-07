
import React from 'react';
import { Listing, Category, SiteConfig } from '../types';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, Star, Shield, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getListingDiscountLabel, getListingFinalPrice, hasListingDiscount } from '../utils/pricing';
import PriceDisplay from '../components/PriceDisplay';

interface HomeProps {
  listings: Listing[];
  categories: Category[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string, slug?: string) => void;
  siteConfig: SiteConfig;
}

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[name] || icons[name.trim()] || icons.Package;
  return <IconComponent size={24} className={className} />;
};

const HorizontalListingCard: React.FC<{ listing: Listing; onViewProduct: (listing: Listing) => void }> = ({ listing, onViewProduct }) => {
  const hasDiscount = hasListingDiscount(listing);
  const discountedPrice = getListingFinalPrice(listing);
  const discountLabel = getListingDiscountLabel(listing);

  return (
    <article className="min-w-[280px] max-w-[280px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col group snap-start">
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">{listing.game}</div>
        {listing.isInstant && (
          <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold flex items-center shadow-sm">
            <Zap size={10} className="mr-1 fill-current" /> Instant
          </div>
        )}
        {hasDiscount && (
          <div className="absolute left-3 bottom-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
            {discountLabel}
          </div>
        )}
        {listing.logoUrl && <img src={listing.logoUrl} alt={`${listing.game || listing.title} logo`} className="absolute bottom-2 right-2 w-8 h-8 rounded bg-white p-1 shadow-sm" />}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center space-x-1 mb-2">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
          </div>
          <span className="text-xs text-slate-400">(4.9)</span>
        </div>
        <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => onViewProduct(listing)}>
          {listing.title}
        </h3>
        <div className="mt-auto pt-4 border-t border-slate-50 flex items-end justify-between gap-3">
          <PriceDisplay listing={listing} priceClassName="text-xl font-black text-slate-900" />
          <button onClick={() => onViewProduct(listing)} className="bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white p-2 rounded-lg transition-colors">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </article>
  );
};

const ProductRailSection: React.FC<{
  railId: string;
  title: string;
  subtitle: string;
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  accent?: React.ReactNode;
}> = ({ railId, title, subtitle, listings, onViewProduct, accent }) => {
  const scrollRail = (direction: 'left' | 'right') => {
    const rail = document.getElementById(railId);
    if (!rail) return;
    rail.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (listings.length === 0) return null;

  return (
    <section>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-3xl font-black text-slate-900">{title}</h2>
            {accent}
          </div>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button type="button" onClick={() => scrollRail('left')} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => scrollRail('right')} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div id={railId} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
        {listings.map((listing) => (
          <HorizontalListingCard key={listing.id} listing={listing} onViewProduct={onViewProduct} />
        ))}
      </div>
    </section>
  );
};

const Home: React.FC<HomeProps> = ({ listings, categories, onViewProduct, navigateTo, siteConfig }) => {
  const featuredListings = listings.slice(0, 12);
  const discountedListings = listings
    .filter((listing) => hasListingDiscount(listing))
    .sort((a, b) => getListingFinalPrice(a) - getListingFinalPrice(b));
  const heroSlides = siteConfig.heroSlides?.filter((slide) => slide.imageUrl) || [];
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);

  React.useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  React.useEffect(() => {
    if (activeSlideIndex >= heroSlides.length) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, heroSlides.length]);

  const activeSlide = heroSlides[activeSlideIndex];

  const handleHeroAction = () => {
    if (!activeSlide) {
      document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (activeSlide.linkType === 'listing' && activeSlide.linkTarget) {
      const listing = listings.find((item) => item.id === activeSlide.linkTarget);
      if (listing) onViewProduct(listing);
      return;
    }

    if (activeSlide.linkType === 'category' && activeSlide.linkTarget) {
      navigateTo('category', activeSlide.linkTarget);
      return;
    }

    if (activeSlide.linkType === 'url' && activeSlide.linkTarget) {
      window.open(activeSlide.linkTarget, '_blank', 'noopener,noreferrer');
      return;
    }

    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-700"
          style={{
            backgroundImage: `url('${activeSlide?.imageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80'}')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="relative px-8 md:px-16 max-w-4xl flex items-center" style={{ minHeight: `${siteConfig.heroSlideHeight || 440}px` }}>
          <div className="py-20 md:py-24">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)', color: 'var(--theme-accent)', border: '1px solid color-mix(in srgb, var(--theme-accent) 35%, transparent)' }}>
            <Zap size={14} fill="currentColor" />
            <span>{activeSlide?.badge || 'Livraison Instantanée'}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            {activeSlide?.title ? (
              activeSlide.title
            ) : (
              <>Première plateforme digitale <span className="text-indigo-600">en Tunisie</span></>
            )}
          </h1>
          <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
            {activeSlide?.subtitle || 'Achetez vos crédits de jeux, abonnements streaming, logiciels et comptes premium en toute sécurité avec D17, Flouci ou Carte Bancaire.'}
          </p>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleHeroAction} className="theme-btn px-8 py-4 rounded-xl font-bold shadow-lg shadow-slate-900/30 flex items-center">
              {activeSlide?.ctaLabel || 'Explorer le catalogue'} <ArrowRight size={20} className="ml-2" />
            </button>
            <button onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })} className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/20 transition backdrop-blur-md border border-white/10">
              Comment ça marche ?
            </button>
          </div>
          </div>
        </div>
        {heroSlides.length > 1 && (
          <>
            <div className="absolute bottom-6 left-8 md:left-16 flex items-center gap-2 z-10">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveSlideIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeSlideIndex ? 'w-10 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'}`}
                  aria-label={`Aller au slide ${index + 1}`}
                />
              ))}
            </div>
            <div className="absolute right-6 bottom-6 z-10 flex gap-2">
              <button type="button" onClick={() => setActiveSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-sm hover:bg-white/10">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-sm hover:bg-white/10">
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
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

      <ProductRailSection
        railId="home-trending-rail"
        title="Tendances du Moment"
        subtitle="Une liste horizontale des offres les plus consultées du moment."
        listings={featuredListings}
        onViewProduct={onViewProduct}
      />

      <ProductRailSection
        railId="home-discounts-rail"
        title="Produits Soldés"
        subtitle="Toutes les offres avec remise active, regroupées dans une section promo dédiée."
        listings={discountedListings}
        onViewProduct={onViewProduct}
        accent={
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-600">
            <Tag size={12} /> Promo
          </span>
        }
      />

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
