const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/gemini.service');

const ENV_KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_THINKING_LEVEL'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

const failingClient = (error) => {
  service._setClientForTests({
    models: {
      generateContent: async () => {
        throw error;
      },
    },
  });
};

// Capture la sortie de diagnostic sans laisser de bruit dans la console des tests.
const captureLogs = async (run) => {
  const original = console.error;
  const lines = [];
  console.error = (...args) => lines.push(args.map((arg) => String(arg)).join(' '));
  try {
    await run();
  } finally {
    console.error = original;
  }
  return lines;
};

const parseLog = (line) => JSON.parse(line.slice(line.indexOf('{')));

test.beforeEach(() => {
  service._resetForTests();
  restoreEnv();
  process.env.GEMINI_API_KEY = 'cle_de_test_diagnostic';
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_THINKING_LEVEL;
});

test.after(() => {
  service._resetForTests();
  restoreEnv();
});

test('chaque statut fournisseur est classe et journalise distinctement', async () => {
  const cases = [
    {
      label: '400 INVALID_ARGUMENT',
      error: Object.assign(new Error('INVALID_ARGUMENT: invalid payload'), { status: 400 }),
      expected: { code: 'INVALID', reason: 'INVALID_ARGUMENT', httpStatus: 400 },
    },
    {
      label: '401 cle refusee',
      error: Object.assign(new Error('API key not valid'), { status: 401 }),
      expected: { code: 'CONFIG', reason: 'AUTH', httpStatus: 401 },
    },
    {
      label: '403 permission refusee',
      error: Object.assign(new Error('PERMISSION_DENIED: caller lacks permission'), { status: 403 }),
      expected: { code: 'CONFIG', reason: 'FORBIDDEN', httpStatus: 403 },
    },
    {
      label: '404 modele introuvable',
      error: Object.assign(new Error('models/gemini-3.6-flash is not found'), { status: 404 }),
      expected: { code: 'UNAVAILABLE', reason: 'MODEL_NOT_FOUND', httpStatus: 404 },
    },
    {
      label: '429 quota',
      error: Object.assign(new Error('RESOURCE_EXHAUSTED: quota exceeded'), { status: 429 }),
      expected: { code: 'RATE_LIMIT', reason: 'RATE_LIMIT', httpStatus: 429 },
    },
    {
      label: 'reseau',
      error: Object.assign(new TypeError('fetch failed'), { code: 'ETIMEDOUT' }),
      expected: { code: 'UNAVAILABLE', reason: 'NETWORK', httpStatus: 0 },
    },
  ];

  for (const { label, error, expected } of cases) {
    failingClient(error);
    let captured = null;

    const logs = await captureLogs(async () => {
      await assert.rejects(
        () => service.generate({ prompt: 'Bonjour', context: { conversationId: 42 } }),
        (thrown) => {
          captured = thrown;
          assert.equal(thrown.code, expected.code, label);
          assert.equal(thrown.diagnostic.reason, expected.reason, label);
          assert.equal(thrown.diagnostic.httpStatus, expected.httpStatus, label);
          return true;
        }
      );
    });

    assert.equal(logs.length, 1, `${label}: un seul log de diagnostic`);
    const entry = parseLog(logs[0]);
    assert.equal(entry.event, 'gemini_provider_error', label);
    assert.equal(entry.reason, expected.reason, label);
    assert.equal(entry.httpStatus, expected.httpStatus || null, label);
    assert.equal(entry.conversationId, 42, label);
    assert.equal(entry.model, 'gemini-3.6-flash', label);
    // Le message technique du fournisseur reste cote serveur, jamais dans l'erreur applicative.
    assert.equal(captured.message.includes('INVALID_ARGUMENT'), false, label);
  }
});

test('un code reseau texte ne devient jamais un statut HTTP', async () => {
  failingClient(Object.assign(new TypeError('fetch failed'), { code: 'ENOTFOUND' }));

  const logs = await captureLogs(async () => {
    await assert.rejects(
      () => service.generate({ prompt: 'Bonjour' }),
      (error) => {
        assert.equal(error.code, 'UNAVAILABLE');
        assert.equal(error.diagnostic.reason, 'NETWORK');
        assert.equal(error.diagnostic.httpStatus, 0);
        return true;
      }
    );
  });

  const entry = parseLog(logs[0]);
  assert.equal(entry.httpStatus, null);
  assert.equal(entry.providerCode, 'ENOTFOUND');
  assert.equal(entry.retryable, true);
});

test('le log ne contient ni cle API, ni e-mail, ni telephone, ni message utilisateur', async () => {
  const apiKey = 'AIzaSyCléDeTest1234567890abcdef';
  process.env.GEMINI_API_KEY = apiKey;
  const question = 'Mon identifiant secret est 987654321';

  failingClient(
    Object.assign(
      new Error(
        `API key not valid: ${apiKey} - contact jean.dupont@example.com ou +33 6 12 34 56 78 - question recue: ${question}`
      ),
      { status: 401 }
    )
  );

  const logs = await captureLogs(async () => {
    await assert.rejects(
      () => service.generate({ prompt: question, context: { conversationId: 7 } }),
      (error) => error.code === 'CONFIG'
    );
  });

  assert.equal(logs.length, 1);
  const line = logs[0];
  for (const secret of [apiKey, 'AIzaSy', 'jean.dupont', '33 6 12 34 56 78', '987654321', 'secret est']) {
    assert.equal(line.includes(secret), false, `le log ne doit pas contenir « ${secret} »`);
  }
  assert.match(line, /\[cle-masquee\]/);
  assert.match(line, /\[email-masque\]/);
  assert.match(line, /\[numero-masque\]/);
  assert.match(line, /\[contenu-masque\]/);
});

test('un message fournisseur tres long est tronque dans le log', async () => {
  failingClient(Object.assign(new Error('boom '.repeat(500)), { status: 500 }));

  const logs = await captureLogs(async () => {
    await assert.rejects(() => service.generate({ prompt: 'Bonjour' }));
  });

  const entry = parseLog(logs[0]);
  assert.ok(entry.providerMessage.length <= 303, 'providerMessage tronque a 300 caracteres');
  assert.equal(entry.reason, 'PROVIDER_ERROR');
  assert.equal(entry.retryable, true);
});

test('sanitizeLogText masque aussi les jetons Bearer et les cles en parametre', () => {
  const cleaned = service.sanitizeLogText(
    'GET /v1beta/models?key=SECRET123&x=1 Authorization: Bearer abc.def-123'
  );

  assert.equal(cleaned.includes('SECRET123'), false);
  assert.equal(cleaned.includes('abc.def-123'), false);
  assert.match(cleaned, /key=\[cle-masquee\]/);
});
