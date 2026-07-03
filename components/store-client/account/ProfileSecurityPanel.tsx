import React from 'react';
import { Trash2 } from 'lucide-react';

interface ProfileSecurityPanelProps {
  deleteConfirmation: string;
  isDeletingAccount: boolean;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteAccount: () => void;
}

const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={`h-5 w-5 animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ProfileSecurityPanel: React.FC<ProfileSecurityPanelProps> = ({
  deleteConfirmation,
  isDeletingAccount,
  onDeleteConfirmationChange,
  onDeleteAccount
}) => (
  <div className="mt-8 rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="mb-2 flex items-center text-sm font-black uppercase tracking-[0.18em] text-red-600">
          <Trash2 size={16} className="mr-2" /> Suppression compte
        </div>
        <h3 className="text-2xl font-black text-slate-950">Supprimer definitivement mon compte</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Cette action supprime vos informations de connexion et vous deconnecte immediatement. Pour des raisons de facturation et de support, les commandes deja passees restent consultables par l administration sans lien actif vers votre compte.
        </p>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Tapez SUPPRIMER pour confirmer</label>
        <input type="text" value={deleteConfirmation} onChange={(e) => onDeleteConfirmationChange(e.target.value)} className="w-full rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-500" placeholder="SUPPRIMER" />
      </div>
      <button type="button" onClick={onDeleteAccount} disabled={isDeletingAccount || deleteConfirmation !== 'SUPPRIMER'} className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
        {isDeletingAccount ? <Spinner className="mr-2" /> : <Trash2 size={18} className="mr-2" />}
        Supprimer mon compte
      </button>
    </div>
  </div>
);

export default ProfileSecurityPanel;
