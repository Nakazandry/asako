import { FiBell, FiCalendar, FiFileText, FiSend } from 'react-icons/fi';

const typeMeta = {
  NOUVELLE_CANDIDATURE: { icon: FiSend, className: 'bg-rose-50 text-rose-600' },
  CANDIDATURE: { icon: FiFileText, className: 'bg-amber-50 text-amber-600' },
  ENTRETIEN: { icon: FiCalendar, className: 'bg-emerald-50 text-emerald-600' },
};

export const metaFor = (type) => typeMeta[type] || { icon: FiBell, className: 'bg-slate-100 text-slate-600' };
