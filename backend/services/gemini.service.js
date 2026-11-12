const { GoogleGenAI } = require('@google/genai');

// Modele Gemini avec offre gratuite. Surchargeable par variable d'environnement
// pour ne pas figer le nom du modele dans le code.
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_OUTPUT_TOKENS = 700;
const HARD_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_MAX_PROMPT_CHARS = 12000;
const MAX_HISTORY_MESSAGES = 10;

class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

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

const statusOf = (error) =>
  Number(error?.status ?? error?.code ?? error?.response?.status) || 0;

// Aucun message brut du fournisseur n'est remonte au client: il peut contenir des
// details internes. On ne conserve que nos messages applicatifs.
const mapError = (error) => {
  const status = statusOf(error);
  const message = String(error?.message || '');

  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)) {
    return new GeminiError('RATE_LIMIT', "Limite de requetes IA atteinte, reessayez dans quelques instants");
  }

  if (status === 401 || status === 403 || /API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return new GeminiError('CONFIG', "Le service d'IA n'est pas configure correctement");
  }

  if (status === 400 || /INVALID_ARGUMENT/i.test(message)) {
    return new GeminiError('INVALID', "La demande n'a pas pu etre traitee par l'IA");
  }

  return new GeminiError('UNAVAILABLE', "Le service d'IA est momentanement indisponible");
};

const resolveMaxOutputTokens = (value) => {
  const configured = Number(value) || Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || DEFAULT_MAX_OUTPUT_TOKENS;
  return Math.min(Math.max(configured, 50), HARD_MAX_OUTPUT_TOKENS);
};

const generate = async ({ systemInstruction, prompt, history = [], maxOutputTokens } = {}) => {
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

  try {
    const response = await getClient().models.generateContent({ model, contents, config });
    const text = extractText(response);
    if (!text) {
      throw new GeminiError('UNAVAILABLE', "L'IA n'a pas renvoye de reponse exploitable");
    }
    return { text, model };
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw mapError(error);
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
  _setClientForTests,
  _resetForTests,
};
