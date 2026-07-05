import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Crown, CreditCard, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles, User, X, Zap } from 'lucide-react';
import { SubscriptionTier, User as UserType, UserRole } from '../types';
import { api } from '../services/api';
import SocialAuthButtons from '../components/shared/SocialAuthButtons';
import { handleApiError } from '../utils/apiError';

interface SubscriptionProps {
  user: UserType;
  onSubscribe: (tier: SubscriptionTier) => void;
  navigateTo: (page: string) => void;
  onRequireLogin: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

type Plan = {
  id: SubscriptionTier;
  name: string;
  eyebrow: string;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  icon: React.ReactElement;
};

const paymentMethods = [
  { id: 'EDINAR', label: 'EDINAR' },
  { id: 'FLOUCI', label: 'Flouci' },
  { id: 'CARTE', label: 'Carte' }
];

const Subscription: React.FC<SubscriptionProps> = ({ user, onSubscribe, navigateTo, onRequireLogin, onNotify }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier | null>(null);
  const [step, setStep] = useState(1);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [guestAuthMode, setGuestAuthMode] = useState<'login' | 'register'>('register');
  const [guestAuthLoading, setGuestAuthLoading] = useState(false);
  const [guestAuthMessage, setGuestAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [guestAuthData, setGuestAuthData] = useState({
    username: '',
    fullName: '',
    address: '',
    phone: '',
    email: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    address: user.address || '',
    phone: user.phone || '',
    paymentMethod: user.paymentMethod || 'EDINAR'
  });

  const plans: Plan[] = [
    {
      id: SubscriptionTier.PRO,
      name: 'Pro Gamer',
      eyebrow: 'Pour les clients réguliers',
      price: '19 TND',
      description: 'Un abonnement simple pour réduire vos coûts et accélérer le support.',
      features: ['5% de réduction sur les achats', 'Support prioritaire', 'Accès aux offres membres', 'Suivi client amélioré'],
      icon: <Zap />
    },
    {
      id: SubscriptionTier.ELITE,
      name: 'Elite VIP',
      eyebrow: 'Expérience premium',
      price: '49 TND',
      description: 'Le niveau le plus complet pour profiter du meilleur service sur la plateforme.',
      features: ['10% de réduction sur les achats', 'Support 24/7', 'Livraison prioritaire', 'Traitement VIP des demandes'],
      highlight: true,
      icon: <Crown />
    }
  ];

  const selectedPlanDetails = plans.find((plan) => plan.id === selectedPlan);

  const handlePlanSelect = (tier: SubscriptionTier) => {
    if (user.role === UserRole.GUEST) {
      setGuestAuthMessage({ type: 'error', text: 'Connectez-vous ou créez votre compte pour choisir un abonnement.' });
      return;
    }
    setSelectedPlan(tier);
    setStep(2);
  };

  const handleGuestSocialClick = (provider: { name: string }) => {
    setGuestAuthMessage({
      type: 'success',
      text: `Redirection vers ${provider.name}...`
    });
  };

  const handleGuestAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthLoading(true);
    setGuestAuthMessage(null);

    try {
      if (guestAuthMode === 'login') {
        onRequireLogin();
        return;
      }

      const result = await api.register({
        email: guestAuthData.email,
        password: guestAuthData.password,
        username: guestAuthData.username,
        fullName: guestAuthData.fullName,
        address: guestAuthData.address,
        phone: guestAuthData.phone
      });

      setGuestAuthMessage({ type: 'success', text: result.message });
    } catch (error) {
      const text = handleApiError({
        error,
        fallbackMessage: "Impossible d'envoyer le formulaire.",
        notify: onNotify,
        logContext: 'Guest subscription auth failed'
      });
      setGuestAuthMessage({ type: 'error', text });
    } finally {
      setGuestAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      await api.updateSubscription({
        tier: selectedPlan,
        ...formData
      });
      setPopup({
        type: 'success',
        title: 'Abonnement activé',
        message: `Votre abonnement ${selectedPlan} est maintenant actif.`
      });
      onSubscribe(selectedPlan);
      window.setTimeout(() => navigateTo('home'), 1500);
    } catch (error) {
      const message = handleApiError({
        error,
        fallbackMessage: "Erreur lors de l'abonnement.",
        notify: onNotify,
        logContext: 'Subscription checkout failed'
      });
      setPopup({
        type: 'error',
        title: 'Abonnement impossible',
        message
      });
    }
  };

  const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pl-11 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5';

  const popupElement = popup && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-300 ${
        popup.type === 'success' ? 'border-emerald-100' : 'border-red-100'
      }`}>
        <div className={`h-1.5 ${popup.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              popup.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {popup.type === 'success' ? <CheckCircle2 size={28} className="animate-[notification-check_450ms_ease-out]" /> : <AlertCircle size={28} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-slate-900">{popup.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{popup.message}</div>
            </div>
            {popup.type === 'error' && (
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer la notification"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (step === 2 && selectedPlanDetails) {
    return (
      <>
        {popupElement}
        <div className="min-h-[82vh] bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Changer de plan
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-6 md:px-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                    <ShieldCheck size={14} />
                    Paiement sécurisé
                  </div>
                  <h1 className="mt-4 text-2xl font-black text-slate-950 md:text-3xl">Finaliser votre abonnement</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Vérifiez vos informations de facturation. Le bot WhatsApp sera activé plus tard selon l'action client définie.
                  </p>
                </div>

                <div className="space-y-8 px-6 py-6 md:px-8">
                  <section>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h2 className="text-base font-black text-slate-900">Informations client</h2>
                      <span className="text-xs font-bold text-slate-400">Étape 2 sur 2</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Nom complet</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                          <input
                            required
                            type="text"
                            className={inputClass}
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Téléphone</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                          <input
                            required
                            type="tel"
                            className={inputClass}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Adresse de facturation</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                          <input
                            required
                            type="text"
                            className={inputClass}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-4 text-base font-black text-slate-900">Méthode de paiement</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {paymentMethods.map((method) => (
                        <button
                          type="button"
                          key={method.id}
                          onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                          className={`flex h-14 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                            formData.paymentMethod === method.id
                              ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <CreditCard size={17} />
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="border-t border-slate-100 px-6 py-5 md:px-8">
                  <button
                    type="submit"
                    className="flex h-14 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-4 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-indigo-600"
                  >
                    Confirmer et payer
                  </button>
                </div>
              </form>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/15">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Plan sélectionné</div>
                    <h2 className="mt-2 text-2xl font-black">{selectedPlanDetails.name}</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    {React.cloneElement(selectedPlanDetails.icon, { size: 24 })}
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-4xl font-black">{selectedPlanDetails.price}</div>
                  <div className="mt-1 text-sm font-medium text-slate-400">par mois</div>
                </div>
                <ul className="mt-6 space-y-3">
                  {selectedPlanDetails.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                      <Check size={17} className="mt-1 shrink-0 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {popupElement}
      <div className="min-h-[82vh] bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              <Sparkles size={15} className="text-indigo-600" />
              Abonnements premium
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Upgradez votre expérience TuniBots
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Choisissez un plan clair, profitez d'avantages immédiats, et gardez une expérience de paiement simple et professionnelle.
            </p>
          </div>

          {user.role === UserRole.GUEST && (
            <div className="mt-10 mb-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
              <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl">
                <div className="bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.3),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.2),transparent_30%)] p-8">
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-200">
                      <ShieldCheck size={14} />
                      Account access
                    </div>
                    <h2 className="mt-5 text-3xl font-black leading-tight">Connect first, then unlock your subscription plan.</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      Use any enabled authentication method or complete the registration form directly from this page.
                    </p>
                  </div>

                  <SocialAuthButtons compact onProviderClick={handleGuestSocialClick} className="mb-6" nextPath="/subscription" />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setGuestAuthMode('login')}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${guestAuthMode === 'login' ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'}`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestAuthMode('register')}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${guestAuthMode === 'register' ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/10 text-white hover:bg-white/15'}`}
                    >
                      Register
                    </button>
                  </div>

                  {guestAuthMessage && (
                    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${guestAuthMessage.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-red-400/20 bg-red-400/10 text-red-100'}`}>
                      {guestAuthMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleGuestAuthSubmit} className="mt-6 space-y-4">
                    {guestAuthMode === 'register' && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="relative">
                            <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                              required
                              type="text"
                              placeholder="Username"
                              value={guestAuthData.username}
                              onChange={(e) => setGuestAuthData({ ...guestAuthData, username: e.target.value })}
                              className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                            />
                          </div>
                          <div className="relative">
                            <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                            <input
                              required
                              type="text"
                              placeholder="Full name"
                              value={guestAuthData.fullName}
                              onChange={(e) => setGuestAuthData({ ...guestAuthData, fullName: e.target.value })}
                              className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                          <input
                            required
                            type="text"
                            placeholder="Billing address"
                            value={guestAuthData.address}
                            onChange={(e) => setGuestAuthData({ ...guestAuthData, address: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                          <input
                            required
                            type="tel"
                            placeholder="+216 XX XXX XXX"
                            value={guestAuthData.phone}
                            onChange={(e) => setGuestAuthData({ ...guestAuthData, phone: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                          />
                        </div>
                      </>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                      <input
                        required
                        type="email"
                        placeholder="Email address"
                        value={guestAuthData.email}
                        onChange={(e) => setGuestAuthData({ ...guestAuthData, email: e.target.value })}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                      <input
                        required
                        type="password"
                        minLength={6}
                        placeholder="Password"
                        value={guestAuthData.password}
                        onChange={(e) => setGuestAuthData({ ...guestAuthData, password: e.target.value })}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 pl-11 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/25"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={guestAuthLoading}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:opacity-70"
                      >
                        {guestAuthLoading ? <CheckCircle2 size={18} className="animate-pulse" /> : guestAuthMode === 'login' ? <ArrowRight size={18} /> : <Sparkles size={18} />}
                        {guestAuthMode === 'login' ? 'Go to login' : 'Create account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo(guestAuthMode === 'login' ? 'register' : 'login')}
                        className="h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15"
                      >
                        Open full page
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                  <Zap size={14} />
                  Subscription preview
                </div>
                <h2 className="text-3xl font-black text-slate-950">Choose your plan while your account setup stays one step away.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  Once you connect or complete the form, you can immediately continue with the subscription flow and payment details.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    'Enabled social login buttons appear automatically from the admin configuration.',
                    'Email registration stays available as a full fallback.',
                    'Premium plans remain visible before authentication.',
                    'The flow stays mobile-friendly and production-ready.'
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:p-8 ${
                  plan.highlight ? 'border-slate-950 ring-4 ring-slate-950/5' : 'border-slate-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute right-5 top-5 rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
                    Recommandé
                  </div>
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  {React.cloneElement(plan.icon, { size: 24 })}
                </div>
                <div className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{plan.eyebrow}</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{plan.name}</h2>
                <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-500">{plan.description}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tight text-slate-950">{plan.price}</span>
                  <span className="pb-2 text-sm font-bold text-slate-400">/ mois</span>
                </div>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-700">
                      <Check size={18} className="mt-1 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`mt-8 flex h-12 w-full items-center justify-center rounded-xl text-sm font-black transition ${
                    plan.highlight
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:bg-indigo-600'
                      : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-950 hover:bg-slate-950 hover:text-white'
                  }`}
                >
                  Choisir ce plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Subscription;
