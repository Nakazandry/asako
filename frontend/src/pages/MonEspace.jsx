import { useEffect, useMemo, useState } from 'react';
import { FiBriefcase, FiCalendar, FiHome, FiSend } from 'react-icons/fi';
import api, { fileUrl } from '../services/api';
import DataTable from '../components/DataTable.jsx';
import StatCard from '../components/StatCard.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

export default function MonEspace() {
  const [candidatures, setCandidatures] = useState([]);
  const [entretiens, setEntretiens] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const columns = useMemo(() => [
    { key: 'offre', header: 'Offre', render: (row) => <div><p className="font-semibold text-slate-950">{row.offre_titre}</p><p className="text-xs text-slate-500">{row.offre_localisation}</p></div> },
    { key: 'date_candidature', header: 'Date', render: (row) => formatDate(row.date_candidature) },
    { key: 'statut', header: 'Statut', render: (row) => <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(row.statut)}`}>{statusLabel(row.statut)}</span> },
    { key: 'cv', header: 'CV', render: (row) => <a className="font-semibold text-[#8f4a56]" href={fileUrl(row.cv)} target="_blank" rel="noreferrer">Voir PDF</a> },
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
            <h2 className="text-lg font-bold text-[#2e2430]">Entretiens programmes</h2>
            <p className="text-sm text-[#7a6670]">Rendez-vous et informations pratiques.</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-md bg-[#fff7f8] text-[#8f4a56]"><FiCalendar /></span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {entretiens.length ? entretiens.map((item) => (
            <article key={item.id} className="rounded-md border border-[#ead7da] bg-[#fff7f8]/50 p-4">
              <p className="font-bold text-[#2e2430]">{item.offre_titre}</p>
              <p className="mt-1 text-sm text-[#4b3a42]">{formatDate(item.date_entretien)} a {item.heure_entretien}</p>
              <p className="text-sm text-[#7a6670]">{item.type_entretien} · {item.lieu || 'Lieu a confirmer'}</p>
              {item.commentaire && <p className="mt-3 text-sm text-[#4b3a42]">{item.commentaire}</p>}
            </article>
          )) : <p className="text-sm text-[#7a6670]">Aucun entretien programme.</p>}
        </div>
      </section>
    </div>
  );
}
