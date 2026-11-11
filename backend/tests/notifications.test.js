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
  res.send = (payload) => {
    res.body = payload;
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
    email: {
      created: [],
      statut: [],
      planifie: [],
      modifie: [],
      annule: [],
      reponseCandidat: [],
      reponseRecruteur: [],
      notifyError: false,
    },
    notify: { create: [], admins: [] },
    candidature: {
      createResult: null,
      createCalls: 0,
      duplicate: null,
      findByIdResults: [],
      updateStatusResult: null,
    },
    entretien: {
      findByIdResult: null,
      findByIdQueue: [],
      createResult: null,
      updateResult: null,
      deleteCalls: 0,
      reponseArgs: null,
      reponseResult: null,
      setReponseCalls: 0,
    },
    offre: { findByIdResult: null },
    admins: [],
  };

  const fakeCandidature = {
    create: async (payload) => {
      state.candidature.createCalls += 1;
      state.candidature.createPayload = payload;
      return state.candidature.createResult;
    },
    findDuplicate: async () => state.candidature.duplicate,
    findById: async () => state.candidature.findByIdResults.shift(),
    updateStatus: async (id, statut) => {
      state.candidature.updateStatusArgs = { id, statut };
      return state.candidature.updateStatusResult;
    },
    list: async () => ({ rows: [], total: 0 }),
    countUnseenAdmin: async () => 0,
    countUnseenUser: async () => 0,
    markAllSeenByAdmin: async () => {},
    markAllSeenByUser: async () => {},
    getCvFile: async () => null,
    delete: async () => {},
  };

  const fakeOffre = {
    findById: async () => state.offre.findByIdResult,
  };

  const fakeUtilisateur = {
    listAdmins: async () => state.admins,
    findById: async () => null,
  };

  const fakeEntretien = {
    findById: async () => (
      state.entretien.findByIdQueue.length
        ? state.entretien.findByIdQueue.shift()
        : state.entretien.findByIdResult
    ),
    create: async (payload) => {
      state.entretien.createPayload = payload;
      return state.entretien.createResult;
    },
    update: async (id, payload) => {
      state.entretien.updateArgs = { id, payload };
      return state.entretien.updateResult;
    },
    setReponseCandidat: async (id, reponse) => {
      state.entretien.setReponseCalls += 1;
      state.entretien.reponseArgs = { id, reponse };
      return state.entretien.reponseResult;
    },
    delete: async () => {
      state.entretien.deleteCalls += 1;
    },
    list: async () => ({ rows: [], total: 0 }),
  };

  const fakeNotify = {
    createNotification: async (...args) => {
      state.notify.create.push(args);
      return { id: 1 };
    },
    notifyAdmins: async (...args) => {
      state.notify.admins.push(args);
      return 1;
    },
  };

  const fakeEmail = {
    notifyCandidatureCreated: async (payload) => {
      if (state.email.notifyError) throw new Error('resend indisponible');
      state.email.created.push(payload);
    },
    sendChangementStatut: async (payload) => {
      state.email.statut.push(payload);
    },
    sendEntretienPlanifie: async (payload) => {
      state.email.planifie.push(payload);
    },
    sendEntretienModifie: async (payload) => {
      state.email.modifie.push(payload);
    },
    sendEntretienAnnule: async (payload) => {
      state.email.annule.push(payload);
    },
    sendEntretienReponseCandidat: async (payload) => {
      state.email.reponseCandidat.push(payload);
    },
    sendEntretienReponseRecruteur: async (payload) => {
      state.email.reponseRecruteur.push(payload);
    },
  };

  const restores = [
    inject('models/candidature.model', fakeCandidature),
    inject('models/offre.model', fakeOffre),
    inject('models/utilisateur.model', fakeUtilisateur),
    inject('models/entretien.model', fakeEntretien),
    inject('utils/notify', fakeNotify),
    inject('services/email.service', fakeEmail),
  ];

  const candidatureController = loadFresh('controllers/candidature.controller');
  const entretienController = loadFresh('controllers/entretien.controller');

  const cleanup = () => {
    delete require.cache[modulePath('controllers/candidature.controller')];
    delete require.cache[modulePath('controllers/entretien.controller')];
    restores.reverse().forEach((restore) => restore());
  };

  return { state, candidatureController, entretienController, cleanup };
};

