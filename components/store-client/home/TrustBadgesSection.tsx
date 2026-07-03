import React from 'react';
import { Shield, Star, Zap } from 'lucide-react';

interface TrustBadgesSectionProps {
  order?: number;
}

const TrustBadgesSection: React.FC<TrustBadgesSectionProps> = ({ order }) => (
  <section className="grid grid-cols-1 gap-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:grid-cols-3" style={{ order }}>
    <div>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <Zap size={32} />
      </div>
      <h3 className="mb-2 font-bold text-slate-900">Livraison Instantanée</h3>
      <p className="text-sm text-slate-500">Recevez vos codes et comptes automatiquement par email en quelques secondes.</p>
    </div>
    <div>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Shield size={32} />
      </div>
      <h3 className="mb-2 font-bold text-slate-900">Paiement Sécurisé</h3>
      <p className="text-sm text-slate-500">Transactions cryptées et sécurisées. Support D17, Flouci et cartes bancaires.</p>
    </div>
    <div>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        <Star size={32} />
      </div>
      <h3 className="mb-2 font-bold text-slate-900">Service Client 24/7</h3>
      <p className="text-sm text-slate-500">Une équipe dédiée disponible à tout moment pour vous assister.</p>
    </div>
  </section>
);

export default TrustBadgesSection;
