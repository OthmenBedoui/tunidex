import React from 'react';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import SocialAuthButtons from '../../shared/SocialAuthButtons';
import { PublicAuthProvider } from '../../../types';

interface LoginFormProps {
  audience: 'client' | 'admin';
  mode: 'login' | 'register';
  email: string;
  password: string;
  error: string;
  success: string;
  isLoading: boolean;
  socialNextPath?: string;
  children?: React.ReactNode;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onProviderClick: (provider: PublicAuthProvider) => void;
}

const inputClass = 'block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10';

const LoginForm: React.FC<LoginFormProps> = ({
  audience,
  mode,
  email,
  password,
  error,
  success,
  isLoading,
  socialNextPath,
  children,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onProviderClick
}) => (
  <form onSubmit={onSubmit} className="space-y-6">
    {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600">{error}</div>}
    {success && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center text-sm font-medium text-green-700">{success}</div>}

    {audience === 'client' && (
      <>
        <SocialAuthButtons onProviderClick={onProviderClick} nextPath={socialNextPath || '/'} />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-xs font-black uppercase tracking-[0.22em] text-slate-400">Or continue with email</span>
          </div>
        </div>
      </>
    )}

    {children}

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Adresse Email</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Mail size={18} className="text-slate-400" />
        </div>
        <input type="email" required className={inputClass} placeholder="vous@exemple.com" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      </div>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Lock size={18} className="text-slate-400" />
        </div>
        <input type="password" required minLength={6} className={inputClass} placeholder="........" value={password} onChange={(e) => onPasswordChange(e.target.value)} />
      </div>
    </div>

    <button type="submit" disabled={isLoading} className="theme-btn flex w-full items-center justify-center rounded-2xl py-3.5 font-bold disabled:opacity-70">
      {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : <>{mode === 'login' ? 'Connexion' : 'Envoyer le code OTP'}<ArrowRight size={18} className="ml-2" /></>}
    </button>
  </form>
);

export default LoginForm;
