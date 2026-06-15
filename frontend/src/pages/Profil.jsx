import { Link } from 'react-router-dom';
import { FiCalendar, FiCheckCircle, FiGlobe, FiMail, FiSettings, FiShield, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { languageOptions, usePreferences } from '../context/PreferencesContext.jsx';
import { formatDate } from '../utils/format.js';
import PageHero from '../components/PageHero.jsx';

function InfoCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-md border border-[#ead7da] bg-white p-4 transition hover:border-[#d9b3ba] hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]">
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[#7a6670]">{label}</p>
          <p className="mt-1 break-words font-bold text-[#2e2430]">{value || '-'}</p>
          {helper && <p className="mt-1 text-sm leading-5 text-[#7a6670]">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Profil() {
  const { user } = useAuth();
  const { preferences, t } = usePreferences();
  const currentLanguage = languageOptions.find((option) => option.value === preferences.language);
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}` || 'AS';
  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
        icon={FiUser}
        stats={[
          { label: t('common.role'), value: user?.role || '-' },
          { label: t('common.account'), value: user?.id ? `#${user.id}` : '-' },
          { label: t('common.language'), value: currentLanguage?.short || 'FR' },
          { label: t('common.theme'), value: preferences.theme === 'dark' ? t('common.dark') : t('common.light') },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="panel overflow-hidden">
          <div className="bg-[#2e2430] px-6 py-8 text-white">
            <div className="grid h-24 w-24 place-items-center rounded-lg border border-white/15 bg-white/10 text-3xl font-black text-[#f7d9dd] shadow-inner">
              {initials}
            </div>
            <h2 className="mt-5 text-2xl font-black leading-tight">{fullName || t('profile.userFallback')}</h2>
            <p className="mt-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold capitalize text-[#f8e1e5]">
              {user?.role || 'Compte'}
            </p>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3 rounded-md border border-[#ead7da] bg-[#fff7f8] p-4">
              <FiCheckCircle className="mt-0.5 shrink-0 text-[#8f4a56]" />
              <div>
                <p className="font-bold text-[#2e2430]">{t('profile.activeTitle')}</p>
                <p className="mt-1 text-sm leading-6 text-[#7a6670]">{t('profile.activeDescription')}</p>
              </div>
            </div>
            <Link to="/parametres" className="btn-primary w-full">
              <FiSettings />
              {t('profile.openSettings')}
            </Link>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#2e2430]">{t('profile.infoTitle')}</h2>
              <p className="mt-1 text-sm text-[#7a6670]">{t('profile.infoDescription')}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]">
              <FiUser />
            </span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoCard icon={FiUser} label={t('profile.fullName')} value={fullName} helper={t('profile.fullNameHelp')} />
            <InfoCard icon={FiMail} label="Email" value={user?.email} helper={t('profile.emailHelp')} />
            <InfoCard icon={FiShield} label={t('common.role')} value={user?.role} helper={t('profile.roleHelp')} />
            <InfoCard icon={FiCalendar} label={t('profile.created')} value={formatDate(user?.date_creation)} helper={t('profile.createdHelp')} />
            <InfoCard icon={FiGlobe} label={t('common.language')} value={currentLanguage?.label} helper={t('profile.languageHelp')} />
            <InfoCard icon={FiSettings} label={t('common.theme')} value={preferences.theme === 'dark' ? t('common.darkMode') : t('common.lightMode')} helper={t('profile.themeHelp')} />
          </div>
        </section>
      </div>
    </div>
  );
}
