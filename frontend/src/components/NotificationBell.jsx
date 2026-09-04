import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiChevronRight, FiInbox } from 'react-icons/fi';
import api from '../services/api';
import { useNotifications } from '../context/NotificationsContext.jsx';
import { metaFor } from '../utils/notifications.js';
import { relativeTime } from '../utils/format.js';

export default function NotificationBell() {
  const { unread, refresh } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const loadRecent = () => {
    setLoading(true);
    api.get('/notifications', { params: { limit: 8 } })
      .then((res) => {
        setItems(res.data.data || []);
        refresh();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) loadRecent();
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (item) => {
    if (!item.lu) {
      api.patch(`/notifications/${item.id}/read`).catch(() => {});
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, lu: true } : n)));
      refresh();
    }
    setOpen(false);
    navigate('/notifications');
  };

  const readAll = () => {
    api.patch('/notifications/read-all')
      .then(() => {
        setItems((current) => current.map((n) => ({ ...n, lu: true })));
        refresh();
      })
      .catch(() => {});
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-[#fff7f8] hover:text-[#8f4a56] active:scale-95"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
      >
        <FiBell className="text-xl" />
        {unread > 0 && (
          <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-md shadow-rose-900/40 ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="modal-card absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#ead7da]/80 bg-white text-left shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[#f1e2e5]/80 bg-gradient-to-r from-[#fff7f8] to-[#fdf1f3] px-4 py-3">
            <p className="text-sm font-black text-[#2e2430]">Notifications</p>
            {unread > 0 ? (
              <button className="inline-flex items-center gap-1 rounded-full bg-[#8f4a56] px-2.5 py-1 text-[11px] font-black text-white transition hover:brightness-110" onClick={readAll}>
                <FiCheck /> Tout marquer lu
              </button>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">Tout est lu</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && !items.length ? (
              <div className="space-y-3 p-4">
                <div className="skeleton h-14" />
                <div className="skeleton h-14" />
                <div className="skeleton h-14" />
              </div>
            ) : items.length ? (
              items.map((item) => {
                const meta = metaFor(item.type);
                const Icon = meta.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 border-b border-[#f1e2e5]/50 px-4 py-3 text-left transition-colors duration-150 last:border-b-0 ${
                      item.lu ? 'bg-white hover:bg-[#fff7f8]/70' : 'bg-[#fff7f8]/80 hover:bg-[#fff0f3]/90'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.className}`}>
                      <Icon className="text-base" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] font-black ${item.lu ? 'text-[#4b3a42]' : 'text-[#2e2430]'}`}>{item.titre}</span>
                        {!item.lu && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-[#7a6670]">{item.message}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-[#b08f99]">{relativeTime(item.date_creation)}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff7f8] text-xl text-[#d9a9b2]">
                  <FiInbox />
                </span>
                <p className="mt-3 text-sm font-bold text-[#2e2430]">Aucune notification</p>
                <p className="mt-1 text-xs leading-5 text-[#7a6670]">Les alertes de candidatures et d'entretiens apparaitront ici.</p>
              </div>
            )}
          </div>

          <button
            className="flex w-full items-center justify-center gap-1.5 border-t border-[#f1e2e5]/80 bg-[#fff7f8]/70 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#8f4a56] transition-colors hover:bg-[#fff0f3]"
            onClick={() => { setOpen(false); navigate('/notifications'); }}
          >
            Voir toutes les notifications <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
