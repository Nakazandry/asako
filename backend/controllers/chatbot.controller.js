const ConversationService = require('../services/conversation.service');
const Chatbot = require('../services/chatbot.service');
const { getPagination, paginated } = require('../utils/pagination');

const MAX_QUESTION = 1000;
const AI_ERROR_STATUS = {
  INVALID: 400,
  RATE_LIMIT: 429,
  UNAVAILABLE: 502,
  CONFIG: 503,
};

// Messages applicatifs fixes: aucun detail du fournisseur n'est renvoye au client.
const AI_ERROR_MESSAGES = {
  INVALID: "La demande envoyee a l'assistant IA est invalide",
  RATE_LIMIT: 'Limite de requetes IA atteinte, reessayez dans quelques instants',
  UNAVAILABLE: "Le service d'IA est momentanement indisponible",
  CONFIG: "Le service d'IA n'est pas configure",
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeQuestion = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const listConversations = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    // Le perimetre vient de req.user (JWT verifie), jamais d'un identifiant envoye par le client.
    const result = await ConversationService.list({
      utilisateurId: req.user.id,
      limit,
      offset,
    });
    res.json(paginated(result.rows, result.total, page, limit));
  } catch (error) {
    next(error);
  }
};

const createConversation = async (req, res, next) => {
  try {
    const titre = req.body?.titre;
    if (titre !== undefined && (typeof titre !== 'string' || !titre.trim())) {
      return res.status(400).json({ message: 'Le titre de la conversation est invalide' });
    }
    if (typeof titre === 'string' && titre.trim().length > ConversationService.TITRE_MAX) {
      return res.status(400).json({
        message: `Le titre ne doit pas depasser ${ConversationService.TITRE_MAX} caracteres`,
      });
    }

    const conversation = await ConversationService.create(req.user.id, { titre });
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de conversation invalide' });

    const conversation = await ConversationService.findOwned(id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation introuvable' });

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

const renameConversation = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de conversation invalide' });

    const titre = req.body?.titre;
    if (typeof titre !== 'string' || !titre.trim()) {
      return res.status(400).json({ message: 'Le titre de la conversation est obligatoire' });
    }
    if (titre.trim().length > ConversationService.TITRE_MAX) {
      return res.status(400).json({
        message: `Le titre ne doit pas depasser ${ConversationService.TITRE_MAX} caracteres`,
      });
    }

    const conversation = await ConversationService.rename(id, req.user.id, titre);
    if (!conversation) return res.status(404).json({ message: 'Conversation introuvable' });

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de conversation invalide' });

    const deleted = await ConversationService.remove(id, req.user.id);
    if (!deleted) return res.status(404).json({ message: 'Conversation introuvable' });

    res.json({ message: 'Conversation supprimee' });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Identifiant de conversation invalide' });

    const question = normalizeQuestion(req.body?.message);
    if (!question) return res.status(400).json({ message: 'Le message est obligatoire' });
    if (question.length > MAX_QUESTION) {
      return res.status(400).json({
        message: `Le message ne doit pas depasser ${MAX_QUESTION} caracteres`,
      });
    }

    const conversation = await ConversationService.findOwned(id, req.user.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation introuvable' });

    const result = await Chatbot.ask({
      user: req.user,
      question,
      history: ConversationService.historyForModel(conversation),
      conversationId: id,
    });

    const updated = await ConversationService.appendExchange(conversation, {
      question,
      answer: result.answer,
    });

    res.json({
      conversation: updated,
      reply: { role: 'assistant', content: result.answer },
    });
  } catch (error) {
    const status = AI_ERROR_STATUS[error?.code];
    if (status) {
      return res.status(status).json({
        message: AI_ERROR_MESSAGES[error.code] || "Le service d'IA est momentanement indisponible",
      });
    }
    next(error);
  }
};

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  sendMessage,
};
