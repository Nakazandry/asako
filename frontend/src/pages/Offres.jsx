import { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiEdit2, FiMapPin, FiPlus, FiSearch, FiSend, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate } from '../utils/format.js';

const emptyOffer = { titre: '', description: '', localisation: '', salaire: '', date_limite: '' };

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
  const [application, setApplication] = useState({ cv: null, lettre_motivation: '' });

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
    try {
      if (editing) await api.put(`/offres/${editing.id}`, offerForm);
      else await api.post('/offres', offerForm);
      toast.success(editing ? 'Offre modifiee' : 'Offre ajoutee');
      setFormOpen(false);
      setEditing(null);
      setOfferForm(emptyOffer);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation impossible');
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

  const columns = useMemo(() => [
    { key: 'titre', header: 'Titre', render: (row) => <div><p className="font-semibold text-[#2e2430]">{row.titre}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-[#7a6670]"><FiMapPin />{row.localisation}</p></div> },
    { key: 'description', header: 'Description', render: (row) => <span className="line-clamp-2 max-w-md">{row.description}</span> },
    { key: 'salaire', header: 'Salaire', render: (row) => row.salaire || '-' },
    { key: 'date_limite', header: 'Date limite', render: (row) => formatDate(row.date_limite) },
    { key: 'actions', header: 'Actions', render: (row) => (
      <div className="flex flex-wrap gap-2">
        {isAdmin ? (
          <>
            <button className="btn-secondary px-3 py-2" onClick={() => { setEditing(row); setOfferForm({ ...row, date_limite: row.date_limite?.slice(0, 10) || '' }); setFormOpen(true); }}><FiEdit2 /></button>
            <button className="btn-secondary px-3 py-2 text-rose-600" onClick={() => setDeleteTarget(row)}><FiTrash2 /></button>
          </>
        ) : (
          <button className="btn-primary px-3 py-2" onClick={() => setApplyTarget(row)}><FiSend /> Postuler</button>
        )}
      </div>
    ) },
  ], [isAdmin]);

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
        actions={isAdmin && <button className="btn-primary bg-white text-[#8f4a56] hover:bg-[#fff7f8]" onClick={() => { setEditing(null); setOfferForm(emptyOffer); setFormOpen(true); }}><FiPlus /> Ajouter</button>}
      />
      <form className="panel flex flex-col gap-3 p-4 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Recherche par titre, description ou localisation" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-secondary">Rechercher</button>
      </form>
      <DataTable columns={columns} rows={rows} loading={loading} meta={meta} onPageChange={setPage} />

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form className="panel max-h-[90vh] w-full max-w-2xl overflow-hidden shadow-2xl" onSubmit={saveOffer}>
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
                <input className="input mt-1" type="date" value={offerForm.date_limite || ''} onChange={(e) => setOfferForm({ ...offerForm, date_limite: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Description</span>
                <textarea className="input mt-1 min-h-32" required value={offerForm.description || ''} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} />
              </label>
            </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4">
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Annuler</button>
              <button className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {applyTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form className="panel w-full max-w-xl overflow-hidden shadow-2xl" onSubmit={submitApplication}>
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
