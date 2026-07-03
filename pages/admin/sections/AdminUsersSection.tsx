import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Loader2, Save, Shield, X } from 'lucide-react';
import { api } from '../../../services/api';
import { User, UserRole } from '../../../types';

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  [UserRole.GUEST]: 'bg-slate-100 text-slate-700',
  [UserRole.CLIENT]: 'bg-slate-100 text-slate-700',
  [UserRole.SELLER]: 'bg-blue-100 text-blue-700',
  [UserRole.SUB_ADMIN]: 'bg-orange-100 text-orange-700',
  [UserRole.ADMIN]: 'bg-red-100 text-red-700'
};

interface AdminUsersSectionProps {
  currentUserRole: UserRole;
  onNotify: (payload: { type: 'success' | 'error'; title: string; message: string }) => void;
}

const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({ currentUserRole, onNotify }) => {
  const [view, setView] = useState<'all' | 'roles'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>(UserRole.CLIENT);
  const [editBalance, setEditBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUserRole !== UserRole.ADMIN) return;

    let cancelled = false;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const nextUsers = await api.getAllUsers();
        if (!cancelled) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (!cancelled) {
          onNotify({
            type: 'error',
            title: 'Utilisateurs indisponibles',
            message: error instanceof Error ? error.message : "Impossible de charger la liste des utilisateurs."
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [currentUserRole, onNotify]);

  const countsByRole = useMemo(() => {
    const roles = [UserRole.ADMIN, UserRole.SUB_ADMIN, UserRole.SELLER, UserRole.CLIENT];
    return new Map(roles.map((role) => [role, users.filter((user) => user.role === role).length]));
  }, [users]);

  const startEditingUser = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditBalance(user.balance.toString());
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsSaving(true);
      const nextBalance = parseFloat(editBalance) || 0;
      await api.updateUserRole(editingUser.id, editRole);
      await api.updateUserBalance(editingUser.id, nextBalance);
      setUsers((current) => current.map((user) => (
        user.id === editingUser.id ? { ...user, role: editRole, balance: nextBalance } : user
      )));
      setEditingUser(null);
      onNotify({
        type: 'success',
        title: 'Utilisateur mis à jour',
        message: `${editingUser.username} a bien été modifié.`
      });
    } catch (error) {
      onNotify({
        type: 'error',
        title: 'Mise à jour impossible',
        message: error instanceof Error ? error.message : "Impossible d'enregistrer cet utilisateur."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUserRole !== UserRole.ADMIN) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="text-lg font-black">Accès restreint</div>
        <p className="mt-2 text-sm leading-6">
          La gestion des utilisateurs est réservée au rôle `ADMIN`.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Gestion des Utilisateurs</h2>
            <p className="mt-1 text-sm text-slate-500">Vue dédiée pour les comptes, rôles et soldes clients.</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setView('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tous les Utilisateurs
            </button>
            <button
              type="button"
              onClick={() => setView('roles')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'roles' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Rôles & Permissions
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 text-slate-500">
            <Loader2 size={20} className="mr-3 animate-spin" />
            Chargement des utilisateurs...
          </div>
        ) : view === 'all' ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 font-bold">Liste des Utilisateurs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Utilisateur</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Rôle</th>
                    <th className="px-6 py-3">Solde</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img src={user.avatarUrl} alt={user.username} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <span className="font-bold text-slate-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${ROLE_BADGE_CLASS[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{user.balance.toFixed(2)} TND</td>
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => startEditingUser(user)} className="text-slate-400 hover:text-indigo-600">
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[UserRole.ADMIN, UserRole.SUB_ADMIN, UserRole.SELLER, UserRole.CLIENT].map((role) => (
              <div key={role} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${role === UserRole.ADMIN ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Shield size={24} />
                  </div>
                  <span className="text-2xl font-black text-slate-900">{countsByRole.get(role) || 0}</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">{role}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {role === UserRole.ADMIN ? 'Accès total au système' :
                    role === UserRole.SUB_ADMIN ? 'Gestion limitée' :
                    role === UserRole.SELLER ? 'Gestion des produits' : 'Utilisateur final'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="font-bold text-slate-900">Modifier l&apos;utilisateur</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nom d&apos;utilisateur</label>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 font-medium text-slate-600">
                  {editingUser.username}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Rôle</label>
                <select
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.values(UserRole).filter((role) => role !== UserRole.GUEST).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Solde (TND)</label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(event) => setEditBalance(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleUpdateUser}
                disabled={isSaving}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminUsersSection;
