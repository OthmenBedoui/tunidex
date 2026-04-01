import React, { useEffect } from 'react';
import { Listing, SubCategory } from '../types';
import { Star, ArrowLeft, Filter, Search, X, CheckCircle, Clock, ShoppingCart, LayoutGrid } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface CategoryPageProps {
  categoryId: string; 
  type: any;
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
  const icons: any = LucideIcons;
  const IconComponent = icons[name] || icons[name.trim()] || icons.LayoutGrid;
  return <IconComponent size={24} className={className} />;
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

  const filteredListings = categoryListings.filter(l => {
    const searchMatch = l.title.toLowerCase().includes(searchTerm.toLowerCase()) || (l.game && l.game.toLowerCase().includes(searchTerm.toLowerCase()));
    // Check if subCategory relation matches selected ID
    const subCatMatch = selectedSubCategory ? l.subCategoryId === selectedSubCategory : true;
    return searchMatch && subCatMatch;
  });

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
            <div className="flex items-center text-slate-700 font-bold"><Filter size={18} className="mr-2 text-slate-400" /> {filteredListings.length} Offres Disponibles</div>
            <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Rechercher un produit..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                <div className="relative h-48 overflow-hidden bg-slate-100">
                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase">{listing.game}</div>
                {listing.logoUrl && <img src={listing.logoUrl} className="absolute bottom-2 right-2 w-8 h-8 rounded bg-white p-1 shadow" />}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2 cursor-pointer hover:text-indigo-600" onClick={() => onViewProduct(listing)}>{listing.title}</h3>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xl font-black text-slate-900">{listing.price.toFixed(2)} <span className="text-xs font-normal text-slate-500">TND</span></span>
                    <button onClick={() => onViewProduct(listing)} className="bg-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Voir</button>
                </div>
                </div>
            </div>
            ))}
      </div>
      
      {filteredListings.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Aucun produit trouvé dans cette catégorie.</p>
          </div>
      )}
    </div>
  );
};

export default CategoryPage;