const candidat = {
  id: 7,
  prenom: 'Amina',
  nom: 'Diallo',
  email: 'amina@example.com',
  role: 'candidat',
};

const candidatureComplete = {
  id: 5,
  utilisateur_id: 7,
  prenom: 'Amina',
  nom: 'Diallo',
  email: 'amina@example.com',
  offre_titre: 'Developpeuse Full Stack',
  offre_localisation: 'Dakar',
  statut: 'En attente',
};

test('createCandidature preserve les notifications internes et envoie les e-mails apres creation', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.offre.findByIdResult = {
      id: 3,
      titre: 'Developpeuse Full Stack',
      localisation: 'Dakar',
      date_limite: null,
    };
    state.candidature.createResult = {
      id: 42,
      date_candidature: '2026-10-28',
      statut: 'En attente',
    };
    state.admins = [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' }];

    const req = {
      user: candidat,
      body: { offre_id: 3, lettre_motivation: 'Je souhaite rejoindre votre equipe.' },
      file: { originalname: 'cv.pdf', buffer: Buffer.from('pdf') },
      query: {},
    };
    const res = createRes();
    const next = createNext();

    await harness.candidatureController.createCandidature(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 201);
    assert.equal(state.candidature.createCalls, 1);
    assert.equal(state.notify.admins.length, 1);
    assert.equal(state.notify.admins[0][0], 'Nouvelle candidature');
    assert.match(state.notify.admins[0][1], /Amina Diallo/);
    assert.equal(state.notify.admins[0][2], 'NOUVELLE_CANDIDATURE');
    assert.equal(state.email.created.length, 1);
    assert.equal(state.email.created[0].candidat.email, 'amina@example.com');
    assert.equal(state.email.created[0].candidature.id, 42);
    assert.equal(state.email.created[0].offre.titre, 'Developpeuse Full Stack');
    assert.deepEqual(state.email.created[0].admins, state.admins);
  } finally {
    harness.cleanup();
  }
});

test('une panne e-mail ne fait pas echouer la creation de candidature', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.offre.findByIdResult = {
      id: 3,
      titre: 'Developpeuse Full Stack',
      localisation: 'Dakar',
      date_limite: null,
    };
    state.candidature.createResult = { id: 42, date_candidature: '2026-10-28' };
    state.email.notifyError = true;

    const req = {
      user: candidat,
      body: { offre_id: 3 },
      file: { originalname: 'cv.pdf', buffer: Buffer.from('pdf') },
      query: {},
    };
    const res = createRes();
    const next = createNext();

    await harness.candidatureController.createCandidature(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 201);
    assert.equal(state.notify.admins.length, 1);
  } finally {
    harness.cleanup();
  }
});

test('une candidature en double ne declenche ni notification ni e-mail', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.offre.findByIdResult = {
      id: 3,
      titre: 'Developpeuse Full Stack',
      localisation: 'Dakar',
      date_limite: null,
    };
    state.candidature.duplicate = { id: 1 };

    const req = {
      user: candidat,
      body: { offre_id: 3 },
      file: { originalname: 'cv.pdf', buffer: Buffer.from('pdf') },
      query: {},
    };
    const res = createRes();
    const next = createNext();

    await harness.candidatureController.createCandidature(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 409);
    assert.equal(state.candidature.createCalls, 0);
    assert.equal(state.notify.admins.length, 0);
    assert.equal(state.email.created.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('updateStatut envoie un e-mail et conserve la notification interne', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.candidature.findByIdResults = [
      { ...candidatureComplete, statut: 'En attente' },
      { ...candidatureComplete, statut: 'Accepté' },
    ];
    state.candidature.updateStatusResult = { id: 5, statut: 'Accepté' };

    const req = { params: { id: '5' }, body: { statut: 'Accepte' }, user: { role: 'admin' } };
    const res = createRes();
    const next = createNext();

    await harness.candidatureController.updateStatut(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.email.statut.length, 1);
    assert.equal(state.email.statut[0].statut, 'Accepté');
    assert.equal(state.email.statut[0].ancienStatut, 'En attente');
    assert.equal(state.email.statut[0].candidature.email, 'amina@example.com');
  } finally {
    harness.cleanup();
  }
});

