import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, clearStoredAccessToken, storeAccessToken } from '../services/api';
import { User } from '../types';

interface AuthCallbackProps {
  onLoginSuccess: (token: string, user: User, redirectPath?: string) => void;
  navigateTo: (page: string) => void;
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ onLoginSuccess, navigateTo }) => {
  const [message, setMessage] = useState('Connexion sécurisée en cours...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const next = params.get('next') || '/';

    if (error) {
      setMessage(error);
      window.setTimeout(() => navigateTo('login'), 1800);
      return;
    }

    if (!token) {
      setMessage('Jeton de connexion manquant.');
      window.setTimeout(() => navigateTo('login'), 1800);
      return;
    }

    storeAccessToken(token);
    api.getCurrentUser()
      .then((user) => {
        onLoginSuccess(token, user, next);
      })
      .catch((authError) => {
        clearStoredAccessToken();
        setMessage(authError instanceof Error ? authError.message : 'Impossible de finaliser la connexion.');
        window.setTimeout(() => navigateTo('login'), 1800);
      });
  }, [navigateTo, onLoginSuccess]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Loader2 size={26} className="animate-spin" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-950">OAuth callback</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
