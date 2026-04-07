import React, { useState } from 'react';
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { SiteConfig, User as UserType } from '../types';
import { api } from '../services/api';

type AuthMode = 'login' | 'register' | 'otp';
type AuthAudience = 'client' | 'admin';

interface LoginProps {
  onLoginSuccess: (token: string, user: UserType) => void;
  navigateTo: (page: string) => void;
  siteConfig: SiteConfig;
  initialMode?: AuthMode;
  audience?: AuthAudience;
}

const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  navigateTo,
  siteConfig,
  initialMode = 'login',
  audience = 'client'
}) => {
  const supportsRegistration = audience === 'client';
  const [mode, setMode] = useState<AuthMode>(supportsRegistration ? initialMode : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (nextMode: AuthMode) => {
    if (!supportsRegistration && nextMode !== 'login') {
      return;
    }
    setMode(nextMode);
    resetMessages();
    if (nextMode === 'login') {
      setPassword('');
      setOtp('');
    }
  };

  const handleLogin = async () => {
    const data = await api.login(email, password) as { token: string; user: UserType };
    onLoginSuccess(data.token, data.user);
  };

  const handleRegister = async () => {
    const data = await api.register(email, password, username);
    setSuccess(data.message);
    setMode('otp');
  };

  const handleVerifyOtp = async () => {
    const data = await api.verifyRegistrationOtp(email, otp);
    onLoginSuccess(data.token, data.user);
  };

  const handleResendOtp = async () => {
    const data = await api.resendRegistrationOtp(email);
    setSuccess(data.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      if (mode === 'login') {
        await handleLogin();
      } else if (mode === 'register') {
        await handleRegister();
      } else {
        await handleVerifyOtp();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const title = mode === 'login'
    ? audience === 'admin' ? 'Connexion Admin' : 'Connexion'
    : mode === 'register'
      ? 'Créer votre compte'
      : 'Confirmer votre email';

  const subtitle = mode === 'login'
    ? audience === 'admin' ? 'Accédez à votre espace de gestion privé.' : 'Connectez-vous à votre espace client.'
    : mode === 'register'
      ? 'Remplissez le formulaire puis recevez un code OTP par email.'
      : `Entrez le code OTP envoyé à ${email || 'votre email'}.`;

  return (
    <div className="relative flex min-h-[82vh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(15,23,42,1)_35%,_rgba(2,6,23,1)_100%)]"></div>
      <div className="absolute -top-16 right-[-80px] h-72 w-72 rounded-full blur-3xl opacity-40" style={{ backgroundColor: 'var(--theme-accent)' }}></div>
      <div className="absolute bottom-[-90px] left-[-70px] h-80 w-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: 'var(--theme-accent)' }}></div>

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-10 text-white backdrop-blur-xl lg:flex">
          <div>
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em]" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)' }}>
              {audience === 'admin' ? 'Accès Privé' : 'Inscription Sécurisée'}
            </div>
            <h1 className="mt-6 text-5xl font-black leading-tight">
              {audience === 'admin'
                ? 'Connectez-vous au dashboard admin privé.'
                : 'Créez votre compte et confirmez-le par OTP email.'}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              {audience === 'admin'
                ? "Accès séparé du store public, routage protégé, et redirection directe vers le dashboard d'administration."
                : 'Un formulaire propre, une validation claire, puis un code OTP envoyé par mail pour activer définitivement le compte.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(audience === 'admin'
              ? ['Route privée', 'Login séparé', 'Dashboard sécurisé']
              : ['Formulaire complet', 'OTP par email', 'Activation immédiate']
            ).map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full rounded-[32px] border border-white/10 bg-white/90 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg" style={{ backgroundColor: 'var(--theme-accent)' }}>
              {siteConfig.logoUrl ? (
                <img src={siteConfig.logoUrl} alt={siteConfig.siteName} className="h-9 w-auto object-contain" />
              ) : (
                siteConfig.siteName?.charAt(0) || 'T'
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-center text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nom d'utilisateur</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10"
                    placeholder="othme"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mode !== 'otp' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Adresse Email</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Mot de passe</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'otp' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Code OTP</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <ShieldCheck size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10 tracking-[0.4em] text-center font-black"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="theme-btn flex w-full items-center justify-center rounded-2xl py-3.5 font-bold disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="mr-2 animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' ? 'Connexion' : mode === 'register' ? "Envoyer le code OTP" : 'Confirmer le compte'}
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </button>
          </form>

          {mode === 'otp' && (
            <div className="mt-5 flex items-center justify-between text-sm">
              <button onClick={() => switchMode('register')} className="font-semibold text-slate-500 hover:text-slate-900">
                Modifier les informations
              </button>
              <button
                onClick={async () => {
                  setIsLoading(true);
                  resetMessages();
                  try {
                    const data = await api.resendRegistrationOtp(email);
                    setSuccess(data.message);
                  } catch (resendError) {
                    setError(resendError instanceof Error ? resendError.message : 'Erreur');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="font-bold theme-text-accent"
              >
                Renvoyer le code
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            {mode === 'login' && supportsRegistration && (
              <>
                <span className="text-slate-500">Pas encore de compte ?</span>
                <button onClick={() => switchMode('register')} className="ml-2 font-bold theme-text-accent">
                  S'inscrire maintenant
                </button>
              </>
            )}
            {mode === 'register' && supportsRegistration && (
              <>
                <span className="text-slate-500">Déjà un compte ?</span>
                <button onClick={() => switchMode('login')} className="ml-2 font-bold theme-text-accent">
                  Se connecter
                </button>
              </>
            )}
            {mode === 'otp' && (
              <>
                <span className="text-slate-500">Déjà confirmé ?</span>
                <button onClick={() => switchMode('login')} className="ml-2 font-bold theme-text-accent">
                  Aller à la connexion
                </button>
              </>
            )}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button
              onClick={() => navigateTo('home')}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {audience === 'admin' ? 'Retour au store' : "Retour à l'accueil"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
