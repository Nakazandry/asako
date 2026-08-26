import { FiLogOut, FiMenu, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import logoImage from '../assets/images/asako-logo-ui.png';

export default function Navbar({ onToggle }) {
  const { user, logout } = useAuth();
  const { t } = usePreferences();
  const admin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 border-b border-[#ead7da]/80 bg-white/80 shadow-[0_1px_12px_rgba(46,36,48,0.04)] backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <button className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 active:scale-95 lg:hidden" onClick={onToggle} aria-label={t('navbar.openMenu')}>
          <FiMenu className="text-xl" />
        </button>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <img src={logoImage} alt="ASAKO" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{t('navbar.title')}</p>
            <p className="truncate text-xs text-slate-500">{t('navbar.subtitle')}</p>
          </div>
        </div>
        <div className="min-w-0 lg:hidden">
          <img src={logoImage} alt="ASAKO" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900">{user?.prenom} {user?.nom}</p>
            <p className="flex items-center justify-end gap-1.5 text-xs font-semibold capitalize text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${admin ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              {user?.role}
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#f8e1e5] to-[#eec4c9] text-[#8f4a56] ring-2 ring-white shadow-sm">
            <FiUser />
          </span>
          <button className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95" onClick={logout} aria-label={t('navbar.logout')}>
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
