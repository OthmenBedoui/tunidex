import React from 'react';
import { CheckoutIdentityFormProps } from './types';

const inputClassName = 'w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500';

const CheckoutIdentityForm: React.FC<CheckoutIdentityFormProps> = ({ isGuest, user, guestForm, onGuestFieldChange }) => {
  if (isGuest) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Prenom</label>
          <input type="text" value={guestForm.firstName} onChange={(e) => onGuestFieldChange('firstName', e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Nom</label>
          <input type="text" value={guestForm.lastName} onChange={(e) => onGuestFieldChange('lastName', e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Email</label>
          <input type="email" value={guestForm.email} onChange={(e) => onGuestFieldChange('email', e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Numero de telephone</label>
          <input type="tel" value={guestForm.phone} onChange={(e) => onGuestFieldChange('phone', e.target.value)} placeholder="+216 xx xxx xxx" className={inputClassName} />
        </div>
      </div>
    );
  }

  if (user.phone) return null;

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">Numero de telephone</label>
      <input type="tel" value={guestForm.phone} onChange={(e) => onGuestFieldChange('phone', e.target.value)} placeholder="+216 xx xxx xxx" className={inputClassName} />
    </div>
  );
};

export default CheckoutIdentityForm;
