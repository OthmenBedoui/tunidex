import React from 'react';
import { Category } from '../../../types';
import HomeDynamicIcon from './HomeDynamicIcon';

interface CollectionsSectionProps {
  categories: Category[];
  navigateTo: (page: string, slug?: string) => void;
  order?: number;
}

const CollectionsSection: React.FC<CollectionsSectionProps> = ({ categories, navigateTo, order }) => (
  <section id="collections" style={{ order }}>
    <div className="mb-8 flex items-end justify-between">
      <div>
        <h2 className="mb-2 text-3xl font-black text-slate-900">Collections Populaires</h2>
        <p className="text-slate-500">Découvrez nos catégories les plus visitées</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {categories.map((category) => (
        <div
          key={category.id}
          onClick={() => navigateTo('category', category.slug)}
          className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          {category.imageUrl ? (
            <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          ) : (
            <div className={`absolute inset-0 ${category.gradient || 'bg-slate-800'}`} />
          )}

          <div className={`absolute inset-0 opacity-60 transition-opacity group-hover:opacity-70 ${category.gradient || 'bg-gradient-to-t from-black/80 to-transparent'}`} />

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="mb-3 rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
              <HomeDynamicIcon name={category.icon} className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-1 text-lg font-bold leading-tight">{category.name}</h3>
            <span className="rounded bg-black/20 px-2 py-1 text-[10px] uppercase tracking-widest opacity-80 transition-opacity group-hover:opacity-100">
              Explorer
            </span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default CollectionsSection;
