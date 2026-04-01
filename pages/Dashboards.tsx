
import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, Plus, Loader2, Zap, Settings, Crown, Users, Shield, FolderTree, Trash2, Edit, Image as ImageIcon, LayoutGrid, HelpCircle, Save } from 'lucide-react';
import { User, Order, OrderStatus, Listing, UserRole, Category, SubCategory } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateListingDescription } from '../services/geminiService';
import { api } from '../services/api';
import * as LucideIcons from 'lucide-react';

interface AdminDashboardProps {
  orders: Order[];
  listings: Listing[];
  categories: Category[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onCreateListing: (listing: any) => void;
  onRefreshCategories: () => void;
  user: User;
}

// Helper for Icon Preview with robust lookup
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: any = LucideIcons;
  const IconComponent = icons[name] || icons[name.trim()] || icons.HelpCircle;
  return <IconComponent size={24} className={className} />;
};

const GRADIENT_PRESETS = [
    { name: 'Dark', class: 'bg-gradient-to-r from-slate-700 to-slate-900' },
    { name: 'Red', class: 'bg-gradient-to-r from-red-600 to-rose-700' },
    { name: 'Blue', class: 'bg-gradient-to-r from-blue-600 to-indigo-700' },
    { name: 'Purple', class: 'bg-gradient-to-r from-violet-600 to-purple-700' },
    { name: 'Gold', class: 'bg-gradient-to-r from-yellow-500 to-amber-600' },
    { name: 'Green', class: 'bg-gradient-to-r from-emerald-500 to-green-700' },
    { name: 'Cyan', class: 'bg-gradient-to-r from-cyan-500 to-blue-600' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ orders, listings, categories, onUpdateStatus, onCreateListing, onRefreshCategories, user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'listings' | 'create' | 'users' | 'categories'>('overview');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  
  // --- Category Management State ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Gamepad2');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatGradient, setNewCatGradient] = useState(GRADIENT_PRESETS[0].class);
  
  // --- SubCategory Management State ---
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatSlug, setNewSubCatSlug] = useState('');
  const [newSubCatIcon, setNewSubCatIcon] = useState('Package');
  const [newSubCatDesc, setNewSubCatDesc] = useState('');
  const [newSubCatOrder, setNewSubCatOrder] = useState('0');
  const [selectedCatForSub, setSelectedCatForSub] = useState('');

  // --- Listing Create State ---
  const [newListingGame, setNewListingGame] = useState('');
  const [newListingTitle, setNewListingTitle] = useState('');
  const [newListingPrice, setNewListingPrice] = useState('');
  const [newListingCatId, setNewListingCatId] = useState('');
  const [newListingSubCatId, setNewListingSubCatId] = useState('');
  const [newListingImageUrl, setNewListingImageUrl] = useState('');
  const [newListingLogoUrl, setNewListingLogoUrl] = useState('');
  const [newListingGallery, setNewListingGallery] = useState(''); 
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'users' && user.role === UserRole.ADMIN) {
        api.getAllUsers().then(setAllUsers);
    }
    if (activeTab === 'overview') {
        api.getDailyStats().then(data => {
            const formatted = data.map(s => ({
                name: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                sales: s.sales,
                orders: s.orders
            }));
            setStats(formatted);
        });
    }
  }, [activeTab, user.role]);

  // Categories Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newCatName || !newCatSlug) return;
      await api.createCategory({ name: newCatName, slug: newCatSlug, icon: newCatIcon, imageUrl: newCatImage, gradient: newCatGradient });
      setNewCatName(''); setNewCatSlug(''); setNewCatImage('');
      onRefreshCategories();
  };

  const handleDeleteCategory = async (id: string) => {
      if(!confirm("Supprimer cette catégorie et tous ses produits ?")) return;
      await api.deleteCategory(id);
      onRefreshCategories();
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedCatForSub || !newSubCatName) return;
      await api.createSubCategory({ 
          name: newSubCatName, 
          slug: newSubCatSlug, 
          categoryId: selectedCatForSub,
          icon: newSubCatIcon,
          description: newSubCatDesc,
          order: parseInt(newSubCatOrder)
      });
      setNewSubCatName(''); setNewSubCatSlug(''); setNewSubCatDesc('');
      onRefreshCategories();
  };

  const handleDeleteSubCategory = async (id: string) => {
      if(!confirm("Supprimer cette sous-catégorie ?")) return;
      await api.deleteSubCategory(id);
      onRefreshCategories();
  };

  // Listing Handlers
  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    const desc = await generateListingDescription(newListingGame, "Produit", "High quality, fast delivery");
    setGeneratedDescription(desc);
    setIsGenerating(false);
  };

  const handleSubmitListing = (e: React.FormEvent) => {
    e.preventDefault();
    const galleryArray = newListingGallery.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    onCreateListing({
        game: newListingGame,
        title: newListingTitle,
        categoryId: newListingCatId,
        subCategoryId: newListingSubCatId || undefined,
        description: generatedDescription,
        price: parseFloat(newListingPrice),
        imageUrl: newListingImageUrl,
        logoUrl: newListingLogoUrl,
        gallery: galleryArray,
        stock: 1,
        deliveryTimeHours: 24,
    });
    setNewListingTitle('');
    setActiveTab('listings');
  };

  const selectedCategoryObj = categories.find(c => c.id === newListingCatId);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-lg shadow p-4 h-fit sticky top-24">
        <h2 className="font-bold text-lg mb-4 px-2 text-slate-800 flex items-center">
            {user.role === UserRole.ADMIN ? <Crown size={20} className="mr-2 text-yellow-500" /> : <Shield size={20} className="mr-2 text-blue-500" />}
            {user.role === UserRole.ADMIN ? 'Admin Panel' : 'Espace Agent'}
        </h2>
        <nav className="space-y-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={18} /> <span>Analytique</span></button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Package size={18} /> <span>Commandes</span></button>
          <button onClick={() => setActiveTab('listings')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'listings' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><DollarSign size={18} /> <span>Produits</span></button>
          {user.role === UserRole.ADMIN && (
            <>
                <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'categories' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><FolderTree size={18} /> <span>Catégories</span></button>
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={18} /> <span>Utilisateurs</span></button>
            </>
          )}
          <button onClick={() => setActiveTab('create')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md mt-4 bg-indigo-600 text-white hover:bg-indigo-700 font-medium`}><Plus size={18} /> <span>Ajouter Produit</span></button>
        </nav>
      </div>

      <div className="flex-1">
        {activeTab === 'overview' && (
             <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
               <h3 className="font-bold mb-4">Performance</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             </div>
        )}

        {/* --- CATEGORIES TAB --- */}
        {activeTab === 'categories' && (
            <div className="space-y-8">
                {/* Create Category Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="font-bold text-xl flex items-center"><LayoutGrid className="mr-2 text-slate-500" /> Nouvelle Catégorie</h3>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Aperçu Live</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form Inputs */}
                        <div className="lg:col-span-2 space-y-4">
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nom</label>
                                        <input className="w-full border p-2 rounded" placeholder="ex: Software & Apps" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Slug (URL)</label>
                                        <input className="w-full border p-2 rounded" placeholder="ex: software-apps" value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Icone Lucide</label>
                                        <div className="relative">
                                            <input className="w-full border p-2 pl-10 rounded" placeholder="ex: MonitorPlay" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} required />
                                            <div className="absolute left-2 top-2 text-slate-400">
                                                <DynamicIcon name={newCatIcon} className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <a href="https://lucide.dev/icons" target="_blank" className="text-[10px] text-indigo-500 hover:underline mt-1 block">Liste des icones</a>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Image Cover (URL)</label>
                                        <input className="w-full border p-2 rounded" placeholder="https://..." value={newCatImage} onChange={e => setNewCatImage(e.target.value)} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Style Gradient</label>
                                    <div className="flex flex-wrap gap-2">
                                        {GRADIENT_PRESETS.map((grad) => (
                                            <button 
                                                key={grad.name}
                                                type="button"
                                                onClick={() => setNewCatGradient(grad.class)}
                                                className={`w-8 h-8 rounded-full ${grad.class} border-2 transition-all ${newCatGradient === grad.class ? 'border-black scale-110' : 'border-transparent hover:scale-105'}`}
                                                title={grad.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white p-3 rounded-lg font-bold shadow-lg shadow-slate-200 transition-all">Créer la Catégorie</button>
                            </form>
                        </div>

                        {/* Live Preview Card */}
                        <div className="lg:col-span-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2 text-center">Aperçu Carte</label>
                            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/5] group cursor-pointer w-full max-w-[240px] mx-auto border border-slate-200">
                                {/* Image Layer */}
                                {newCatImage ? (
                                    <img src={newCatImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className={`absolute inset-0 ${newCatGradient} opacity-50`}></div>
                                )}
                                
                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 opacity-60 transition-opacity group-hover:opacity-70 ${newCatGradient}`}></div>
                                
                                {/* Content */}
                                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-white z-10">
                                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-md mb-4 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                                        <DynamicIcon name={newCatIcon} className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight drop-shadow-md">{newCatName || 'Titre Catégorie'}</h3>
                                    <p className="text-sm font-medium opacity-90 mt-2">0 Produits</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub Categories Creation & List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                        <h3 className="font-bold text-lg mb-4">Ajouter Sous-Catégorie</h3>
                        <form onSubmit={handleCreateSubCategory} className="space-y-4">
                            <select className="w-full border p-2 rounded" value={selectedCatForSub} onChange={e => setSelectedCatForSub(e.target.value)} required>
                                <option value="">Catégorie Parente</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            
                            <input className="w-full border p-2 rounded" placeholder="Nom (ex: Chatbots)" value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} required />
                            <input className="w-full border p-2 rounded" placeholder="Slug (ex: chatbots)" value={newSubCatSlug} onChange={e => setNewSubCatSlug(e.target.value)} required />
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <input className="w-full border p-2 pl-9 rounded" placeholder="Icon" value={newSubCatIcon} onChange={e => setNewSubCatIcon(e.target.value)} />
                                    <div className="absolute left-2 top-2 text-slate-400"><DynamicIcon name={newSubCatIcon} className="w-5 h-5"/></div>
                                </div>
                                <input type="number" className="w-full border p-2 rounded" placeholder="Ordre" value={newSubCatOrder} onChange={e => setNewSubCatOrder(e.target.value)} />
                            </div>
                            
                            <input className="w-full border p-2 rounded" placeholder="Description courte (ex: ChatGPT, Gemini...)" value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} />
                            
                            {/* Card Preview */}
                            {newSubCatName && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3 opacity-80">
                                    <div className="p-2 bg-white rounded-lg shadow-sm"><DynamicIcon name={newSubCatIcon} className="w-5 h-5 text-indigo-600"/></div>
                                    <div><div className="font-bold text-sm">{newSubCatName}</div><div className="text-[10px] text-slate-500">{newSubCatDesc || 'Description...'}</div></div>
                                </div>
                            )}

                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded font-bold transition-colors">Ajouter la Carte</button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 font-bold bg-slate-50">Structure du Site</div>
                        <div className="max-h-[500px] overflow-y-auto">
                            {categories.map(cat => (
                                <div key={cat.id} className="border-b border-slate-50 last:border-0">
                                    <div className="px-6 py-3 bg-slate-50/50 flex justify-between items-center">
                                        <div className="font-bold text-slate-900 flex items-center">
                                            <DynamicIcon name={cat.icon} className="w-4 h-4 mr-2 text-slate-500" /> 
                                            {cat.name}
                                        </div>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {cat.subCategories?.map(sub => (
                                            <div key={sub.id} className="bg-white border border-slate-100 p-3 rounded-lg flex justify-between items-start group hover:border-indigo-200 transition-colors">
                                                <div className="flex items-start space-x-3">
                                                    <div className="p-1.5 bg-slate-50 rounded text-slate-500"><DynamicIcon name={sub.icon || 'Package'} className="w-4 h-4" /></div>
                                                    <div>
                                                        <div className="font-bold text-xs text-slate-900">{sub.name}</div>
                                                        <div className="text-[10px] text-slate-400 line-clamp-1">{sub.description}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteSubCategory(sub.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                            </div>
                                        ))}
                                        {(!cat.subCategories || cat.subCategories.length === 0) && <div className="text-xs text-slate-300 italic col-span-full">Aucune sous-catégorie</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- CREATE LISTING TAB --- */}
        {activeTab === 'create' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-3xl">
            <h3 className="text-xl font-bold mb-6">Ajouter Nouveau Produit</h3>
            <form onSubmit={handleSubmitListing} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                   <select className="w-full border rounded p-2" value={newListingCatId} onChange={e => setNewListingCatId(e.target.value)} required>
                       <option value="">-- Sélectionner --</option>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Sous-Catégorie</label>
                   <select className="w-full border rounded p-2" value={newListingSubCatId} onChange={e => setNewListingSubCatId(e.target.value)} disabled={!newListingCatId}>
                       <option value="">-- Aucune --</option>
                       {selectedCategoryObj?.subCategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jeu / Marque (ex: Netflix, Valorant)</label>
                  <input type="text" className="w-full border rounded p-2" value={newListingGame} onChange={e => setNewListingGame(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre du Produit</label>
                <input type="text" className="w-full border rounded p-2" value={newListingTitle} onChange={e => setNewListingTitle(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Image Principale (URL)</label>
                      <input type="text" className="w-full border rounded p-2" value={newListingImageUrl} onChange={e => setNewListingImageUrl(e.target.value)} placeholder="https://..." required />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Logo Spécifique (URL, Optionnel)</label>
                      <input type="text" className="w-full border rounded p-2" value={newListingLogoUrl} onChange={e => setNewListingLogoUrl(e.target.value)} placeholder="https://..." />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Galerie Images (URLs séparées par des virgules)</label>
                  <input type="text" className="w-full border rounded p-2" value={newListingGallery} onChange={e => setNewListingGallery(e.target.value)} placeholder="url1, url2, url3" />
              </div>

              <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
                <button type="button" onClick={handleGenerateDescription} disabled={!newListingGame || isGenerating} className="text-sm bg-white border border-indigo-300 text-indigo-700 px-3 py-2 rounded font-medium hover:bg-indigo-50 flex items-center">
                  {isGenerating ? <Loader2 className="animate-spin mr-1" size={14} /> : <Zap size={14} className="mr-1" />} Générer Description IA
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea className="w-full border rounded p-2 h-32" value={generatedDescription} onChange={(e) => setGeneratedDescription(e.target.value)} required></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prix (TND)</label>
                <input type="number" step="0.01" className="w-full border rounded p-2" value={newListingPrice} onChange={(e) => setNewListingPrice(e.target.value)} required />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-md hover:bg-slate-800 transition">Créer l'Offre</button>
            </form>
          </div>
        )}
        
        {activeTab === 'users' && user.role === UserRole.ADMIN && (
             <div className="bg-white rounded-lg shadow p-4">Gestion des Utilisateurs (Voir version précédente)</div>
        )}
        {activeTab === 'listings' && (
             <div className="bg-white rounded-lg shadow p-4">
                 {listings.map(l => (
                     <div key={l.id} className="flex justify-between border-b p-2">
                         <span>{l.title}</span> <span className="font-bold">{l.price} TND</span>
                     </div>
                 ))}
             </div>
        )}
      </div>
    </div>
  );
};

// --- USER DASHBOARD ---
export const UserDashboard: React.FC<any> = ({ user, orders }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6">
       <div className="w-full md:w-64 bg-white p-6 rounded-lg shadow text-center">
          <img src={user.avatarUrl} className="w-20 h-20 rounded-full mx-auto mb-3" />
          <h3 className="font-bold">{user.username}</h3>
       </div>
       <div className="flex-1 space-y-4">
          <h2 className="font-bold text-2xl">Mes Commandes</h2>
          {orders.map((o: any) => (
             <div key={o.id} className="bg-white p-4 rounded shadow flex justify-between">
                <span>{o.listingSnapshot.title}</span> <span className="font-bold">{o.amount} TND</span>
             </div>
          ))}
       </div>
    </div>
  );
};

function X(props: any) { return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>; }