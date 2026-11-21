import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiBell, FiBriefcase, FiCalendar, FiCpu, FiGrid, FiHome, FiSettings, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import api from '../services/api';

export default function Sidebar({ open, onClose, onOpenChatbot }) {
  const { user } = useAuth();
  const { t } = usePreferences();
  const location = useLocation();
  const admin = user?.role === 'admin';
  const [unseen, setUnseen] = useState(0);

  const loadUnseen = useCallback(() => {
    api.get('/candidatures/unseen-count')
      .then((res) => setUnseen(res.data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadUnseen();
    const interval = setInterval(loadUnseen, 25000);
    return () => clearInterval(interval);
  }, [loadUnseen, location.pathname]);

  const handleNavClick = (badge) => {
    onClose();
    if (badge && unseen > 0) {
      setUnseen(0);
      const timer = setTimeout(loadUnseen, 1200);
      return () => clearTimeout(timer);
    }
  };

  const links = admin
    ? [
        { to: '/dashboard', label: t('nav.dashboard'), icon: FiGrid },
        { to: '/offres', label: t('nav.offers'), icon: FiBriefcase },
        { to: '/candidatures', label: t('nav.applications'), icon: FiUsers, badge: true },
        { to: '/entretiens', label: t('nav.interviews'), icon: FiCalendar },
        { to: '/notifications', label: t('nav.notifications'), icon: FiBell },
        { to: '/profil', label: t('nav.profile'), icon: FiUser },
        { to: '/parametres', label: t('nav.settings'), icon: FiSettings },
      ]
    : [
        { to: '/mon-espace', label: t('nav.mySpace'), icon: FiHome, badge: true },
        { to: '/offres', label: t('nav.offers'), icon: FiBriefcase },
        { to: '/entretiens', label: t('nav.interviews'), icon: FiCalendar },
        { to: '/notifications', label: t('nav.notifications'), icon: FiBell },
        { to: '/profil', label: t('nav.profile'), icon: FiUser },
        { to: '/parametres', label: t('nav.settings'), icon: FiSettings },
      ];

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col overflow-hidden border-r border-[#dce9df] bg-white text-[#17362b] shadow-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="shrink-0 px-4 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/akdigital.jpeg" alt="AK Digital Service" className="h-12 w-28 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-wide text-[#147a54]">ASAKO</p>
                <p className="truncate text-xs text-[#718278]">{t('app.subtitle')}</p>
              </div>
            </div>
            <button className="rounded-lg p-2 text-[#60756b] transition hover:bg-[#f1f8f3] hover:text-[#147a54] lg:hidden" onClick={onClose} aria-label={t('sidebar.close')}>
              <FiX />
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-[#e2ece4] bg-[#f7fbf8] p-3.5 transition hover:border-[#c9dfce]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b8b80]">{t('common.account')}</p>
            <p className="mt-1 truncate text-sm font-bold text-[#17362b]">{user?.prenom} {user?.nom}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d5e8d9] bg-[#eaf5ee] px-2.5 py-1 text-[11px] font-bold capitalize text-[#276d4b]">
              <span className={`h-1.5 w-1.5 rounded-full ${admin ? 'bg-emerald-400' : 'bg-sky-400'}`} />
              {user?.role || '-'}
            </span>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
          <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-[#84948a]">Menu</p>
          {links.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => handleNavClick(badge)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#eaf5ee] text-[#0e6041] shadow-sm'
                    : 'text-[#60756b] hover:translate-x-0.5 hover:bg-[#f5faf6] hover:text-[#147a54]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#147a54] transition-all duration-300 ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-200 ${isActive ? 'bg-white text-[#147a54] shadow-sm' : 'bg-[#f1f6f2] text-[#75867b] group-hover:scale-105 group-hover:bg-[#eaf5ee] group-hover:text-[#147a54]'}`}>
                    <Icon className="text-lg" />
                  </span>
                  <span className="truncate">{label}</span>
                  {badge && unseen > 0 && (
                    <span className="relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white shadow-sm ring-2 ring-white">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                      <span className="relative">{unseen > 99 ? '99+' : unseen}</span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Outils disponibles pour les deux roles (un seul composant de chat) */}
          <div className="mt-3 border-t border-[#e6eee8] pt-3">
            <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-[#84948a]">
              {t('nav.tools')}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenChatbot?.();
              }}
              className="group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-[#60756b] transition-all duration-200 hover:translate-x-0.5 hover:bg-[#f5faf6] hover:text-[#147a54] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f2] text-[#75867b] transition-all duration-200 group-hover:scale-105 group-hover:bg-[#eaf5ee] group-hover:text-[#147a54]">
                <FiCpu className="text-lg" />
              </span>
              <span className="truncate">{t('nav.assistant')}</span>
              <span className="ml-auto rounded-full bg-[#e2f1e6] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#276d4b]">
                IA
              </span>
            </button>
          </div>
        </nav>
        <div className="shrink-0 px-4 pb-5 pt-3 max-sm:hidden">
          <div className="rounded-2xl border border-[#e2ece4] bg-gradient-to-br from-[#f5faf6] to-[#eaf5ee] p-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#147a54] shadow-sm"><FiCpu /></span>
            <p className="mt-3 text-xs font-black text-[#17362b]">Un recrutement plus fluide</p>
            <p className="mt-1 text-[11px] leading-5 text-[#718278]">Les outils essentiels, réunis dans votre espace.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