test('updateStatut ne renvoie pas d e-mail si le statut est identique', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.candidature.findByIdResults = [
      { ...candidatureComplete, statut: 'Accepté' },
      { ...candidatureComplete, statut: 'Accepté' },
    ];
    state.candidature.updateStatusResult = { id: 5, statut: 'Accepté' };

    const req = { params: { id: '5' }, body: { statut: 'Accepté' }, user: { role: 'admin' } };
    const res = createRes();
    const next = createNext();

    await harness.candidatureController.updateStatut(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.email.statut.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('createEntretien notifie le candidat par e-mail apres enregistrement', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.createResult = {
      id: 9,
      candidature_id: 5,
      date_entretien: '2026-12-01',
      heure_entretien: '09:30:00',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    };
    state.candidature.findByIdResults = [candidatureComplete];

    const req = {
      body: {
        candidature_id: 5,
        date_entretien: '2026-12-01',
        heure_entretien: '09:30',
        type_entretien: 'Visio',
        lieu: 'Google Meet',
      },
      user: { role: 'admin' },
    };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.createEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 201);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.email.planifie.length, 1);
    assert.equal(state.email.planifie[0].entretien.id, 9);
    assert.equal(state.email.planifie[0].candidature.email, 'amina@example.com');
    // La notification interne contient type, lieu et l'invitation a repondre.
    assert.match(state.notify.create[0][2], /Visio/);
    assert.match(state.notify.create[0][2], /Google Meet/);
    assert.match(state.notify.create[0][2], /accepter ou refuser/);
  } finally {
    harness.cleanup();
  }
});

test('updateEntretien signale une reprogrammation apres enregistrement', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = {
      id: 9,
      candidature_id: 5,
      date_entretien: '2026-12-01',
      heure_entretien: '09:30',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    };
    state.entretien.updateResult = {
      id: 9,
      candidature_id: 5,
      date_entretien: '2026-12-05',
      heure_entretien: '10:00',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    };
    state.candidature.findByIdResults = [candidatureComplete];

    const req = {
      params: { id: '9' },
      body: {
        date_entretien: '2026-12-05',
        heure_entretien: '10:00',
        type_entretien: 'Visio',
        lieu: 'Google Meet',
      },
      user: { role: 'admin' },
    };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.updateEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.email.modifie.length, 1);
    assert.equal(state.email.modifie[0].reprogramme, true);
    assert.deepEqual(state.email.modifie[0].changements, ['Date : 5 décembre 2026', 'Heure : 10:00']);
  } finally {
    harness.cleanup();
  }
});

test('deleteEntretien envoie un e-mail d annulation apres suppression', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = {
      id: 9,
      candidature_id: 5,
      date_entretien: '2026-12-01',
      heure_entretien: '09:30',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    };
    state.candidature.findByIdResults = [candidatureComplete];

    const req = { params: { id: '9' }, user: { role: 'admin' } };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.deleteEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 204);
    assert.equal(state.entretien.deleteCalls, 1);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.email.annule.length, 1);
    assert.equal(state.email.annule[0].entretien.id, 9);
  } finally {
    harness.cleanup();
  }
});
const entretienInvitation = {
  id: 9,
  candidature_id: 5,
  utilisateur_id: 7,
  date_entretien: '2099-12-01',
  heure_entretien: '09:30:00',
  type_entretien: 'Visio',
  lieu: 'Google Meet',
  commentaire: 'Prevoir un exemple de projet.',
  resultat: 'En attente',
  reponse_candidat: 'En attente',
  date_reponse: null,
  prenom: 'Amina',
  nom: 'Diallo',
  email: 'amina@example.com',
  offre_titre: 'Developpeuse Full Stack',
  offre_localisation: 'Dakar',
};

