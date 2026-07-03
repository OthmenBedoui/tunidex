import React from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { SubCategory } from '../../../types';
import StoreDynamicIcon from '../shell/StoreDynamicIcon';

interface SubCategoryPickerModalProps {
  open: boolean;
  title: string;
  subCategories: SubCategory[];
  selectedSubCategory: string | null;
  totalCount: number;
  getSubCategoryProductCount: (subCategoryId: string | null) => number;
  onClose: () => void;
  onSelectSubCategory: (subCategoryId: string | null) => void;
}

const isImageIconValue = (value?: string) => {
  const normalized = value?.trim() || '';
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(normalized);
};

const SubCategoryPickerModal: React.FC<SubCategoryPickerModalProps> = ({
  open,
  title,
  subCategories,
  selectedSubCategory,
  totalCount,
  getSubCategoryProductCount,
  onClose,
  onSelectSubCategory
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 backdrop-blur-sm md:items-center md:justify-center" onClick={onClose}>
      <div className="max-h-[82vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Sous-categories</div>
            <h3 className="mt-1 text-xl font-black text-slate-900">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <button
              type="button"
              onClick={() => onSelectSubCategory(null)}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                selectedSubCategory === null ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}
            >
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
                selectedSubCategory === null ? 'bg-white/10 text-white' : 'bg-white text-slate-800'
              }`}>
                <LayoutGrid size={26} />
              </div>
              <div className="font-black">Tout voir</div>
              <div className={`mt-1 text-xs font-bold ${selectedSubCategory === null ? 'text-white/60' : 'text-slate-400'}`}>{totalCount} produits</div>
            </button>

            {subCategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubCategory(sub.id)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                  selectedSubCategory === sub.id ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/10' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="relative mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-indigo-600 shadow-sm">
                  {isImageIconValue(sub.icon) ? (
                    <img src={sub.icon} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <StoreDynamicIcon name={sub.icon || 'Package'} size={28} className="h-7 w-7" />
                  )}
                </div>
                <div className="line-clamp-2 font-black text-slate-900">{sub.name}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{getSubCategoryProductCount(sub.id)} produits</div>
                {sub.description && <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{sub.description}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubCategoryPickerModal;
