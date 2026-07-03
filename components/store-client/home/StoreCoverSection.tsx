import React from 'react';
import { Listing } from '../../../types';
import { getListingDiscountLabel, hasListingDiscount } from '../../../utils/pricing';
import { ListingImage } from '../ListingImage';

interface StoreCoverSectionProps {
  coverBackgroundUrl: string;
  coverCardListings: Listing[];
  onViewProduct: (listing: Listing) => void;
  order?: number;
}

const StoreCoverSection: React.FC<StoreCoverSectionProps> = ({ coverBackgroundUrl, coverCardListings, onViewProduct, order }) => (
  <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-slate-950" style={{ order }}>
    <div className="relative">
      <img className="absolute inset-0 h-full w-full object-cover opacity-35" src={coverBackgroundUrl} alt="" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/0 to-white/10" />

      <div className="relative mx-auto flex w-full max-w-[1170px] flex-col px-4 py-[50px] pb-[70px]">
        <div className="w-full overflow-x-auto pb-2 no-scrollbar">
          <div className="flex snap-x snap-mandatory gap-5 lg:grid lg:grid-cols-4 lg:gap-8 lg:snap-none">
            {coverCardListings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => onViewProduct(listing)}
                className="group relative h-[340px] w-[292px] shrink-0 snap-center overflow-hidden rounded-2xl bg-slate-900 text-left shadow-2xl transition duration-300 hover:shadow-xl lg:h-[432px] lg:w-full lg:hover:scale-105"
              >
                <div className="absolute inset-0 transition duration-500 group-hover:scale-105">
                  <ListingImage listing={listing} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                {hasListingDiscount(listing) && (
                  <div className="absolute left-4 top-3 rounded-full bg-gradient-to-b from-amber-400 to-amber-700 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    {getListingDiscountLabel(listing)}
                  </div>
                )}
                {listing.isInstant && (
                  <div className="absolute right-4 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    Instant
                  </div>
                )}
                {listing.logoUrl && <img src={listing.logoUrl} alt="" className="absolute bottom-32 right-4 h-10 w-10 rounded-lg bg-white p-1 shadow" />}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-black/65 to-black/95 p-4 text-white">
                  <h3 className="line-clamp-3 text-2xl font-black uppercase leading-tight lg:text-3xl">{listing.title}</h3>
                  <div className="mt-2 truncate text-sm font-bold text-slate-200">
                    {listing.game || 'Digital'} · GLOBAL
                  </div>
                  <div className="mt-3 text-xs font-black uppercase text-slate-300">Sponsorisé</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default StoreCoverSection;
