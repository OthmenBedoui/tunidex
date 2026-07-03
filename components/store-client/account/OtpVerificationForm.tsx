import React from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

interface OtpVerificationFormProps {
  email: string;
  otp: string;
  error: string;
  success: string;
  isLoading: boolean;
  onOtpChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onEdit: () => void;
  onResend: () => void;
  onGoToLogin: () => void;
}

const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  email,
  otp,
  error,
  success,
  isLoading,
  onOtpChange,
  onSubmit,
  onEdit,
  onResend,
  onGoToLogin
}) => (
  <>
    {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-center text-sm font-medium text-red-600">{error}</div>}
    {success && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-center text-sm font-medium text-green-700">{success}</div>}

    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Code OTP</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <ShieldCheck size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            required
            maxLength={6}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 pl-10 text-center font-black tracking-[0.4em]"
            placeholder="123456"
            value={otp}
            onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">Code envoye a {email || 'votre email'}.</p>
      </div>

      <button type="submit" disabled={isLoading} className="theme-btn flex w-full items-center justify-center rounded-2xl py-3.5 font-bold disabled:opacity-70">
        {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : <>Confirmer le compte <ArrowRight size={18} className="ml-2" /></>}
      </button>
    </form>

    <div className="mt-5 flex items-center justify-between text-sm">
      <button onClick={onEdit} className="font-semibold text-slate-500 hover:text-slate-900">
        Modifier les informations
      </button>
      <button onClick={onResend} className="font-bold theme-text-accent">
        Renvoyer le code
      </button>
    </div>

    <div className="mt-6 text-center text-sm">
      <span className="text-slate-500">Deja confirme ?</span>
      <button onClick={onGoToLogin} className="ml-2 font-bold theme-text-accent">
        Aller a la connexion
      </button>
    </div>
  </>
);

export default OtpVerificationForm;
