import React from 'react';
import { Filter, Search } from 'lucide-react';

interface CategoryFilterBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedBrandLabel?: string | null;
  selectedBrandOfferCount?: number;
  shouldShowDirectListings: boolean;
  directListingCount: number;
  selectedSubCategoryLabel?: string;
  groupedBrandCount: number;
}

const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  searchTerm,
  onSearchTermChange,
  selectedBrandLabel,
  selectedBrandOfferCount = 0,
  shouldShowDirectListings,
  directListingCount,
  selectedSubCategoryLabel,
  groupedBrandCount
}) => (
  <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
    <div className="flex items-center font-bold text-slate-700">
      <Filter size={18} className="mr-2 text-slate-400" />
      {selectedBrandLabel
        ? `${selectedBrandOfferCount} offres pour ${selectedBrandLabel}`
        : shouldShowDirectListings
          ? `${directListingCount} produits dans ${selectedSubCategoryLabel || 'cette sous-categorie'}`
          : `${groupedBrandCount} marques disponibles`}
    </div>
    <div className="flex w-full gap-3 md:w-auto">
      <div className="relative w-full md:w-96">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={selectedBrandLabel || shouldShowDirectListings ? 'Rechercher un produit...' : 'Rechercher une marque ou un produit...'}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </div>
    </div>
  </div>
);

export default CategoryFilterBar;
