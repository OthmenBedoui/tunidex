import React from 'react';
import { Edit, LayoutGrid, Save, Trash2, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Category, SubCategory } from '../../../types';

interface GradientPreset {
  name: string;
  class: string;
}

interface AdminCategoriesSectionProps {
  categories: Category[];
  orderedCategories: Category[];
  editingCategory: Category | null;
  editingSubCategory: SubCategory | null;
  editCatName: string;
  editCatSlug: string;
  editCatIcon: string;
  editCatImage: string;
  editCatGradient: string;
  editCatOrder: string;
  editSubName: string;
  editSubSlug: string;
  editSubIcon: string;
  editSubDesc: string;
  editSubOrder: string;
  editSubCatId: string;
  newCatName: string;
  newCatSlug: string;
  newCatIcon: string;
  newCatImage: string;
  newCatGradient: string;
  newCatOrder: string;
  selectedCatForSub: string;
  newSubCatName: string;
  newSubCatSlug: string;
  newSubCatIcon: string;
  newSubCatDesc: string;
  newSubCatOrder: string;
  GRADIENT_PRESETS: GradientPreset[];
  DynamicIcon: React.ComponentType<{ name: string; className?: string }>;
  IconPicker: React.ComponentType<{ label: string; value: string; onChange: (value: string) => void }>;
  SubCategoryIconPicker: React.ComponentType<{ value: string; onChange: (value: string) => void }>;
  ImageInput: React.ComponentType<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string; uploadPreset?: 'default' | 'siteLogo' | 'favicon' | 'avatar' | 'icon' }>;
  setEditingCategory: (value: Category | null) => void;
  setEditingSubCategory: (value: SubCategory | null) => void;
  setEditCatName: (value: string) => void;
  setEditCatSlug: (value: string) => void;
  setEditCatIcon: (value: string) => void;
  setEditCatImage: (value: string) => void;
  setEditCatGradient: (value: string) => void;
  setEditCatOrder: (value: string) => void;
  setEditSubName: (value: string) => void;
  setEditSubSlug: (value: string) => void;
  setEditSubIcon: (value: string) => void;
  setEditSubDesc: (value: string) => void;
  setEditSubOrder: (value: string) => void;
  setEditSubCatId: (value: string) => void;
  setNewCatName: (value: string) => void;
  setNewCatSlug: (value: string) => void;
  setNewCatIcon: (value: string) => void;
  setNewCatImage: (value: string) => void;
  setNewCatGradient: (value: string) => void;
  setNewCatOrder: (value: string) => void;
  setSelectedCatForSub: (value: string) => void;
  setNewSubCatName: (value: string) => void;
  setNewSubCatSlug: (value: string) => void;
  setNewSubCatIcon: (value: string) => void;
  setNewSubCatDesc: (value: string) => void;
  setNewSubCatOrder: (value: string) => void;
  handleUpdateCategory: (e: React.FormEvent) => void;
  handleUpdateSubCategory: () => void;
  handleCreateCategory: (e: React.FormEvent) => void;
  handleCreateSubCategory: (e: React.FormEvent) => void;
  startEditingCategory: (category: Category) => void;
  startEditingSubCategory: (subCategory: SubCategory) => void;
  handleMoveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  handleMoveSubCategory: (categoryId: string, subCategoryId: string, direction: 'up' | 'down') => void;
  handleDeleteCategory: (id: string) => void;
  handleDeleteSubCategory: (id: string) => void;
}

