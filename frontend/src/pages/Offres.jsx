import { useEffect, useState } from 'react';
import { FiBriefcase, FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiDollarSign, FiEdit2, FiInbox, FiMapPin, FiPlus, FiSearch, FiSend, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { apiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate } from '../utils/format.js';

const emptyOffer = { titre: '', description: '', localisation: '', salaire: '', date_limite: '' };

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const isExpired = (row) => Boolean(row.date_limite) && row.date_limite.slice(0, 10) < todayStr();

const cardAccents = [
  { bar: 'from-[#eec4c9] to-[#8f4a56]', tile: 'from-[#fff7f8] to-[#f8e1e5] text-[#8f4a56]', text: 'text-[#8f4a56]', chip: 'bg-[#fff7f8] text-[#8f4a56] ring-[#ead7da]/70' },
  { bar: 'from-emerald-300 to-emerald-600', tile: 'from-emerald-50 to-emerald-100 text-emerald-700', text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70' },
  { bar: 'from-amber-300 to-amber-500', tile: 'from-amber-50 to-amber-100 text-amber-700', text: 'text-amber-600', chip: 'bg-amber-50 text-amber-700 ring-amber-200/70' },
  { bar: 'from-slate-300 to-slate-500', tile: 'from-slate-100 to-slate-200 text-slate-700', text: 'text-slate-600', chip: 'bg-slate-100 text-slate-700 ring-slate-300/70' },
  { bar: 'from-teal-300 to-teal-600', tile: 'from-teal-50 to-teal-100 text-teal-700', text: 'text-teal-600', chip: 'bg-teal-50 text-teal-700 ring-teal-200/70' },
];

export default function Offres() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [offerForm, setOfferForm] = useState(emptyOffer);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [application, setApplication] = useState({ cv: null, lettre_motivation: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoVersion, setPhotoVersion] = useState(0);

  const photoSrc = (row) => (row?.has_photo ? `${apiUrl(`/offres/${row.id}/photo`)}?v=${photoVersion}` : '');

  const resetPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/offres', { params: { page, search } });
      setRows(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const saveOffer = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('titre', offerForm.titre || '');
    formData.append('description', offerForm.description || '');
    formData.append('localisation', offerForm.localisation || '');
    formData.append('salaire', offerForm.salaire || '');
    formData.append('date_limite', offerForm.date_limite || '');
    if (photoFile) formData.append('photo', photoFile);
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editing) await api.put(`/offres/${editing.id}`, formData, config);
      else await api.post('/offres', formData, config);
      toast.success(editing ? 'Offre modifiee' : 'Offre ajoutee');
      setFormOpen(false);
      setEditing(null);
      setOfferForm(emptyOffer);
      resetPhoto();
      setPhotoVersion((v) => v + 1);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation impossible');
    }
  };

  const onPhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez choisir une image (JPEG, PNG, WebP ou GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (5 Mo maximum)');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = async () => {
    if (!editing) return;
    try {
      await api.delete(`/offres/${editing.id}/photo`);
      toast.success('Photo supprimee');
      setEditing((prev) => (prev ? { ...prev, has_photo: false } : prev));
      resetPhoto();
      setPhotoVersion((v) => v + 1);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Suppression impossible');
    }
  };

  const removeOffer = async () => {
    try {
      await api.delete(`/offres/${deleteTarget.id}`);
      toast.success('Offre supprimee');
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Suppression impossible');
    }
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('offre_id', applyTarget.id);
    formData.append('lettre_motivation', application.lettre_motivation);
    formData.append('cv', application.cv);
    try {
      await api.post('/candidatures', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Candidature envoyee');
      setApplyTarget(null);
      setApplication({ cv: null, lettre_motivation: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Candidature impossible');
    }
  };

  const startEdit = (row) => {
    setDetailTarget(null);
    setEditing(row);
    setOfferForm({ ...row, date_limite: row.date_limite?.slice(0, 10) || '' });
    resetPhoto();
    setFormOpen(true);
  };

  const startDelete = (row) => {
    setDetailTarget(null);
    setDeleteTarget(row);
  };

  const startApply = (row) => {
    setDetailTarget(null);
    setApplyTarget(row);
  };

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={isAdmin ? 'Bibliotheque des postes' : 'Opportunites ouvertes'}
        title="Offres"
        description={isAdmin ? 'Créez, organisez et ajustez les postes ouverts dans une interface claire.' : 'Explorez les offres disponibles et envoyez une candidature complete avec votre CV PDF.'}
        icon={FiBriefcase}
        stats={[
          { label: 'Offres affichees', value: rows.length },
          { label: 'Page', value: meta?.page || 1 },
        ]}
        actions={isAdmin && <button className="btn-primary bg-white text-[#8f4a56] hover:bg-[#fff7f8]" onClick={() => { resetPhoto(); setEditing(null); setOfferForm(emptyOffer); setFormOpen(true); }}><FiPlus /> Ajouter</button>}
      />
      <form className="panel flex flex-col gap-3 p-4 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Recherche par titre, description ou localisation" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-secondary">Rechercher</button>
      </form>

      {loading ? (
        <Loader />
      ) : rows.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const expired = isExpired(row);
              const accent = cardAccents[(row.id || 0) % cardAccents.length];
              return (
                <article
                  key={row.id}
                  onClick={() => setDetailTarget(row)}
                  className="panel panel-hover group relative flex cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:border-[#dcc2c8] active:scale-[0.99]"
                >
                  <span className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent.bar} opacity-90`} />
                  {row.has_photo && (
                    <div className="relative w-full overflow-hidden bg-[#fff7f8]">
                      <img
                        src={photoSrc(row)}
                        alt={row.titre}
                        className="block h-auto max-h-64 w-full object-cover object-center"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                      {expired ? (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                          <FiClock className="text-xs" /> Expiree
                        </span>
                      ) : (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ouverte
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    {!row.has_photo && (
                      <div className="flex items-start justify-between gap-3">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accent.tile} shadow-inner ring-1 ring-white/60 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105`}>
                          <FiBriefcase className="text-xl" />
                        </span>
                        {expired ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                            <FiClock className="text-xs" /> Expiree
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            Ouverte
                          </span>
                        )}
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-black leading-snug text-[#2e2430] transition-colors duration-200 group-hover:text-[#8f4a56]">{row.titre}</h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#7a6670]">
                      <FiMapPin className={`shrink-0 ${accent.text}`} /> {row.localisation || 'Localisation non precisee'}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4b3a42]">{row.description}</p>
                    <div className="mt-auto pt-5">
                      <div className="flex flex-wrap items-center gap-2 border-t border-[#f1e2e5]/80 pt-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ring-1 ${accent.chip}`}>
                          <FiDollarSign /> {row.salaire || 'A negocier'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${expired ? 'bg-rose-50 text-rose-600 ring-rose-200/70' : 'bg-white text-[#7a6670] ring-[#ead7da]/70'}`}>
                          <FiCalendar /> {formatDate(row.date_limite)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <>
                            <button className="btn-secondary px-3 py-2" onClick={() => startEdit(row)}><FiEdit2 /> Modifier</button>
                            <button className="btn-secondary px-3 py-2 text-rose-600" onClick={() => startDelete(row)}><FiTrash2 /> Supprimer</button>
                          </>
                        ) : expired ? (
                          <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-500">Date limite passee</span>
                        ) : (
                          <button className="btn-primary px-3 py-2" onClick={() => startApply(row)}><FiSend /> Postuler</button>
                        )}
                        <button className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-wider transition-colors duration-200 ${accent.text} hover:bg-[#fff7f8]`} onClick={() => setDetailTarget(row)}>
                          Details <FiChevronRight />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {meta && meta.pages > 1 && (
            <div className="panel flex flex-col gap-3 px-4 py-3 text-sm font-semibold text-[#7a6670] sm:flex-row sm:items-center sm:justify-between">
              <span>Page {meta.page} sur {meta.pages} · {meta.total} resultat(s)</span>
              <div className="flex gap-2">
                <button className="btn-secondary px-3 py-1.5" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
                  <FiChevronLeft /> Precedent
                </button>
                <button className="btn-secondary px-3 py-1.5" disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)}>
                  Suivant <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="panel px-4 py-16 text-center">
          <div className="mx-auto max-w-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff7f8] text-2xl text-[#d9a9b2] ring-8 ring-[#fff7f8]/60">
              <FiInbox />
            </span>
            <p className="mt-4 font-bold text-[#2e2430]">Aucune offre trouvee</p>
            <p className="mt-1 text-sm text-[#7a6670]">Aucun resultat pour cette recherche. Essayez d'autres mots-cles.</p>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setDetailTarget(null)}>
          <div className="modal-card panel max-h-[90vh] w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[#ead7da] bg-gradient-to-r from-[#fff7f8] to-[#fdf1f3] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#fff7f8] to-[#f8e1e5] text-[#8f4a56] shadow-inner ring-1 ring-[#ead7da]/70">
                  <FiBriefcase className="text-xl" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Detail de l'offre</p>
                  <h2 className="mt-0.5 truncate text-lg font-black text-[#2e2430]">{detailTarget.titre}</h2>
                </div>
              </div>
              <button className="btn-secondary shrink-0 px-2.5 py-2" onClick={() => setDetailTarget(null)} aria-label="Fermer"><FiX /></button>
            </div>
            {detailTarget.has_photo && (
              <div className="w-full overflow-hidden bg-[#fff7f8]">
                <img
                  src={photoSrc(detailTarget)}
                  alt={detailTarget.titre}
                  className="block h-auto max-h-80 w-full object-cover object-center"
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="flex flex-wrap items-center gap-2">
                {isExpired(detailTarget) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                    <FiClock /> Date limite passee
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Postes ouverts aux candidatures
                  </span>
                )}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#f1e2e5] bg-[#fff7f8]/60 p-3">
                  <p className="label">Localisation</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#2e2430]"><FiMapPin /> {detailTarget.localisation || 'Non precisee'}</p>
                </div>
                <div className="rounded-lg border border-[#f1e2e5] bg-[#fff7f8]/60 p-3">
                  <p className="label">Salaire</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#2e2430]"><FiDollarSign /> {detailTarget.salaire || 'A negocier'}</p>
                </div>
                <div className="rounded-lg border border-[#f1e2e5] bg-[#fff7f8]/60 p-3">
                  <p className="label">Date limite</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#2e2430]"><FiCalendar /> {formatDate(detailTarget.date_limite)}</p>
                </div>
                {detailTarget.date_creation && (
                  <div className="rounded-lg border border-[#f1e2e5] bg-[#fff7f8]/60 p-3">
                    <p className="label">Publiee le</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#2e2430]">{formatDate(detailTarget.date_creation)}</p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <p className="label">Description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#4b3a42]">{detailTarget.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4">
              <button className="btn-secondary" onClick={() => setDetailTarget(null)}>Fermer</button>
              {isAdmin ? (
                <>
                  <button className="btn-secondary" onClick={() => startEdit(detailTarget)}><FiEdit2 /> Modifier</button>
                  <button className="btn-danger" onClick={() => startDelete(detailTarget)}><FiTrash2 /> Supprimer</button>
                </>
              ) : isExpired(detailTarget) ? null : (
                <button className="btn-primary" onClick={() => startApply(detailTarget)}><FiSend /> Postuler</button>
              )}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form className="modal-card panel max-h-[90vh] w-full max-w-2xl overflow-hidden shadow-2xl" onSubmit={saveOffer}>
            <div className="border-b border-[#ead7da] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Offre</p>
              <h2 className="mt-1 text-lg font-black text-[#2e2430]">{editing ? 'Modifier une offre' : 'Ajouter une offre'}</h2>
            </div>
            <div className="max-h-[68vh] overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {['titre', 'localisation', 'salaire'].map((key) => (
                <label key={key} className="block">
                  <span className="label">{key.replace('_', ' ')}</span>
                  <input className="input mt-1" required={key !== 'salaire'} value={offerForm[key] || ''} onChange={(e) => setOfferForm({ ...offerForm, [key]: e.target.value })} />
                </label>
              ))}
              <label className="block">
                <span className="label">Date limite</span>
                <input className="input mt-1" type="date" min={editing ? undefined : todayStr()} value={offerForm.date_limite || ''} onChange={(e) => setOfferForm({ ...offerForm, date_limite: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Description</span>
                <textarea className="input mt-1 min-h-32" required value={offerForm.description || ''} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} />
              </label>
              <div className="sm:col-span-2">
                <span className="label">Photo de l'offre</span>
                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
                  {(photoPreview || editing?.has_photo) && (
                    <img
                      src={photoPreview || photoSrc(editing)}
                      alt="Apercu de l'offre"
                      className="block max-h-40 w-auto rounded-lg border border-[#ead7da] object-contain object-center"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="btn-secondary cursor-pointer">
                      <FiUpload /> {photoPreview ? 'Changer la photo' : (editing?.has_photo ? 'Remplacer la photo' : 'Choisir une photo')}
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPhotoChange} />
                    </label>
                    {editing?.has_photo && !photoFile && (
                      <button type="button" className="btn-secondary text-rose-600" onClick={removePhoto}>
                        <FiTrash2 /> Retirer la photo
                      </button>
                    )}
                    {photoFile && (
                      <button type="button" className="btn-secondary" onClick={resetPhoto}>
                        <FiX /> Annuler la selection
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#7a6670]">Formats acceptes : JPEG, PNG, WebP ou GIF · 5 Mo maximum.</p>
              </div>
            </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => { resetPhoto(); setFormOpen(false); }}>Annuler</button>
              <button className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {applyTarget && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form className="modal-card panel w-full max-w-xl overflow-hidden shadow-2xl" onSubmit={submitApplication}>
            <div className="border-b border-[#ead7da] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Candidature</p>
              <h2 className="mt-1 text-lg font-black text-[#2e2430]">Postuler: {applyTarget.titre}</h2>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="label">CV PDF</span>
                <input className="input mt-1" type="file" accept="application/pdf" required onChange={(e) => setApplication({ ...application, cv: e.target.files[0] })} />
              </label>
              <label className="block">
                <span className="label">Lettre de motivation</span>
                <textarea className="input mt-1 min-h-36" required value={application.lettre_motivation} onChange={(e) => setApplication({ ...application, lettre_motivation: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => setApplyTarget(null)}>Annuler</button>
              <button className="btn-primary">Envoyer</button>
            </div>
          </form>
        </div>
      )}
      <ConfirmModal open={Boolean(deleteTarget)} title="Supprimer cette offre ?" message="Cette action supprimera definitivement l'offre." onCancel={() => setDeleteTarget(null)} onConfirm={removeOffer} />
    </div>
  );
}
