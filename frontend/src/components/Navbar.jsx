import { FiLogOut, FiMenu, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import logoImage from '../assets/images/asako-logo-ui.png';

export default function Navbar({ onToggle }) {
  const { user, logout } = useAuth();
  const { t } = usePreferences();

  return (
    <header className="sticky top-0 z-30 border-b border-[#ead7da] bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onToggle} aria-label={t('navbar.openMenu')}>
          <FiMenu className="text-xl" />
        </button>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <img src={logoImage} alt="ASAKO" className="h-9 w-9 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{t('navbar.title')}</p>
            <p className="truncate text-xs text-slate-500">{t('navbar.subtitle')}</p>
          </div>
        </div>
        <div className="min-w-0 lg:hidden">
          <img src={logoImage} alt="ASAKO" className="h-9 w-9 rounded-md object-cover" />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.prenom} {user?.nom}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#f8e1e5] text-[#8f4a56]">
            <FiUser />
          </span>
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={logout} aria-label={t('navbar.logout')}>
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
