const ConversationIa = require('../models/conversation.model');

const DEFAULT_TITLE = 'Nouvelle conversation';
const TITRE_MAX = 120;
const MAX_STORED_MESSAGES = 40;
const HISTORY_FOR_MODEL = 10;

const normalizeTitre = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TITRE_MAX);

const titreDepuisQuestion = (question) => {
  const titre = normalizeTitre(question);
  if (!titre) return DEFAULT_TITLE;
  return titre.length > 80 ? `${titre.slice(0, 80).trim()}...` : titre;
};

const normalizeMessage = (message) => {
  if (!message || typeof message.content !== 'string') return null;
  const content = message.content.trim();
  if (!content) return null;
  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content,
    date: message.date || new Date().toISOString(),
  };
};

const list = ({ utilisateurId, limit, offset }) =>
  ConversationIa.listByUtilisateur(utilisateurId, { limit, offset });

const findOwned = (id, utilisateurId) => ConversationIa.findOwned(id, utilisateurId);

const create = (utilisateurId, { titre } = {}) =>
  ConversationIa.create({
    utilisateur_id: utilisateurId,
    titre: normalizeTitre(titre) || DEFAULT_TITLE,
    messages: [],
  });

const rename = (id, utilisateurId, titre) =>
  ConversationIa.update(id, utilisateurId, { titre: normalizeTitre(titre) });

const remove = (id, utilisateurId) => ConversationIa.delete(id, utilisateurId);

// Historique transmis au modele: uniquement les derniers echanges, en texte.
const historyForModel = (conversation) => {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  return messages
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-HISTORY_FOR_MODEL)
    .map((message) => ({ role: message.role, text: message.content }));
};

// Ajoute la question et la reponse, borne la taille stockee et nomme la
// conversation a partir de la premiere question.
const appendExchange = async (conversation, { question, answer }) => {
  const messages = (Array.isArray(conversation?.messages) ? conversation.messages : [])
    .map(normalizeMessage)
    .filter(Boolean);

  const now = new Date().toISOString();
  const next = [
    ...messages,
    { role: 'user', content: String(question ?? '').trim(), date: now },
    { role: 'assistant', content: String(answer ?? '').trim(), date: now },
  ]
    .filter((message) => message.content)
    .slice(-MAX_STORED_MESSAGES);

  const doitRenommer =
    messages.length === 0 &&
    (!conversation?.titre || conversation.titre === DEFAULT_TITLE);

  return ConversationIa.update(conversation.id, conversation.utilisateur_id, {
    messages: next,
    ...(doitRenommer ? { titre: titreDepuisQuestion(question) } : {}),
  });
};

module.exports = {
  DEFAULT_TITLE,
  TITRE_MAX,
  MAX_STORED_MESSAGES,
  list,
  findOwned,
  create,
  rename,
  remove,
  historyForModel,
  appendExchange,
  normalizeTitre,
};