const entretienAccepte = {
  ...entretienInvitation,
  reponse_candidat: 'Accepté',
  date_reponse: '2026-11-11T09:00:00.000Z',
};

const entretienRefuse = {
  ...entretienInvitation,
  reponse_candidat: 'Refusé',
  date_reponse: '2026-11-11T09:05:00.000Z',
};

const candidatDemandeur = { id: 7, prenom: 'Amina', nom: 'Diallo', email: 'amina@example.com', role: 'candidat' };

test('le candidat concerne accepte son invitation et informe le recruteur', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdQueue = [entretienInvitation, entretienAccepte];
    state.entretien.reponseResult = entretienAccepte;
    state.admins = [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' }];

    const req = { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(state.entretien.reponseArgs.id, 9);
    assert.equal(state.entretien.reponseArgs.reponse, 'Accepté');
    assert.equal(res.payload.reponse_candidat, 'Accepté');
    // Le resultat de l'entretien reste reserve au recruteur.
    assert.equal(res.payload.resultat, 'En attente');

    assert.equal(state.notify.create.length, 1);
    assert.equal(state.notify.create[0][0], 7);
    assert.match(state.notify.create[0][1], /acceptee/);

    assert.equal(state.notify.admins.length, 1);
    assert.match(state.notify.admins[0][1], /Amina Diallo a accepte/);

    assert.equal(state.email.reponseCandidat.length, 1);
    assert.equal(state.email.reponseCandidat[0].candidature.email, 'amina@example.com');
    assert.equal(state.email.reponseRecruteur.length, 1);
    assert.equal(state.email.reponseRecruteur[0].recruteur.email, 'awa@example.com');
    assert.equal(state.email.reponseRecruteur[0].entretien.reponse_candidat, 'Accepté');
  } finally {
    harness.cleanup();
  }
});

