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
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-[#f1f8f3] hover:text-[#147a54] active:scale-95"
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
        <div className="modal-card absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#dce9df]/80 bg-white text-left shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6eee8]/80 bg-gradient-to-r from-[#f1f8f3] to-[#f7faf7] px-4 py-3">
            <p className="text-sm font-black text-[#17362b]">Notifications</p>
            {unread > 0 ? (
              <button className="inline-flex items-center gap-1 rounded-full bg-[#147a54] px-2.5 py-1 text-[11px] font-black text-white transition hover:brightness-110" onClick={readAll}>
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
                    className={`flex w-full items-start gap-3 border-b border-[#e6eee8]/50 px-4 py-3 text-left transition-colors duration-150 last:border-b-0 ${
                      item.lu ? 'bg-white hover:bg-[#f1f8f3]/70' : 'bg-[#f1f8f3]/80 hover:bg-[#fff0f3]/90'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.className}`}>
                      <Icon className="text-base" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] font-black ${item.lu ? 'text-[#40574a]' : 'text-[#17362b]'}`}>{item.titre}</span>
                        {!item.lu && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-[#60756b]">{item.message}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-[#7c9585]">{relativeTime(item.date_creation)}</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f8f3] text-xl text-[#82b594]">
                  <FiInbox />
                </span>
                <p className="mt-3 text-sm font-bold text-[#17362b]">Aucune notification</p>
                <p className="mt-1 text-xs leading-5 text-[#60756b]">Les alertes de candidatures et d'entretiens apparaitront ici.</p>
              </div>
            )}
          </div>

          <button
            className="flex w-full items-center justify-center gap-1.5 border-t border-[#e6eee8]/80 bg-[#f1f8f3]/70 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#147a54] transition-colors hover:bg-[#fff0f3]"
            onClick={() => { setOpen(false); navigate('/notifications'); }}
          >
            Voir toutes les notifications <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
