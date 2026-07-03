import React from 'react';
import { Category } from '../../../types';
import StoreDynamicIcon from './StoreDynamicIcon';

interface StoreCategoryRailProps {
  currentPage: string;
  categories: Category[];
  navigateTo: (page: string, slug?: string) => void;
}

const StoreCategoryRail: React.FC<StoreCategoryRailProps> = ({ currentPage, categories, navigateTo }) => (
  <div className="border-t border-white/10 bg-black">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex space-x-6 overflow-x-auto py-3 text-sm font-medium no-scrollbar">
        <button
          onClick={() => navigateTo('home')}
          className={`whitespace-nowrap flex items-center ${currentPage === 'home' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
        >
          Tout Voir
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => navigateTo('category', category.slug)}
            className="whitespace-nowrap flex items-center text-slate-300 transition-colors hover:text-white"
          >
            <StoreDynamicIcon name={category.icon} className="mr-1" />
            {category.name}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default StoreCategoryRail;
