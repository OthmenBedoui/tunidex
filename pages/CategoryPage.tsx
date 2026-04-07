import React from 'react';
import { Listing, SubCategory } from '../types';
import { ArrowLeft, Filter, Search, LayoutGrid, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getListingDiscountLabel, getListingFinalPrice, hasListingDiscount } from '../utils/pricing';
import PriceDisplay from '../components/PriceDisplay';

interface CategoryPageProps {
  categoryId: string; 
  type: string;
  title: string;
  subtitle: string;
  heroGradient: string;
  heroImage: string;
  icon: React.ReactNode;
  listings: Listing[];
  onViewProduct: (listing: Listing) => void;
  navigateTo: (page: string, slug?: string) => void;
  subCategories?: SubCategory[];
}

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[name] || icons[name.trim()] || icons.LayoutGrid;
  return <IconComponent size={24} className={className} />;
};

const getListingBrand = (listing: Listing) => {
  const brand = listing.game?.trim();
  return brand && brand.length > 0 ? brand : listing.title.trim();
};

const matchesSelectedSubCategory = (listing: Listing, selectedSubCategory: string | null) => {
  if (!selectedSubCategory) return true;
  return listing.subCategoryId === selectedSubCategory || listing.subCategory?.id === selectedSubCategory;
};

const CategoryPage: React.FC<CategoryPageProps> = ({ 
  categoryId,
  title, 
  subtitle, 
  heroGradient, 
  heroImage,
  icon,
  listings, 
  onViewProduct, 
  navigateTo,
  subCategories
}) => {
  // Filter by Category ID
  const categoryListings = listings.filter(l => l.categoryId === categoryId);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedBrand(null);
  }, [selectedSubCategory, categoryId]);

  const selectedSubCategoryLabel = subCategories?.find((sub) => sub.id === selectedSubCategory)?.name;
  const filteredListings = categoryListings.filter(l => {
    const brand = getListingBrand(l);
    const searchMatch =
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.toLowerCase().includes(searchTerm.toLowerCase());
    const subCatMatch = matchesSelectedSubCategory(l, selectedSubCategory);
    return searchMatch && subCatMatch;
  });

  const brandGroups = filteredListings.reduce((acc, listing) => {
    const brand = getListingBrand(listing);
    const key = brand.toLowerCase();
    const existing = acc.get(key);
    if (existing) {
      existing.offerCount += 1;
      existing.minPrice = Math.min(existing.minPrice, getListingFinalPrice(listing));
      existing.listings.push(listing);
      if (!existing.cover.logoUrl && listing.logoUrl) existing.cover = listing;
      return acc;
    }

    acc.set(key, {
      key,
      brand,
      cover: listing,
      minPrice: getListingFinalPrice(listing),
      offerCount: 1,
      listings: [listing]
    });
    return acc;
  }, new Map<string, { key: string; brand: string; cover: Listing; minPrice: number; offerCount: number; listings: Listing[] }>());

  const groupedBrands = Array.from(brandGroups.values()).sort((a, b) => a.brand.localeCompare(b.brand));
  const selectedBrandListings = categoryListings.filter((listing) => {
    if (!selectedBrand) return false;
    const brandMatch = getListingBrand(listing).toLowerCase() === selectedBrand;
    const subCatMatch = matchesSelectedSubCategory(listing, selectedSubCategory);
    const normalizedSearch = searchTerm.toLowerCase();
    const searchMatch =
      listing.title.toLowerCase().includes(normalizedSearch) ||
      getListingBrand(listing).toLowerCase().includes(normalizedSearch);
    return brandMatch && subCatMatch && searchMatch;
  });
  const selectedBrandGroup = selectedBrand
    ? groupedBrands.find(group => group.key === selectedBrand) ??
      (() => {
        const fallbackCover = categoryListings.find(listing => getListingBrand(listing).toLowerCase() === selectedBrand);
        return fallbackCover
          ? {
              key: selectedBrand,
              brand: getListingBrand(fallbackCover),
              cover: fallbackCover,
              minPrice: Math.min(...selectedBrandListings.map(listing => getListingFinalPrice(listing)), getListingFinalPrice(fallbackCover)),
              offerCount: selectedBrandListings.length,
              listings: selectedBrandListings
            }
          : null;
      })()
    : null;
  const brandListings = selectedBrandGroup ? [...selectedBrandListings].sort((a, b) => getListingFinalPrice(a) - getListingFinalPrice(b)) : [];
  const shouldShowDirectListings = Boolean(selectedSubCategory) && !selectedBrandGroup;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-12">
      {/* Hero */}
      <div className={`rounded-3xl overflow-hidden shadow-xl relative border border-slate-200 ${heroGradient.includes('bg-') ? heroGradient : 'bg-slate-900'}`}>
        <div className="absolute inset-0 opacity-20"><img src={heroImage} alt={title} className="w-full h-full object-cover" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/40"></div>
        <div className="relative px-8 py-12 md:px-12 md:py-16 text-white max-w-4xl">
          <button onClick={() => navigateTo('home')} className="flex items-center text-slate-300 hover:text-white mb-6 text-sm font-medium"><ArrowLeft size={16} className="mr-2" /> Retour à l'accueil</button>
          <div className="flex items-center space-x-3 mb-4"><div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">{icon}</div><span className="text-sm font-bold uppercase tracking-wider text-slate-200 opacity-80">{subtitle}</span></div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{title}</h1>
        </div>
      </div>

      {/* Sub Category Cards Grid */}
      {subCategories && subCategories.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
                onClick={() => setSelectedSubCategory(null)} 
                className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border transition-all flex items-start space-x-4 hover:shadow-md ${selectedSubCategory === null ? 'border-slate-900 ring-2 ring-slate-900 bg-slate-50' : 'border-slate-100'}`}
            >
                <div className="p-3 bg-slate-100 rounded-xl">
                    <LayoutGrid className="text-slate-700" size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Tout Voir</h3>
                    <p className="text-xs text-slate-500 mt-1">Tous les produits</p>
                </div>
            </div>

            {subCategories.map((sub) => (
               <div 
                 key={sub.id} 
                 onClick={() => setSelectedSubCategory(sub.id)}
                 className={`cursor-pointer bg-white p-6 rounded-2xl shadow-sm border transition-all flex items-start space-x-4 hover:shadow-md ${selectedSubCategory === sub.id ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
               >
                  <div className="p-3 bg-slate-50 rounded-xl text-indigo-600">
                    <DynamicIcon name={sub.icon || 'Package'} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{sub.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sub.description || 'Collection'}</p>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center text-slate-700 font-bold">
              <Filter size={18} className="mr-2 text-slate-400" />
              {selectedBrandGroup
                ? `${brandListings.length} offres pour ${selectedBrandGroup.brand}`
                : shouldShowDirectListings
                  ? `${filteredListings.length} produits dans ${selectedSubCategoryLabel || 'cette sous-catégorie'}`
                  : `${groupedBrands.length} marques disponibles`}
            </div>
            <div className="flex w-full md:w-auto flex-col md:flex-row gap-3">
              {subCategories && subCategories.length > 0 && (
                <select
                  className="w-full md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  value={selectedSubCategory || ''}
                  onChange={(e) => setSelectedSubCategory(e.target.value || null)}
                >
                  <option value="">Toutes les sous-catégories</option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="relative w-full md:w-96">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder={selectedBrandGroup || shouldShowDirectListings ? "Rechercher un produit..." : "Rechercher une marque ou un produit..."} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
      </div>

      {shouldShowDirectListings ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">{getListingBrand(listing)}</div>
                {listing.isInstant && (
                  <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold flex items-center shadow-sm">
                    <Zap size={10} className="mr-1 fill-current" /> Instant
                  </div>
                )}
                {hasListingDiscount(listing) && (
                  <div className="absolute left-3 bottom-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
                    {getListingDiscountLabel(listing)}
                  </div>
                )}
                {listing.logoUrl && <img src={listing.logoUrl} className="absolute bottom-2 right-2 w-8 h-8 rounded bg-white p-1 shadow" />}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 cursor-pointer hover:text-indigo-600" onClick={() => onViewProduct(listing)}>{listing.title}</h3>
                <div className="text-xs text-slate-500 mb-4">
                  {listing.subCategory?.name || selectedSubCategoryLabel || 'Sous-catégorie'}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                  <PriceDisplay listing={listing} priceClassName="text-xl font-black text-slate-900" />
                  <button onClick={() => onViewProduct(listing)} className="bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Voir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !selectedBrandGroup ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {groupedBrands.map((group) => (
            <div
              key={group.key}
              onClick={() => setSelectedBrand(group.key)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
            >
              <div className="relative h-52 overflow-hidden bg-slate-100">
                <img src={group.cover.imageUrl} alt={group.brand} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                  {group.offerCount} offres
                </div>
                {group.cover.logoUrl && <img src={group.cover.logoUrl} className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white p-1.5 shadow" />}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-2xl font-black tracking-tight">{group.brand}</h3>
                  <p className="text-xs text-slate-200 mt-1">À partir de {group.minPrice.toFixed(2)} TND</p>
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Catalogue groupé</div>
                  <div className="text-sm text-slate-600 mt-1">Voir toutes les variantes {group.brand}</div>
                </div>
                <button className="bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">
                  Explorer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-indigo-600 font-bold mb-1">Marque sélectionnée</div>
              <h2 className="text-2xl font-black text-slate-900">{selectedBrandGroup.brand}</h2>
              <p className="text-sm text-slate-600 mt-1">Choisissez l’offre qui vous convient parmi toutes les variantes disponibles.</p>
            </div>
            <button onClick={() => setSelectedBrand(null)} className="bg-white text-slate-900 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
              Retour aux marques
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {brandListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">{getListingBrand(listing)}</div>
                  {listing.isInstant && (
                    <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold flex items-center shadow-sm">
                      <Zap size={10} className="mr-1 fill-current" /> Instant
                    </div>
                  )}
                  {hasListingDiscount(listing) && (
                    <div className="absolute left-3 bottom-3 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-black text-white shadow-lg">
                      {getListingDiscountLabel(listing)}
                    </div>
                  )}
                  {listing.logoUrl && <img src={listing.logoUrl} className="absolute bottom-2 right-2 w-8 h-8 rounded bg-white p-1 shadow" />}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 cursor-pointer hover:text-indigo-600" onClick={() => onViewProduct(listing)}>{listing.title}</h3>
                  <div className="text-xs text-slate-500 mb-4">
                    {listing.isInstant ? 'Livraison immédiate' : listing.preparationTime || 'Livraison programmée'}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <PriceDisplay listing={listing} priceClassName="text-xl font-black text-slate-900" />
                    <button onClick={() => onViewProduct(listing)} className="bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Voir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {groupedBrands.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Aucun produit trouvé dans cette catégorie.</p>
          </div>
      )}
    </div>
  );
};

export default CategoryPage;
