
import React, { useEffect, useState } from 'react';
import { Trash2, ShoppingBag, ArrowRight, Lock, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { CartItem } from '../types';

interface CartProps {
  navigateTo: (page: string) => void;
  onCartUpdate: (count: number) => void;
}

// Données Mock pour affichage immédiat
const MOCK_CART_ITEMS: CartItem[] = [
    {
        id: 'c1', listingId: '1', quantity: 1, 
        listing: { id: '1', title: 'Netflix Premium 1 Mois', price: 12.00, game: 'Netflix', categoryId: 'cat_streaming', imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85', description: '4K', stock: 50, deliveryTimeHours: 0, gallery: [], isInstant: true, preparationTime: 'Immédiat' }
    },
    {
        id: 'c2', listingId: '2', quantity: 2, 
        listing: { id: '2', title: 'FIFA 25 - 100K Coins', price: 25.00, game: 'EA FC 25', categoryId: 'cat_coins', imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8', description: 'Coins', stock: 100, deliveryTimeHours: 1, gallery: [], isInstant: false, preparationTime: '1-2 heures' }
    }
];

const Cart: React.FC<CartProps> = ({ navigateTo, onCartUpdate }) => {
  const [items, setItems] = useState<CartItem[]>(MOCK_CART_ITEMS);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('edinar');

  useEffect(() => {
    // On essaie de charger le vrai panier, mais on ne bloque pas l'affichage
    api.getCart()
      .then(data => { if(data.length > 0) setItems(data); })
      .catch(console.error);
  }, []);

  const handleRemove = async (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    
    // Calculer le nouveau nombre total d'items
    const newCount = newItems.reduce((acc, item) => acc + item.quantity, 0);
    onCartUpdate(newCount);

    try { await api.removeFromCart(id); } catch { /* ignore */ }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setTimeout(() => {
        alert(`Paiement simulé avec succès via ${paymentMethod} !`);
        setItems([]);
        onCartUpdate(0); // Reset cart count to 0
        setIsCheckingOut(false);
    }, 1500);
  };

  const total = items.reduce((sum, item) => sum + (item.listing.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center">
        <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-300">
          <ShoppingBag size={64} className="text-slate-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Votre panier est vide</h2>
        <button onClick={() => navigateTo('home')} className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1">
          Parcourir la Boutique
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-black mb-8 flex items-center text-slate-900"><ShoppingBag className="mr-3" /> Mon Panier <span className="ml-3 text-lg font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{items.length} articles</span></h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center transition-all hover:shadow-md">
              <img src={item.listing.imageUrl} alt={item.listing.title} className="w-24 h-24 object-cover rounded-xl sm:mr-6 mb-4 sm:mb-0 shadow-sm" />
              <div className="flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-indigo-600 uppercase mb-1">{item.listing.game}</div>
                <h3 className="font-bold text-slate-900 text-xl mb-1">{item.listing.title}</h3>
                <p className="text-sm text-slate-400">{item.listing.description}</p>
              </div>
              <div className="text-right mx-6 mt-4 sm:mt-0">
                <div className="font-black text-xl text-slate-900">{item.listing.price.toFixed(2)} <span className="text-xs font-normal text-slate-500">TND</span></div>
                <div className="text-xs font-medium text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded mt-1">Qté: {item.quantity}</div>
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-slate-300 hover:text-indigo-500 p-3 hover:bg-indigo-50 rounded-xl transition-all mt-4 sm:mt-0">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 sticky top-24">
            <h3 className="font-bold text-xl mb-6 flex items-center"><Wallet size={20} className="mr-2" /> Paiement</h3>
            
            <div className="grid grid-cols-3 gap-2 mb-8">
                {['edinar', 'carte', 'flouci'].map(pm => (
                    <button 
                        key={pm}
                        onClick={() => setPaymentMethod(pm)}
                        className={`border rounded-xl p-3 flex flex-col items-center justify-center transition-all ${paymentMethod === pm ? 'border-indigo-600 bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300 text-slate-500'}`}
                    >
                        {pm === 'edinar' && <CreditCard size={20} className="mb-1" />}
                        {pm === 'carte' && <Lock size={20} className="mb-1" />}
                        {pm === 'flouci' && <Smartphone size={20} className="mb-1" />}
                        <span className="text-xs font-bold uppercase">{pm}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4 mb-8 text-sm text-slate-600">
                <div className="flex justify-between"><span>Sous-total</span> <span className="font-medium">{total.toFixed(2)} TND</span></div>
                <div className="border-t border-dashed pt-4 flex justify-between text-2xl font-black text-slate-900">
                <span>Total</span> <span>{total.toFixed(2)} <span className="text-sm text-slate-400 font-normal">TND</span></span>
                </div>
            </div>

            <button 
                onClick={handleCheckout} 
                disabled={isCheckingOut}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center disabled:opacity-70 shadow-lg"
            >
                {isCheckingOut ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div> : <>Payer Maintenant <ArrowRight size={20} className="ml-2" /></>}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
