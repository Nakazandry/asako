import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { usePreferences } from '../context/PreferencesContext.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import SkillBar from './SkillBar.jsx';

// Liste de suggestions locale (aucun referentiel en base pour le moment).
const SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Vue.js', 'Angular', 'Node.js',
  'Express.js', 'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'PHP', 'Laravel',
  'C#', '.NET', 'C++', 'Go', 'Rust', 'Ruby', 'Rails', 'Kotlin', 'Swift', 'Dart',
  'Flutter', 'React Native', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Git', 'CI/CD', 'GraphQL',
  'REST API', 'Tailwind CSS', 'HTML', 'CSS', 'Sass', 'Figma', 'Linux', 'Bash',
  'Machine Learning', 'Data Analysis', 'TensorFlow', 'Pandas', 'Spring', 'Oracle',
];

const DEFAULT_LEVEL = 50;

const sortByName = (list) =>
  [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));

const clampLevel = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

function LevelField({ value, onChange, disabled, label, id }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="label">{label}</span>
        <div className="flex items-center gap-1">
          <input
            id={id}
            className="input w-20 px-2 py-1 text-center text-sm font-bold"
            type="number"
            min="0"
            max="100"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? '' : clampLevel(raw));
            }}
            onBlur={() => { if (value === '') onChange(DEFAULT_LEVEL); }}
          />
          <span className="text-sm font-bold text-[#7a6670]">%</span>
        </div>
      </div>
      <input
        className="mt-2 w-full accent-[#8f4a56]"
        type="range"
        min="0"
        max="100"
        step="1"
        value={value === '' ? DEFAULT_LEVEL : clampLevel(value)}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(clampLevel(e.target.value))}
      />
    </div>
  );
}

