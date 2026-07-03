import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { SubCategory } from '../../../types';
import StoreDynamicIcon from '../shell/StoreDynamicIcon';

interface SubCategoryRailProps {
  subCategories: SubCategory[];
  selectedSubCategory: string | null;
  visibleSubCategories: SubCategory[];
  totalCount: number;
  getSubCategoryProductCount: (subCategoryId: string | null) => number;
  onSelectSubCategory: (subCategoryId: string | null) => void;
  onOpenMenu: () => void;
}

const isImageIconValue = (value?: string) => {
  const normalized = value?.trim() || '';
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(normalized);
};

const SubCategoryRail: React.FC<SubCategoryRailProps> = ({
  subCategories,
  selectedSubCategory,
  visibleSubCategories,
  totalCount,
  getSubCategoryProductCount,
  onSelectSubCategory,
  onOpenMenu
}) => {
  if (subCategories.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex w-max min-w-full items-start gap-5 pb-2">
          <button type="button" onClick={onOpenMenu} className="group flex w-[92px] shrink-0 flex-col items-center text-center">
            <span className={`relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[22px] border shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-xl ${
              selectedSubCategory === null ? 'border-slate-950 bg-slate-950 text-white ring-4 ring-slate-950/10' : 'border-slate-200 bg-white text-slate-700'
            }`}>
              <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10" />
              <LayoutGrid size={30} className="relative" />
            </span>
            <span className="mt-2 line-clamp-2 text-xs font-black leading-tight text-slate-900">Voir tout</span>
            <span className="mt-1 text-[10px] font-bold text-slate-400">{totalCount}</span>
          </button>

          {visibleSubCategories.map((sub) => (
            <button type="button" key={sub.id} onClick={() => onSelectSubCategory(sub.id)} className="group flex w-[92px] shrink-0 flex-col items-center text-center">
              <span className={`relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[22px] border shadow-sm transition-all group-hover:-translate-y-1 group-hover:shadow-xl ${
                selectedSubCategory === sub.id ? 'border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-600/10' : 'border-slate-200 bg-white text-indigo-600'
              }`}>
                {isImageIconValue(sub.icon) ? (
                  <img src={sub.icon} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <span className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-indigo-100/80 to-transparent" />
                    <StoreDynamicIcon name={sub.icon || 'Package'} size={32} className="relative h-8 w-8" />
                  </>
                )}
                <span className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/15" />
              </span>
              <span className="mt-2 line-clamp-2 text-xs font-black leading-tight text-slate-900">{sub.name}</span>
              <span className="mt-1 text-[10px] font-bold text-slate-400">{getSubCategoryProductCount(sub.id)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubCategoryRail;
