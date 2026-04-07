
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { ImageInput } from '../components/ImageInput';
import { Save, Shield, Mail, Lock, User as UserIcon, History } from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  navigateTo: (page: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, navigateTo }) => {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (password && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      setIsLoading(false);
      return;
    }

    try {
      const updatedUser = await api.updateProfile({
        username,
        email,
        avatarUrl,
        password: password || undefined
      });
      onUpdateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await api.sendVerificationEmail();
      setMessage({ type: 'success', text: 'Email de vérification envoyé !' });
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'envoi de l'email." });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 flex items-center">
          <UserIcon className="mr-3 text-indigo-600" size={32} /> Mon Profil
        </h1>
        <button 
          onClick={() => navigateTo('user-dashboard')}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
        >
          <History size={16} className="mr-1" /> Voir mes commandes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={avatarUrl || 'https://via.placeholder.com/150'} 
                alt="Avatar" 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm"></div>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{user.username}</h2>
            <p className="text-sm text-slate-500 mb-4">{user.email}</p>
            <div className="flex justify-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {user.role}
              </span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                {user.balance.toFixed(2)} TND
              </span>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold mb-2 flex items-center">
              <Shield size={18} className="mr-2" /> Sécurité
            </h3>
            <p className="text-xs text-indigo-100 mb-4">
              Gardez votre compte sécurisé en utilisant un mot de passe fort et en vérifiant votre adresse email.
            </p>
            {!user.emailVerified && (
              <button 
                onClick={handleVerifyEmail}
                className="w-full bg-white text-indigo-600 font-bold py-2 rounded-xl hover:bg-indigo-50 transition text-sm"
              >
                Vérifier mon email
              </button>
            )}
            {user.emailVerified && (
              <div className="flex items-center text-green-300 text-sm font-bold">
                <Mail size={16} className="mr-2" /> Email vérifié
              </div>
            )}
          </div>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {message.text && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom d'utilisateur</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <ImageInput 
                  label="URL de l'Avatar"
                  value={avatarUrl}
                  onChange={setAvatarUrl}
                  placeholder="https://..."
                  uploadPreset="avatar"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                  <Lock size={18} className="mr-2 text-slate-400" /> Changer le mot de passe
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nouveau mot de passe</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Laisser vide pour ne pas changer"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmer le mot de passe</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez le nouveau mot de passe"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center shadow-lg shadow-slate-200"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                Enregistrer les modifications
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default Profile;
