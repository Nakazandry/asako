import { NavLink } from 'react-router-dom';
import { FiBriefcase, FiCalendar, FiGrid, FiHome, FiSettings, FiUser, FiUsers, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import logoImage from '../assets/images/asako-logo-ui.png';
import sidebarImage from '../assets/images/sidebar-stationery.webp';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t } = usePreferences();
  const admin = user?.role === 'admin';
  const links = admin
    ? [
        { to: '/dashboard', label: t('nav.dashboard'), icon: FiGrid },
        { to: '/offres', label: t('nav.offers'), icon: FiBriefcase },
        { to: '/candidatures', label: t('nav.applications'), icon: FiUsers },
        { to: '/entretiens', label: t('nav.interviews'), icon: FiCalendar },
        { to: '/profil', label: t('nav.profile'), icon: FiUser },
        { to: '/parametres', label: t('nav.settings'), icon: FiSettings },
      ]
    : [
        { to: '/mon-espace', label: t('nav.mySpace'), icon: FiHome },
        { to: '/offres', label: t('nav.offers'), icon: FiBriefcase },
        { to: '/entretiens', label: t('nav.interviews'), icon: FiCalendar },
        { to: '/profil', label: t('nav.profile'), icon: FiUser },
        { to: '/parametres', label: t('nav.settings'), icon: FiSettings },
      ];

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-slate-950/40 transition lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col overflow-hidden border-r border-white/10 bg-[#2e2430] text-white shadow-2xl transition-transform lg:static lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="shrink-0 px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logoImage} alt="ASAKO" className="h-12 w-12 shrink-0 rounded-md border border-white/10 object-cover shadow-sm" />
              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-wide text-[#f7d9dd]">ASAKO</p>
                <p className="truncate text-xs text-[#eec4c9]/80">{t('app.subtitle')}</p>
              </div>
            </div>
            <button className="rounded-md p-2 text-[#f8e1e5] hover:bg-white/10 lg:hidden" onClick={onClose} aria-label={t('sidebar.close')}>
              <FiX />
            </button>
          </div>
          <div className="mt-4 rounded-md border border-white/10 bg-white/[0.07] p-3">
            <p className="text-xs font-semibold uppercase text-[#eec4c9]/70">{t('common.account')}</p>
            <p className="mt-1 truncate text-sm font-bold text-white">{user?.prenom} {user?.nom}</p>
            <p className="mt-2 inline-flex rounded-full border border-[#EEC4C9]/30 bg-[#EEC4C9]/15 px-2.5 py-1 text-xs font-bold capitalize text-[#f7d9dd]">
              {user?.role || '-'}
            </p>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <p className="px-3 pb-2 text-xs font-black uppercase tracking-wide text-[#eec4c9]/60">Menu</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#EEC4C9] text-[#2e2430] shadow-sm' : 'text-[#f8e1e5] hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute left-0 h-6 w-1 rounded-r-full transition ${isActive ? 'bg-[#8f4a56]' : 'bg-transparent group-hover:bg-white/30'}`} />
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md transition ${isActive ? 'bg-white/35' : 'bg-white/[0.07] group-hover:bg-white/10'}`}>
                    <Icon className="text-lg" />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 px-4 pb-5 pt-4 max-sm:hidden">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.07]">
            <img src={sidebarImage} alt="" className="h-36 w-full object-cover object-center opacity-90" />
            <div className="p-3">
              <p className="text-xs font-bold uppercase text-[#eec4c9]/70">ASAKO</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#f8e1e5]">Plateforme RH moderne et organisee.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
