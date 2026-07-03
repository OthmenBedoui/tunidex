import React from 'react';
import { getListingFinalPrice } from '../../utils/pricing';
import BrandGroupGrid from '../../components/store-client/category/BrandGroupGrid';
import CategoryFilterBar from '../../components/store-client/category/CategoryFilterBar';
import CategoryHero from '../../components/store-client/category/CategoryHero';
import CategoryListingGrid from '../../components/store-client/category/CategoryListingGrid';
import SubCategoryPickerModal from '../../components/store-client/category/SubCategoryPickerModal';
import SubCategoryRail from '../../components/store-client/category/SubCategoryRail';
import { CategoryBrandGroup, StoreCategoryPageProps } from '../../components/store-client/category/types';

const getListingBrand = (listing: StoreCategoryPageProps['listings'][number]) => {
  const brand = listing.game?.trim();
  return brand && brand.length > 0 ? brand : listing.title.trim();
};

const matchesSelectedSubCategory = (listing: StoreCategoryPageProps['listings'][number], selectedSubCategory: string | null) => {
  if (!selectedSubCategory) return true;
  return listing.subCategoryId === selectedSubCategory || listing.subCategory?.id === selectedSubCategory;
};

const CategoryPage: React.FC<StoreCategoryPageProps> = ({
  categoryId,
  title,
  subtitle,
  heroGradient,
  heroImage,
  icon,
  listings,
  onViewProduct,
  navigateTo,
  subCategories = []
}) => {
  const categoryListings = listings.filter((listing) => listing.categoryId === categoryId);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSubCategory, setSelectedSubCategory] = React.useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = React.useState<string | null>(null);
  const [showSubCategoryMenu, setShowSubCategoryMenu] = React.useState(false);

  React.useEffect(() => {
    setSelectedBrand(null);
  }, [selectedSubCategory, categoryId]);

  const selectedSubCategoryLabel = subCategories.find((sub) => sub.id === selectedSubCategory)?.name;
  const getSubCategoryProductCount = (subCategoryId: string | null) =>
    subCategoryId ? categoryListings.filter((listing) => matchesSelectedSubCategory(listing, subCategoryId)).length : categoryListings.length;
  const visibleSubCategories = subCategories.slice(0, 7);
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredListings = categoryListings.filter((listing) => {
    const brand = getListingBrand(listing);
    const searchMatch = listing.title.toLowerCase().includes(normalizedSearch) || brand.toLowerCase().includes(normalizedSearch);
    return searchMatch && matchesSelectedSubCategory(listing, selectedSubCategory);
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
  }, new Map<string, CategoryBrandGroup>());

  const groupedBrands = Array.from(brandGroups.values()).sort((a, b) => a.brand.localeCompare(b.brand));
  const selectedBrandListings = categoryListings.filter((listing) => {
    if (!selectedBrand) return false;
    const brandMatch = getListingBrand(listing).toLowerCase() === selectedBrand;
    const searchMatch = listing.title.toLowerCase().includes(normalizedSearch) || getListingBrand(listing).toLowerCase().includes(normalizedSearch);
    return brandMatch && searchMatch && matchesSelectedSubCategory(listing, selectedSubCategory);
  });

  const selectedBrandGroup = selectedBrand
    ? groupedBrands.find((group) => group.key === selectedBrand) ||
      (() => {
        const fallbackCover = categoryListings.find((listing) => getListingBrand(listing).toLowerCase() === selectedBrand);
        if (!fallbackCover) return null;

        return {
          key: selectedBrand,
          brand: getListingBrand(fallbackCover),
          cover: fallbackCover,
          minPrice: Math.min(...selectedBrandListings.map((listing) => getListingFinalPrice(listing)), getListingFinalPrice(fallbackCover)),
          offerCount: selectedBrandListings.length,
          listings: selectedBrandListings
        };
      })()
    : null;

  const brandListings = selectedBrandGroup ? [...selectedBrandListings].sort((a, b) => getListingFinalPrice(a) - getListingFinalPrice(b)) : [];
  const shouldShowDirectListings = Boolean(selectedSubCategory) && !selectedBrandGroup;

  const handleSelectSubCategory = (subCategoryId: string | null) => {
    setSelectedSubCategory(subCategoryId);
    setShowSubCategoryMenu(false);
  };

  return (
    <div className="animate-in space-y-12 fade-in duration-500 pb-12">
      <CategoryHero
        title={title}
        subtitle={subtitle}
        heroGradient={heroGradient}
        heroImage={heroImage}
        icon={icon}
        navigateTo={navigateTo}
      />

      <SubCategoryRail
        subCategories={subCategories}
        selectedSubCategory={selectedSubCategory}
        visibleSubCategories={visibleSubCategories}
        totalCount={categoryListings.length}
        getSubCategoryProductCount={getSubCategoryProductCount}
        onSelectSubCategory={handleSelectSubCategory}
        onOpenMenu={() => setShowSubCategoryMenu(true)}
      />

      <SubCategoryPickerModal
        open={showSubCategoryMenu}
        title={title}
        subCategories={subCategories}
        selectedSubCategory={selectedSubCategory}
        totalCount={categoryListings.length}
        getSubCategoryProductCount={getSubCategoryProductCount}
        onClose={() => setShowSubCategoryMenu(false)}
        onSelectSubCategory={handleSelectSubCategory}
      />

      <CategoryFilterBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedBrandLabel={selectedBrandGroup?.brand}
        selectedBrandOfferCount={brandListings.length}
        shouldShowDirectListings={shouldShowDirectListings}
        directListingCount={filteredListings.length}
        selectedSubCategoryLabel={selectedSubCategoryLabel}
        groupedBrandCount={groupedBrands.length}
      />

      {shouldShowDirectListings ? (
        <CategoryListingGrid
          listings={filteredListings}
          onViewProduct={onViewProduct}
          getListingBrand={getListingBrand}
          getListingMeta={(listing) => listing.subCategory?.name || selectedSubCategoryLabel || 'Sous-categorie'}
        />
      ) : !selectedBrandGroup ? (
        <BrandGroupGrid groups={groupedBrands} onSelectBrand={setSelectedBrand} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600">Marque selectionnee</div>
              <h2 className="text-2xl font-black text-slate-900">{selectedBrandGroup.brand}</h2>
              <p className="mt-1 text-sm text-slate-600">Choisissez l'offre qui vous convient parmi toutes les variantes disponibles.</p>
            </div>
            <button onClick={() => setSelectedBrand(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:border-slate-300">
              Retour aux marques
            </button>
          </div>

          <CategoryListingGrid
            listings={brandListings}
            onViewProduct={onViewProduct}
            getListingBrand={getListingBrand}
            getListingMeta={(listing) => (listing.isInstant ? 'Livraison immediate' : listing.preparationTime || 'Livraison programmee')}
            emptyMessage="Aucune offre ne correspond aux filtres pour cette marque."
          />
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
