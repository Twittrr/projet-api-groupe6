'use client';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useToast } from '@/store/toast';

export default function Toaster() {
  const { toasts, removeToast } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-sin flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-soft ${
            toast.type === 'error' ? 'bg-err' : 'bg-ok'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle size={16} strokeWidth={2.5} />
            : <XCircle size={16} strokeWidth={2.5} />}
          <span className="whitespace-nowrap">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-0.5 opacity-70 transition hover:opacity-100"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
