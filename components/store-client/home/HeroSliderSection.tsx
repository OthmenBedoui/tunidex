import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroPromoBanner, HeroSlide } from '../../../types';

interface HeroSliderSectionProps {
  activeSlide?: HeroSlide;
  activeSlideIndex: number;
  heroSlides: HeroSlide[];
  heroPromoBanners: HeroPromoBanner[];
  onHeroAction: () => void;
  onHeroLink: (linkType?: 'listing' | 'category' | 'url' | 'collections', linkTarget?: string) => void;
  onSelectSlide: (index: number) => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  isVideoMedia: (src?: string, mediaType?: 'image' | 'video') => boolean;
  order?: number;
}

const HeroSliderSection: React.FC<HeroSliderSectionProps> = ({
  activeSlide,
  activeSlideIndex,
  heroSlides,
  heroPromoBanners,
  onHeroAction,
  onHeroLink,
  onSelectSlide,
  onPrevSlide,
  onNextSlide,
  isVideoMedia,
  order
}) => {
  const renderHeroPromoBanner = (banner: HeroPromoBanner | undefined, className: string) => {
    if (!banner) return <div className={`${className} rounded-2xl bg-slate-200/60`} />;

    return (
      <button
        key={banner.id}
        type="button"
        onClick={() => onHeroLink(banner.linkType, banner.linkTarget)}
        className={`group relative overflow-hidden rounded-2xl bg-slate-900 text-left shadow-sm transition hover:brightness-110 ${className}`}
      >
        <img src={banner.imageUrl} alt={banner.alt || ''} className="absolute inset-0 h-full w-full object-cover" />
      </button>
    );
  };

  return (
    <section className="w-full" style={{ order }}>
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-4 lg:h-[clamp(430px,39vw,562px)] lg:grid-cols-3 lg:grid-rows-4">
        <div className="relative aspect-[1440/630] overflow-hidden rounded-2xl bg-slate-900 shadow-xl lg:col-span-2 lg:row-span-3 lg:aspect-auto">
          <button type="button" onClick={onHeroAction} className="absolute inset-0 block w-full text-left">
            {isVideoMedia(activeSlide?.imageUrl, activeSlide?.mediaType) ? (
              <video
                key={activeSlide?.imageUrl}
                className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
                src={activeSlide?.imageUrl}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                className="absolute inset-0 h-full w-full object-cover transition-all duration-700"
                src={activeSlide?.imageUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80'}
                alt={activeSlide?.title || 'Slide'}
              />
            )}
          </button>

          {heroSlides.length > 1 && (
            <>
              <button type="button" onClick={onPrevSlide} className="absolute left-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/15 text-white transition hover:bg-black/35">
                <ChevronLeft size={34} strokeWidth={3} />
              </button>
              <button type="button" onClick={onNextSlide} className="absolute right-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/15 text-white transition hover:bg-black/35">
                <ChevronRight size={34} strokeWidth={3} />
              </button>
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 rounded-full bg-black/60 px-2 py-1.5">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => onSelectSlide(index)}
                    className={`mx-1 h-3 w-3 rounded-full bg-white transition-opacity ${index === activeSlideIndex ? 'opacity-80' : 'opacity-25 hover:opacity-60'}`}
                    aria-label={`Aller au slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {renderHeroPromoBanner(heroPromoBanners[0], 'aspect-[1380/700] lg:col-start-3 lg:row-span-2 lg:aspect-auto')}
        {renderHeroPromoBanner(heroPromoBanners[1], 'aspect-[1380/400] lg:col-start-3 lg:row-start-3 lg:aspect-auto')}
        {renderHeroPromoBanner(heroPromoBanners[2], 'aspect-[1380/400] lg:col-start-3 lg:row-start-4 lg:aspect-auto')}
        {renderHeroPromoBanner(heroPromoBanners[3], 'aspect-[1380/400] lg:col-start-1 lg:row-start-4 lg:aspect-auto')}
        {renderHeroPromoBanner(heroPromoBanners[4], 'aspect-[1380/400] lg:col-start-2 lg:row-start-4 lg:aspect-auto')}
      </div>
    </section>
  );
};

export default HeroSliderSection;
