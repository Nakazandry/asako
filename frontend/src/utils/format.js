export const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
};

export const statusLabel = (status) => {
  const map = { Accepte: 'Accepté', Refuse: 'Refusé' };
  return map[status] || status || '-';
};

export const statusClass = (status) => {
  const normalized = statusLabel(status);
  return {
    'En attente': 'bg-amber-50 text-amber-700 border-amber-200',
    Entretien: 'bg-[#fff7f8] text-[#8f4a56] border-[#EEC4C9]',
    Accepté: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Refusé: 'bg-rose-50 text-rose-700 border-rose-200',
  }[normalized] || 'bg-slate-50 text-slate-700 border-slate-200';
};
