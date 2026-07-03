import React from 'react';
import { Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import FloatingBrandCardsSection from '../../components/store-client/home/FloatingBrandCardsSection';
import CollectionsSection from '../../components/store-client/home/CollectionsSection';
import HeroSliderSection from '../../components/store-client/home/HeroSliderSection';
import ProductRailSection from '../../components/store-client/home/ProductRailSection';
import StoreCoverSection from '../../components/store-client/home/StoreCoverSection';
import TrustBadgesSection from '../../components/store-client/home/TrustBadgesSection';
import { StoreHomePageProps } from '../../components/store-client/home/types';
import { Listing } from '../../types';
import { getListingFinalPrice, hasListingDiscount } from '../../utils/pricing';
import { getMergedStoreSections, isStoreSectionEnabled } from '../../utils/storeSections';

const isVideoMedia = (src?: string, mediaType?: 'image' | 'video') => {
  if (mediaType === 'video') return true;
  if (!src) return false;
  return src.startsWith('data:video/') || /\.(mp4|webm)(\?|#|$)/i.test(src);
};

const HomePage: React.FC<StoreHomePageProps> = ({ listings, categories, onViewProduct, navigateTo, siteConfig }) => {
  const packageListings = listings.filter((listing) => listing.isPackage);
  const featuredListings = listings.slice(0, 12);
  const topProductListings = [...listings].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 12);
  const giftCardListings = listings
    .filter((listing) => {
      const text = `${listing.title} ${listing.game || ''} ${listing.category?.name || ''} ${listing.subCategory?.name || ''}`.toLowerCase();
      return text.includes('gift') || text.includes('carte cadeau') || text.includes('gift card');
    })
    .slice(0, 12);
  const discountedListings = listings.filter((listing) => hasListingDiscount(listing)).sort((a, b) => getListingFinalPrice(a) - getListingFinalPrice(b));
  const storeSections = getMergedStoreSections(siteConfig);
  const sectionEnabled = (sectionId: string) => isStoreSectionEnabled(siteConfig, sectionId);
  const sectionOrder = (sectionId: string) => storeSections.find((section) => section.id === sectionId)?.order || 999;
  const heroSlides = siteConfig.heroSlides?.filter((slide) => slide.imageUrl) || [];
  const heroPromoBanners = siteConfig.heroPromoBanners?.filter((banner) => banner.imageUrl) || [];
  const floatingBrandCards = siteConfig.floatingBrandCards?.filter((card) => card.imageUrl) || [];
  const coverListings = (siteConfig.coverListingIds || [])
    .map((id) => listings.find((listing) => listing.id === id && !listing.isArchived))
    .filter((listing): listing is Listing => Boolean(listing));
  const coverCardListings = coverListings.length > 0 ? coverListings.slice(0, 5) : featuredListings.slice(0, 5);
  const coverBackgroundUrl = siteConfig.coverBackgroundUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80';
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

  const handleHeroLink = (linkType?: 'listing' | 'category' | 'url' | 'collections', linkTarget?: string) => {
    if (!linkType || linkType === 'collections') {
      document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (linkType === 'listing' && linkTarget) {
      const listing = listings.find((item) => item.id === linkTarget);
      if (listing) onViewProduct(listing);
      return;
    }

    if (linkType === 'category' && linkTarget) {
      navigateTo('category', linkTarget);
      return;
    }

    if (linkType === 'url' && linkTarget) {
      window.open(linkTarget, '_blank', 'noopener,noreferrer');
    }
  };

  const handleHeroAction = () => {
    handleHeroLink(activeSlide?.linkType, activeSlide?.linkTarget);
  };

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-16">
      {sectionEnabled('store-cover') && (
        <StoreCoverSection
          coverBackgroundUrl={coverBackgroundUrl}
          coverCardListings={coverCardListings}
          onViewProduct={onViewProduct}
          order={sectionOrder('store-cover')}
        />
      )}

      {sectionEnabled('hero-slider') && (
        <HeroSliderSection
          activeSlide={activeSlide}
          activeSlideIndex={activeSlideIndex}
          heroSlides={heroSlides}
          heroPromoBanners={heroPromoBanners}
          onHeroAction={handleHeroAction}
          onHeroLink={handleHeroLink}
          onSelectSlide={setActiveSlideIndex}
          onPrevSlide={() => setActiveSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
          onNextSlide={() => setActiveSlideIndex((prev) => (prev + 1) % heroSlides.length)}
          isVideoMedia={isVideoMedia}
          order={sectionOrder('hero-slider')}
        />
      )}

      {sectionEnabled('floating-brand-cards') && floatingBrandCards.length > 0 && (
        <FloatingBrandCardsSection
          floatingBrandCards={floatingBrandCards}
          onHeroLink={handleHeroLink}
          order={sectionOrder('floating-brand-cards')}
        />
      )}

      {sectionEnabled('collections') && (
        <CollectionsSection categories={categories} navigateTo={navigateTo} order={sectionOrder('collections')} />
      )}

      {sectionEnabled('packages') && (
        <div style={{ order: sectionOrder('packages') }}>
          <ProductRailSection
            railId="home-packages-rail"
            title="Packages Disponibles"
            subtitle="Des packs prêts à l’achat avec un prix global plus avantageux que l’achat séparé."
            listings={packageListings}
            onViewProduct={onViewProduct}
            accent={
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600">
                <LucideIcons.Package size={12} /> Bundle
              </span>
            }
          />
        </div>
      )}

      {sectionEnabled('top-products') && (
        <div style={{ order: sectionOrder('top-products') }}>
          <ProductRailSection
            railId="home-top-products-rail"
            title="Top Products"
            subtitle="Les produits les plus performants du store, prêts à être mis en avant."
            listings={topProductListings}
            onViewProduct={onViewProduct}
            accent={
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                <LucideIcons.Trophy size={12} /> Top
              </span>
            }
          />
        </div>
      )}

      {sectionEnabled('gift-cards') && (
        <div style={{ order: sectionOrder('gift-cards') }}>
          <ProductRailSection
            railId="home-gift-cards-rail"
            title="Gift Cards"
            subtitle="Cartes cadeau, crédits prépayés et offres digitales faciles à offrir."
            listings={giftCardListings}
            onViewProduct={onViewProduct}
            accent={
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                <LucideIcons.Gift size={12} /> Gift
              </span>
            }
          />
        </div>
      )}

      {sectionEnabled('trending') && (
        <div style={{ order: sectionOrder('trending') }}>
          <ProductRailSection
            railId="home-trending-rail"
            title="Tendances du Moment"
            subtitle="Une liste horizontale des offres les plus consultées du moment."
            listings={featuredListings}
            onViewProduct={onViewProduct}
          />
        </div>
      )}

      {sectionEnabled('discounts') && (
        <div style={{ order: sectionOrder('discounts') }}>
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
        </div>
      )}

      {sectionEnabled('trust-badges') && <TrustBadgesSection order={sectionOrder('trust-badges')} />}
    </div>
  );
};

export default HomePage;
