import { useEffect, useMemo, useState } from 'react';
import { FiAward, FiEye, FiFilter, FiUser, FiUsers, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { voirCv } from '../services/api';
import DataTable from '../components/DataTable.jsx';
import PageHero from '../components/PageHero.jsx';
import SkillBar from '../components/SkillBar.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

const statuses = ['', 'En attente', 'Entretien', 'Accepté', 'Refusé'];

export default function Candidatures() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState(null);
  const [details, setDetails] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState('');

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

  const openDetails = async (row) => {
    setDetails(row);
    setSkills([]);
    setSkillsError('');
    setSkillsLoading(true);
    try {
      const { data } = await api.get(`/competences/candidat/${row.utilisateur_id}`);
      setSkills(Array.isArray(data?.competences) ? data.competences : []);
    } catch (error) {
      setSkillsError(error.response?.data?.message || 'Chargement des competences impossible');
    } finally {
      setSkillsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetails(null);
    setSkills([]);
    setSkillsError('');
  };

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
        <button className="btn-secondary px-3 py-2" onClick={() => voirCv(row.id).catch((e) => toast.error(e.message))}><FiEye /> CV</button>
        <button className="btn-secondary px-3 py-2" onClick={() => setLetter(row)}>Lettre</button>
      </div>
    ) },
    { key: 'details', header: 'Profil candidat', render: (row) => (
      <button className="btn-secondary px-3 py-2" onClick={() => openDetails(row)}>
        <FiUser /> Details
      </button>
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
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="modal-card panel w-full max-w-2xl overflow-hidden shadow-2xl">
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

      {details && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={closeDetails}>
          <div className="modal-card panel w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#ead7da] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#8f4a56]">Profil candidat</p>
                <h2 className="mt-1 text-lg font-black text-[#2e2430]">{details.prenom} {details.nom}</h2>
                <p className="mt-1 text-sm text-[#7a6670]">{details.email} · {details.offre_titre}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(details.statut)}`}>
                  {statusLabel(details.statut)}
                </span>
              </div>
              <button className="rounded-lg p-2 text-[#7a6670] transition hover:bg-[#fff7f8] hover:text-[#8f4a56]" onClick={closeDetails} aria-label="Fermer">
                <FiX />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]"><FiAward /></span>
                <div>
                  <h3 className="font-bold text-[#2e2430]">Competences declarees</h3>
                  <p className="text-xs text-[#7a6670]">Niveau de maitrise renseigne par le candidat.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {skillsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
                  </div>
                ) : skillsError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                    {skillsError}
                  </div>
                ) : skills.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#ead7da] bg-[#fff7f8]/40 px-4 py-8 text-center text-sm text-[#7a6670]">
                    Ce candidat n'a pas encore renseigne de competence.
                  </div>
                ) : (
                  skills.map((item) => <SkillBar key={item.id} nom={item.nom} niveau={item.niveau} />)
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#ead7da] px-5 py-4">
              <button className="btn-primary" onClick={closeDetails}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
