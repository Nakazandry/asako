const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/gemini.service');

const ENV_KEYS = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_MAX_OUTPUT_TOKENS',
  'AI_MAX_PROMPT_CHARS',
];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

const fakeClient = (handler = async () => ({ text: 'Bonjour' })) => {
  const calls = [];
  return {
    calls,
    client: {
      models: {
        generateContent: async (params) => {
          calls.push(params);
          return handler(params, calls.length);
        },
      },
    },
  };
};

test.beforeEach(() => {
  service._resetForTests();
  restoreEnv();
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_MAX_OUTPUT_TOKENS;
  delete process.env.AI_MAX_PROMPT_CHARS;
});

test.after(() => {
  service._resetForTests();
  restoreEnv();
});

test('sans cle API, le service echoue proprement en CONFIG', async () => {
  delete process.env.GEMINI_API_KEY;

  await assert.rejects(
    () => service.generate({ prompt: 'Bonjour' }),
    (error) => {
      assert.equal(error.name, 'GeminiError');
      assert.equal(error.code, 'CONFIG');
      assert.doesNotMatch(error.message, /AIza|cle/i);
      return true;
    }
  );
});

test('une reponse valide est renvoyee avec le modele par defaut et des bornes de tokens', async () => {
  process.env.GEMINI_API_KEY = 'cle_de_test';
  const fake = fakeClient(() => ({ text: '  Voici ma reponse  ' }));
  service._setClientForTests(fake.client);

  const result = await service.generate({
    systemInstruction: 'Tu es un assistant',
    prompt: 'Ma question',
    history: [{ role: 'user', text: 'Plus tot' }],
  });

  assert.equal(result.text, 'Voici ma reponse');
  assert.equal(result.model, 'gemini-2.5-flash');

  const params = fake.calls[0];
  assert.equal(params.model, 'gemini-2.5-flash');
  assert.equal(params.config.systemInstruction, 'Tu es un assistant');
  assert.ok(params.config.maxOutputTokens <= 2048);
  assert.equal(params.contents.at(-1).role, 'user');
  assert.equal(params.contents.at(-1).parts[0].text, 'Ma question');
  assert.deepEqual(params.contents[0], { role: 'user', parts: [{ text: 'Plus tot' }] });
});

test('un modele surcharge et un historique long sont bornes', async () => {
  process.env.GEMINI_API_KEY = 'cle_de_test';
  process.env.GEMINI_MODEL = 'gemini-test-model';
  process.env.GEMINI_MAX_OUTPUT_TOKENS = '400';
  const fake = fakeClient();
  service._setClientForTests(fake.client);

  const history = Array.from({ length: 25 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    text: `message ${index}`,
  }));

  await service.generate({ prompt: 'Question', history, maxOutputTokens: 9999 });

  const params = fake.calls[0];
  assert.equal(params.model, 'gemini-test-model');
  assert.equal(params.config.maxOutputTokens, 2048);
  // 10 messages d'historique + la question courante.
  assert.equal(params.contents.length, 11);
  assert.equal(params.contents[0].parts[0].text, 'message 15');
  assert.equal(params.contents[0].role, 'model');
  assert.equal(params.contents[1].role, 'user');
});

test('une reponse sans texte exploitable est traitee comme indisponible', async () => {
  process.env.GEMINI_API_KEY = 'cle_de_test';
  service._setClientForTests(fakeClient(() => ({ candidates: [{ content: { parts: [] } }] })).client);

  await assert.rejects(
    () => service.generate({ prompt: 'Bonjour' }),
    (error) => error.code === 'UNAVAILABLE'
  );
});

test('un prompt trop long est refuse sans appel reseau', async () => {
  process.env.GEMINI_API_KEY = 'cle_de_test';
  process.env.AI_MAX_PROMPT_CHARS = '50';
  const fake = fakeClient();
  service._setClientForTests(fake.client);

  await assert.rejects(
    () => service.generate({ prompt: 'a'.repeat(120) }),
    (error) => error.code === 'INVALID'
  );
  assert.equal(fake.calls.length, 0);
});

test('les erreurs du fournisseur sont mappees sans message technique brut', async () => {
  process.env.GEMINI_API_KEY = 'cle_de_test';

  const cases = [
    [{ status: 429, message: 'RESOURCE_EXHAUSTED' }, 'RATE_LIMIT'],
    [{ status: 403, message: 'API key not valid' }, 'CONFIG'],
    [{ status: 400, message: 'INVALID_ARGUMENT' }, 'INVALID'],
    [{ status: 500, message: 'internal boom' }, 'UNAVAILABLE'],
  ];

  for (const [providerError, expected] of cases) {
    service._setClientForTests(
      fakeClient(() => {
        throw Object.assign(new Error(providerError.message), { status: providerError.status });
      }).client
    );

    await assert.rejects(
      () => service.generate({ prompt: 'Bonjour' }),
      (error) => {
        assert.equal(error.code, expected);
        assert.doesNotMatch(error.message, /internal boom|RESOURCE_EXHAUSTED|API key not valid/);
        return true;
      }
    );
  }
});

test('isConfigured reflete la presence de la cle', () => {
  delete process.env.GEMINI_API_KEY;
  service._resetForTests();
  assert.equal(service.isConfigured(), false);

  process.env.GEMINI_API_KEY = 'cle_de_test';
  assert.equal(service.isConfigured(), true);
});
