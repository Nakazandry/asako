import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiMapPin, FiMessageSquare, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Loader from '../components/Loader.jsx';
import PageHero from '../components/PageHero.jsx';
import { formatDate, statusClass, statusLabel } from '../utils/format.js';

const EN_ATTENTE = 'En attente';

// Page de l'application (authentifiee) permettant de repondre a une invitation.
// L'e-mail d'invitation ne contient aucun lien de reponse : il renvoie seulement
// vers l'espace candidat. Aucune decision n'est enregistree par un GET.
export default function InvitationEntretien() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entretien, setEntretien] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [refusOpen, setRefusOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/entretiens/${id}`)
      .then(({ data }) => setEntretien(data))
      .catch((err) => setError(err.response?.data?.message || 'Invitation introuvable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const reponse = entretien?.reponse_candidat || EN_ATTENTE;
  const enAttente = reponse === EN_ATTENTE;

  const repondre = async (decision) => {
    setResponding(true);
    try {
      const { data } = await api.patch(`/entretiens/${id}/reponse`, { reponse: decision });
      setEntretien(data);
      setRefusOpen(false);
      toast.success(decision === 'accepter' ? 'Entretien accepte' : 'Entretien refuse');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reponse impossible');
      if (err.response?.status === 409 || err.response?.status === 404) load();
    } finally {
      setResponding(false);
    }
  };

  const details = useMemo(() => {
    if (!entretien) return [];
    return [
      { label: 'Date', value: formatDate(entretien.date_entretien), icon: FiCalendar },
      { label: 'Heure', value: entretien.heure_entretien ? entretien.heure_entretien.slice(0, 5) : 'A confirmer', icon: FiClock },
      { label: 'Type', value: entretien.type_entretien || '-', icon: FiCalendar },
      { label: 'Lieu / lien', value: entretien.lieu || 'A confirmer', icon: FiMapPin },
    ];
  }, [entretien]);

  if (loading) return <Loader />;

  if (error || !entretien) {
    return (
      <div className="panel mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff7f8] text-2xl text-[#d9a9b2]"><FiXCircle /></span>
        <h1 className="mt-4 text-lg font-bold text-[#2e2430]">Invitation indisponible</h1>
        <p className="mt-2 text-sm text-[#7a6670]">{error || 'Invitation introuvable'}</p>
        <Link className="btn-primary mt-6" to="/mon-espace"><FiArrowLeft /> Retour a mon espace</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Invitation a un entretien"
        title={entretien.offre_titre || 'Votre entretien'}
        description="Verifiez les informations du rendez-vous puis confirmez votre decision."
        icon={FiCalendar}
        stats={[
          { label: 'Date', value: formatDate(entretien.date_entretien) },
          { label: 'Reponse', value: statusLabel(reponse) },
        ]}
      />
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#2e2430]">Informations du rendez-vous</h2>
            <p className="text-sm text-[#7a6670]">Candidature : {entretien.offre_titre || '-'}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(reponse)}`}>{statusLabel(reponse)}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-[#ead7da] bg-[#fff7f8]/50 p-3">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#7a6670]"><Icon /> {label}</p>
              <p className="mt-1 break-words text-sm font-semibold text-[#2e2430]">{value}</p>
            </div>
          ))}
        </div>
        {entretien.commentaire && (
          <div className="mt-4 rounded-lg border border-[#ead7da] bg-white p-3">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#7a6670]"><FiMessageSquare /> Commentaire</p>
            <p className="mt-1 text-sm text-[#4b3a42]">{entretien.commentaire}</p>
          </div>
        )}
        {enAttente ? (
          <div className="mt-6 flex flex-col gap-3 border-t border-[#ead7da] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#7a6670]">
              Votre reponse sera enregistree uniquement apres votre confirmation.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={responding} onClick={() => repondre('accepter')}>
                <FiCheckCircle /> Accepter l&apos;entretien
              </button>
              <button className="btn-secondary text-rose-600" disabled={responding} onClick={() => setRefusOpen(true)}>
                <FiXCircle /> Refuser l&apos;entretien
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3 border-t border-[#ead7da] pt-5">
            <p className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${statusClass(reponse)}`}>
              {reponse === 'Accepté' ? <FiCheckCircle /> : <FiXCircle />}
              {reponse === 'Accepté' ? 'Vous avez accepte cette invitation' : 'Vous avez refuse cette invitation'}
            </p>
            {entretien.date_reponse && (
              <p className="text-xs font-semibold text-[#7a6670]">Reponse enregistree le {formatDate(entretien.date_reponse)}</p>
            )}
            <div>
              <button className="btn-secondary" onClick={() => navigate('/mon-espace')}>
                <FiArrowLeft /> Retour a mon espace
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        open={refusOpen}
        title="Refuser cette invitation ?"
        message="Le recruteur sera informe de votre refus. Cette decision ne pourra plus etre modifiee."
        onCancel={() => setRefusOpen(false)}
        onConfirm={() => repondre('refuser')}
        loading={responding}
        cancelLabel="Retour"
        confirmLabel="Oui, refuser"
      />
    </div>
  );
}