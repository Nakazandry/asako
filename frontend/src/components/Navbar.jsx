import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSettings,
  FiSun,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import UserAvatar from './UserAvatar.jsx';
import logoImage from '../assets/images/asako-logo-ui.png';

const pageRoutes = [
  { match: /^\/dashboard/, icon: FiGrid, key: 'nav.dashboard' },
  { match: /^\/offres/, icon: FiBriefcase, key: 'nav.offers' },
  { match: /^\/candidatures/, icon: FiUsers, key: 'nav.applications' },
  { match: /^\/entretiens/, icon: FiCalendar, key: 'nav.interviews' },
  { match: /^\/notifications/, icon: FiBell, key: 'nav.notifications' },
  { match: /^\/profil/, icon: FiUser, key: 'nav.profile' },
  { match: /^\/(parametres|parametre)/, icon: FiSettings, key: 'nav.settings' },
  { match: /^\/mon-espace/, icon: FiHome, key: 'nav.mySpace' },
];

export default function Navbar({ onToggle }) {
  const { user, logout } = useAuth();
  const { preferences, updatePreference, t } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const admin = user?.role === 'admin';
  const dark = preferences.theme === 'dark';
  const home = admin ? '/dashboard' : '/mon-espace';

  const pageMeta = pageRoutes.find((route) => route.match.test(location.pathname)) || null;
  const PageIcon = pageMeta?.icon || FiGrid;
  const pageTitle = pageMeta ? t(pageMeta.key) : 'ASAKO';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ') || t('profile.userFallback');

  const toggleTheme = () => updatePreference('theme', dark ? 'light' : 'dark');

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const iconBtnClass =
    'grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-[#fff7f8] hover:text-[#8f4a56] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EEC4C9]';

  return (
    <header className="sticky top-0 z-30 border-b border-[#ead7da]/80 bg-white/85 shadow-[0_1px_12px_rgba(46,36,48,0.04)] backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
        {/* Ouverture du menu (mobile) */}
        <button className={`${iconBtnClass} lg:hidden`} onClick={onToggle} aria-label={t('navbar.openMenu')}>
          <FiMenu className="text-xl" />
        </button>

        {/* Contexte de la page courante */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to={home} className="shrink-0 lg:hidden" aria-label="ASAKO">
            <img src={logoImage} alt="ASAKO" className="h-9 w-9 rounded-xl border border-[#f1e2e5] object-cover shadow-sm" />
          </Link>
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#fff7f8] to-[#f8e1e5] text-[#8f4a56] shadow-inner ring-1 ring-[#ead7da]/60 lg:grid">
            <PageIcon className="text-xl" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-slate-900">{pageTitle}</h1>
            <p className="hidden truncate text-xs font-semibold text-slate-500 sm:block">{t('navbar.subtitle')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            className={iconBtnClass}
            onClick={toggleTheme}
            aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={dark ? 'Mode clair' : 'Mode sombre'}
          >
            <FiSun className={`absolute text-lg transition-all duration-300 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`} />
            <FiMoon className={`text-lg transition-all duration-300 ${dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
          </button>

          <NotificationBell />

          <span className="mx-1 hidden h-6 w-px bg-[#f1e2e5] sm:block" />

          {/* Menu utilisateur */}
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 rounded-full p-1 transition-all duration-200 hover:bg-[#fff7f8] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EEC4C9]"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-label="Menu utilisateur"
            >
              <UserAvatar user={user} size={36} className="rounded-full ring-2 ring-white shadow-sm" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[9rem] truncate text-sm font-black leading-tight text-slate-900">{fullName}</span>
                <span className="block text-[11px] font-bold capitalize leading-tight text-slate-500">{user?.role || 'Compte'}</span>
              </span>
              <FiChevronDown
                className={`hidden text-slate-400 transition-transform duration-200 sm:block ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div className="modal-card absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[#ead7da]/80 bg-white shadow-[0_20px_50px_-16px_rgba(46,36,48,0.35)]">
                <div className="border-b border-[#f1e2e5]/80 bg-gradient-to-br from-[#fff7f8] to-[#fdf1f3] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size={46} className="rounded-full ring-2 ring-white shadow-sm" textClassName="text-base" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#2e2430]">{fullName}</p>
                      <p className="truncate text-xs font-semibold text-[#7a6670]">{user?.email}</p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#EEC4C9]/60 bg-white/70 px-2.5 py-1 text-[11px] font-black capitalize text-[#8f4a56]">
                    <span className={`h-1.5 w-1.5 rounded-full ${admin ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                    {user?.role || '-'}
                  </span>
                </div>

                <div className="p-2">
                  <Link
                    to="/profil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#4b3a42] transition-colors duration-150 hover:bg-[#fff7f8] hover:text-[#8f4a56]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff7f8] text-[#8f4a56]">
                      <FiUser />
                    </span>
                    {t('nav.profile')}
                  </Link>
                  <Link
                    to="/parametres"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#4b3a42] transition-colors duration-150 hover:bg-[#fff7f8] hover:text-[#8f4a56]"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff7f8] text-[#8f4a56]">
                      <FiSettings />
                    </span>
                    {t('nav.settings')}
                  </Link>
                </div>

                <div className="border-t border-[#f1e2e5]/80 p-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors duration-150 hover:bg-rose-50"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600">
                      <FiLogOut />
                    </span>
                    {t('navbar.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
