
import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign, Plus, Loader2, Zap, Crown, Users, Shield, FolderTree, Trash2, Edit, LayoutGrid, Save, X } from 'lucide-react';
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
  onCreateListing: (listing: Partial<Listing>) => void;
  onRefreshCategories: () => void;
  user: User;
}

// Helper for Icon Preview with robust lookup
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
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
  const [stats, setStats] = useState<{name: string, sales: number, orders: number}[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalOrders: 0, totalUsers: 0 });
  const [topProducts, setTopProducts] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
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
  const [newListingIsInstant, setNewListingIsInstant] = useState(true);
  const [newListingPrepTime, setNewListingPrepTime] = useState('');
  const [newListingMetaTitle, setNewListingMetaTitle] = useState('');
  const [newListingMetaDesc, setNewListingMetaDesc] = useState('');
  const [newListingKeywords, setNewListingKeywords] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Auto-slug Generation ---
  useEffect(() => {
    setNewCatSlug(newCatName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
  }, [newCatName]);

  useEffect(() => {
    setNewSubCatSlug(newSubCatName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
  }, [newSubCatName]);

  useEffect(() => {
    if (newListingTitle) {
        setNewListingMetaTitle(`${newListingTitle} | Tunidex`);
        setNewListingMetaDesc(`Achetez ${newListingTitle} au meilleur prix sur Tunidex. Livraison rapide et sécurisée.`);
    }
  }, [newListingTitle]);

  // --- Editing State ---
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatImage, setEditCatImage] = useState('');
  const [editCatGradient, setEditCatGradient] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [editCatName, setEditCatName] = useState('');
  const [editCatSlug, setEditCatSlug] = useState('');

  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubSlug, setEditSubSlug] = useState('');
  const [editSubIcon, setEditSubIcon] = useState('');
  const [editSubDesc, setEditSubDesc] = useState('');
  const [editSubOrder, setEditSubOrder] = useState('0');
  const [editSubCatId, setEditSubCatId] = useState('');
  
  useEffect(() => {
    if (activeTab === 'users' && user.role === UserRole.ADMIN) {
        api.getAllUsers().then(setAllUsers);
    }
    if (activeTab === 'overview') {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const data = await api.getDailyStats();
                const formatted = (Array.isArray(data.dailyStats) ? data.dailyStats : []).map((s: {date: string, sales: number, orders: number}) => ({
                    name: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    sales: s.sales,
                    orders: s.orders
                }));
                setStats(formatted);
                setSummary({
                    totalSales: data.totalSales || 0,
                    totalOrders: data.totalOrders || 0,
                    totalUsers: data.totalUsers || 0
                });
                setTopProducts(Array.isArray(data.topProducts) ? data.topProducts : []);
            } catch (err) {
                console.error("Failed to fetch stats:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }
  }, [activeTab, user.role]);

  // Categories Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newCatName || !newCatSlug) return;
      try {
          await api.createCategory({ name: newCatName, slug: newCatSlug, icon: newCatIcon, imageUrl: newCatImage, gradient: newCatGradient });
          setNewCatName(''); setNewCatSlug(''); setNewCatImage('');
          onRefreshCategories();
      } catch {
          alert("Erreur");
      }
  };

  const handleDeleteCategory = async (id: string) => {
      if(!confirm("Supprimer cette catégorie et tous ses produits ?")) return;
      try {
          await api.deleteCategory(id);
          onRefreshCategories();
      } catch {
          alert("Erreur");
      }
  };

  const startEditingSubCategory = (sub: SubCategory) => {
    setEditingSubCategory(sub);
    setEditSubName(sub.name);
    setEditSubSlug(sub.slug);
    setEditSubIcon(sub.icon || '');
    setEditSubDesc(sub.description || '');
    setEditSubOrder((sub.order || 0).toString());
    setEditSubCatId(sub.categoryId);
  };

  const handleUpdateSubCategory = async () => {
    if (!editingSubCategory) return;
    try {
        await api.updateSubCategory(editingSubCategory.id, {
            name: editSubName,
            slug: editSubSlug,
            icon: editSubIcon,
            description: editSubDesc,
            order: parseInt(editSubOrder),
            categoryId: editSubCatId
        });
        setEditingSubCategory(null);
        onRefreshCategories();
        alert('Sous-catégorie mise à jour !');
    } catch (err) {
        console.error('Update subcat fail:', err);
        alert('Erreur lors de la mise à jour');
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedCatForSub || !newSubCatName) {
          alert('Veuillez remplir le nom et sélectionner une catégorie parente');
          return;
      }
      try {
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
          alert('Sous-catégorie créée avec succès !');
      } catch (err) {
          console.error('Create subcat fail:', err);
          alert('Erreur lors de la création');
      }
  };

  const handleDeleteSubCategory = async (id: string) => {
      if(!confirm("Supprimer cette sous-catégorie ?")) return;
      try {
          await api.deleteSubCategory(id);
          onRefreshCategories();
      } catch {
          alert("Erreur");
      }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingCategory) return;
      try {
          await api.updateCategory(editingCategory.id, { 
              name: editCatName,
              slug: editCatSlug,
              icon: editCatIcon,
              imageUrl: editCatImage, 
              gradient: editCatGradient 
          });
          setEditingCategory(null);
          onRefreshCategories();
          alert('Catégorie mise à jour !');
      } catch {
          alert("Erreur");
      }
  };

  const startEditingCategory = (cat: Category) => {
      setEditingCategory(cat);
      setEditCatName(cat.name);
      setEditCatSlug(cat.slug);
      setEditCatIcon(cat.icon);
      setEditCatImage(cat.imageUrl || '');
      setEditCatGradient(cat.gradient || GRADIENT_PRESETS[0].class);
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
        isInstant: newListingIsInstant,
        preparationTime: newListingIsInstant ? 'Immédiat' : newListingPrepTime,
        metaTitle: newListingMetaTitle,
        metaDesc: newListingMetaDesc,
        keywords: newListingKeywords,
    });
    // Reset form
    setNewListingGame('');
    setNewListingTitle('');
    setNewListingPrice('');
    setNewListingCatId('');
    setNewListingSubCatId('');
    setNewListingImageUrl('');
    setNewListingLogoUrl('');
    setNewListingGallery('');
    setNewListingIsInstant(true);
    setNewListingPrepTime('');
    setNewListingMetaTitle('');
    setNewListingMetaDesc('');
    setNewListingKeywords('');
    setGeneratedDescription('');
    
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

      <div className="flex-1 min-h-screen pb-12">
        {isLoading && (
            <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )}
        {activeTab === 'overview' && (
             <div className="space-y-6">
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Ventes Totales</span>
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalSales.toFixed(2)} TND</div>
                    <div className="text-xs text-green-600 mt-1 font-medium">+12% vs mois dernier</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Commandes</span>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalOrders}</div>
                    <div className="text-xs text-blue-600 mt-1 font-medium">+5% vs mois dernier</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-500 text-sm font-medium">Clients</span>
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Users size={20} /></div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{summary.totalUsers}</div>
                    <div className="text-xs text-purple-600 mt-1 font-medium">+8 nouveaux aujourd'hui</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="font-bold text-slate-900">Ventes (30 jours)</h3>
                     <TrendingUp size={18} className="text-slate-400" />
                   </div>
                   <div className="h-64">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f8fafc' }}
                          />
                          <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-900 mb-6">Produits les plus vendus</h3>
                   <div className="space-y-4">
                     {topProducts.length > 0 ? topProducts.map((p, i) => (
                       <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-500 text-xs">{i+1}</div>
                           <div>
                             <div className="font-bold text-sm text-slate-900">{p.title}</div>
                             <div className="text-[10px] text-slate-500 uppercase font-bold">{p.game}</div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className="font-bold text-sm text-slate-900">{(p.salesCount || 0)} ventes</div>
                           <div className="text-[10px] text-green-600 font-bold">{(p.price * (p.salesCount || 0)).toFixed(2)} TND</div>
                         </div>
                       </div>
                     )) : (
                       <div className="text-center py-12 text-slate-400 italic text-sm">Aucune donnée disponible</div>
                     )}
                   </div>
                 </div>
               </div>
             </div>
        )}

        {/* --- CATEGORIES TAB --- */}
        {activeTab === 'categories' && (
            <div className="space-y-8">
                {/* Edit Category Modal Overlay */}
                {editingCategory && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-xl text-slate-900 flex items-center">
                                    <Edit className="mr-2 text-indigo-600" /> Modifier la Catégorie: {editingCategory.name}
                                </h3>
                                <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-8">
                                <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Nom de la catégorie</label>
                                            <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editCatName} onChange={e => setEditCatName(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Slug (URL)</label>
                                            <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editCatSlug} onChange={e => setEditCatSlug(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Icone (Lucide Name)</label>
                                            <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editCatIcon} onChange={e => setEditCatIcon(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Image de Couverture (URL)</label>
                                            <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editCatImage} onChange={e => setEditCatImage(e.target.value)} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Dégradé de Couleur</label>
                                            <div className="flex flex-wrap gap-2">
                                                {GRADIENT_PRESETS.map((grad) => (
                                                    <button 
                                                        key={grad.name}
                                                        type="button"
                                                        onClick={() => setEditCatGradient(grad.class)}
                                                        className={`w-8 h-8 rounded-full ${grad.class} border-2 ${editCatGradient === grad.class ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'} transition-all`}
                                                        title={grad.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center w-full shadow-lg shadow-indigo-100 transition-all">
                                            <Save size={18} className="mr-2" /> Enregistrer les modifications
                                        </button>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Aperçu en temps réel</p>
                                        <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[16/9] w-full group">
                                            {editCatImage ? (
                                                <img src={editCatImage} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className={`absolute inset-0 ${editCatGradient}`}></div>
                                            )}
                                            <div className={`absolute inset-0 opacity-40 ${editCatGradient}`}></div>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                                                <div className="bg-white/20 p-4 rounded-full backdrop-blur-md mb-4 border border-white/30 shadow-inner">
                                                    <DynamicIcon name={editCatIcon} className="w-10 h-10" />
                                                </div>
                                                <h4 className="font-black text-2xl tracking-tight drop-shadow-lg">{editCatName || 'Titre'}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit SubCategory Modal Overlay */}
                {editingSubCategory && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg text-slate-900 flex items-center">
                                    <Edit className="mr-2 text-indigo-600" /> Modifier Sous-Catégorie
                                </h3>
                                <button onClick={() => setEditingSubCategory(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Nom</label>
                                    <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editSubName} onChange={e => setEditSubName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Slug</label>
                                    <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editSubSlug} onChange={e => setEditSubSlug(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Icône Lucide</label>
                                    <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editSubIcon} onChange={e => setEditSubIcon(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Description</label>
                                    <textarea className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none" value={editSubDesc} onChange={e => setEditSubDesc(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Ordre</label>
                                        <input type="number" className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editSubOrder} onChange={e => setEditSubOrder(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Parente</label>
                                        <select className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={editSubCatId} onChange={e => setEditSubCatId(e.target.value)}>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleUpdateSubCategory} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                            {cat.imageUrl ? (
                                                <img src={cat.imageUrl} className="w-8 h-5 object-cover rounded mr-2 border border-slate-200" />
                                            ) : (
                                                <div className={`w-8 h-5 rounded mr-2 ${cat.gradient || 'bg-slate-200'}`} />
                                            )}
                                            <DynamicIcon name={cat.icon} className="w-4 h-4 mr-2 text-slate-500" /> 
                                            {cat.name}
                                            <button onClick={() => startEditingCategory(cat)} className="ml-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Modifier la catégorie"><Edit size={14} /></button>
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
                                                <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditingSubCategory(sub)} className="text-slate-400 hover:text-indigo-600"><Edit size={12} /></button>
                                                    <button onClick={() => handleDeleteSubCategory(sub.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                </div>
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

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <Zap size={16} className="mr-2 text-yellow-500" /> Disponibilité & Livraison
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                          <label className="block text-xs font-bold uppercase text-slate-500">Type de Stock</label>
                          <div className="flex space-x-2">
                              <button 
                                type="button"
                                onClick={() => setNewListingIsInstant(true)}
                                className={`flex-1 p-3 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${newListingIsInstant ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                              >
                                  <Zap size={16} className="mr-2" /> Instantané
                              </button>
                              <button 
                                type="button"
                                onClick={() => setNewListingIsInstant(false)}
                                className={`flex-1 p-3 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${!newListingIsInstant ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                              >
                                  <Package size={16} className="mr-2" /> Sur Commande
                              </button>
                          </div>
                      </div>
                      {!newListingIsInstant && (
                          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Temps d'attente estimé</label>
                              <input 
                                type="text" 
                                className="w-full border rounded p-2 bg-white" 
                                placeholder="ex: 2-4 heures, 1 jour..." 
                                value={newListingPrepTime} 
                                onChange={e => setNewListingPrepTime(e.target.value)} 
                                required={!newListingIsInstant}
                              />
                          </div>
                      )}
                  </div>
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

              {/* SEO Section */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="font-bold text-slate-900 flex items-center">
                      <LayoutGrid size={18} className="mr-2 text-indigo-600" /> Optimisation SEO
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">Optimisez la visibilité de ce produit sur Google et les moteurs de recherche.</p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Meta Title</label>
                          <input 
                            type="text" 
                            className="w-full border rounded p-2 bg-white" 
                            placeholder="Titre pour Google (max 60 chars)" 
                            value={newListingMetaTitle} 
                            onChange={e => setNewListingMetaTitle(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Meta Description</label>
                          <textarea 
                            className="w-full border rounded p-2 bg-white h-20" 
                            placeholder="Description pour Google (max 160 chars)" 
                            value={newListingMetaDesc} 
                            onChange={e => setNewListingMetaDesc(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mots-clés (séparés par des virgules)</label>
                          <input 
                            type="text" 
                            className="w-full border rounded p-2 bg-white" 
                            placeholder="ex: netflix tunisie, abonnement pas cher..." 
                            value={newListingKeywords} 
                            onChange={e => setNewListingKeywords(e.target.value)} 
                          />
                      </div>
                  </div>

                  {/* Google Preview */}
                  <div className="mt-6 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Aperçu Google Search</p>
                      <div className="max-w-[600px]">
                          <div className="text-[#1a0dab] text-xl hover:underline cursor-pointer truncate">
                              {newListingMetaTitle || newListingTitle || 'Titre du produit sur Google'}
                          </div>
                          <div className="text-[#006621] text-sm truncate mb-1">
                              tunidex.com › products › {newListingTitle.toLowerCase().replace(/\s+/g, '-')}
                          </div>
                          <div className="text-[#545454] text-sm line-clamp-2">
                              {newListingMetaDesc || generatedDescription || 'La description de votre produit apparaîtra ici dans les résultats de recherche Google...'}
                          </div>
                      </div>
                  </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-md hover:bg-slate-800 transition">Créer l'Offre</button>
            </form>
          </div>
        )}
        
        {activeTab === 'users' && user.role === UserRole.ADMIN && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 font-bold bg-slate-50">Utilisateurs</div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                             <tr>
                                 <th className="px-6 py-3">Utilisateur</th>
                                 <th className="px-6 py-3">Email</th>
                                 <th className="px-6 py-3">Rôle</th>
                                 <th className="px-6 py-3">Solde</th>
                                 <th className="px-6 py-3">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {allUsers.map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4 flex items-center space-x-3">
                                         <img src={u.avatarUrl} className="w-8 h-8 rounded-full" />
                                         <span className="font-bold text-slate-900">{u.username}</span>
                                     </td>
                                     <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : u.role === UserRole.AGENT ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                             {u.role}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4 font-bold text-slate-900 text-sm">{u.balance.toFixed(2)} TND</td>
                                     <td className="px-6 py-4">
                                         <button className="text-slate-400 hover:text-indigo-600"><Edit size={16} /></button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}
        {activeTab === 'orders' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 font-bold bg-slate-50 flex justify-between items-center">
                     <span>Toutes les Commandes</span>
                     <span className="text-xs font-normal text-slate-500">{orders.length} commandes au total</span>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                             <tr>
                                 <th className="px-6 py-3">ID</th>
                                 <th className="px-6 py-3">Client</th>
                                 <th className="px-6 py-3">Produit</th>
                                 <th className="px-6 py-3">Montant</th>
                                 <th className="px-6 py-3">Statut</th>
                                 <th className="px-6 py-3">Date</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {orders.map(o => (
                                 <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4 text-xs font-mono text-slate-400">#{o.id.slice(0, 8)}</td>
                                     <td className="px-6 py-4 text-sm font-bold text-slate-900">{o.buyerId.slice(0, 8)}...</td>
                                     <td className="px-6 py-4 text-sm text-slate-600">{o.items?.[0]?.titleSnapshot || 'Multi-items'}</td>
                                     <td className="px-6 py-4 font-bold text-slate-900 text-sm">{o.amount.toFixed(2)} TND</td>
                                     <td className="px-6 py-4">
                                         <select 
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded border-none focus:ring-0 cursor-pointer ${
                                                o.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                                                o.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-700' : 
                                                'bg-amber-100 text-amber-700'
                                            }`}
                                            value={o.status}
                                            onChange={(e) => onUpdateStatus(o.id, e.target.value as OrderStatus)}
                                         >
                                             {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                         </select>
                                     </td>
                                     <td className="px-6 py-4 text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     {orders.length === 0 && <div className="text-center py-20 text-slate-400 italic">Aucune commande trouvée</div>}
                 </div>
             </div>
        )}
        {activeTab === 'listings' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-4 border-b border-slate-100 font-bold bg-slate-50 flex justify-between items-center">
                     <span>Inventaire Produits</span>
                     <button onClick={() => setActiveTab('create')} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition">Nouveau</button>
                 </div>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                             <tr>
                                 <th className="px-6 py-3">Produit</th>
                                 <th className="px-6 py-3">Catégorie</th>
                                 <th className="px-6 py-3">Prix</th>
                                 <th className="px-6 py-3">Stock</th>
                                 <th className="px-6 py-3">Type</th>
                                 <th className="px-6 py-3">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {listings.map(l => (
                                 <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                     <td className="px-6 py-4 flex items-center space-x-3">
                                         <img src={l.imageUrl} className="w-10 h-10 rounded object-cover border border-slate-100" />
                                         <div>
                                             <div className="font-bold text-slate-900 text-sm">{l.title}</div>
                                             <div className="text-[10px] text-slate-400 uppercase font-bold">{l.game}</div>
                                         </div>
                                     </td>
                                     <td className="px-6 py-4 text-xs text-slate-600">
                                         {categories.find(c => c.id === l.categoryId)?.name || 'Inconnu'}
                                     </td>
                                     <td className="px-6 py-4 font-bold text-slate-900 text-sm">{l.price.toFixed(2)} TND</td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                             {l.stock > 0 ? 'EN STOCK' : 'RUPTURE'}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.isInstant ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                             {l.isInstant ? 'INSTANT' : 'MANUEL'}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="flex space-x-2">
                                             <button className="text-slate-400 hover:text-indigo-600"><Edit size={16} /></button>
                                             <button className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

// --- USER DASHBOARD ---
export const UserDashboard: React.FC<{user: User, orders: Order[]}> = ({ user, orders }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6">
       <div className="w-full md:w-64 bg-white p-6 rounded-lg shadow text-center">
          <img src={user.avatarUrl} className="w-20 h-20 rounded-full mx-auto mb-3" />
          <h3 className="font-bold">{user.username}</h3>
       </div>
       <div className="flex-1 space-y-4">
          <h2 className="font-bold text-2xl">Mes Commandes</h2>
          {orders.map((o) => (
             <div key={o.id} className="bg-white p-4 rounded shadow flex justify-between">
                <span>{o.items?.[0]?.titleSnapshot || 'Commande'}</span> <span className="font-bold">{o.amount} TND</span>
             </div>
          ))}
       </div>
    </div>
  );
};

// Removed redundant X function as it's now imported from lucide-react