import { FiBell, FiCheck, FiGlobe, FiLayout, FiMoon, FiSettings, FiSun } from 'react-icons/fi';
import PageHero from '../components/PageHero.jsx';
import { languageOptions, usePreferences } from '../context/PreferencesContext.jsx';

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-[#dce9df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#f1f8f3] text-[#147a54]">
          <Icon />
        </span>
        <div>
          <p className="font-bold text-[#17362b]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#60756b]">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-[#147a54]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

export default function Parametres() {
  const { preferences, updatePreference, t } = usePreferences();
  const currentLanguage = languageOptions.find((option) => option.value === preferences.language);
  const themeOptions = [
    { value: 'light', label: t('common.light'), icon: FiSun, description: t('settings.theme.light.description') },
    { value: 'dark', label: t('common.dark'), icon: FiMoon, description: t('settings.theme.dark.description') },
  ];

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
        icon={FiSettings}
        stats={[
          { label: t('common.language'), value: currentLanguage?.short || 'FR' },
          { label: t('common.theme'), value: preferences.theme === 'dark' ? t('common.dark') : t('common.light') },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#17362b]">{t('settings.languageTitle')}</h2>
              <p className="mt-1 text-sm text-[#60756b]">{t('settings.languageDescription')}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#f1f8f3] text-[#147a54]">
              <FiGlobe />
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {languageOptions.map((option) => {
              const active = preferences.language === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updatePreference('language', option.value)}
                  className={`rounded-md border p-4 text-left transition ${
                    active
                      ? 'border-[#147a54] bg-[#f1f8f3] shadow-sm'
                      : 'border-[#dce9df] bg-white hover:border-[#c1dac7] hover:bg-[#f1f8f3]/60'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-[#147a54]">{option.short}</span>
                    {active && <FiCheck className="text-[#147a54]" />}
                  </span>
                  <span className="mt-3 block font-bold text-[#17362b]">{option.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#60756b]">{t(`settings.language.${option.value}.description`)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-5">
          <div>
            <h2 className="text-lg font-bold text-[#17362b]">{t('settings.appearanceTitle')}</h2>
            <p className="mt-1 text-sm text-[#60756b]">{t('settings.appearanceDescription')}</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {themeOptions.map(({ value, label, icon: Icon, description }) => {
              const active = preferences.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updatePreference('theme', value)}
                  className={`flex items-start gap-3 rounded-md border p-4 text-left transition ${
                    active
                      ? 'border-[#147a54] bg-[#f1f8f3] shadow-sm'
                      : 'border-[#dce9df] bg-white hover:border-[#c1dac7] hover:bg-[#f1f8f3]/60'
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#e6f3e9] text-[#147a54]">
                    <Icon />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 font-bold text-[#17362b]">
                      {label}
                      {active && <FiCheck className="text-[#147a54]" />}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#60756b]">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div>
          <h2 className="text-lg font-bold text-[#17362b]">{t('settings.workTitle')}</h2>
          <p className="mt-1 text-sm text-[#60756b]">{t('settings.workDescription')}</p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <ToggleRow
            icon={FiBell}
            title={t('settings.notificationsTitle')}
            description={t('settings.notificationsDescription')}
            checked={preferences.emailNotifications}
            onChange={(value) => updatePreference('emailNotifications', value)}
          />
          <ToggleRow
            icon={FiLayout}
            title={t('settings.compactTitle')}
            description={t('settings.compactDescription')}
            checked={preferences.compactMode}
            onChange={(value) => updatePreference('compactMode', value)}
          />
        </div>
      </section>
    </div>
  );
}
