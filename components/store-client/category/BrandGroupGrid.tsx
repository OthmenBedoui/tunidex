import React from 'react';
import { CategoryBrandGroup } from './types';
import { ListingImage } from '../ListingImage';

interface BrandGroupGridProps {
  groups: CategoryBrandGroup[];
  onSelectBrand: (brandKey: string) => void;
}

const BrandGroupGrid: React.FC<BrandGroupGridProps> = ({ groups, onSelectBrand }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
        <p className="text-slate-500">Aucun produit trouve dans cette categorie.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {groups.map((group) => (
        <div
          key={group.key}
          onClick={() => onSelectBrand(group.key)}
          className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="relative h-52 overflow-hidden bg-slate-100">
            <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
              <ListingImage listing={group.cover} alt={group.brand} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
            <div className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              {group.offerCount} offres
            </div>
            {group.cover.logoUrl && <img src={group.cover.logoUrl} className="absolute right-3 top-3 h-10 w-10 rounded-xl bg-white p-1.5 shadow" />}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-2xl font-black tracking-tight">{group.brand}</h3>
              <p className="mt-1 text-xs text-slate-200">A partir de {group.minPrice.toFixed(2)} TND</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Catalogue groupe</div>
              <div className="mt-1 text-sm text-slate-600">Voir toutes les variantes {group.brand}</div>
            </div>
            <button className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white">
              Explorer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BrandGroupGrid;