test('le candidat concerne refuse son invitation et le recruteur est notifie', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdQueue = [entretienInvitation, entretienRefuse];
    state.entretien.reponseResult = entretienRefuse;
    state.admins = [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' }];

    const req = { params: { id: '9' }, body: { reponse: 'refuser' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(state.entretien.reponseArgs.reponse, 'Refusé');
    assert.equal(res.payload.reponse_candidat, 'Refusé');
    assert.equal(state.notify.create.length, 1);
    assert.match(state.notify.create[0][1], /refuse/);
    assert.equal(state.notify.admins.length, 1);
    assert.match(state.notify.admins[0][1], /Amina Diallo a refuse/);
    assert.equal(state.email.reponseCandidat.length, 1);
    assert.equal(state.email.reponseRecruteur.length, 1);
  } finally {
    harness.cleanup();
  }
});

test('un candidat ne peut pas repondre a l entretien d un autre candidat', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = entretienInvitation;

    const req = { params: { id: '9' }, body: { reponse: 'accepter' }, user: { id: 8, role: 'candidat' } };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 403);
    assert.equal(state.entretien.setReponseCalls, 0);
    assert.equal(state.notify.create.length, 0);
    assert.equal(state.notify.admins.length, 0);
    assert.equal(state.email.reponseCandidat.length, 0);
    assert.equal(state.email.reponseRecruteur.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('repondreEntretien refuse une valeur de reponse invalide', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = entretienInvitation;

    const req = { params: { id: '9' }, body: { reponse: 'peut-etre' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 400);
    assert.equal(state.entretien.setReponseCalls, 0);
  } finally {
    harness.cleanup();
  }
});


test('repondreEntretien bloque une double soumission sans renvoyer de notification', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = entretienAccepte;
    state.admins = [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' }];

    const req = { params: { id: '9' }, body: { reponse: 'refuser' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 409);
    assert.match(res.payload.message, /deja repondu/);
    assert.equal(state.entretien.setReponseCalls, 0);
    assert.equal(state.notify.create.length, 0);
    assert.equal(state.notify.admins.length, 0);
    assert.equal(state.email.reponseCandidat.length, 0);
    assert.equal(state.email.reponseRecruteur.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('une mise a jour concurrente (deja repondu en base) est refusee proprement', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdQueue = [entretienInvitation, entretienInvitation];
    state.entretien.reponseResult = null;

    const req = { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 409);
    assert.equal(state.entretien.setReponseCalls, 1);
    assert.equal(state.notify.create.length, 0);
    assert.equal(state.notify.admins.length, 0);
    assert.equal(state.email.reponseCandidat.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('repondreEntretien bloque une reponse apres le delai de l entretien', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = {
      ...entretienInvitation,
      date_entretien: '2020-01-01',
      heure_entretien: '09:00:00',
    };

    const req = { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 409);
    assert.match(res.payload.message, /delai de reponse est depasse/);
    assert.equal(state.entretien.setReponseCalls, 0);
    assert.equal(state.notify.create.length, 0);
  } finally {
    harness.cleanup();
  }
});

test('repondreEntretien renvoie 404 quand l entretien est annule (supprime)', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = null;

    const req = { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur };
    const res = createRes();
    const next = createNext();

    await harness.entretienController.repondreEntretien(req, res, next);
    await flush();

    assert.equal(next.calls.length, 0);
    assert.equal(res.statusCode, 404);
    assert.equal(state.entretien.setReponseCalls, 0);
  } finally {
    harness.cleanup();
  }
});

test('une seconde reponse sur le meme entretien ne cree aucune notification en double', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.admins = [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' }];
    state.entretien.findByIdQueue = [entretienInvitation, entretienAccepte];
    state.entretien.reponseResult = entretienAccepte;

    const first = createRes();
    await harness.entretienController.repondreEntretien(
      { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur },
      first,
      createNext()
    );
    await flush();

    // Deuxieme tentative : l'entretien est desormais accepte.
    state.entretien.findByIdResult = entretienAccepte;
    state.entretien.reponseResult = entretienAccepte;
    const second = createRes();
    await harness.entretienController.repondreEntretien(
      { params: { id: '9' }, body: { reponse: 'accepter' }, user: candidatDemandeur },
      second,
      createNext()
    );
    await flush();

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 409);
    assert.equal(state.notify.create.length, 1);
    assert.equal(state.notify.admins.length, 1);
    assert.equal(state.email.reponseCandidat.length, 1);
    assert.equal(state.email.reponseRecruteur.length, 1);
  } finally {
    harness.cleanup();
  }
});

test('getEntretien autorise le candidat concerne et le recruteur, refuse les autres', async () => {
  const harness = createHarness();
  try {
    const { state } = harness;
    state.entretien.findByIdResult = entretienInvitation;

    const own = createRes();
    await harness.entretienController.getEntretien({ params: { id: '9' }, user: candidatDemandeur }, own, createNext());
    assert.equal(own.statusCode, 200);
    assert.equal(own.payload.id, 9);

    const admin = createRes();
    await harness.entretienController.getEntretien({ params: { id: '9' }, user: { id: 1, role: 'admin' } }, admin, createNext());
    assert.equal(admin.statusCode, 200);

    const other = createRes();
    await harness.entretienController.getEntretien({ params: { id: '9' }, user: { id: 8, role: 'candidat' } }, other, createNext());
    assert.equal(other.statusCode, 403);

    state.entretien.findByIdResult = null;
    const missing = createRes();
    await harness.entretienController.getEntretien({ params: { id: '99' }, user: { id: 1, role: 'admin' } }, missing, createNext());
    assert.equal(missing.statusCode, 404);
  } finally {
    harness.cleanup();
  }
});

