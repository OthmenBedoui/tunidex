import React from 'react';
import { MapPin, Phone, User } from 'lucide-react';

interface RegisterFormProps {
  username: string;
  fullName: string;
  address: string;
  phone: string;
  onUsernameChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

const inputClass = 'block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10';

const RegisterForm: React.FC<RegisterFormProps> = ({
  username,
  fullName,
  address,
  phone,
  onUsernameChange,
  onFullNameChange,
  onAddressChange,
  onPhoneChange
}) => (
  <>
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nom d'utilisateur</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <User size={18} className="text-slate-400" />
          </div>
          <input type="text" required className={inputClass} placeholder="Nom" value={username} onChange={(e) => onUsernameChange(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nom complet</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <User size={18} className="text-slate-400" />
          </div>
          <input type="text" required className={inputClass} placeholder="Nom complet" value={fullName} onChange={(e) => onFullNameChange(e.target.value)} />
        </div>
      </div>
    </div>
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MapPin size={18} className="text-slate-400" />
        </div>
        <input type="text" required className={inputClass} placeholder="Rue, ville, gouvernorat" value={address} onChange={(e) => onAddressChange(e.target.value)} />
      </div>
    </div>
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Numero de telephone</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Phone size={18} className="text-slate-400" />
        </div>
        <input type="tel" required className={inputClass} placeholder="+216 XX XXX XXX" value={phone} onChange={(e) => onPhoneChange(e.target.value)} />
      </div>
    </div>
  </>
);

export default RegisterForm;
