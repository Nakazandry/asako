import { useEffect, useMemo, useState } from 'react';
import { FiEye, FiFilter, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { fileUrl } from '../services/api';
import DataTable from '../components/DataTable.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

const statuses = ['', 'En attente', 'Entretien', 'Accepté', 'Refusé'];

export default function Candidatures() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/candidatures', { params: { page, statut } });
      setRows(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statut]);

  const changeStatus = async (id, value) => {
    try {
      await api.patch(`/candidatures/${id}/statut`, { statut: value });
      toast.success('Statut mis a jour');
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Modification impossible');
    }
  };

  const columns = useMemo(() => [
    { key: 'candidat', header: 'Candidat', render: (row) => <div><p className="font-semibold text-[#2e2430]">{row.prenom} {row.nom}</p><p className="text-xs text-[#7a6670]">{row.email}</p></div> },
    { key: 'offre', header: 'Offre', render: (row) => <div><p>{row.offre_titre}</p><p className="text-xs text-slate-500">{row.offre_localisation}</p></div> },
    { key: 'statut', header: 'Statut', render: (row) => <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.statut)}`}>{statusLabel(row.statut)}</span> },
    { key: 'date_candidature', header: 'Date', render: (row) => formatDate(row.date_candidature) },
    { key: 'documents', header: 'Documents', render: (row) => (
      <div className="flex flex-wrap gap-2">
        <a className="btn-secondary px-3 py-2" href={fileUrl(row.cv)} target="_blank" rel="noreferrer"><FiEye /> CV</a>
        <button className="btn-secondary px-3 py-2" onClick={() => setLetter(row)}>Lettre</button>
      </div>
    ) },
    { key: 'actions', header: 'Changer statut', render: (row) => (
      <select className="input min-w-36" value={row.statut} onChange={(e) => changeStatus(row.id, e.target.value)}>
        {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </select>
    ) },
  ], []);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Analyse des dossiers"
        title="Candidatures"
        description="Filtrez les profils, consultez les documents et faites avancer chaque candidature dans le pipeline."
        icon={FiUsers}
        stats={[
          { label: 'Dossiers affiches', value: rows.length },
          { label: 'Total', value: meta?.total || 0 },
        ]}
      />
      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="block w-full sm:w-64">
          <span className="label inline-flex items-center gap-2"><FiFilter /> Filtrer par statut</span>
          <select className="input mt-1" value={statut} onChange={(e) => { setPage(1); setStatut(e.target.value); }}>
            {statuses.map((item) => <option key={item || 'all'} value={item}>{item ? statusLabel(item) : 'Tous les statuts'}</option>)}
          </select>
        </label>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} meta={meta} onPageChange={setPage} />
      {letter && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="border-b border-[#ead7da] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Document candidat</p>
              <h2 className="mt-1 text-lg font-black text-[#2e2430]">Lettre de motivation</h2>
              <p className="mt-1 text-sm text-[#7a6670]">{letter.prenom} {letter.nom} · {letter.offre_titre}</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap bg-[#fff7f8]/60 p-5 text-sm leading-6 text-[#4b3a42]">{letter.lettre_motivation}</div>
            <div className="flex justify-end border-t border-[#ead7da] px-5 py-4">
              <button className="btn-primary" onClick={() => setLetter(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
