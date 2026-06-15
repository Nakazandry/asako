import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate } from '../utils/format.js';

const empty = { candidature_id: '', date_entretien: '', heure_entretien: '', type_entretien: 'Presentiel', lieu: '', commentaire: '', resultat: '' };

export default function Entretiens() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [candidatures, setCandidatures] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/entretiens', { params: { page } });
      setRows(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    if (isAdmin) api.get('/candidatures', { params: { limit: 100 } }).then((res) => setCandidatures(res.data.data));
  }, [isAdmin]);

  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/entretiens/${editing.id}`, form);
      else await api.post('/entretiens', form);
      toast.success(editing ? 'Entretien modifie' : 'Entretien programme');
      setFormOpen(false);
      setEditing(null);
      setForm(empty);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation impossible');
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/entretiens/${deleteTarget.id}`);
      toast.success('Entretien supprime');
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Suppression impossible');
    }
  };

  const columns = useMemo(() => [
    { key: 'candidat', header: 'Candidat', render: (row) => <div><p className="font-semibold text-[#2e2430]">{row.prenom} {row.nom}</p><p className="text-xs text-[#7a6670]">{row.offre_titre}</p></div> },
    { key: 'date_entretien', header: 'Date', render: (row) => <span className="inline-flex items-center gap-2"><FiClock className="text-[#8f4a56]" />{formatDate(row.date_entretien)} {row.heure_entretien || ''}</span> },
    { key: 'type_entretien', header: 'Type', render: (row) => row.type_entretien },
    { key: 'lieu', header: 'Lieu', render: (row) => row.lieu || '-' },
    { key: 'resultat', header: 'Resultat', render: (row) => row.resultat || '-' },
    { key: 'commentaire', header: 'Commentaire', render: (row) => <span className="line-clamp-2 max-w-xs">{row.commentaire || '-'}</span> },
    { key: 'actions', header: 'Actions', render: (row) => isAdmin ? (
      <div className="flex gap-2">
        <button className="btn-secondary px-3 py-2" onClick={() => { setEditing(row); setForm({ ...row, date_entretien: row.date_entretien?.slice(0, 10) || '' }); setFormOpen(true); }}><FiEdit2 /></button>
        <button className="btn-secondary px-3 py-2 text-rose-600" onClick={() => setDeleteTarget(row)}><FiTrash2 /></button>
      </div>
    ) : '-' },
  ], [isAdmin]);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Agenda de selection"
        title="Entretiens"
        description={isAdmin ? 'Planifiez les rendez-vous, ajoutez les retours et gardez une trace claire des resultats.' : 'Retrouvez vos rendez-vous programmes et les informations utiles pour chaque entretien.'}
        icon={FiCalendar}
        stats={[
          { label: 'Entretiens affiches', value: rows.length },
          { label: 'Total', value: meta?.total || rows.length },
        ]}
        actions={isAdmin && <button className="btn-primary bg-white text-[#8f4a56] hover:bg-[#fff7f8]" onClick={() => { setEditing(null); setForm(empty); setFormOpen(true); }}><FiPlus /> Programmer</button>}
      />
      <DataTable columns={columns} rows={rows} loading={loading} meta={meta} onPageChange={setPage} />
      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form className="panel max-h-[90vh] w-full max-w-2xl overflow-hidden shadow-2xl" onSubmit={save}>
            <div className="border-b border-[#ead7da] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Entretien</p>
              <h2 className="mt-1 text-lg font-black text-[#2e2430]">{editing ? 'Modifier un entretien' : 'Programmer un entretien'}</h2>
            </div>
            <div className="max-h-[68vh] overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {!editing && (
                <label className="block sm:col-span-2">
                  <span className="label">Candidature</span>
                  <select className="input mt-1" required value={form.candidature_id} onChange={(e) => setForm({ ...form, candidature_id: e.target.value })}>
                    <option value="">Choisir une candidature</option>
                    {candidatures.map((item) => <option key={item.id} value={item.id}>{item.prenom} {item.nom} - {item.offre_titre}</option>)}
                  </select>
                </label>
              )}
              <label className="block"><span className="label">Date</span><input className="input mt-1" type="date" required value={form.date_entretien || ''} onChange={(e) => setForm({ ...form, date_entretien: e.target.value })} /></label>
              <label className="block"><span className="label">Heure</span><input className="input mt-1" type="time" required value={form.heure_entretien || ''} onChange={(e) => setForm({ ...form, heure_entretien: e.target.value })} /></label>
              <label className="block"><span className="label">Type</span><select className="input mt-1" value={form.type_entretien || 'Presentiel'} onChange={(e) => setForm({ ...form, type_entretien: e.target.value })}><option>Presentiel</option><option>Visioconference</option><option>Telephonique</option></select></label>
              <label className="block"><span className="label">Lieu</span><input className="input mt-1" value={form.lieu || ''} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></label>
              <label className="block sm:col-span-2"><span className="label">Commentaire</span><textarea className="input mt-1 min-h-24" value={form.commentaire || ''} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} /></label>
              <label className="block sm:col-span-2"><span className="label">Resultat</span><textarea className="input mt-1 min-h-20" value={form.resultat || ''} onChange={(e) => setForm({ ...form, resultat: e.target.value })} /></label>
            </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#ead7da] bg-[#fff7f8]/60 px-5 py-4"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Annuler</button><button className="btn-primary">Enregistrer</button></div>
          </form>
        </div>
      )}
      <ConfirmModal open={Boolean(deleteTarget)} title="Supprimer cet entretien ?" message="Cette action est definitive." onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    </div>
  );
}
