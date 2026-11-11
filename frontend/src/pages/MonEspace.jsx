import { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiCalendar, FiCheckCircle, FiHome, FiSend, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api, { voirCv } from '../services/api';
import ConfirmModal from '../components/ConfirmModal.jsx';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

const EN_ATTENTE = 'En attente';

export default function MonEspace() {
  const [candidatures, setCandidatures] = useState([]);
  const [entretiens, setEntretiens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [refusTarget, setRefusTarget] = useState(null);

  const loadEntretiens = () =>
    api.get('/entretiens', { params: { limit: 100 } }).then((res) => setEntretiens(res.data.data));

  useEffect(() => {
    Promise.all([
      api.get('/candidatures', { params: { limit: 100 } }),
      api.get('/entretiens', { params: { limit: 100 } }),
    ]).then(([apps, interviews]) => {
      setCandidatures(apps.data.data);
      setEntretiens(interviews.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const pending = candidatures.filter((item) => item.statut === 'En attente').length;
  const accepted = candidatures.filter((item) => ['Accepté', 'Accepte'].includes(item.statut)).length;

  const repondre = async (item, reponse) => {
    setResponding(item.id);
    try {
      const { data } = await api.patch(`/entretiens/${item.id}/reponse`, { reponse });
      setEntretiens((current) => current.map((row) => (row.id === data.id ? { ...row, ...data } : row)));
      setRefusTarget(null);
      toast.success(reponse === 'accepter' ? 'Entretien accepte' : 'Entretien refuse');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reponse impossible');
      if (error.response?.status === 409) loadEntretiens().catch(() => {});
    } finally {
      setResponding(null);
    }
  };

  const columns = useMemo(() => [
    { key: 'offre', header: 'Offre', render: (row) => <div><p className="font-semibold text-slate-950">{row.offre_titre}</p><p className="text-xs text-slate-500">{row.offre_localisation}</p></div> },
    { key: 'date_candidature', header: 'Date', render: (row) => formatDate(row.date_candidature) },
    { key: 'statut', header: 'Statut', render: (row) => <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.statut)}`}>{statusLabel(row.statut)}</span> },
    { key: 'cv', header: 'CV', render: (row) => <button className="font-semibold text-[#8f4a56] cursor-pointer" onClick={() => voirCv(row.id).catch((e) => alert(e.message))}>Voir PDF</button> },
  ], []);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Tableau personnel"
        title="Mon espace"
        description="Suivez vos candidatures, vos statuts et les prochains entretiens depuis une vue claire et organisee."
        icon={FiHome}
        stats={[
          { label: 'Candidatures', value: candidatures.length },
          { label: 'Entretiens', value: entretiens.length },
          { label: 'En attente', value: pending },
          { label: 'Acceptées', value: accepted },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FiSend} label="Candidatures" value={candidatures.length} tone="blue" />
        <StatCard icon={FiBriefcase} label="En attente" value={pending} tone="amber" />
        <StatCard icon={FiCalendar} label="Acceptées" value={accepted} tone="emerald" />
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-[#2e2430]">Mes candidatures</h2>
          <p className="text-sm text-[#7a6670]">Historique des dossiers envoyes.</p>
        </div>
        <DataTable columns={columns} rows={candidatures} loading={loading} />
      </section>
      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#2e2430]">Invitations a des entretiens</h2>
            <p className="text-sm text-[#7a6670]">Confirmez votre presence en acceptant ou en refusant chaque invitation.</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]"><FiCalendar /></span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {entretiens.length ? entretiens.map((item) => {
            const reponse = item.reponse_candidat || EN_ATTENTE;
            const enAttente = reponse === EN_ATTENTE;
            return (
              <article key={item.id} className="flex flex-col rounded-xl border border-[#ead7da] bg-white p-4 shadow-[0_1px_2px_rgba(46,36,48,0.04)] transition hover:border-[#dcc2c8] hover:shadow-[0_8px_22px_-16px_rgba(46,36,48,0.4)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[#2e2430]">{item.offre_titre}</p>
                    <p className="mt-1 text-sm text-[#4b3a42]">
                      {formatDate(item.date_entretien)} a {item.heure_entretien ? item.heure_entretien.slice(0, 5) : 'heure a confirmer'}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(reponse)}`}>{statusLabel(reponse)}</span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm text-[#4b3a42] sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[#7a6670]">Type</dt>
                    <dd>{item.type_entretien || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-[#7a6670]">Lieu / lien</dt>
                    <dd className="break-words">{item.lieu || 'A confirmer'}</dd>
                  </div>
                </dl>
                {item.commentaire && (
                  <p className="mt-3 rounded-md bg-[#fff7f8]/70 p-3 text-sm text-[#4b3a42]">{item.commentaire}</p>
                )}
                {item.date_reponse && (
                  <p className="mt-2 text-xs font-semibold text-[#7a6670]">Reponse enregistree le {formatDate(item.date_reponse)}</p>
                )}
                {enAttente ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary" disabled={responding === item.id} onClick={() => repondre(item, 'accepter')}>
                      <FiCheckCircle /> Accepter
                    </button>
                    <button className="btn-secondary text-rose-600" disabled={responding === item.id} onClick={() => setRefusTarget(item)}>
                      <FiXCircle /> Refuser
                    </button>
                  </div>
                ) : (
                  <p className={`mt-4 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${statusClass(reponse)}`}>
                    {reponse === 'Accepté' ? <FiCheckCircle /> : <FiXCircle />}
                    {reponse === 'Accepté' ? 'Invitation acceptee' : 'Invitation refusee'}
                  </p>
                )}
              </article>
            );
          }) : <p className="text-sm text-[#7a6670]">Aucune invitation pour le moment.</p>}
        </div>
      </section>
      <ConfirmModal
        open={Boolean(refusTarget)}
        title="Refuser cette invitation ?"
        message="Le recruteur sera informe de votre refus. Cette decision ne pourra plus etre modifiee."
        onCancel={() => setRefusTarget(null)}
        onConfirm={() => refusTarget && repondre(refusTarget, 'refuser')}
        loading={Boolean(refusTarget) && responding === refusTarget.id}
        cancelLabel="Retour"
        confirmLabel="Oui, refuser"
      />
    </div>
  );
}
