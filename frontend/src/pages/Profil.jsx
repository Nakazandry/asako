import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiEdit2,
  FiGlobe,
  FiMail,
  FiSettings,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { languageOptions, usePreferences } from '../context/PreferencesContext.jsx';
import { formatDate } from '../utils/format.js';
import PageHero from '../components/PageHero.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import CompetencesSection from '../components/CompetencesSection.jsx';

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
  const { user, setCurrentUser } = useAuth();
  const { preferences, t } = usePreferences();
  const currentLanguage = languageOptions.find((option) => option.value === preferences.language);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draft, setDraft] = useState({ prenom: '', nom: '', email: '' });

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ');

  const startEdit = () => {
    setDraft({ prenom: user?.prenom || '', nom: user?.nom || '', email: user?.email || '' });
    setEditing(true);
  };

  const saveInfo = async (event) => {
    event.preventDefault();
    if (!draft.prenom.trim() || !draft.nom.trim() || !draft.email.trim()) {
      return toast.error(t('profile.requiredFields'));
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', {
        prenom: draft.prenom.trim(),
        nom: draft.nom.trim(),
        email: draft.email.trim(),
      });
      setCurrentUser(data);
      toast.success(t('profile.infoSaved'));
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (photoBusy) return;
    if (!file.type.startsWith('image/')) {
      return toast.error(t('profile.photoInvalid'));
    }
    setPhotoBusy(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const { data } = await api.put('/auth/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCurrentUser(data);
      toast.success(t('profile.photoUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.uploadFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPickPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadPhoto(file);
  };

  const removePhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      const { data } = await api.delete('/auth/me/photo');
      setCurrentUser(data);
      toast.success(t('profile.photoRemoved'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('profile.uploadFailed'));
    } finally {
      setPhotoBusy(false);
    }
  };

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

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Carte identite + photo */}
        <section className="panel overflow-hidden">
          <div className="relative bg-gradient-to-br from-[#3a2d3f] via-[#2e2430] to-[#231b28] px-6 pb-7 pt-9 text-center text-white">
            <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#EEC4C9]/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-14 h-40 w-40 rounded-full bg-[#8f4a56]/25 blur-2xl" />

            <div className="relative mx-auto w-fit">
              <UserAvatar
                user={user}
                size={104}
                className="rounded-full border-4 border-white/20 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
                textClassName="text-3xl"
              />
              <label
                className={`group absolute inset-0 cursor-pointer overflow-hidden rounded-full ${
                  photoBusy ? 'pointer-events-none' : ''
                }`}
                title={t('profile.changePhoto')}
                aria-label={t('profile.changePhoto')}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onPickPhoto}
                />
                <span className="grid h-full w-full place-items-center rounded-full bg-black/0 text-white transition-colors duration-200 group-hover:bg-black/45">
                  {photoBusy ? (
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <FiCamera className="text-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  )}
                </span>
              </label>
            </div>

            <h2 className="mt-5 text-2xl font-black leading-tight">{fullName || t('profile.userFallback')}</h2>
            <p className="mt-1 truncate text-sm text-[#f8e1e5]/70">{user?.email}</p>
            <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold capitalize text-[#f8e1e5]">
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

            <button className="btn-primary w-full" onClick={startEdit}>
              <FiEdit2 />
              {t('profile.editProfile')}
            </button>
            <Link to="/parametres" className="btn-secondary w-full">
              <FiSettings />
              {t('profile.openSettings')}
            </Link>
            {user?.photo_type && (
              <button
                type="button"
                className="btn-secondary w-full text-rose-600"
                onClick={removePhoto}
                disabled={photoBusy}
              >
                <FiTrash2 />
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
        </section>

        {/* Informations du compte (consultation / edition) */}
        <section className="panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#2e2430]">{t('profile.infoTitle')}</h2>
              <p className="mt-1 text-sm text-[#7a6670]">
                {editing ? t('profile.editDescription') : t('profile.infoDescription')}
              </p>
            </div>
            {editing ? (
              <button className="btn-secondary shrink-0" onClick={() => setEditing(false)}>
                <FiX />
                {t('profile.cancel')}
              </button>
            ) : (
              <button className="btn-secondary shrink-0" onClick={startEdit}>
                <FiEdit2 />
                {t('profile.editProfile')}
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={saveInfo} className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">{t('profile.firstName')}</span>
                  <input
                    className="input mt-1"
                    required
                    value={draft.prenom}
                    onChange={(e) => setDraft({ ...draft, prenom: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="label">{t('profile.lastName')}</span>
                  <input
                    className="input mt-1"
                    required
                    value={draft.nom}
                    onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="label">Email</span>
                <input
                  className="input mt-1"
                  type="email"
                  required
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </label>
              <div className="mt-5 flex justify-end gap-2 border-t border-[#ead7da] pt-4">
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                  {t('profile.cancel')}
                </button>
                <button className="btn-primary" disabled={saving}>
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoCard icon={FiUser} label={t('profile.fullName')} value={fullName} helper={t('profile.fullNameHelp')} />
              <InfoCard icon={FiMail} label="Email" value={user?.email} helper={t('profile.emailHelp')} />
              <InfoCard icon={FiShield} label={t('common.role')} value={user?.role} helper={t('profile.roleHelp')} />
              <InfoCard icon={FiCalendar} label={t('profile.created')} value={formatDate(user?.date_creation)} helper={t('profile.createdHelp')} />
              <InfoCard icon={FiGlobe} label={t('common.language')} value={currentLanguage?.label} helper={t('profile.languageHelp')} />
              <InfoCard icon={FiSettings} label={t('common.theme')} value={preferences.theme === 'dark' ? t('common.darkMode') : t('common.lightMode')} helper={t('profile.themeHelp')} />
            </div>
          )}
        </section>
      </div>

      {/* Competences: reservees aux candidats */}
      {user?.role === 'candidat' && <CompetencesSection />}
    </div>
  );
}
