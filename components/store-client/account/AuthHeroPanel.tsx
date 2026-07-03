import React from 'react';
import { AuthAudience } from './types';

interface AuthHeroPanelProps {
  audience: AuthAudience;
}

const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ audience }) => (
  <div className="hidden flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-10 text-white backdrop-blur-xl lg:flex">
    <div>
      <div
        className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em]"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 18%, transparent)' }}
      >
        {audience === 'admin' ? 'Acces Prive' : 'Inscription Securisee'}
      </div>
      <h1 className="mt-6 text-5xl font-black leading-tight">
        {audience === 'admin' ? 'Connectez-vous au dashboard admin prive.' : 'Creez votre compte et confirmez-le par OTP email.'}
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
        {audience === 'admin'
          ? "Acces separe du store public, routage protege, et redirection directe vers le dashboard d'administration."
          : 'Un formulaire propre, une validation claire, puis un code OTP envoye par mail pour activer definitivement le compte.'}
      </p>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {(audience === 'admin' ? ['Route privee', 'Login separe', 'Dashboard securise'] : ['Formulaire complet', 'OTP par email', 'Activation immediate']).map((item) => (
        <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-100">
          {item}
        </div>
      ))}
    </div>
  </div>
);

export default AuthHeroPanel;
