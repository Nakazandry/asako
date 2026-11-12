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

const CANDIDATURES = {
  rows: [
    {
      id: 12,
      utilisateur_id: 7,
      nom: 'Martin',
      prenom: 'Alice',
      email: 'alice.martin@example.com',
      offre_titre: 'Developpeur React',
      statut: 'En attente',
      date_candidature: '2026-10-01T10:00:00.000Z',
      lettre_motivation:
        'Bonjour, je suis Alice Martin, joignable au 06 12 34 56 78 et alice.martin@example.com.',
    },
  ],
  total: 1,
};

const ENTRETIENS = {
  rows: [
    {
      id: 4,
      candidature_id: 12,
      utilisateur_id: 7,
      nom: 'Martin',
      prenom: 'Alice',
      offshore: true,
      offre_titre: 'Developpeur React',
      date_entretien: '2026-11-20T00:00:00.000Z',
      heure_entretien: '10:00',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
      reponse_candidat: 'En attente',
      resultat: '',
    },
  ],
  total: 1,
};

const OFFRES = {
  rows: [
    {
      id: 3,
      titre: 'Developpeur React',
      description: 'Maitrise de React et Node.js. Contact recrutement@asako.test.',
      localisation: 'Paris',
      salaire: '45k',
      date_limite: '2026-12-31T00:00:00.000Z',
    },
  ],
  total: 1,
};

const createHarness = () => {
  const state = {
    candidatureArgs: [],
    entretienArgs: [],
    competenceArgs: [],
    offreArgs: [],
    geminiArgs: null,
    geminiError: null,
  };

  state.restore = [
    inject('models/candidature.model', {
      list: async (args) => {
        state.candidatureArgs.push(args);
        return CANDIDATURES;
      },
    }),
    inject('models/entretien.model', {
      list: async (args) => {
        state.entretienArgs.push(args);
        return ENTRETIENS;
      },
    }),
    inject('models/competence.model', {
      listByCandidat: async (candidatId) => {
        state.competenceArgs.push(candidatId);
        return [
          { id: 1, candidat_id: candidatId, nom: 'React', niveau: 80 },
          { id: 2, candidat_id: candidatId, nom: 'Node.js', niveau: 60 },
        ];
      },
    }),
    inject('models/offre.model', {
      list: async (args) => {
        state.offreArgs.push(args);
        return OFFRES;
      },
    }),
    inject('services/gemini.service', {
      generate: async (args) => {
        state.geminiArgs = args;
        if (state.geminiError) throw state.geminiError;
        return { text: 'Reponse de test', model: 'fake-model' };
      },
    }),
  ];

  state.service = loadFresh('services/chatbot.service');
  return state;
};

test('le contexte candidat est limite a son perimetre et anonymise', async () => {
  const state = createHarness();
  try {
    const contexte = await state.service.buildContext({ id: 7, role: 'candidat' });

    assert.deepEqual(state.candidatureArgs, [{ userId: 7, limit: 10, offset: 0 }]);
    assert.deepEqual(state.entretienArgs, [{ userId: 7, limit: 10, offset: 0 }]);
    assert.deepEqual(state.competenceArgs, [7]);
    assert.match(contexte, /React/);

    // Aucune donnee personnelle du candidat ne doit atteindre le prompt.
    assert.doesNotMatch(contexte, /Alice|Martin/);
    assert.doesNotMatch(contexte, /alice\.martin@example\.com/);
    assert.doesNotMatch(contexte, /06 12 34 56 78/);
    assert.doesNotMatch(contexte, /recrutement@asako\.test/);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('le contexte recruteur ne contient aucune identite de candidat', async () => {
  const state = createHarness();
  try {
    const contexte = await state.service.buildContext({ id: 1, role: 'admin' });

    // Le recruteur voit toutes les candidatures, sans filtre par utilisateur.
    assert.deepEqual(state.candidatureArgs, [{ limit: 10, offset: 0 }]);
    assert.match(contexte, /Candidature #12/);
    assert.match(contexte, /Candidat #7/);
    assert.match(contexte, /React \(80\/100\)/);
    assert.doesNotMatch(contexte, /Alice|Martin|example\.com/);
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('ask construit un prompt borne avec la question et les instructions du role', async () => {
  const state = createHarness();
  try {
    const result = await state.service.ask({
      user: { id: 7, role: 'candidat' },
      question: 'Quelles sont mes candidatures ?',
      history: [{ role: 'user', text: 'Bonjour' }],
    });

    assert.equal(result.answer, 'Reponse de test');
    assert.match(state.geminiArgs.prompt, /Quelles sont mes candidatures \?/);
    assert.match(state.geminiArgs.prompt, /DONNEES DISPONIBLES/);
    assert.match(state.geminiArgs.systemInstruction, /ne jamais inventer|jamais inventer/i);
    assert.deepEqual(state.geminiArgs.history, [{ role: 'user', text: 'Bonjour' }]);

    const adminState = createHarness();
    try {
      await adminState.service.ask({ user: { id: 1, role: 'admin' }, question: 'Synthese' });
      assert.match(adminState.geminiArgs.systemInstruction, /recruteur/i);
      assert.doesNotMatch(adminState.geminiArgs.prompt, /Alice|Martin/);
    } finally {
      adminState.restore.forEach((restore) => restore());
    }
  } finally {
    state.restore.forEach((restore) => restore());
  }
});

test('les erreurs du service Gemini remontent sans etre masquees', async () => {
  const state = createHarness();
  try {
    const error = new Error('Limite atteinte');
    error.code = 'RATE_LIMIT';
    state.geminiError = error;

    await assert.rejects(
      () => state.service.ask({ user: { id: 7, role: 'candidat' }, question: 'Bonjour' }),
      (thrown) => thrown === error
    );
  } finally {
    state.restore.forEach((restore) => restore());
  }
});
