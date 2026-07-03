import React from 'react';
import { AdminTab } from './adminRouteConfig';

interface AdminNotFoundPageProps {
  openAdminTab: (tab: AdminTab) => void;
  navigateTo: (page: string, slug?: string) => void;
}

const AdminNotFoundPage: React.FC<AdminNotFoundPageProps> = ({ openAdminTab, navigateTo }) => (
  <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
    <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-700">
      Route introuvable
    </div>
    <h1 className="mt-4 text-3xl font-black text-slate-950">Page admin introuvable</h1>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
      Cette URL admin n&apos;existe pas ou n&apos;est pas encore rattachée au shell Tunibots.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => openAdminTab('overview')}
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
      >
        Retour dashboard
      </button>
      <button
        type="button"
        onClick={() => navigateTo('admin-register-authentication')}
        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
      >
        Auth & Register
      </button>
    </div>
  </div>
);

export default AdminNotFoundPage;
