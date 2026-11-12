const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const modulePath = (relative) => require.resolve(path.join(root, relative));

const inject = (relative, exports) => {
  const resolved = modulePath(relative);
  const previous = require.cache[resolved];
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
  return () => {
    if (previous) require.cache[resolved] = previous;
    else delete require.cache[resolved];
  };
};

const loadFresh = (relative) => {
  const resolved = modulePath(relative);
  delete require.cache[resolved];
  return require(resolved);
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

const createRes = () => {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.payload = payload;
    return res;
  };
  return res;
};

const createNext = () => {
  const calls = [];
  const next = (error) => calls.push(error);
  next.calls = calls;
  return next;
};

const createHarness = () => {
  const state = {
    conversation: {
      listResult: { rows: [], total: 0 },
      listArgs: null,
      conversation: null,
      createArgs: null,
      createResult: null,
      renameArgs: null,
      renameResult: null,
      removeArgs: null,
      removeResult: 0,
      history: [],
      appendArgs: null,
      appendResult: null,
    },
    chatbot: { answer: 'Reponse IA', askArgs: null, error: null },
  };

  state.restore = [
    inject('services/conversation.service', {
      TITRE_MAX: 120,
      list: async (args) => {
        state.conversation.listArgs = args;
        return state.conversation.listResult;
      },
      findOwned: async (id, utilisateurId) => {
        const conversation = state.conversation.conversation;
        if (!conversation) return undefined;
        return conversation.id === id && conversation.utilisateur_id === utilisateurId
          ? conversation
          : undefined;
      },
      create: async (utilisateurId, options) => {
        state.conversation.createArgs = { utilisateurId, options };
        return (
          state.conversation.createResult || {
            id: 1,
            utilisateur_id: utilisateurId,
            titre: options?.titre || 'Nouvelle conversation',
            messages: [],
          }
        );
      },
      rename: async (id, utilisateurId, titre) => {
        state.conversation.renameArgs = { id, utilisateurId, titre };
        return state.conversation.renameResult;
      },
      remove: async (id, utilisateurId) => {
        state.conversation.removeArgs = { id, utilisateurId };
        return state.conversation.removeResult;
      },
      historyForModel: () => state.conversation.history,
      appendExchange: async (conversation, payload) => {
        state.conversation.appendArgs = { conversation, payload };
        return (
          state.conversation.appendResult || {
            ...conversation,
            messages: [
              { role: 'user', content: payload.question },
              { role: 'assistant', content: payload.answer },
            ],
          }
        );
      },
    }),
    inject('services/chatbot.service', {
      ask: async (args) => {
        state.chatbot.askArgs = args;
        if (state.chatbot.error) throw state.chatbot.error;
        return { answer: state.chatbot.answer };
      },
    }),
  ];

  delete require.cache[modulePath('controllers/chatbot.controller')];
  state.controller = require(modulePath('controllers/chatbot.controller'));
  return state;
};

test.beforeEach(() => {
  flush();
});

