const { GoogleGenAI } = require('@google/genai');

// Modele Gemini avec offre gratuite. Surchargeable par variable d'environnement
// pour ne pas figer le nom du modele dans le code.
// Gemini 2.5 Flash est une generation precedente en cours de retrait : on cible la
// famille Gemini 3 Flash. Parmi les modeles Gemini 3 joignables avec la cle du
// projet, gemini-3.6-flash est le Flash stable qui repond de facon fiable
// (3-flash-preview et 3.8-flash ont renvoye 503 en test, et un modele "preview"
// peut etre retire sans preavis).
const DEFAULT_MODEL = 'gemini-3.6-flash';
const DEFAULT_MAX_OUTPUT_TOKENS = 1200;
// Gemini 3 raisonne par defaut et facture ce raisonnement dans maxOutputTokens.
// Un niveau 'low' garde des reponses rapides pour un assistant conversationnel.
const DEFAULT_THINKING_LEVEL = 'low';
const THINKING_LEVELS = new Set(['low', 'high']);
const HARD_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_MAX_PROMPT_CHARS = 12000;
const MAX_HISTORY_MESSAGES = 10;

class GeminiError extends Error {
  constructor(code, message, diagnostic = null) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    // Diagnostic interne (jamais expose au client) : sert uniquement aux logs.
    this.diagnostic = diagnostic;
  }
}

const LOG_MESSAGE_MAX = 300;
const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_BODY_TIMEOUT',
]);

let client = null;
let clientApiKey = '';
let clientInjecte = false;

const getClient = () => {
  if (clientInjecte) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('CONFIG', "Le service d'IA n'est pas configure");
  }
  if (!client || clientApiKey !== apiKey) {
    // La cle reste uniquement cote backend: elle n'est jamais journalisee ni renvoyee.
    client = new GoogleGenAI({ apiKey });
    clientApiKey = apiKey;
  }
  return client;
};

const extractText = (response) => {
  if (!response) return '';
  try {
    if (typeof response.text === 'string') return response.text.trim();
  } catch (_error) {
    // Reponse bloquee par la securite Gemini: on bascule sur les candidates.
  }
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    // Gemini 3 renvoie ses jetons de raisonnement dans des parts marquees
    // `thought`: elles ne doivent jamais etre affichees comme la reponse.
    .filter((part) => part?.thought !== true)
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
};

const toContents = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((message) => message && typeof message.text === 'string' && message.text.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === 'model' || message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.text.trim() }],
    }));
};

// Statut HTTP du fournisseur. On n'accepte que des entiers 100-599 : un code
// reseau texte ('ETIMEDOUT') ne doit jamais etre interprete comme un statut.
const providerStatusOf = (error) => {
  const candidates = [error?.status, error?.response?.status, error?.error?.code, error?.code];
  for (const value of candidates) {
    const status = Number(value);
    if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  }
  return 0;
};

// Code fournisseur textuel (RESOURCE_EXHAUSTED, PERMISSION_DENIED, ETIMEDOUT...).
const providerCodeOf = (error) => {
  const candidates = [error?.code, error?.cause?.code, error?.errno, error?.error?.status];
  for (const value of candidates) {
    if (typeof value === 'string' && /^[A-Z][A-Z0-9_]+$/.test(value)) return value;
  }
  return '';
};

const isNetworkError = (error) => {
  const codes = [error?.code, error?.cause?.code, error?.errno];
  if (codes.some((code) => typeof code === 'string' && NETWORK_ERROR_CODES.has(code))) return true;
  const text = `${error?.message ?? ''} ${error?.cause?.message ?? ''}`;
  return /fetch failed|network error|socket hang up|other side closed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|connect timeout|DEADLINE_EXCEEDED/i.test(
    text
  );
};

