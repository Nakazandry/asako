import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmModal({ open, title, message, onCancel, onConfirm, loading, cancelLabel = 'Annuler', confirmLabel = 'Confirmer' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="modal-card panel w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#8f4a56]">Confirmation</p>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <FiAlertTriangle />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">{message}</p>
              </div>
            </div>
            <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onCancel} aria-label="Fermer">
              <FiX />
            </button>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
            <button className="btn-danger" onClick={onConfirm} disabled={loading}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
