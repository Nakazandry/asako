const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_MAX_OUTPUT_TOKENS = 1200;
const DEFAULT_MAX_PROMPT_CHARS = 12000;
const MAX_HISTORY_MESSAGES = 10;

class GroqError extends Error {
  constructor(code, message, diagnostic = null) {
    super(message);
    this.name = 'GroqError';
    this.code = code;
    this.diagnostic = diagnostic;
  }
}

let fetchOverride = null;

const resolveTimeout = () => {
  const configured = Number(process.env.AI_PROVIDER_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured <= 0) return 15000;
  return Math.min(Math.max(configured, 1000), 60000);
};

const normalizeHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((message) => message && typeof message.text === 'string' && message.text.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role === 'assistant' || message.role === 'model' ? 'assistant' : 'user',
      content: message.text.trim(),
    }));

const statusOf = (error) => {
  const value = Number(error?.status ?? error?.response?.status);
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : 0;
};

const classifyError = (error) => {
  const httpStatus = statusOf(error);
  const code = String(error?.code ?? error?.cause?.code ?? '');
  const timedOut =
    error?.name === 'TimeoutError' ||
    error?.name === 'AbortError' ||
    /timeout|timed out/i.test(String(error?.message ?? '')) ||
    ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(code);

  if (httpStatus === 429) {
    return { code: 'RATE_LIMIT', reason: 'RATE_LIMIT', httpStatus, retryable: true };
  }
  if (httpStatus === 408 || timedOut) {
    return { code: 'UNAVAILABLE', reason: 'TIMEOUT', httpStatus: httpStatus || 408, retryable: true };
  }
  if (httpStatus >= 500) {
    return { code: 'UNAVAILABLE', reason: 'PROVIDER_ERROR', httpStatus, retryable: true };
  }
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 404) {
    return {
      code: 'CONFIG',
      reason: httpStatus === 404 ? 'MODEL_NOT_FOUND' : 'AUTH',
      httpStatus,
      retryable: false,
    };
  }
  if (httpStatus >= 400) {
    return { code: 'INVALID', reason: 'INVALID_ARGUMENT', httpStatus, retryable: false };
  }
  if (code || error instanceof TypeError) {
    return { code: 'UNAVAILABLE', reason: 'NETWORK', httpStatus: 0, retryable: true };
  }
  return { code: 'UNAVAILABLE', reason: 'PROVIDER_ERROR', httpStatus: 0, retryable: false };
};

const logFailure = (diagnostic, context, model) => {
  console.error(
    '[groq] echec appel fournisseur',
    JSON.stringify({
      event: 'groq_provider_error',
      reason: diagnostic.reason,
      httpStatus: diagnostic.httpStatus || null,
      retryable: diagnostic.retryable,
      model,
      conversationId: context.conversationId ?? null,
    })
  );
};

const generate = async ({ systemInstruction, prompt, history = [], maxOutputTokens, context = {} } = {}) => {
  const question = String(prompt ?? '').trim();
  if (!question) throw new GroqError('INVALID', "La demande envoyee a l IA est vide");

  const maxPromptChars = Number(process.env.AI_MAX_PROMPT_CHARS) || DEFAULT_MAX_PROMPT_CHARS;
  if (question.length > maxPromptChars) {
    throw new GroqError('INVALID', "La demande est trop longue pour l'IA");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqError('CONFIG', "Le service Groq n'est pas configure");

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push(...normalizeHistory(history));
  messages.push({ role: 'user', content: question });

  const configuredTokens = Number(maxOutputTokens) || DEFAULT_MAX_OUTPUT_TOKENS;
  const maxTokens = Math.min(Math.max(configuredTokens, 50), 2048);
  const fetcher = fetchOverride || globalThis.fetch;

  try {
    const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(resolveTimeout()),
    });

    if (!response.ok) {
      throw Object.assign(new Error('Groq returned a non-success status'), { status: response.status });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (_error) {
      throw Object.assign(new Error('Groq returned an invalid response'), { status: 502 });
    }
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw Object.assign(new Error('Groq returned an empty response'), { status: 502 });
    }
    return { text: text.trim(), model };
  } catch (error) {
    if (error instanceof GroqError) throw error;
    const diagnostic = classifyError(error);
    logFailure(diagnostic, context, model);
    throw new GroqError(
      diagnostic.code,
      diagnostic.code === 'RATE_LIMIT'
        ? 'Limite de requetes IA atteinte'
        : "Le service d'IA est momentanement indisponible",
      diagnostic
    );
  }
};

const _setFetchForTests = (fetchImpl) => {
  fetchOverride = fetchImpl;
};

const _resetForTests = () => {
  fetchOverride = null;
};

module.exports = {
  generate,
  GroqError,
  DEFAULT_MODEL,
  classifyError,
  _setFetchForTests,
  _resetForTests,
};
