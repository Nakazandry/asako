import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmModal({ open, title, message, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md overflow-hidden shadow-2xl">
        <div className="border-b border-[#ead7da] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Confirmation</p>
        </div>
        <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-rose-50 text-rose-600">
              <FiAlertTriangle />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{message}</p>
            </div>
          </div>
          <button className="rounded-md p-2 text-slate-400 hover:bg-slate-100" onClick={onCancel} aria-label="Fermer">
            <FiX />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>Annuler</button>
          <button className="btn-primary bg-rose-600 hover:bg-rose-700" onClick={onConfirm} disabled={loading}>
            Confirmer
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