export default function CompetencesSection() {
  const { t } = usePreferences();

  const [competences, setCompetences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [nom, setNom] = useState('');
  const [niveau, setNiveau] = useState(DEFAULT_LEVEL);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ nom: '', niveau: DEFAULT_LEVEL });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/competences');
      setCompetences(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.response?.data?.message || t('skills.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const existingNames = useMemo(
    () => new Set(competences.map((item) => item.nom.toLowerCase())),
    [competences]
  );

  const filteredSuggestions = useMemo(() => {
    const query = nom.trim().toLowerCase();
    return SUGGESTIONS
      .filter((item) => !existingNames.has(item.toLowerCase()))
      .filter((item) => !query || item.toLowerCase().includes(query))
      .slice(0, 6);
  }, [nom, existingNames]);

  const canSubmit = nom.trim().length > 0 && !adding;

  const addCompetence = async (event) => {
    event.preventDefault();
    const cleanName = nom.trim();
    if (!cleanName) {
      toast.error(t('skills.nameRequired'));
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post('/competences', { nom: cleanName, niveau: clampLevel(niveau) });
      setCompetences((prev) => sortByName([...prev, data]));
      setNom('');
      setNiveau(DEFAULT_LEVEL);
      setShowSuggestions(false);
      toast.success(t('skills.added'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('skills.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({ nom: item.nom, niveau: item.niveau });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ nom: '', niveau: DEFAULT_LEVEL });
  };

  const saveEdit = async (item) => {
    const cleanName = editDraft.nom.trim();
    if (!cleanName) {
      toast.error(t('skills.nameRequired'));
      return;
    }
    setSavingEdit(true);
    try {
      const { data } = await api.put(`/competences/${item.id}`, {
        nom: cleanName,
        niveau: clampLevel(editDraft.niveau),
      });
      setCompetences((prev) => sortByName(prev.map((row) => (row.id === item.id ? data : row))));
      cancelEdit();
      toast.success(t('skills.updated'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('skills.updateFailed'));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/competences/${deleteTarget.id}`);
      setCompetences((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      if (editingId === deleteTarget.id) cancelEdit();
      toast.success(t('skills.deleted'));
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || t('skills.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]">
            <FiAward />
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#2e2430]">{t('skills.title')}</h2>
            <p className="mt-1 text-sm text-[#7a6670]">{t('skills.description')}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#ead7da] bg-[#fff7f8] px-3 py-1 text-xs font-bold text-[#8f4a56]">
          {competences.length} {t('skills.count')}
        </span>
      </div>

      <form onSubmit={addCompetence} className="mt-5 rounded-md border border-[#ead7da] bg-[#fff7f8]/40 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <label className="label" htmlFor="competence-nom">{t('skills.nameLabel')}</label>
            <input
              id="competence-nom"
              className="input mt-1"
              placeholder={t('skills.namePlaceholder')}
              value={nom}
              autoComplete="off"
              disabled={adding}
              onChange={(e) => { setNom(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#ead7da] bg-white py-1 shadow-xl">
                <li className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#7a6670]">
                  {t('skills.suggestions')}
                </li>
                {filteredSuggestions.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left text-sm font-semibold text-[#2e2430] transition hover:bg-[#fff7f8] hover:text-[#8f4a56]"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNom(item);
                        setShowSuggestions(false);
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <LevelField
            id="competence-niveau"
            label={t('skills.levelLabel')}
            value={niveau}
            onChange={setNiveau}
            disabled={adding}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            <FiPlus />
            {adding ? t('skills.adding') : t('skills.add')}
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        ) : loadError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <p>{loadError}</p>
            <button type="button" className="btn-secondary mt-3" onClick={load}>{t('skills.retry')}</button>
          </div>
        ) : competences.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#ead7da] bg-[#fff7f8]/40 px-4 py-8 text-center">
            <p className="font-bold text-[#2e2430]">{t('skills.empty')}</p>
            <p className="mt-1 text-sm text-[#7a6670]">{t('skills.emptyHelp')}</p>
          </div>
        ) : (
          competences.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <SkillBar
                key={item.id}
                nom={item.nom}
                niveau={item.niveau}
                actions={isEditing ? null : (
                  <>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#8f4a56] transition hover:bg-white hover:text-[#783d47]"
                      title={t('skills.edit')}
                      aria-label={t('skills.edit')}
                      onClick={() => startEdit(item)}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-white"
                      title={t('skills.delete')}
                      aria-label={t('skills.delete')}
                      onClick={() => setDeleteTarget(item)}
                    >
                      <FiTrash2 />
                    </button>
                  </>
                )}
              >
                {isEditing && (
                  <div className="mt-3 space-y-3 border-t border-[#ead7da] pt-3">
                    <div>
                      <label className="label" htmlFor={`edit-nom-${item.id}`}>{t('skills.nameLabel')}</label>
                      <input
                        id={`edit-nom-${item.id}`}
                        className="input mt-1"
                        value={editDraft.nom}
                        disabled={savingEdit}
                        onChange={(e) => setEditDraft((d) => ({ ...d, nom: e.target.value }))}
                      />
                    </div>
                    <LevelField
                      id={`edit-niveau-${item.id}`}
                      label={t('skills.levelLabel')}
                      value={editDraft.niveau}
                      onChange={(value) => setEditDraft((d) => ({ ...d, niveau: value }))}
                      disabled={savingEdit}
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={savingEdit}>
                        <FiX /> {t('profile.cancel')}
                      </button>
                      <button type="button" className="btn-primary" onClick={() => saveEdit(item)} disabled={savingEdit}>
                        <FiCheck /> {savingEdit ? t('profile.saving') : t('profile.save')}
                      </button>
                    </div>
                  </div>
                )}
              </SkillBar>
            );
          })
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t('skills.deleteTitle')}
        message={deleteTarget ? `${t('skills.deleteMessage')} « ${deleteTarget.nom} » ?` : ''}
        cancelLabel={t('profile.cancel')}
        confirmLabel={t('skills.delete')}
        loading={deleting}
        onCancel={() => (deleting ? null : setDeleteTarget(null))}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
