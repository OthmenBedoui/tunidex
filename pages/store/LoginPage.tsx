import React, { useState } from 'react';
import { api } from '../../services/api';
import AuthHeroPanel from '../../components/store-client/account/AuthHeroPanel';
import LoginForm from '../../components/store-client/account/LoginForm';
import OtpVerificationForm from '../../components/store-client/account/OtpVerificationForm';
import RegisterForm from '../../components/store-client/account/RegisterForm';
import { AuthMode, StoreLoginPageProps } from '../../components/store-client/account/types';
import { PublicAuthProvider, User } from '../../types';

const LoginPage: React.FC<StoreLoginPageProps> = ({
  onLoginSuccess,
  navigateTo,
  siteConfig,
  initialMode = 'login',
  audience = 'client',
  socialNextPath
}) => {
  const supportsRegistration = audience === 'client';
  const [mode, setMode] = useState<AuthMode>(supportsRegistration ? initialMode : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (nextMode: AuthMode) => {
    if (!supportsRegistration && nextMode !== 'login') return;
    setMode(nextMode);
    resetMessages();
    if (nextMode === 'login') {
      setPassword('');
      setOtp('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      if (mode === 'login') {
        const data = await api.login(email, password) as { token: string; user: User };
        onLoginSuccess(data.token, data.user);
      } else if (mode === 'register') {
        const data = await api.register({ email, password, username, fullName, address, phone });
        setSuccess(data.message);
        setMode('otp');
      } else {
        const data = await api.verifyRegistrationOtp(email, otp) as { token: string; user: User };
        onLoginSuccess(data.token, data.user);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
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
  };

  const handleSocialProviderClick = (provider: PublicAuthProvider) => {
    resetMessages();
    setSuccess(`Redirection vers ${provider.name}...`);
  };

  const title = mode === 'login' ? (audience === 'admin' ? 'Connexion Admin' : 'Connexion') : mode === 'register' ? 'Creer votre compte' : 'Confirmer votre email';
  const subtitle =
    mode === 'login'
      ? audience === 'admin'
        ? 'Accedez a votre espace de gestion prive.'
        : 'Connectez-vous a votre espace client.'
      : mode === 'register'
        ? 'Remplissez le formulaire puis recevez un code OTP par email.'
        : `Entrez le code OTP envoye a ${email || 'votre email'}.`;

  return (
    <div className="relative flex min-h-[82vh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.95),_rgba(15,23,42,1)_35%,_rgba(2,6,23,1)_100%)]"></div>
      <div className="absolute -top-16 right-[-80px] h-72 w-72 rounded-full blur-3xl opacity-40" style={{ backgroundColor: 'var(--theme-accent)' }}></div>
      <div className="absolute bottom-[-90px] left-[-70px] h-80 w-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: 'var(--theme-accent)' }}></div>

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <AuthHeroPanel audience={audience} />

        <div className="w-full rounded-[32px] border border-white/10 bg-white/90 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-24 w-56 items-center justify-center rounded-2xl text-xl font-black text-slate-900">
              {siteConfig.logoUrl ? <img src={siteConfig.logoUrl} alt={siteConfig.siteName} className="max-h-20 w-full object-contain" /> : siteConfig.siteName?.charAt(0) || 'T'}
            </div>
            <h2 className="text-3xl font-black text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>

          {mode === 'otp' ? (
            <OtpVerificationForm
              email={email}
              otp={otp}
              error={error}
              success={success}
              isLoading={isLoading}
              onOtpChange={setOtp}
              onSubmit={handleSubmit}
              onEdit={() => switchMode('register')}
              onResend={handleResendOtp}
              onGoToLogin={() => switchMode('login')}
            />
          ) : (
            <>
              <LoginForm
                audience={audience}
                mode={mode}
                email={email}
                password={password}
                error={error}
                success={success}
                isLoading={isLoading}
                socialNextPath={socialNextPath}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleSubmit}
                onProviderClick={handleSocialProviderClick}
              >
                {mode === 'register' && (
                  <RegisterForm
                    username={username}
                    fullName={fullName}
                    address={address}
                    phone={phone}
                    onUsernameChange={setUsername}
                    onFullNameChange={setFullName}
                    onAddressChange={setAddress}
                    onPhoneChange={setPhone}
                  />
                )}
              </LoginForm>
            </>
          )}

          {mode !== 'otp' && (
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
                  <span className="text-slate-500">Deja un compte ?</span>
                  <button onClick={() => switchMode('login')} className="ml-2 font-bold theme-text-accent">
                    Se connecter
                  </button>
                </>
              )}
            </div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-6">
            <button onClick={() => navigateTo('home')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {audience === 'admin' ? 'Retour au store' : "Retour a l'accueil"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