const AdminCategoriesSection: React.FC<AdminCategoriesSectionProps> = ({
  categories,
  orderedCategories,
  editingCategory,
  editingSubCategory,
  editCatName,
  editCatSlug,
  editCatIcon,
  editCatImage,
  editCatGradient,
  editCatOrder,
  editSubName,
  editSubSlug,
  editSubIcon,
  editSubDesc,
  editSubOrder,
  editSubCatId,
  newCatName,
  newCatSlug,
  newCatIcon,
  newCatImage,
  newCatGradient,
  newCatOrder,
  selectedCatForSub,
  newSubCatName,
  newSubCatSlug,
  newSubCatIcon,
  newSubCatDesc,
  newSubCatOrder,
  GRADIENT_PRESETS,
  DynamicIcon,
  IconPicker,
  SubCategoryIconPicker,
  ImageInput,
  setEditingCategory,
  setEditingSubCategory,
  setEditCatName,
  setEditCatSlug,
  setEditCatIcon,
  setEditCatImage,
  setEditCatGradient,
  setEditCatOrder,
  setEditSubName,
  setEditSubSlug,
  setEditSubIcon,
  setEditSubDesc,
  setEditSubOrder,
  setEditSubCatId,
  setNewCatName,
  setNewCatSlug,
  setNewCatIcon,
  setNewCatImage,
  setNewCatGradient,
  setNewCatOrder,
  setSelectedCatForSub,
  setNewSubCatName,
  setNewSubCatSlug,
  setNewSubCatIcon,
  setNewSubCatDesc,
  setNewSubCatOrder,
  handleUpdateCategory,
  handleUpdateSubCategory,
  handleCreateCategory,
  handleCreateSubCategory,
  startEditingCategory,
  startEditingSubCategory,
  handleMoveCategory,
  handleMoveSubCategory,
  handleDeleteCategory,
  handleDeleteSubCategory
}) => (
  <div className="space-y-8">
    {editingCategory && (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm md:p-6 animate-in fade-in duration-200">
        <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 md:max-h-[calc(100vh-3rem)]">
          <div className="shrink-0 border-b bg-slate-50 p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="min-w-0 text-lg font-bold text-slate-900 md:text-xl">
                <Edit className="mr-2 inline text-indigo-600" /> Modifier la Catégorie: {editingCategory.name}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
          </div>
          <div className="overflow-y-auto p-4 md:p-8">
            <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Nom de la catégorie</label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editCatName} onChange={e => setEditCatName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Slug (URL)</label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editCatSlug} onChange={e => setEditCatSlug(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Position d'affichage</label>
                  <input type="number" min="0" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editCatOrder} onChange={e => setEditCatOrder(e.target.value)} />
                  <p className="mt-1 text-[11px] text-slate-400">Plus le nombre est petit, plus la catégorie apparaît tôt.</p>
                </div>
                <div><IconPicker label="Icône Lucide" value={editCatIcon} onChange={setEditCatIcon} /></div>
                <div><ImageInput label="Image de Couverture" value={editCatImage} onChange={setEditCatImage} placeholder="https://..." /></div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Dégradé de Couleur</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map((grad) => (
                      <button key={grad.name} type="button" onClick={() => setEditCatGradient(grad.class)} className={`h-8 w-8 rounded-full ${grad.class} border-2 ${editCatGradient === grad.class ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'} transition-all`} title={grad.name} />
                    ))}
                  </div>
                </div>
                <button type="submit" className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">
                  <Save size={18} className="mr-2" /> Enregistrer les modifications
                </button>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-6">
                <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Aperçu en temps réel</p>
                <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-xl">
                  {editCatImage ? (
                    <img src={editCatImage} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className={`absolute inset-0 ${editCatGradient}`}></div>
                  )}
                  <div className={`absolute inset-0 opacity-40 ${editCatGradient}`}></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="mb-4 rounded-full border border-white/30 bg-white/20 p-4 shadow-inner backdrop-blur-md">
                      <DynamicIcon name={editCatIcon} className="h-10 w-10" />
                    </div>
                    <h4 className="text-2xl font-black tracking-tight drop-shadow-lg">{editCatName || 'Titre'}</h4>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

    {editingSubCategory && (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm md:p-6 animate-in fade-in duration-200">
        <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 md:max-h-[calc(100vh-3rem)]">
          <div className="shrink-0 border-b bg-slate-50 p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900"><Edit className="mr-2 inline text-indigo-600" /> Modifier Sous-Catégorie</h3>
              <button onClick={() => setEditingSubCategory(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
          </div>
          <div className="space-y-5 overflow-y-auto p-4 md:p-6">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Nom</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editSubName} onChange={e => setEditSubName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Slug</label>
              <input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editSubSlug} onChange={e => setEditSubSlug(e.target.value)} />
            </div>
            <div><SubCategoryIconPicker value={editSubIcon} onChange={setEditSubIcon} /></div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Description</label>
              <textarea className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editSubDesc} onChange={e => setEditSubDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Ordre</label>
                <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editSubOrder} onChange={e => setEditSubOrder(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Parente</label>
                <select className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500" value={editSubCatId} onChange={e => setEditSubCatId(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleUpdateSubCategory} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <h3 className="flex items-center text-xl font-bold"><LayoutGrid className="mr-2 text-slate-500" /> Nouvelle Catégorie</h3>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">Aperçu Live</span>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nom</label>
                <input className="w-full rounded border p-2" placeholder="ex: Software & Apps" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Slug (URL)</label>
                <input className="w-full rounded border p-2" placeholder="ex: software-apps" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Position d'affichage</label>
              <input type="number" min="0" className="w-full rounded border p-2" placeholder="1 = première catégorie, 2 = deuxième..." value={newCatOrder} onChange={e => setNewCatOrder(e.target.value)} />
              <p className="mt-1 text-[11px] text-slate-400">Utilise 1, 2, 3... pour contrôler l'ordre dans le header, la home et les listes.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><IconPicker label="Icône Lucide" value={newCatIcon} onChange={setNewCatIcon} /></div>
              <div><ImageInput label="Image Cover" value={newCatImage} onChange={setNewCatImage} placeholder="https://..." /></div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Style Gradient</label>
              <div className="flex flex-wrap gap-2">
                {GRADIENT_PRESETS.map((grad) => (
                  <button key={grad.name} type="button" onClick={() => setNewCatGradient(grad.class)} className={`h-8 w-8 rounded-full ${grad.class} border-2 transition-all ${newCatGradient === grad.class ? 'border-black scale-110' : 'border-transparent hover:scale-105'}`} title={grad.name} />
                ))}
              </div>
            </div>
            <button type="submit" className="w-full rounded-lg bg-slate-900 p-3 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-black">Créer la Catégorie</button>
          </form>
        </div>
        <div className="lg:col-span-1">
          <label className="mb-2 block text-center text-xs font-bold uppercase text-slate-500">Aperçu Carte</label>
          <div className="group relative mx-auto aspect-[4/5] w-full max-w-[240px] cursor-pointer overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
            {newCatImage ? (
              <img src={newCatImage} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
              <div className={`absolute inset-0 ${newCatGradient} opacity-50`}></div>
            )}
            <div className={`absolute inset-0 opacity-60 transition-opacity group-hover:opacity-70 ${newCatGradient}`}></div>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="mb-4 rounded-full border border-white/30 bg-white/20 p-4 shadow-inner backdrop-blur-md transition-transform group-hover:scale-110">
                <DynamicIcon name={newCatIcon} className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-black tracking-tight drop-shadow-md">{newCatName || 'Titre Catégorie'}</h3>
              <p className="mt-2 text-sm font-medium opacity-90">0 Produits</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
        <h3 className="mb-4 text-lg font-bold">Ajouter Sous-Catégorie</h3>
        <form onSubmit={handleCreateSubCategory} className="space-y-4">
          <select className="w-full rounded border p-2" value={selectedCatForSub} onChange={e => setSelectedCatForSub(e.target.value)} required>
            <option value="">Catégorie Parente</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="w-full rounded border p-2" placeholder="Nom (ex: Chatbots)" value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} required />
          <input className="w-full rounded border p-2" placeholder="Slug (ex: chatbots)" value={newSubCatSlug} onChange={e => setNewSubCatSlug(e.target.value)} required />
          <div className="grid grid-cols-1 gap-3"><SubCategoryIconPicker value={newSubCatIcon} onChange={setNewSubCatIcon} /></div>
          <div className="grid grid-cols-1 gap-2"><input type="number" className="w-full rounded border p-2" placeholder="Ordre" value={newSubCatOrder} onChange={e => setNewSubCatOrder(e.target.value)} /></div>
          <input className="w-full rounded border p-2" placeholder="Description courte (ex: ChatGPT, Gemini...)" value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} />
          {newSubCatName && (
            <div className="flex items-start space-x-3 rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-80">
              <div className="rounded-lg bg-white p-2 shadow-sm"><DynamicIcon name={newSubCatIcon} className="h-5 w-5 text-indigo-600" /></div>
              <div><div className="text-sm font-bold">{newSubCatName}</div><div className="text-[10px] text-slate-500">{newSubCatDesc || 'Description...'}</div></div>
            </div>
          )}
          <button type="submit" className="w-full rounded bg-indigo-600 p-2 font-bold text-white transition-colors hover:bg-indigo-700">Ajouter la Carte</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 font-bold">Structure du Site</div>
        <div className="max-h-[500px] overflow-y-auto">
          {orderedCategories.map((cat, index) => (
            <div key={cat.id} className="border-b border-slate-50 last:border-0">
              <div className="flex items-center justify-between bg-slate-50/50 px-6 py-3">
                <div className="flex items-center font-bold text-slate-900">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} className="mr-2 h-5 w-8 rounded border border-slate-200 object-cover" />
                  ) : (
                    <div className={`mr-2 h-5 w-8 rounded ${cat.gradient || 'bg-slate-200'}`} />
                  )}
                  <DynamicIcon name={cat.icon} className="mr-2 h-4 w-4 text-slate-500" />
                  {cat.name}
                  <span className="ml-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">Ordre {cat.order || 0}</span>
                  <button onClick={() => startEditingCategory(cat)} className="ml-2 text-slate-400 transition-colors hover:text-indigo-600" title="Modifier la catégorie"><Edit size={14} /></button>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleMoveCategory(cat.id, 'up')} disabled={index === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30" title="Monter"><LucideIcons.ChevronUp size={15} /></button>
                  <button type="button" onClick={() => handleMoveCategory(cat.id, 'down')} disabled={index === orderedCategories.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30" title="Descendre"><LucideIcons.ChevronDown size={15} /></button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-6 py-3 md:grid-cols-3">
                {[...(cat.subCategories || [])].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)).map((sub, subIndex, orderedSubCategories) => (
                  <div key={sub.id} className="group flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:border-indigo-200">
                    <div className="flex items-start space-x-3">
                      <div className="rounded bg-slate-50 p-1.5 text-slate-500"><DynamicIcon name={sub.icon || 'Package'} className="h-4 w-4" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-bold text-slate-900">{sub.name}</div>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500">{sub.order || subIndex + 1}</span>
                        </div>
                        <div className="line-clamp-1 text-[10px] text-slate-400">{sub.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" onClick={() => handleMoveSubCategory(cat.id, sub.id, 'up')} disabled={subIndex === 0} className="text-slate-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30" title="Monter"><LucideIcons.ChevronUp size={12} /></button>
                      <button type="button" onClick={() => handleMoveSubCategory(cat.id, sub.id, 'down')} disabled={subIndex === orderedSubCategories.length - 1} className="text-slate-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-30" title="Descendre"><LucideIcons.ChevronDown size={12} /></button>
                      <button onClick={() => startEditingSubCategory(sub)} className="text-slate-400 hover:text-indigo-600"><Edit size={12} /></button>
                      <button onClick={() => handleDeleteSubCategory(sub.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                {(!cat.subCategories || cat.subCategories.length === 0) && <div className="col-span-full text-xs italic text-slate-300">Aucune sous-catégorie</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default AdminCategoriesSection;