// Masque toute donnee sensible avant journalisation : cle API, jetons, e-mails,
// numeros de telephone et contenu applicatif fourni par l'appelant.
const sanitizeLogText = (value, { redact = [] } = {}) => {
  let text = String(value ?? '');
  if (!text) return '';

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.length >= 8) text = text.split(apiKey).join('[cle-masquee]');
  for (const secret of redact) {
    const motif = String(secret ?? '').trim();
    if (motif.length >= 8) text = text.split(motif).join('[contenu-masque]');
  }

  text = text
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[cle-masquee]')
    .replace(/([?&](?:key|api_key|apikey|access_token)=)[^&\s"']+/gi, '$1[cle-masquee]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [jeton-masque]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email-masque]')
    .replace(/\+?\d[\d ().-]{7,}\d/g, '[numero-masque]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text.length > LOG_MESSAGE_MAX ? `${text.slice(0, LOG_MESSAGE_MAX)}...` : text;
};

// Traduit une erreur fournisseur en categorie exploitable. Les statuts renvoyes
// au client ne changent pas : seul le diagnostic interne gagne en precision.
const classifyError = (error) => {
  const httpStatus = providerStatusOf(error);
  const providerCode = providerCodeOf(error);
  const text = `${providerCode} ${String(error?.message ?? '')}`;

  if (httpStatus === 429 || /RESOURCE_EXHAUSTED|rate limit|quota/i.test(text)) {
    return { code: 'RATE_LIMIT', reason: 'RATE_LIMIT', httpStatus: httpStatus || 429, providerCode, retryable: true };
  }

  if (httpStatus === 401 || /API key|API_KEY_INVALID|UNAUTHENTICATED/i.test(text)) {
    return { code: 'CONFIG', reason: 'AUTH', httpStatus: httpStatus || 401, providerCode, retryable: false };
  }

  if (httpStatus === 403 || /PERMISSION_DENIED|permission denied/i.test(text)) {
    return { code: 'CONFIG', reason: 'FORBIDDEN', httpStatus: 403, providerCode, retryable: false };
  }

  if (httpStatus === 404 || /NOT_FOUND|not found|not supported/i.test(text)) {
    return { code: 'UNAVAILABLE', reason: 'MODEL_NOT_FOUND', httpStatus: 404, providerCode, retryable: false };
  }

  if (httpStatus === 400 || /INVALID_ARGUMENT/i.test(text)) {
    return { code: 'INVALID', reason: 'INVALID_ARGUMENT', httpStatus: 400, providerCode, retryable: false };
  }

  if (isNetworkError(error)) {
    return {
      code: 'UNAVAILABLE',
      reason: 'NETWORK',
      httpStatus,
      providerCode: providerCode || '(reseau)',
      retryable: true,
    };
  }

  return { code: 'UNAVAILABLE', reason: 'PROVIDER_ERROR', httpStatus, providerCode, retryable: httpStatus >= 500 };
};

// Une seule ligne JSON, sans secret ni contenu utilisateur, pour les logs Render.
const logProviderFailure = ({ diagnostic, error, contexte }) => {
  const entry = {
    event: 'gemini_provider_error',
    reason: diagnostic.reason,
    httpStatus: diagnostic.httpStatus || null,
    providerCode: diagnostic.providerCode || null,
    retryable: diagnostic.retryable,
    model: contexte.model,
    conversationId: contexte.conversationId ?? null,
    providerMessage: sanitizeLogText(error?.message, { redact: contexte.redact }),
  };
  console.error('[gemini] echec appel fournisseur', JSON.stringify(entry));
};

// Aucun message brut du fournisseur n'est remonte au client: il peut contenir des
// details internes. On ne conserve que nos messages applicatifs.
const mapError = (error, contexte = {}) => {
  const diagnostic = classifyError(error);
  logProviderFailure({
    diagnostic,
    error,
    contexte: { model: contexte.model || DEFAULT_MODEL, conversationId: contexte.conversationId, redact: contexte.redact },
  });
  return new GeminiError(diagnostic.code, ERROR_MESSAGES[diagnostic.code], diagnostic);
};

const resolveMaxOutputTokens = (value) => {
  const configured = Number(value) || Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(Math.max(configured, 50), HARD_MAX_OUTPUT_TOKENS);
};

const ERROR_MESSAGES = {
  RATE_LIMIT: "Limite de requetes IA atteinte, reessayez dans quelques instants",
  CONFIG: "Le service d'IA n'est pas configure correctement",
  INVALID: "La demande n'a pas pu etre traitee par l'IA",
  UNAVAILABLE: "Le service d'IA est momentanement indisponible",
};

const generate = async ({ systemInstruction, prompt, history = [], maxOutputTokens, context = {} } = {}) => {
  const question = String(prompt ?? '').trim();
  if (!question) {
    throw new GeminiError('INVALID', 'La demande envoyee a l IA est vide');
  }

  const maxPromptChars = Number(process.env.AI_MAX_PROMPT_CHARS) || DEFAULT_MAX_PROMPT_CHARS;
  if (question.length > maxPromptChars) {
    throw new GeminiError('INVALID', "La demande est trop longue pour l'IA");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const contents = toContents(history);
  contents.push({ role: 'user', parts: [{ text: question }] });

  const config = {
    maxOutputTokens: resolveMaxOutputTokens(maxOutputTokens),
    temperature: 0.4,
  };
  if (systemInstruction) config.systemInstruction = systemInstruction;
  // `thinkingLevel` n'existe que sur la famille Gemini 3 : l'envoyer a un modele
  // 2.5 surcharge via GEMINI_MODEL provoquerait une erreur 400.
  if (model.startsWith('gemini-3')) {
    const requested = String(process.env.GEMINI_THINKING_LEVEL || '').toLowerCase();
    config.thinkingConfig = {
      thinkingLevel: THINKING_LEVELS.has(requested) ? requested : DEFAULT_THINKING_LEVEL,
    };
  }

  try {
    const response = await getClient().models.generateContent({ model, contents, config });
    const text = extractText(response);
    if (!text) {
      throw new GeminiError('UNAVAILABLE', "L'IA n'a pas renvoye de reponse exploitable");
    }
    return { text, model };
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    // La question de l'utilisateur est masquee si le fournisseur la recite dans son erreur.
    throw mapError(error, { model, conversationId: context.conversationId, redact: [question] });
  }
};

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY) || clientInjecte;

// Points d'entree reserves aux tests: aucun appel reseau n'est effectue.
const _setClientForTests = (fakeClient) => {
  client = fakeClient;
  clientInjecte = true;
};

const _resetForTests = () => {
  client = null;
  clientApiKey = '';
  clientInjecte = false;
};

module.exports = {
  generate,
  isConfigured,
  GeminiError,
  DEFAULT_MODEL,
  classifyError,
  sanitizeLogText,
  _setClientForTests,
  _resetForTests,
};
