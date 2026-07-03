import React from 'react';
import { FloatingBrandCard } from '../../../types';

interface FloatingBrandCardsSectionProps {
  floatingBrandCards: FloatingBrandCard[];
  onHeroLink: (linkType?: 'listing' | 'category' | 'url' | 'collections', linkTarget?: string) => void;
  order?: number;
}

const FloatingBrandCardsSection: React.FC<FloatingBrandCardsSectionProps> = ({ floatingBrandCards, onHeroLink, order }) => (
  <section className="relative left-1/2 w-screen -translate-x-1/2 border-y border-slate-200/60 bg-white/55 py-12 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55" style={{ order }}>
    <div className="mx-auto max-w-[1224px] overflow-hidden px-4 sm:px-6 lg:px-0">
      <div className="overflow-hidden no-scrollbar">
        <div className="floating-brand-marquee flex w-max gap-4 pr-4">
          {[...floatingBrandCards, ...floatingBrandCards].map((card, index) => (
            <button
              key={`${card.id}-${index}`}
              type="button"
              onClick={() => onHeroLink(card.linkType, card.linkTarget)}
              className="group relative h-[82px] w-[150px] shrink-0 overflow-hidden rounded-[10px] transition duration-200 hover:-translate-y-1 hover:brightness-110 md:h-[100px] md:w-[190px] lg:h-[112px] lg:w-[215px]"
            >
              <img src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default FloatingBrandCardsSection;
