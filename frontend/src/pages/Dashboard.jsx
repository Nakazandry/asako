import { useEffect, useState } from 'react';
import { FiActivity, FiBriefcase, FiCalendar, FiCheckCircle, FiClock, FiSend, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';
import Loader from '../components/Loader.jsx';
import PageHero from '../components/PageHero.jsx';

const statusColors = ['#8f4a56', '#16a34a', '#f59e0b', '#64748b', '#0f766e'];

const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(value || 0);

const percent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

function DashboardCard({ icon: Icon, label, value, helper, tone = 'rose' }) {
  const tones = {
    rose: 'bg-[#fff7f8] text-[#8f4a56]',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <article className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(46,36,48,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#7a6670]">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-[#2e2430]">{formatNumber(value)}</p>
          <p className="mt-2 text-sm leading-5 text-[#7a6670]">{helper}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
          <Icon className="text-xl" />
        </span>
      </div>
    </article>
  );
}

function ChartHeader({ title, description, badge }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-black text-[#2e2430]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#7a6670]">{description}</p>
      </div>
      {badge && <span className="w-fit rounded-full border border-[#ead7da] bg-[#fff7f8] px-3 py-1 text-xs font-bold text-[#8f4a56]">{badge}</span>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const title = label || payload[0].name || payload[0].payload?.name;

  return (
    <div className="rounded-md border border-[#ead7da] bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-bold text-[#2e2430]">{title}</p>
      <p className="mt-1 text-[#7a6670]">{formatNumber(payload[0].value)} dossier(s)</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const totals = data?.totals || {};
  const evolution = data?.evolution || [];
  const statuts = data?.statuts || [];
  const totalApplications = totals.candidatures || 0;
  const interviewRate = percent(totals.entretiens, totalApplications);
  const applicationsPerOffer = totals.offres ? (totalApplications / totals.offres).toFixed(1) : '0';
  const lastMonth = evolution.at(-1)?.total || 0;
  const previousMonth = evolution.at(-2)?.total || 0;
  const monthDelta = lastMonth - previousMonth;
  const acceptedStatus = statuts.find((item) => ['accepté', 'accepte', 'accepted'].includes(String(item.name).toLowerCase()))?.value || 0;
  const pendingStatus = statuts.find((item) => String(item.name).toLowerCase().includes('attente'))?.value || 0;
  const acceptanceRate = percent(acceptedStatus, totalApplications);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Centre de controle RH"
        title="Dashboard RH"
        description="Vue finale et claire du recrutement ASAKO: volumes, progression, statuts et signaux utiles pour piloter les decisions RH."
        icon={FiActivity}
        stats={[
          { label: 'Offres actives', value: formatNumber(totals.offres) },
          { label: 'Candidats', value: formatNumber(totals.candidats) },
          { label: 'Candidatures', value: formatNumber(totalApplications) },
          { label: 'Entretiens', value: formatNumber(totals.entretiens) },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard icon={FiBriefcase} label="Offres ouvertes" value={totals.offres} helper={`${applicationsPerOffer} candidature(s) par offre`} tone="rose" />
        <DashboardCard icon={FiUsers} label="Talents inscrits" value={totals.candidats} helper="Base candidats disponible" tone="green" />
        <DashboardCard icon={FiSend} label="Dossiers recus" value={totalApplications} helper={`${pendingStatus} dossier(s) en attente`} tone="amber" />
        <DashboardCard icon={FiCalendar} label="Entretiens planifies" value={totals.entretiens} helper={`${interviewRate}% des dossiers passent en entretien`} tone="slate" />
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="panel p-5 xl:col-span-8">
          <ChartHeader
            title="Evolution des candidatures"
            description="Lecture mensuelle des dossiers recus pour suivre le rythme du pipeline."
            badge={monthDelta >= 0 ? `+${monthDelta} ce mois` : `${monthDelta} ce mois`}
          />
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="applicationsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8f4a56" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#8f4a56" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ead7da" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fill: '#7a6670', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#7a6670', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#8f4a56" strokeWidth={3} fill="url(#applicationsGradient)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5 xl:col-span-4">
          <ChartHeader
            title="Repartition des statuts"
            description="Etat actuel des candidatures dans le processus."
            badge={`${acceptanceRate}% acceptes`}
          />
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statuts} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={4}>
                  {statuts.map((entry, index) => <Cell key={entry.name} fill={statusColors[index % statusColors.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {statuts.length ? statuts.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[#4b3a42]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColors[index % statusColors.length] }} />
                  <span className="truncate font-semibold">{item.name}</span>
                </span>
                <span className="font-black text-[#2e2430]">{formatNumber(item.value)}</span>
              </div>
            )) : <p className="text-sm text-[#7a6670]">Aucun statut disponible.</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <ChartHeader
            title="Performance du pipeline"
            description="Comparaison rapide des volumes cles pour visualiser la pression de recrutement."
          />
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Offres', total: totals.offres || 0 },
                  { name: 'Candidats', total: totals.candidats || 0 },
                  { name: 'Candidatures', total: totalApplications },
                  { name: 'Entretiens', total: totals.entretiens || 0 },
                ]}
                margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid stroke="#ead7da" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#7a6670', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#7a6670', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#8f4a56" radius={[6, 6, 0, 0]} barSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <ChartHeader
            title="Synthese executive"
            description="Indicateurs utiles pour la decision rapide."
          />
          <div className="mt-5 space-y-3">
            <div className="rounded-md border border-[#ead7da] bg-[#fff7f8] p-4">
              <div className="flex items-center gap-3">
                <FiTrendingUp className="text-[#8f4a56]" />
                <p className="font-bold text-[#2e2430]">Taux d'entretien</p>
              </div>
              <p className="mt-3 text-3xl font-black text-[#2e2430]">{interviewRate}%</p>
              <p className="mt-1 text-sm text-[#7a6670]">Candidatures converties en entretiens.</p>
            </div>
            <div className="rounded-md border border-[#ead7da] bg-white p-4">
              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-emerald-600" />
                <p className="font-bold text-[#2e2430]">Acceptation</p>
              </div>
              <p className="mt-3 text-3xl font-black text-[#2e2430]">{acceptanceRate}%</p>
              <p className="mt-1 text-sm text-[#7a6670]">{acceptedStatus} candidature(s) acceptee(s).</p>
            </div>
            <div className="rounded-md border border-[#ead7da] bg-white p-4">
              <div className="flex items-center gap-3">
                <FiClock className="text-amber-600" />
                <p className="font-bold text-[#2e2430]">A traiter</p>
              </div>
              <p className="mt-3 text-3xl font-black text-[#2e2430]">{formatNumber(pendingStatus)}</p>
              <p className="mt-1 text-sm text-[#7a6670]">Dossiers encore en attente de decision.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
