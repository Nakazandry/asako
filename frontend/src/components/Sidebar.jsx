import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiBell, FiBriefcase, FiCalendar, FiGrid, FiHome, FiSettings, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import api from '../services/api';
import logoImage from '../assets/images/asako-logo-ui.png';
import sidebarImage from '../assets/images/sidebar-stationery.webp';

export default function Sidebar({ open, onClose }) {
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
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#332937] via-[#2e2430] to-[#241c28] text-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="shrink-0 px-4 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logoImage} alt="ASAKO" className="h-12 w-12 shrink-0 rounded-xl border border-white/10 object-cover shadow-lg shadow-black/20" />
              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-wide text-[#f7d9dd]">ASAKO</p>
                <p className="truncate text-xs text-[#eec4c9]/80">{t('app.subtitle')}</p>
              </div>
            </div>
            <button className="rounded-lg p-2 text-[#f8e1e5] transition hover:bg-white/10 lg:hidden" onClick={onClose} aria-label={t('sidebar.close')}>
              <FiX />
            </button>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm transition hover:border-white/20">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#eec4c9]/70">{t('common.account')}</p>
            <p className="mt-1 truncate text-sm font-bold text-white">{user?.prenom} {user?.nom}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#EEC4C9]/30 bg-[#EEC4C9]/15 px-2.5 py-1 text-xs font-bold capitalize text-[#f7d9dd]">
              <span className={`h-1.5 w-1.5 rounded-full ${admin ? 'bg-emerald-400' : 'bg-sky-400'}`} />
              {user?.role || '-'}
            </span>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          <p className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-widest text-[#eec4c9]/60">Menu</p>
          {links.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => handleNavClick(badge)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#EEC4C9]/95 to-[#f7d9dd]/85 text-[#2e2430] shadow-lg shadow-black/20'
                    : 'text-[#f8e1e5]/90 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute -left-3 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-r-full bg-[#f7d9dd] transition-all duration-300 ${isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all duration-200 ${isActive ? 'bg-white/40 shadow-inner' : 'bg-white/[0.07] group-hover:scale-105 group-hover:bg-white/[0.12]'}`}>
                    <Icon className="text-lg" />
                  </span>
                  <span className="truncate">{label}</span>
                  {badge && unseen > 0 && (
                    <span className="relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[11px] font-black text-white shadow-md shadow-rose-900/40 ring-2 ring-[#2e2430]">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
                      <span className="relative">{unseen > 99 ? '99+' : unseen}</span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 px-4 pb-5 pt-4 max-sm:hidden">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm">
            <img src={sidebarImage} alt="" className="h-32 w-full object-cover object-center opacity-80 transition duration-500 hover:scale-105 hover:opacity-100" />
            <div className="p-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#eec4c9]/70">ASAKO</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#f8e1e5]">Plateforme RH</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
