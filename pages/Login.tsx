import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';

interface LoginProps {
  onLoginSuccess: (token: string, user: UserType) => void;
  navigateTo: (page: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, navigateTo }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      let data;
      if (isRegistering) {
        data = await api.register(email, password, username);
      } else {
        data = await api.login(email, password);
      }
      onLoginSuccess((data as any).token, (data as any).user);
    } catch (err) {
      setError(isRegistering ? "Échec de l'inscription. L'email existe peut-être déjà." : "Identifiants invalides.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold mx-auto mb-4">
            T
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isRegistering ? 'Créer un compte' : 'Bon retour parmi nous'}
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            {isRegistering 
              ? 'Rejoignez la plateforme premium pour vos assets digitaux.' 
              : 'Connectez-vous pour accéder à vos commandes.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-slate-400" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition duration-200 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2" size={20} />
            ) : (
              <>
                {isRegistering ? 'S\'inscrire' : 'Connexion'} <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">
            {isRegistering ? 'Déjà un compte ?' : "Pas encore de compte ?"}
          </span>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="ml-2 font-bold text-indigo-600 hover:text-indigo-700"
          >
            {isRegistering ? 'Se connecter' : 'S\'inscrire maintenant'}
          </button>
        </div>

        {!isRegistering && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={async () => {
                setIsLoading(true);
                setError('');
                try {
                  const data = await api.login('johnson67377@gmail.com', '123456');
                  onLoginSuccess((data as any).token, (data as any).user);
                } catch (err) {
                  setError("Échec de la connexion admin rapide.");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full py-2 px-4 border border-indigo-200 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={14} /> Connexion Admin Rapide
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;