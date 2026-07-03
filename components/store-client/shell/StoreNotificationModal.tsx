import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { StoreNotification } from './types';

interface StoreNotificationModalProps {
  notification?: StoreNotification;
  onClose?: () => void;
}

const StoreNotificationModal: React.FC<StoreNotificationModalProps> = ({ notification, onClose }) => {
  if (!notification?.show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-300 ${
          notification.type === 'error' ? 'border-red-100' : 'border-emerald-100'
        }`}
      >
        <div className={`h-1.5 ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                notification.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {notification.type === 'error' ? (
                <AlertCircle size={28} />
              ) : (
                <CheckCircle size={28} className="animate-[notification-check_450ms_ease-out]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-slate-900">{notification.type === 'error' ? 'Erreur' : 'Succès'}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</div>
            </div>
            {notification.type === 'error' && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer la notification"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreNotificationModal;