test('creer une conversation utilise l utilisateur du JWT et ignore le corps', async () => {
  const state = createHarness();
  try {
    const req = {
      user: { id: 42, role: 'candidat' },
      body: { titre: 'Preparation entretien', utilisateur_id: 999 },
    };
    const res = createRes();

    await state.controller.createConversation(req, res, createNext());

    assert.equal(res.statusCode, 201);
    assert.deepEqual(state.conversation.createArgs, {
      utilisateurId: 42,
      options: { titre: 'Preparation entretien' },
    });
    assert.equal(res.payload.utilisateur_id, 42);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('creer une conversation rejette un titre vide', async () => {
  const state = createHarness();
  try {
    const res = createRes();
    await state.controller.createConversation(
      { user: { id: 1, role: 'candidat' }, body: { titre: '   ' } },
      res,
      createNext()
    );
    assert.equal(res.statusCode, 400);
    assert.equal(state.conversation.createArgs, null);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('lister les conversations est limite a l utilisateur connecte', async () => {
  const state = createHarness();
  try {
    state.conversation.listResult = { rows: [{ id: 3 }], total: 1 };
    const res = createRes();

    await state.controller.listConversations(
      { user: { id: 8, role: 'candidat' }, query: { page: '2', limit: '5', utilisateur_id: '1' } },
      res,
      createNext()
    );

    assert.deepEqual(state.conversation.listArgs, { utilisateurId: 8, limit: 5, offset: 5 });
    assert.deepEqual(res.payload.meta, { total: 1, page: 2, limit: 5, pages: 1 });
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('un candidat ne peut pas lire la conversation d un autre utilisateur', async () => {
  const state = createHarness();
  try {
    state.conversation.conversation = { id: 5, utilisateur_id: 2, messages: [] };
    const res = createRes();

    await state.controller.getConversation(
      { user: { id: 1, role: 'candidat' }, params: { id: '5' } },
      res,
      createNext()
    );

    assert.equal(res.statusCode, 404);
    assert.equal(res.payload.message, 'Conversation introuvable');
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('envoyer un message valide la saisie et transmet l historique', async () => {
  const state = createHarness();
  try {
    state.conversation.conversation = {
      id: 5,
      utilisateur_id: 1,
      titre: 'Nouvelle conversation',
      messages: [],
    };
    state.conversation.history = [{ role: 'user', text: 'Question precedente' }];
    const res = createRes();

    await state.controller.sendMessage(
      {
        user: { id: 1, role: 'candidat' },
        params: { id: '5' },
        body: { message: '  Quelles sont mes candidatures ?  ' },
      },
      res,
      createNext()
    );

    assert.equal(res.statusCode, 200);
    assert.equal(state.chatbot.askArgs.question, 'Quelles sont mes candidatures ?');
    assert.deepEqual(state.chatbot.askArgs.history, state.conversation.history);
    assert.equal(state.chatbot.askArgs.user.id, 1);
    assert.equal(state.conversation.appendArgs.payload.question, 'Quelles sont mes candidatures ?');
    assert.equal(res.payload.reply.content, 'Reponse IA');
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('envoyer un message refuse une saisie vide ou trop longue', async () => {
  const state = createHarness();
  try {
    state.conversation.conversation = { id: 5, utilisateur_id: 1, messages: [] };

    const vide = createRes();
    await state.controller.sendMessage(
      { user: { id: 1, role: 'candidat' }, params: { id: '5' }, body: { message: '   ' } },
      vide,
      createNext()
    );
    assert.equal(vide.statusCode, 400);

    const longue = createRes();
    await state.controller.sendMessage(
      {
        user: { id: 1, role: 'candidat' },
        params: { id: '5' },
        body: { message: 'a'.repeat(1001) },
      },
      longue,
      createNext()
    );
    assert.equal(longue.statusCode, 400);
    assert.equal(state.chatbot.askArgs, null);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('envoyer un message refuse une conversation non possedee', async () => {
  const state = createHarness();
  try {
    state.conversation.conversation = { id: 5, utilisateur_id: 2, messages: [] };
    const res = createRes();

    await state.controller.sendMessage(
      { user: { id: 1, role: 'admin' }, params: { id: '5' }, body: { message: 'Bonjour' } },
      res,
      createNext()
    );

    assert.equal(res.statusCode, 404);
    assert.equal(state.chatbot.askArgs, null);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('les erreurs Gemini sont traduites en statut HTTP sans fuite technique', async () => {
  const cases = [
    ['RATE_LIMIT', 429],
    ['UNAVAILABLE', 502],
    ['CONFIG', 503],
    ['INVALID', 400],
  ];

  for (const [code, expected] of cases) {
    const state = createHarness();
    try {
      state.conversation.conversation = { id: 5, utilisateur_id: 1, messages: [] };
      const error = new Error('Erreur interne du fournisseur');
      error.code = code;
      state.chatbot.error = error;

      const res = createRes();
      const next = createNext();
      await state.controller.sendMessage(
        { user: { id: 1, role: 'candidat' }, params: { id: '5' }, body: { message: 'Bonjour' } },
        res,
        next
      );

      assert.equal(res.statusCode, expected, `code ${code}`);
      assert.equal(next.calls.length, 0);
      assert.doesNotMatch(res.payload.message, /fournisseur|interne/i);
      assert.equal(state.conversation.appendArgs, null);
    } finally {
      state.restore.forEach((restore) => restore());
    }
  }
});

test('renommer et supprimer verifient la propriete de la conversation', async () => {
  const state = createHarness();
  try {
    const renommer = createRes();
    await state.controller.renameConversation(
      { user: { id: 1, role: 'candidat' }, params: { id: '5' }, body: { titre: '   ' } },
      renommer,
      createNext()
    );
    assert.equal(renommer.statusCode, 400);
    assert.equal(state.conversation.renameArgs, null);

    const supprimer = createRes();
    await state.controller.deleteConversation(
      { user: { id: 1, role: 'candidat' }, params: { id: '5' } },
      supprimer,
      createNext()
    );
    assert.equal(supprimer.statusCode, 404);
    assert.deepEqual(state.conversation.removeArgs, { id: 5, utilisateurId: 1 });
  } finally {
    state.restore.forEach((restore) => restore());
  }
});
