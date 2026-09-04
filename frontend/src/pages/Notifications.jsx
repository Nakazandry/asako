import { useCallback, useEffect, useState } from 'react';
import { FiBell, FiCheck, FiInbox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useNotifications } from '../context/NotificationsContext.jsx';
import Loader from '../components/Loader.jsx';
import PageHero from '../components/PageHero.jsx';
import { metaFor } from '../utils/notifications.js';
import { formatDate, relativeTime } from '../utils/format.js';

export default function Notifications() {
  const { refresh } = useNotifications();
  const [rows, setRows] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 100 } });
      setRows(data.data || []);
      setUnread(data.unread || 0);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (item) => {
    if (item.lu) return;
    try {
      await api.patch(`/notifications/${item.id}/read`);
      setRows((current) => current.map((n) => (n.id === item.id ? { ...n, lu: true } : n)));
      setUnread((current) => Math.max(current - 1, 0));
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation impossible');
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setRows((current) => current.map((n) => ({ ...n, lu: true })));
      setUnread(0);
      refresh();
      toast.success('Toutes les notifications marquees comme lues');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation impossible');
    }
  };

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Centre de notifications"
        title="Notifications"
        description="Consultez les alertes de candidatures, de statuts et d'entretiens. Cliquez sur une notification pour la marquer comme lue."
        icon={FiBell}
        stats={[
          { label: 'Non lues', value: unread },
          { label: 'Total', value: total },
        ]}
        actions={
          <button className="btn-primary bg-white text-[#8f4a56] hover:bg-[#fff7f8]" disabled={!unread} onClick={markAllRead}>
            <FiCheck /> Tout marquer comme lu
          </button>
        }
      />

      {loading ? (
        <Loader />
      ) : rows.length ? (
        <div className="panel overflow-hidden">
          {rows.map((item) => {
            const meta = metaFor(item.type);
            const Icon = meta.icon;
            const unreadItem = !item.lu;
            return (
              <button
                key={item.id}
                onClick={() => markRead(item)}
                className={`group flex w-full items-start gap-4 border-b border-[#f1e2e5]/70 px-4 py-4 text-left transition-colors duration-150 last:border-b-0 sm:px-5 ${
                  unreadItem ? 'bg-[#fff7f8]/70 hover:bg-[#fff0f3]/80' : 'bg-white hover:bg-[#fff7f8]/50'
                }`}
              >
                <span className={`relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl shadow-inner ring-1 ring-white/60 ${meta.className}`}>
                  <Icon className="text-lg" />
                  {unreadItem && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className={`text-[15px] font-black ${unreadItem ? 'text-[#2e2430]' : 'text-[#4b3a42]'}`}>{item.titre}</span>
                    <span className={`text-xs font-bold ${unreadItem ? 'text-[#8f4a56]' : 'text-[#b08f99]'}`}>{relativeTime(item.date_creation)}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#7a6670]">{item.message}</span>
                  <span className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#b08f99]">
                    {formatDate(item.date_creation)}
                    {unreadItem && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-600 ring-1 ring-rose-200/70">
                        Nouveau
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="panel px-4 py-16 text-center">
          <div className="mx-auto max-w-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff7f8] text-2xl text-[#d9a9b2] ring-8 ring-[#fff7f8]/60">
              <FiInbox />
            </span>
            <p className="mt-4 font-bold text-[#2e2430]">Aucune notification</p>
            <p className="mt-1 text-sm text-[#7a6670]">Vous serez alerte ici lors de nouvelles candidatures, changements de statut ou entretiens.</p>
          </div>
        </div>
      )}
    </div>
  );
}
