const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const providerPath = require.resolve(path.join(root, 'services', 'ai-provider.service.js'));
const groqPath = require.resolve(path.join(root, 'services', 'groq.service.js'));
const geminiPath = require.resolve(path.join(root, 'services', 'gemini.service.js'));

const inject = (resolved, exports) => {
  const previous = require.cache[resolved];
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
  return () => {
    if (previous) require.cache[resolved] = previous;
    else delete require.cache[resolved];
  };
};

const createHarness = ({ groqResult, groqError, geminiResult, geminiError } = {}) => {
  const state = { groqCalls: [], geminiCalls: [] };
  const restore = [
    inject(groqPath, {
      generate: async (input) => {
        state.groqCalls.push(input);
        if (groqError) throw groqError;
        return groqResult || { text: 'Reponse Groq', model: 'groq-test' };
      },
    }),
    inject(geminiPath, {
      generate: async (input) => {
        state.geminiCalls.push(input);
        if (geminiError) throw geminiError;
        return geminiResult || { text: 'Reponse Gemini', model: 'gemini-test' };
      },
    }),
  ];

  delete require.cache[providerPath];
  const service = require(providerPath);
  return {
    state,
    service,
    restore: () => {
      restore.forEach((undo) => undo());
      delete require.cache[providerPath];
    },
  };
};

const temporaryGroqError = (reason, httpStatus = 0) => {
  const error = new Error('detailed provider error');
  error.diagnostic = { retryable: true, reason, httpStatus };
  return error;
};

const captureLogs = async (run) => {
  const original = { info: console.info, warn: console.warn };
  const lines = [];
  console.info = (...args) => lines.push(args.join(' '));
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    await run();
  } finally {
    console.info = original.info;
    console.warn = original.warn;
  }
  return lines;
};

test('Groq repond en premier et Gemini n est pas appele si Groq reussit', async () => {
  const harness = createHarness();
  const input = {
    prompt: 'Question',
    history: [{ role: 'assistant', text: 'Contexte precedent' }],
    context: { conversationId: 12 },
  };

  try {
    const logs = await captureLogs(async () => {
      const result = await harness.service.generate(input);
      assert.equal(result.text, 'Reponse Groq');
    });

    assert.deepEqual(harness.state.groqCalls, [input]);
    assert.equal(harness.state.geminiCalls.length, 0);
    assert.match(logs.join('\n'), /provider":"groq"/);
  } finally {
    harness.restore();
  }
});

test('429, 503 et timeout Groq declenchent chacun un seul fallback Gemini', async () => {
  const cases = [
    { reason: 'RATE_LIMIT', status: 429 },
    { reason: 'PROVIDER_ERROR', status: 503 },
    { reason: 'TIMEOUT', status: 408 },
  ];

  for (const { reason, status } of cases) {
    const harness = createHarness({ groqError: temporaryGroqError(reason, status) });
    const input = {
      prompt: 'Question enrichie par le contexte',
      history: [{ role: 'user', text: 'Question precedente' }],
      context: { conversationId: 22 },
    };

    try {
      const logs = await captureLogs(async () => {
        const result = await harness.service.generate(input);
        assert.equal(result.text, 'Reponse Gemini');
      });

      assert.equal(harness.state.groqCalls.length, 1, reason);
      assert.deepEqual(harness.state.geminiCalls, [input], reason);
      assert.match(logs.join('\n'), /ai_provider_fallback/, reason);
      assert.match(logs.join('\n'), /provider":"gemini"/, reason);
    } finally {
      harness.restore();
    }
  }
});

test('si Groq et Gemini echouent, une erreur indisponible sans details techniques remonte', async () => {
  const harness = createHarness({
    groqError: temporaryGroqError('PROVIDER_ERROR', 503),
    geminiError: new Error('Gemini internal secret'),
  });

  try {
    await assert.rejects(
      () => harness.service.generate({ prompt: 'Question' }),
      (error) => {
        assert.equal(error.code, 'UNAVAILABLE');
        assert.match(error.message, /temporairement indisponible/i);
        assert.doesNotMatch(error.message, /secret|Gemini/);
        return true;
      }
    );
    assert.equal(harness.state.groqCalls.length, 1);
    assert.equal(harness.state.geminiCalls.length, 1);
  } finally {
    harness.restore();
  }
});

test('une erreur Groq non temporaire ne declenche pas Gemini', async () => {
  const error = new Error('invalid model');
  error.diagnostic = { retryable: false, reason: 'MODEL_NOT_FOUND', httpStatus: 404 };
  const harness = createHarness({ groqError: error });

  try {
    await assert.rejects(() => harness.service.generate({ prompt: 'Question' }), (thrown) => thrown === error);
    assert.equal(harness.state.geminiCalls.length, 0);
  } finally {
    harness.restore();
  }
});
