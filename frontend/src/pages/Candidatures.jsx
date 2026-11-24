import { useEffect, useMemo, useState } from 'react';
import {
  FiAward,
  FiEye,
  FiFileText,
  FiFilter,
  FiRefreshCcw,
  FiSearch,
  FiChevronDown,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { voirCv } from '../services/api';
import DataTable from '../components/DataTable.jsx';
import PageHero from '../components/PageHero.jsx';
import SkillBar from '../components/SkillBar.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

const statuses = ['', 'En attente', 'Entretien', 'Accepté', 'Refusé'];
const evaluationOptions = ['', 'non_evalue', 'faible', 'moyen', 'excellent'];
const EVALUATIONS_STORAGE_KEY = 'asako_candidature_evaluations';

// Les évaluations sont locales à ce navigateur via localStorage.
// Elles ne sont ni envoyées au backend ni synchronisées entre appareils.
const readEvaluations = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVALUATIONS_STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        ['faible', 'moyen', 'excellent'].includes(value)
      )
    );
  } catch (_error) {
    localStorage.removeItem(EVALUATIONS_STORAGE_KEY);
    return {};
  }
};

const evaluationLabel = (value) => ({
  faible: 'Faible',
  moyen: 'Moyen',
  excellent: 'Excellent',
})[value] || 'Non évalué';

const evaluationClass = (value) => ({
  faible: 'bg-rose-50 text-rose-700 border-rose-200',
  moyen: 'bg-amber-50 text-amber-700 border-amber-200',
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
})[value] || 'bg-slate-50 text-slate-600 border-slate-200';

const initialsOf = (row) =>
  `${row?.prenom?.[0] || ''}${row?.nom?.[0] || ''}`.toUpperCase() || 'C';

