import React from 'react';
import { Lock, Mail, Save } from 'lucide-react';
import { ImageInput } from '../../shared/ImageInput';

interface ProfileFormProps {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  whatsappNumber: string;
  avatarUrl: string;
  password: string;
  confirmPassword: string;
  newEmail: string;
  emailOtp: string;
  userEmail: string;
  isEmailVerified: boolean;
  isEmailChangePending: boolean;
  isLoading: boolean;
  isEmailSending: boolean;
  isEmailConfirming: boolean;
  message: { type: string; text: string };
  onSubmit: (event: React.FormEvent) => void;
  onUsernameChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onWhatsappNumberChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNewEmailChange: (value: string) => void;
  onEmailOtpChange: (value: string) => void;
  onRequestEmailChange: () => void;
  onConfirmEmailChange: () => void;
}

const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={`h-5 w-5 animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const fieldClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition';

const ProfileForm: React.FC<ProfileFormProps> = ({
  username,
  firstName,
  lastName,
  phone,
  address,
  paymentMethod,
  whatsappNumber,
  avatarUrl,
  password,
  confirmPassword,
  newEmail,
  emailOtp,
  userEmail,
  isEmailVerified,
  isEmailChangePending,
  isLoading,
  isEmailSending,
  isEmailConfirming,
  message,
  onSubmit,
  onUsernameChange,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onAddressChange,
  onPaymentMethodChange,
  onWhatsappNumberChange,
  onAvatarUrlChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onNewEmailChange,
  onEmailOtpChange,
  onRequestEmailChange,
  onConfirmEmailChange
}) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
    <form onSubmit={onSubmit} className="space-y-6">
      {message.text && <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{message.text}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prenom</label>
          <input type="text" className={fieldClass} value={firstName} onChange={(e) => onFirstNameChange(e.target.value)} placeholder="Votre prenom" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom</label>
          <input type="text" className={fieldClass} value={lastName} onChange={(e) => onLastNameChange(e.target.value)} placeholder="Votre nom" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom d'utilisateur</label>
          <input type="text" className={fieldClass} value={username} onChange={(e) => onUsernameChange(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email actuel</label>
          <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 outline-none transition" value={userEmail} disabled />
          {isEmailVerified && <p className="text-xs font-medium text-emerald-600">Email confirme. Pour le changer, utilisez la validation par code ci-dessous.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
        <h3 className="mb-4 flex items-center font-bold text-slate-900">
          <Mail size={18} className="mr-2 text-indigo-600" /> Changer l'adresse email
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nouveau email</label>
            <input type="email" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:ring-2 focus:ring-indigo-500" value={newEmail} onChange={(e) => onNewEmailChange(e.target.value)} placeholder="nouveau@email.com" />
          </div>
          <button type="button" onClick={onRequestEmailChange} disabled={isEmailSending || !isEmailChangePending} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isEmailSending ? 'Envoi...' : 'Envoyer le code'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Code recu</label>
            <input type="text" inputMode="numeric" maxLength={6} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-black tracking-[0.4em] outline-none transition focus:ring-2 focus:ring-indigo-500" value={emailOtp} onChange={(e) => onEmailOtpChange(e.target.value)} placeholder="000000" />
          </div>
          <button type="button" onClick={onConfirmEmailChange} disabled={isEmailConfirming || !isEmailChangePending || emailOtp.trim().length < 6} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
            {isEmailConfirming ? 'Validation...' : 'Confirmer email'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numero telephone</label>
          <input type="tel" className={fieldClass} value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="+216 ..." />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
          <input type="tel" className={fieldClass} value={whatsappNumber} onChange={(e) => onWhatsappNumberChange(e.target.value)} placeholder="+216 ..." />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse</label>
          <input type="text" className={fieldClass} value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="Adresse de livraison / facturation" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Methode de paiement preferee</label>
          <input type="text" className={fieldClass} value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)} placeholder="Ex: D17, virement, cash..." />
        </div>
      </div>

      <div className="space-y-2">
        <ImageInput label="URL de l'Avatar" value={avatarUrl} onChange={onAvatarUrlChange} placeholder="https://..." uploadPreset="avatar" />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center">
          <Lock size={18} className="mr-2 text-slate-400" /> Changer le mot de passe
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nouveau mot de passe</label>
            <input type="password" className={fieldClass} value={password} onChange={(e) => onPasswordChange(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmer le mot de passe</label>
            <input type="password" className={fieldClass} value={confirmPassword} onChange={(e) => onConfirmPasswordChange(e.target.value)} placeholder="Confirmez le nouveau mot de passe" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-slate-200">
        {isLoading ? <Spinner className="mr-2" /> : <Save className="mr-2" />}
        Enregistrer les modifications
      </button>
    </form>
  </div>
);

export default ProfileForm;
