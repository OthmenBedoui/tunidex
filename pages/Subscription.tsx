import React, { useState } from 'react';
import { Check, Crown, Zap, User, MapPin, Phone } from 'lucide-react';
import { SubscriptionTier, User as UserType, UserRole } from '../types';
import { api } from '../services/api';

interface SubscriptionProps {
  user: UserType;
  onSubscribe: (tier: SubscriptionTier) => void;
  navigateTo: (page: string) => void;
}

const Subscription: React.FC<SubscriptionProps> = ({ user, onSubscribe, navigateTo }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);
  const [step, setStep] = useState(1); // 1: Select Plan, 2: Details
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    phone: '',
    paymentMethod: 'EDINAR'
  });

  const plans = [
    { id: SubscriptionTier.PRO, name: 'Pro Gamer', price: '19 TND', features: ['5% Réduction', 'Support Prio'], icon: <Zap /> },
    { id: SubscriptionTier.ELITE, name: 'Elite VIP', price: '49 TND', features: ['10% Réduction', 'Support 24/7', 'Livraison Prio'], icon: <Crown /> }
  ];

  const handlePlanSelect = (tier: SubscriptionTier) => {
    if (user.role === UserRole.GUEST) return navigateTo('login');
    setSelectedPlan(tier);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
        await api.updateSubscription({
            tier: selectedPlan,
            ...formData
        });
        alert(`Félicitations ! Vous êtes maintenant ${selectedPlan}.`);
        onSubscribe(selectedPlan);
        navigateTo('home');
    } catch {
        alert("Erreur lors de l'abonnement.");
    }
  };

  if (step === 2 && selectedPlan) {
    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <button onClick={() => setStep(1)} className="mb-6 text-slate-500 hover:text-indigo-600">← Changer de plan</button>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <h2 className="text-2xl font-bold mb-6">Finaliser votre abonnement {selectedPlan}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom Complet</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input required type="text" className="w-full pl-10 p-2 border rounded-lg" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Adresse de Facturation</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input required type="text" className="w-full pl-10 p-2 border rounded-lg" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input required type="tel" className="w-full pl-10 p-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">Méthode de Paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['EDINAR', 'FLOUCI', 'CARTE'].map(method => (
                                <div 
                                    key={method}
                                    onClick={() => setFormData({...formData, paymentMethod: method})}
                                    className={`cursor-pointer border rounded-xl p-4 text-center font-bold text-sm ${formData.paymentMethod === method ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    {method}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition">
                        Confirmer et Payer
                    </button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="py-12 max-w-6xl mx-auto px-4">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Upgradez votre Expérience</h1>
        <p className="text-lg text-slate-500">Choisissez le plan qui correspond à votre style de jeu.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
            <div key={plan.id} className="bg-white border hover:border-indigo-500 transition-all rounded-2xl p-8 shadow-sm hover:shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                    {React.cloneElement(plan.icon as React.ReactElement<{ size: number }>, { size: 100 })}
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-black mb-6">{plan.price} <span className="text-sm font-normal text-slate-500">/ mois</span></div>
                <ul className="space-y-3 mb-8">
                    {plan.features.map((f, i) => <li key={i} className="flex items-center"><Check size={18} className="text-green-500 mr-2" /> {f}</li>)}
                </ul>
                <button onClick={() => handlePlanSelect(plan.id)} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-indigo-600 transition">Choisir ce plan</button>
            </div>
        ))}
      </div>
    </div>
  );
};

export default Subscription;