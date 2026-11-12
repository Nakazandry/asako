import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCpu,
  FiMessageSquare,
  FiPlus,
  FiSend,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const MAX_MESSAGE = 1000;
const HISTORY_LIMIT = 50;

const WELCOME = {
  admin: {
    subtitle: 'Assistant recrutement',
    greeting:
      'Bonjour, je suis votre assistant recrutement. Je peux vous aider à analyser des candidatures, préparer un entretien ou rédiger une offre.',
    suggestions: [
      'Comment structurer un entretien technique ?',
      'Quelles questions poser pour un poste de développeur ?',
      'Aide-moi à rédiger une offre attractive',
    ],
  },
  candidat: {
    subtitle: 'Assistant personnel',
    greeting:
      'Bonjour, je suis votre assistant ASAKO. Je peux vous aider à préparer votre candidature, améliorer votre CV ou vos entretiens.',
    suggestions: [
      'Comment mettre en valeur mon expérience ?',
      'Prépare-moi aux questions d’entretien',
      'Quelles compétences ajouter à mon profil ?',
    ],
  },
};

const normalizeMessages = (value) =>
  (Array.isArray(value) ? value : [])
    .filter((message) => message && typeof message.content === 'string' && message.content.trim())
    .map((message, index) => ({
      id: `${message.date || 'msg'}-${index}`,
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

const formatWhen = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export default function Chatbot({ open, onClose }) {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const welcome = admin ? WELCOME.admin : WELCOME.candidat;

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const initialized = useRef(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId]
  );

  const loadConversation = useCallback(async (id) => {
    setLoadingConversation(true);
    setError('');
    try {
      const { data } = await api.get(`/chatbot/conversations/${id}`);
      setActiveId(data.id);
      setMessages(normalizeMessages(data.messages));
      setConversations((current) =>
        current.map((item) => (item.id === data.id ? { ...item, ...data } : item))
      );
    } catch (err) {
      setError(
        err.response?.status === 404
          ? 'Cette conversation n’existe plus.'
          : 'Impossible de charger la conversation.'
      );
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const { data } = await api.get('/chatbot/conversations', {
        params: { limit: HISTORY_LIMIT },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      setConversations(rows);
      return rows;
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Votre session a expiré. Reconnectez-vous pour utiliser l’assistant.'
          : 'Impossible de charger votre historique.'
      );
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Chargement initial a la premiere ouverture : on reprend la conversation la plus recente.
  useEffect(() => {
    if (!open || initialized.current) return;
    initialized.current = true;
    loadConversations().then((rows) => {
      if (rows.length) loadConversation(rows[0].id);
    });
  }, [open, loadConversations, loadConversation]);

  // Focus dans le champ et fermeture au clavier.
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  // Defilement automatique vers le dernier message.
  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages, sending, historyOpen]);

  const startNewConversation = () => {
    setActiveId(null);
    setMessages([]);
    setError('');
    setDraft('');
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const send = async (event) => {
    event?.preventDefault();
    const question = draft.replace(/\s+/g, ' ').trim();
    if (!question || sending) return;

    const previous = messages;
    const now = new Date().toISOString();
    setDraft('');
    setError('');
    setSending(true);
    setHistoryOpen(false);
    setMessages([
      ...previous,
      { id: `local-${now}`, role: 'user', content: question },
    ]);

    try {
      let conversationId = activeId;
      if (!conversationId) {
        const { data } = await api.post('/chatbot/conversations', {});
        conversationId = data.id;
        setActiveId(data.id);
        setConversations((current) => [{ ...data }, ...current]);
      }

      const { data } = await api.post(`/chatbot/conversations/${conversationId}/messages`, {
        message: question,
      });

      const updated = data?.conversation;
      const stored = normalizeMessages(updated?.messages);
      setMessages(
        stored.length
          ? stored
          : [
              ...previous,
              { id: `user-${now}`, role: 'user', content: question },
              { id: `reply-${now}`, role: 'assistant', content: data?.reply?.content || '' },
            ].filter((message) => message.content)
      );

      if (updated) {
        setConversations((current) => {
          const others = current.filter((item) => item.id !== updated.id);
          return [updated, ...others].slice(0, HISTORY_LIMIT);
        });
      }
    } catch (err) {
      setMessages(previous);
      setDraft(question);
      setError(
        err.response?.data?.message ||
          (err.response?.status === 429
            ? 'Trop de requêtes. Patientez quelques instants avant de réessayer.'
            : 'L’assistant est momentanément indisponible. Réessayez dans un instant.')
      );
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/chatbot/conversations/${deleteTarget.id}`);
      setConversations((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (activeId === deleteTarget.id) startNewConversation();
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'La suppression a échoué.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const showWelcome = !messages.length && !loadingConversation;
  const canSend = draft.trim().length > 0 && !sending;

  return (
    <>
      <section
        className="chatbot-panel modal-card fixed inset-x-2 bottom-2 top-2 z-50 flex flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_60px_-20px_rgba(16,64,42,0.45)] sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[620px] sm:w-[400px]"
        role="dialog"
        aria-modal="false"
        aria-label="Assistant IA Asako"
      >
        {/* En-tete */}
        <header className="shrink-0 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <FiCpu className="text-lg" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight">Assistant IA Asako</p>
                <p className="truncate text-[11px] font-semibold text-emerald-50/90">
                  {activeConversation?.titre && !historyOpen
                    ? activeConversation.titre
                    : welcome.subtitle}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setHistoryOpen((value) => !value)}
                className={`grid h-9 w-9 place-items-center rounded-lg transition hover:bg-white/20 ${historyOpen ? 'bg-white/20' : ''}`}
                aria-label="Historique des conversations"
                title="Historique"
              >
                <FiMessageSquare />
              </button>
              <button
                type="button"
                onClick={startNewConversation}
                className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-white/20"
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
              >
                <FiPlus />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-lg transition hover:bg-white/20"
                aria-label="Fermer l’assistant"
                title="Fermer"
              >
                <FiX />
              </button>
            </div>
          </div>
        </header>

        {/* Historique */}
        {historyOpen ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-[#ead7da] px-4 py-2.5">
              <p className="text-xs font-black uppercase tracking-widest text-[#7a6670]">
                Mes conversations
              </p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {conversations.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loadingList ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="skeleton h-14 w-full" />
                  ))}
                </div>
              ) : conversations.length ? (
                <ul className="space-y-1">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <div
                        className={`group flex items-start gap-2 rounded-xl border px-3 py-2.5 transition ${
                          conversation.id === activeId
                            ? 'border-emerald-200 bg-emerald-50/80'
                            : 'border-transparent hover:border-[#ead7da] hover:bg-[#fff7f8]'
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setHistoryOpen(false);
                            loadConversation(conversation.id);
                          }}
                        >
                          <p className="truncate text-sm font-bold text-[#2e2430]">
                            {conversation.titre || 'Nouvelle conversation'}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#7a6670]">
                            {formatWhen(conversation.date_modification || conversation.date_creation)}
                            {' · '}
                            {Array.isArray(conversation.messages) ? conversation.messages.length : 0} message(s)
                          </p>
                        </button>
                        <button
                          type="button"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setDeleteTarget(conversation)}
                          aria-label={`Supprimer ${conversation.titre || 'la conversation'}`}
                          title="Supprimer"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid place-items-center px-6 py-12 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <FiMessageSquare />
                  </span>
                  <p className="mt-3 text-sm font-bold text-[#2e2430]">Aucune conversation</p>
                  <p className="mt-1 text-xs text-[#7a6670]">
                    Posez une question pour démarrer votre première discussion.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(5,120,70,0.7)] transition hover:brightness-105 active:scale-[0.98]"
                    onClick={startNewConversation}
                  >
                    <FiPlus /> Nouvelle conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7fbf8] px-3 py-4"
            >
              {loadingConversation ? (
                <div className="space-y-3">
                  <div className="skeleton h-16 w-3/4" />
                  <div className="skeleton ml-auto h-12 w-2/3" />
                  <div className="skeleton h-20 w-4/5" />
                </div>
              ) : (
                <>
                  {showWelcome && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
                          <FiCpu className="text-sm" />
                        </span>
                        <div className="chat-bubble-assistant max-w-[85%] rounded-2xl rounded-tl-sm border border-emerald-100 bg-white px-3.5 py-2.5 shadow-sm">
                          <p className="text-[13px] leading-6 text-[#2e2430]">
                            {welcome.greeting}
                          </p>
                        </div>
                      </div>
                      <div className="pl-10">
                        <p className="text-[11px] font-black uppercase tracking-wide text-[#7a6670]">
                          Suggestions
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {welcome.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setDraft(suggestion);
                                inputRef.current?.focus();
                              }}
                              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((message) =>
                    message.role === 'assistant' ? (
                      <div key={message.id} className="flex items-start gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
                          <FiCpu className="text-sm" />
                        </span>
                        <div className="chat-bubble-assistant max-w-[85%] rounded-2xl rounded-tl-sm border border-emerald-100 bg-white px-3.5 py-2.5 shadow-sm">
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-[#2e2430]">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-600 to-emerald-700 px-3.5 py-2.5 text-white shadow-sm">
                          <p className="whitespace-pre-wrap break-words text-[13px] leading-6">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {sending && (
                    <div className="flex items-start gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm">
                        <FiCpu className="text-sm" />
                      </span>
                      <div className="chat-bubble-assistant flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" />
                        <span className="ml-1 text-[11px] font-semibold text-[#7a6670]">
                          L’assistant rédige…
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Erreur */}
            {error && (
              <div className="shrink-0 border-t border-rose-100 bg-rose-50 px-3 py-2">
                <p className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-rose-700">
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="shrink-0 rounded p-1 text-rose-500 transition hover:bg-rose-100"
                    aria-label="Masquer l’erreur"
                  >
                    <FiX />
                  </button>
                </p>
              </div>
            )}

            {/* Saisie */}
            <form
              onSubmit={send}
              className="shrink-0 border-t border-[#ead7da] bg-white px-3 py-2.5"
            >
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, MAX_MESSAGE))}
                  maxLength={MAX_MESSAGE}
                  placeholder="Posez votre question…"
                  className="input h-11 flex-1 rounded-xl border-[#ead7da] px-3 text-[13px] focus:border-emerald-300 focus:ring-emerald-100"
                  aria-label="Message"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-[0_6px_16px_-6px_rgba(5,120,70,0.7)] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Envoyer le message"
                  title="Envoyer"
                >
                  <FiSend />
                </button>
              </div>
              <p className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-[#7a6670]">
                <span>Entrée pour envoyer</span>
                <span>
                  {draft.length}/{MAX_MESSAGE}
                </span>
              </p>
            </form>
          </>
        )}
      </section>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Supprimer cette conversation ?"
        message={`La conversation « ${deleteTarget?.titre || 'Nouvelle conversation'} » sera définitivement supprimée.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
      />
    </>
  );
}
