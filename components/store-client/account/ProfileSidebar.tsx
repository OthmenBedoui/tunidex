import React from 'react';
import { History, Mail, MapPin, Phone, Shield, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../../../types';

interface ProfileSidebarProps {
  user: User;
  avatarUrl: string;
  phone: string;
  address: string;
  onGoOrders: () => void;
  onVerifyEmail: () => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ user, avatarUrl, phone, address, onGoOrders, onVerifyEmail }) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
      <div className="relative inline-block mb-4">
        <img src={avatarUrl || 'https://via.placeholder.com/150'} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
        <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm"></div>
      </div>
      <h2 className="text-xl font-bold text-slate-900">{user.username}</h2>
      <p className="text-sm text-slate-500 mb-4">{user.email}</p>
      <div className="flex justify-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>{user.role}</span>
        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{user.balance.toFixed(2)} TND</span>
      </div>
    </div>

    <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
      <h3 className="font-bold mb-2 flex items-center">
        <Shield size={18} className="mr-2" /> Securite
      </h3>
      <p className="text-xs text-indigo-100 mb-4">Gardez votre compte securise en utilisant un mot de passe fort et en verifiant votre adresse email.</p>
      {!user.emailVerified ? (
        <button onClick={onVerifyEmail} className="w-full bg-white text-indigo-600 font-bold py-2 rounded-xl hover:bg-indigo-50 transition text-sm">
          Verifier mon email
        </button>
      ) : (
        <div className="flex items-center text-green-300 text-sm font-bold">
          <Mail size={16} className="mr-2" /> Email verifie
        </div>
      )}
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="mb-3 flex items-center font-black text-slate-900">
          <Phone size={18} className="mr-2 text-indigo-600" /> Coordonnees
        </h3>
        <button onClick={onGoOrders} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center">
          <History size={16} className="mr-1" /> Commandes
        </button>
      </div>
      <div className="space-y-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Mail size={15} className="text-slate-400" />
          <span className="truncate">{user.email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2">
            <Phone size={15} className="text-slate-400" />
            <span>{phone}</span>
          </div>
        )}
        {address && (
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-slate-400" />
            <span>{address}</span>
          </div>
        )}
      </div>
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <h3 className="mb-2 flex items-center font-black text-red-900">
        <UserIcon size={18} className="mr-2" /> Zone sensible
      </h3>
      <p className="text-xs leading-6 text-red-700">La suppression du compte efface votre profil et votre panier. Vos anciennes commandes peuvent rester conservees pour le suivi, la facturation et le support.</p>
    </div>
  </div>
);

export default ProfileSidebar;