export default function Candidatures() {
  const [allRows, setAllRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statut, setStatut] = useState('');
  const [evaluationFilter, setEvaluationFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(false);
  const [evaluationsByCandidature, setEvaluationsByCandidature] = useState(readEvaluations);
  const [letter, setLetter] = useState(null);
  const [details, setDetails] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = [];
      let apiPage = 1;
      let pages = 1;
      do {
        const { data } = await api.get('/candidatures', {
          params: { page: apiPage, limit: 100 },
        });
        const pageRows = Array.isArray(data?.data) ? data.data : [];
        rows.push(...pageRows);
        pages = Number(data?.meta?.pages) || 1;
        apiPage += 1;
      } while (apiPage <= pages);
      setAllRows(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setAllRows([]);
      toast.error(error.response?.data?.message || 'Chargement des candidatures impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statut, evaluationFilter, sort, pageSize]);

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

  const setEvaluation = (rowId, value) => {
    const next = { ...evaluationsByCandidature };
    if (value === 'non_evalue') delete next[String(rowId)];
    else next[String(rowId)] = value;

    try {
      localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(next));
      setEvaluationsByCandidature(next);
    } catch (_error) {
      toast.error("Impossible d'enregistrer l'evaluation dans ce navigateur.");
    }
  };

  const requestStatusChange = (row, value) => {
    if (statusSaving || statusLabel(row.statut) === statusLabel(value)) return;
    setStatusTarget({ row, statut: value });
  };

  const cancelStatusChange = () => {
    if (statusSaving) return;
    setStatusTarget(null);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget || statusSaving) return;
    const { row, statut: value } = statusTarget;
    setStatusSaving(true);
    try {
      const { data } = await api.patch(`/candidatures/${row.id}/statut`, { statut: value });
      const nextStatus = statusLabel(data?.statut || value);
      setAllRows((current) =>
        (Array.isArray(current) ? current : []).map((item) =>
          item.id === row.id ? { ...item, ...data, statut: nextStatus } : item
        )
      );
      setDetails((current) =>
        current?.id === row.id ? { ...current, ...data, statut: nextStatus } : current
      );
      setStatusTarget(null);
      toast.success('Le statut de la candidature a ete mis a jour avec succes.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Modification impossible');
    } finally {
      setStatusSaving(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatut('');
    setEvaluationFilter('');
    setSort('date_desc');
    setPage(1);
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const safeRows = Array.isArray(allRows) ? allRows : [];
    const result = safeRows.filter((row) => {
      const statusMatches = !statut || statusLabel(row.statut) === statusLabel(statut);
      const evaluation = evaluationsByCandidature[String(row.id)] || '';
      const evaluationMatches =
        !evaluationFilter ||
        (evaluationFilter === 'non_evalue' ? !evaluation : evaluation === evaluationFilter);
      const searchMatches =
        !term ||
        `${row.prenom || ''} ${row.nom || ''}`.toLocaleLowerCase().includes(term) ||
        `${row.nom || ''} ${row.prenom || ''}`.toLocaleLowerCase().includes(term) ||
        String(row.email || '').toLocaleLowerCase().includes(term);
      return statusMatches && evaluationMatches && searchMatches;
    });

    return [...result].sort((a, b) => {
      if (sort === 'nom_asc') {
        return `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr');
      }
      if (sort === 'nom_desc') {
        return `${b.nom || ''} ${b.prenom || ''}`.localeCompare(`${a.nom || ''} ${a.prenom || ''}`, 'fr');
      }
      const dateA = new Date(a.date_candidature).getTime() || 0;
      const dateB = new Date(b.date_candidature).getTime() || 0;
      return sort === 'date_asc' ? dateA - dateB : dateB - dateA;
    });
  }, [allRows, search, statut, evaluationFilter, evaluationsByCandidature, sort]);

  const pages = Math.ceil(filteredRows.length / pageSize) || 1;
  const safePage = Math.min(page, pages);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const safeSkills = Array.isArray(skills) ? skills : [];

  const columns = useMemo(() => [
    {
      key: 'candidat',
      header: 'Candidat',
      width: 220,
      render: (row) => (
        <div className="flex min-w-[190px] items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#e6f3e9] to-[#b7dec2] text-sm font-black text-[#147a54] ring-2 ring-white">
            {initialsOf(row)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-[#17362b]">{row.prenom} {row.nom}</p>
            <p className="truncate text-xs text-[#60756b]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'offre',
      header: 'Offre',
      width: 210,
      render: (row) => (
        <div className="min-w-[150px]">
          <p className="max-w-52 truncate font-semibold text-[#40574a]" title={row.offre_titre}>{row.offre_titre}</p>
          <p className="mt-0.5 text-xs text-slate-500">{row.offre_localisation || '-'}</p>
        </div>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      width: 120,
      render: (row) => (
        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.statut)}`}>
          {statusLabel(row.statut)}
        </span>
      ),
    },
    {
      key: 'evaluation',
      header: 'Évaluation',
      width: 150,
      render: (row) => {
        const value = evaluationsByCandidature[String(row.id)] || '';
        return (
          <select
            className={`h-9 min-w-32 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm ${evaluationClass(value)} [&>option]:bg-white [&>option]:text-slate-700`}
            value={value || 'non_evalue'}
            onChange={(event) => setEvaluation(row.id, event.target.value)}
            aria-label={`Évaluation de ${row.prenom} ${row.nom}`}
          >
            {evaluationOptions.slice(1).map((item) => (
              <option key={item} value={item}>
                {evaluationLabel(item === 'non_evalue' ? '' : item)}
              </option>
            ))}
          </select>
        );
      },
    },
    { key: 'date_candidature', header: 'Date', width: 105, render: (row) => <span className="whitespace-nowrap text-xs font-semibold">{formatDate(row.date_candidature)}</span> },
    {
      key: 'documents',
      header: 'Documents',
      width: 180,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="btn-secondary h-9 px-2.5" onClick={() => voirCv(row.id).catch((e) => toast.error(e.message))} title="Consulter le CV">
            <FiEye /> CV
          </button>
          <button className="btn-secondary h-9 px-2.5" onClick={() => setLetter(row)} title="Lire la lettre de motivation">
            <FiFileText /> Lettre
          </button>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Profil candidat',
      width: 155,
      render: (row) => (
        <button className="btn-secondary h-9 px-3" onClick={() => openDetails(row)}>
          <FiUser /> Détails
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Changer statut',
      width: 175,
      render: (row) => (
        <select
          className="input h-9 min-w-36 py-1"
          value={statusLabel(row.statut)}
          disabled={statusSaving}
          onChange={(event) => requestStatusChange(row, event.target.value)}
        >
          {statuses.filter(Boolean).map((item) => (
            <option key={item} value={item}>{statusLabel(item)}</option>
          ))}
        </select>
      ),
    },
  ], [evaluationsByCandidature, statusSaving]);

  const hasFilters = search || statut || evaluationFilter;

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Analyse des dossiers"
        title="Candidatures"
        description="Filtrez les profils, évaluez les candidats et faites avancer chaque candidature dans le pipeline."
        icon={FiUsers}
        stats={[
          { label: 'Dossiers affichés', value: filteredRows.length },
          { label: 'Total des candidatures', value: allRows.length },
        ]}
      />

      <div className="panel p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto] lg:items-end">
          <label className="block">
            <span className="label">Rechercher un candidat</span>
            <span className="relative mt-1 block">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7d9284]" />
              <input
                className="input pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, prénom ou e-mail"
              />
            </span>
          </label>

          <label className="block">
            <span className="label inline-flex items-center gap-2"><FiFilter /> Statut</span>
            <select className="input mt-1" value={statut} onChange={(event) => setStatut(event.target.value)}>
              {statuses.map((item) => (
                <option key={item || 'all'} value={item}>{item ? statusLabel(item) : 'Tous les statuts'}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label inline-flex items-center gap-2"><FiAward /> Évaluation</span>
            <select className="input mt-1" value={evaluationFilter} onChange={(event) => setEvaluationFilter(event.target.value)}>
              {evaluationOptions.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item ? evaluationLabel(item === 'non_evalue' ? '' : item) : 'Toutes les évaluations'}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label inline-flex items-center gap-2"><FiChevronDown /> Trier</span>
            <select className="input mt-1" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="date_desc">Date récente</option>
              <option value="date_asc">Date ancienne</option>
              <option value="nom_asc">Nom A → Z</option>
              <option value="nom_desc">Nom Z → A</option>
            </select>
          </label>

          <button
            type="button"
            className="btn-secondary h-10 justify-center whitespace-nowrap"
            onClick={resetFilters}
            disabled={!hasFilters && sort === 'date_desc'}
          >
            <FiRefreshCcw /> Réinitialiser
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pagedRows}
        loading={loading}
        empty={hasFilters ? 'Aucune candidature ne correspond aux filtres.' : 'Aucune candidature.'}
        meta={{ page: safePage, pages, total: filteredRows.length }}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageSizeChange={setPageSize}
        resultLabel={filteredRows.length > 1 ? 'résultats' : 'résultat'}
        tableMinWidth={1315}
      />

      {letter && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setLetter(null)}>
          <div className="modal-card panel w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-[#dce9df] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#147a54]">Document candidat</p>
                <h2 className="mt-1 text-lg font-black text-[#17362b]">Lettre de motivation</h2>
                <p className="mt-1 text-sm text-[#60756b]">{letter.prenom} {letter.nom} · {letter.offre_titre}</p>
              </div>
              <button className="rounded-lg p-2 text-[#60756b] transition hover:bg-[#f1f8f3] hover:text-[#147a54]" onClick={() => setLetter(null)} aria-label="Fermer">
                <FiX />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap bg-[#f1f8f3]/60 p-5 text-sm leading-6 text-[#40574a]">{letter.lettre_motivation}</div>
            <div className="flex justify-end border-t border-[#dce9df] px-5 py-4">
              <button className="btn-primary" onClick={() => setLetter(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {details && (
        <div className="modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={closeDetails}>
          <div className="modal-card panel w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#dce9df] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#147a54]">Profil candidat</p>
                <h2 className="mt-1 text-lg font-black text-[#17362b]">{details.prenom} {details.nom}</h2>
                <p className="mt-1 text-sm text-[#60756b]">{details.email} · {details.offre_titre}</p>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(details.statut)}`}>
                  {statusLabel(details.statut)}
                </span>
              </div>
              <button className="rounded-lg p-2 text-[#60756b] transition hover:bg-[#f1f8f3] hover:text-[#147a54]" onClick={closeDetails} aria-label="Fermer">
                <FiX />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-[#f1f8f3] text-[#147a54]"><FiAward /></span>
                <div>
                  <h3 className="font-bold text-[#17362b]">Compétences déclarées</h3>
                  <p className="text-xs text-[#60756b]">Niveau de maîtrise renseigné par le candidat.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {skillsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((index) => <div key={index} className="skeleton h-16 w-full" />)}
                  </div>
                ) : skillsError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                    {skillsError}
                  </div>
                ) : safeSkills.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#dce9df] bg-[#f1f8f3]/40 px-4 py-8 text-center text-sm text-[#60756b]">
                    Ce candidat n'a pas encore renseigné de compétence.
                  </div>
                ) : (
                  safeSkills.map((item) => <SkillBar key={item.id} nom={item.nom} niveau={item.niveau} />)
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#dce9df] px-5 py-4">
              <button className="btn-primary" onClick={closeDetails}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(statusTarget)}
        title="Confirmer le changement de statut ?"
        message={
          statusTarget
            ? `Voulez-vous vraiment faire passer cette candidature au statut "${statusLabel(statusTarget.statut)}" ?`
            : ''
        }
        onCancel={cancelStatusChange}
        onConfirm={confirmStatusChange}
        loading={statusSaving}
        cancelLabel="Annuler"
        confirmLabel="Confirmer"
      />
    </div>
  );
}
