const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/groq.service');

const ENV_KEYS = ['GROQ_API_KEY', 'GROQ_MODEL', 'AI_MAX_PROMPT_CHARS', 'AI_PROVIDER_TIMEOUT_MS'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

test.beforeEach(() => {
  service._resetForTests();
  restoreEnv();
  process.env.GROQ_API_KEY = 'groq-test-secret';
  delete process.env.GROQ_MODEL;
  delete process.env.AI_MAX_PROMPT_CHARS;
  delete process.env.AI_PROVIDER_TIMEOUT_MS;
});

test.after(() => {
  service._resetForTests();
  restoreEnv();
});

test('Groq recoit les instructions systeme, le contexte historique borne et la question', async () => {
  let request;
  service._setFetchForTests(async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '  Reponse Groq  ' } }] }),
    };
  });

  const history = Array.from({ length: 14 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    text: `message ${index}`,
  }));
  const result = await service.generate({
    systemInstruction: 'Instructions privees',
    prompt: 'Question et donnees anonymisees',
    history,
    context: { conversationId: 42 },
  });

  assert.equal(result.text, 'Reponse Groq');
  assert.equal(result.model, 'openai/gpt-oss-120b');
  assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer groq-test-secret');
  const body = JSON.parse(request.options.body);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[0].content, 'Instructions privees');
  assert.equal(body.messages.length, 12);
  assert.equal(body.messages[1].content, 'message 4');
  assert.equal(body.messages[1].role, 'user');
  assert.equal(body.messages.at(-1).content, 'Question et donnees anonymisees');
  assert.ok(request.options.signal instanceof AbortSignal);
});

test('les erreurs temporaires Groq sont classifiees pour declencher le fallback', () => {
  assert.equal(service.classifyError({ status: 429 }).retryable, true);
  assert.equal(service.classifyError({ status: 503 }).retryable, true);
  assert.equal(
    service.classifyError(Object.assign(new Error('deadline exceeded'), { name: 'TimeoutError' })).reason,
    'TIMEOUT'
  );
  assert.equal(service.classifyError({ status: 404 }).retryable, false);
});

test('les erreurs HTTP 429 et 503 de Groq sont remontees avec leur diagnostic', async () => {
  for (const [status, reason] of [
    [429, 'RATE_LIMIT'],
    [503, 'PROVIDER_ERROR'],
  ]) {
    service._setFetchForTests(async () => ({ ok: false, status }));

    await assert.rejects(
      () => service.generate({ prompt: 'Question' }),
      (error) => {
        assert.equal(error.diagnostic.httpStatus, status);
        assert.equal(error.diagnostic.reason, reason);
        assert.equal(error.diagnostic.retryable, true);
        return true;
      }
    );
  }
});

test('un timeout de la requete Groq est remonte comme erreur temporaire', async () => {
  service._setFetchForTests(async () => {
    throw Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' });
  });

  await assert.rejects(
    () => service.generate({ prompt: 'Question' }),
    (error) =>
      error.diagnostic.reason === 'TIMEOUT' &&
      error.diagnostic.retryable &&
      error.diagnostic.httpStatus === 408
  );
});

test('une reponse fournisseur vide est rejetee', async () => {
  service._setFetchForTests(async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: '   ' } }] }),
  }));

  await assert.rejects(
    () => service.generate({ prompt: 'Question' }),
    (error) => error.code === 'UNAVAILABLE' && error.diagnostic.retryable
  );
});

test('une reponse HTTP invalide est consideree temporaire et rejetee', async () => {
  service._setFetchForTests(async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError('invalid JSON');
    },
  }));

  await assert.rejects(
    () => service.generate({ prompt: 'Question' }),
    (error) => error.diagnostic.httpStatus === 502 && error.diagnostic.retryable
  );
});
