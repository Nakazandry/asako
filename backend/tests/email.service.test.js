const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../services/email.service');

const providerKey = (value) => crypto.createHash('sha256').update(value).digest('hex');

const ENV_KEYS = [
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'FRONTEND_URL',
  'CLIENT_URL',
  'NODE_ENV',
  'EMAIL_DEMO_REDIRECT_ENABLED',
  'EMAIL_DEMO_REDIRECT_TO',
];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const silentLogger = { warn() {}, error() {}, info() {} };

const captureLogger = () => {
  const calls = { warn: [], error: [], info: [] };
  return {
    calls,
    warn: (message) => calls.warn.push(String(message)),
    error: (message) => calls.error.push(String(message)),
    info: (message) => calls.info.push(String(message)),
  };
};

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

const mockTransport = (handler) => {
  const calls = [];
  return {
    calls,
    emails: {
      send: async (payload, options) => {
        calls.push({ payload, options });
        if (handler) return handler(payload, options, calls.length);
        return { data: { id: `email-${calls.length}` } };
      },
    },
  };
};

test.beforeEach(() => {
  service._resetForTests();
  service._setLoggerForTests(silentLogger);
  restoreEnv();
  delete process.env.EMAIL_DEMO_REDIRECT_ENABLED;
  delete process.env.EMAIL_DEMO_REDIRECT_TO;
  process.env.NODE_ENV = 'test';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.EMAIL_FROM = 'ASAKO <no-reply@example.com>';
  process.env.FRONTEND_URL = 'https://asako.example.com/';
});

test.after(() => {
  service._resetForTests();
  restoreEnv();
});

test('sendEmail ne fait rien sans RESEND_API_KEY et ne leve pas d erreur', async () => {
  delete process.env.RESEND_API_KEY;
  const result = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
  });
  assert.deepEqual(result, { sent: false, reason: 'not_configured' });
});

test('sendEmail utilise le transport injecte et les variables configurees', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: ' Candidat@Example.com ',
    subject: 'Bonjour',
    html: '<p>Bonjour</p>',
    text: 'Bonjour',
    idempotencyKey: 'event-1',
  });

  assert.deepEqual(result, { sent: true, id: 'email-1' });
  assert.equal(transport.calls.length, 1);
  assert.deepEqual(transport.calls[0].payload, {
    from: 'ASAKO <no-reply@example.com>',
    to: 'candidat@example.com',
    subject: 'Bonjour',
    html: '<p>Bonjour</p>',
    text: 'Bonjour',
  });
  assert.deepEqual(transport.calls[0].options, { idempotencyKey: providerKey('event-1') });
});

test('sendEmail refuse un destinataire invalide', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: 'pas-un-email',
    subject: 'Test',
    html: '<p>Test</p>',
  });

  assert.deepEqual(result, { sent: false, reason: 'invalid_recipient' });
  assert.equal(transport.calls.length, 0);
});

test('sendEmail evite les doublons pour une meme cle', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  const first = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
    idempotencyKey: 'duplicate-key',
  });
  const second = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
    idempotencyKey: 'duplicate-key',
  });

  assert.equal(first.sent, true);
  assert.deepEqual(second, { sent: false, reason: 'duplicate' });
  assert.equal(transport.calls.length, 1);
});

test('sendEmail autorise un nouvel essai apres une erreur fournisseur', async () => {
  let fail = true;
  const transport = mockTransport(() => {
    if (fail) return { error: { message: 'invalid from address' } };
    return { data: { id: 'email-ok' } };
  });
  service._setTransportForTests(transport);

  const failed = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
    idempotencyKey: 'retry-key',
  });
  fail = false;
  const retried = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
    idempotencyKey: 'retry-key',
  });

  assert.deepEqual(failed, { sent: false, reason: 'provider_error' });
  assert.deepEqual(retried, { sent: true, id: 'email-ok' });
  assert.equal(transport.calls.length, 2);
});

test('sendEmail capture les exceptions du transport', async () => {
  const transport = mockTransport(() => {
    throw new Error('reseau indisponible');
  });
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
  });

  assert.deepEqual(result, { sent: false, reason: 'send_error' });
});

test('la confirmation de candidature contient les donnees reelles et echappe le HTML', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendCandidatureConfirmation({
    candidature: { id: 12, date_candidature: '2026-10-28' },
    candidat: { prenom: '<script>alert(1)</script>', nom: 'Diallo', email: 'amina@example.com' },
    offre: { titre: 'Developpeuse Full Stack', localisation: 'Dakar' },
  });

  const { payload, options } = transport.calls[0];
  assert.equal(payload.to, 'amina@example.com');
  assert.match(payload.subject, /Candidature reçue : Developpeuse Full Stack/);
  assert.match(payload.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(payload.html, /<script>alert\(1\)<\/script>/);
  assert.match(payload.html, /Developpeuse Full Stack/);
  assert.match(payload.html, /Dakar/);
  assert.match(payload.html, /En attente/);
  assert.match(payload.html, /https:\/\/asako\.example\.com\/mon-espace/);
  assert.deepEqual(options, { idempotencyKey: providerKey('candidature:12:confirmation') });
});

test('notifyCandidatureCreated envoie un e-mail au candidat et a chaque recruteur', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.notifyCandidatureCreated({
    candidature: { id: 8, date_candidature: '2026-10-28' },
    candidat: { prenom: 'Amina', nom: 'Diallo', email: 'amina@example.com' },
    offre: { titre: 'Developpeuse Full Stack', localisation: 'Dakar' },
    admins: [
      { id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@example.com' },
      { id: 2, prenom: 'Moussa', nom: 'Fall', email: 'moussa@example.com' },
    ],
  });

  assert.equal(transport.calls.length, 3);
  assert.deepEqual(
    transport.calls.map((call) => call.payload.to),
    ['amina@example.com', 'awa@example.com', 'moussa@example.com']
  );
  assert.match(transport.calls[1].payload.html, /Amina Diallo/);
  assert.match(transport.calls[1].payload.html, /https:\/\/asako\.example\.com\/candidatures/);
});

test('le changement de statut contient l ancien et le nouveau statut', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendChangementStatut({
    candidature: {
      id: 4,
      prenom: 'Amina',
      nom: 'Diallo',
      email: 'amina@example.com',
      offre_titre: 'Developpeuse Full Stack',
      offre_localisation: 'Dakar',
    },
    statut: 'Accepté',
    ancienStatut: 'En attente',
  });

  const { payload } = transport.calls[0];
  assert.match(payload.subject, /Mise à jour de votre candidature/);
  assert.match(payload.html, /Accepté/);
  assert.match(payload.html, /En attente/);
  assert.match(payload.text, /Nouveau statut : Accepté/);
});

test('la planification d entretien contient date, heure, type et lieu', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendEntretienPlanifie({
    candidature: {
      prenom: 'Amina',
      nom: 'Diallo',
      email: 'amina@example.com',
      offre_titre: 'Developpeuse Full Stack',
      offre_localisation: 'Dakar',
    },
    entretien: {
      id: 9,
      date_entretien: '2026-12-01',
      heure_entretien: '09:30:00',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
      commentaire: 'Merci de preparer un exemple de projet.',
    },
  });

  const { payload, options } = transport.calls[0];
  assert.match(payload.subject, /Entretien planifié/);
  assert.match(payload.html, /1 décembre 2026/);
  assert.match(payload.html, /09:30/);
  assert.match(payload.html, /Visio/);
  assert.match(payload.html, /Google Meet/);
  assert.match(payload.text, /Date : 1 décembre 2026/);
  assert.deepEqual(options, { idempotencyKey: providerKey('entretien:9:planifie') });
});

test('la modification d entretien signale une reprogrammation et les changements', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendEntretienModifie({
    candidature: {
      prenom: 'Amina',
      nom: 'Diallo',
      email: 'amina@example.com',
      offre_titre: 'Developpeuse Full Stack',
      offre_localisation: 'Dakar',
    },
    entretien: {
      id: 9,
      date_entretien: '2026-12-05',
      heure_entretien: '10:00',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    },
    reprogramme: true,
    changements: ['Date : 5 décembre 2026', 'Heure : 10:00'],
  });

  const { payload } = transport.calls[0];
  assert.match(payload.subject, /Entretien reprogrammé/);
  assert.match(payload.html, /Date : 5 décembre 2026/);
  assert.match(payload.html, /Heure : 10:00/);
  assert.match(payload.text, /reprogrammé/);
});

test('l annulation d entretien contient les informations du rendez-vous', async () => {
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendEntretienAnnule({
    candidature: {
      prenom: 'Amina',
      nom: 'Diallo',
      email: 'amina@example.com',
      offre_titre: 'Developpeuse Full Stack',
      offre_localisation: 'Dakar',
    },
    entretien: {
      id: 9,
      date_entretien: '2026-12-01',
      heure_entretien: '09:30',
      type_entretien: 'Visio',
      lieu: 'Google Meet',
    },
  });

  const { payload, options } = transport.calls[0];
  assert.match(payload.subject, /Entretien annulé/);
  assert.match(payload.html, /1 décembre 2026/);
  assert.match(payload.html, /Google Meet/);
  assert.deepEqual(options, { idempotencyKey: providerKey('entretien:9:annule') });
});

test('getEmailConfig expose la configuration active sans secret', () => {
  const config = service.getEmailConfig();

  assert.deepEqual(config, {
    environment: 'development',
    providerConfigured: true,
    from: 'ASAKO <no-reply@example.com>',
    frontendUrl: 'https://asako.example.com',
    dedupeTtlHours: 24,
    demoRedirect: { enabled: false, to: null },
  });
});

test('en production, une FRONTEND_URL locale est remplacee par le frontend deploye', async () => {
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.sendCandidatureConfirmation({
    candidature: { id: 21, date_candidature: '2026-10-28' },
    candidat: { prenom: 'Amina', nom: 'Diallo', email: 'amina@example.com' },
    offre: { titre: 'Developpeuse Full Stack', localisation: 'Dakar' },
  });

  const { payload } = transport.calls[0];
  assert.equal(service.getEmailConfig().frontendUrl, 'https://asako-beta.vercel.app');
  assert.match(payload.html, /https:\/\/asako-beta\.vercel\.app\/mon-espace/);
  assert.doesNotMatch(payload.html, /localhost/);
  assert.match(payload.text, /https:\/\/asako-beta\.vercel\.app\/mon-espace/);
});

test('en production, FRONTEND_URL absent retombe sur le frontend deploye', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.FRONTEND_URL;
  delete process.env.CLIENT_URL;

  assert.equal(service.getEmailConfig().frontendUrl, 'https://asako-beta.vercel.app');
});

test('en developpement, FRONTEND_URL absent retombe sur localhost', () => {
  delete process.env.FRONTEND_URL;
  delete process.env.CLIENT_URL;

  assert.equal(service.getEmailConfig().frontendUrl, 'http://localhost:5173');
});

test('une FRONTEND_URL sans protocole est complete automatiquement', () => {
  process.env.FRONTEND_URL = 'asako-beta.vercel.app/';

  assert.equal(service.getEmailConfig().frontendUrl, 'http://asako-beta.vercel.app');
});

test('un EMAIL_FROM absent ou invalide retombe sur l expediteur de test avec avertissement', () => {
  const logger = captureLogger();
  service._setLoggerForTests(logger);

  delete process.env.EMAIL_FROM;
  assert.equal(service.getEmailConfig().from, 'ASAKO <onboarding@resend.dev>');
  assert.ok(logger.calls.warn.some((message) => /EMAIL_FROM non defini/.test(message)));

  service._resetForTests();
  service._setLoggerForTests(logger);
  process.env.EMAIL_FROM = 'pas-un-email';
  assert.equal(service.getEmailConfig().from, 'ASAKO <onboarding@resend.dev>');
  assert.ok(logger.calls.warn.some((message) => /EMAIL_FROM invalide/.test(message)));
});

test('en production, onboarding@resend.dev est signale comme expediteur de test', () => {
  const logger = captureLogger();
  service._setLoggerForTests(logger);
  process.env.NODE_ENV = 'production';
  process.env.EMAIL_FROM = 'ASAKO <onboarding@resend.dev>';

  assert.equal(service.getEmailConfig().from, 'ASAKO <onboarding@resend.dev>');
  assert.ok(logger.calls.warn.some((message) => /resend\.dev/.test(message)));
});

test('la redirection de demonstration est desactivee par defaut', async () => {
  process.env.NODE_ENV = 'production';
  const transport = mockTransport();
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: 'admin@asako.com',
    subject: 'Nouvelle candidature',
    html: '<p>Test</p>',
  });

  const { payload } = transport.calls[0];
  assert.equal(payload.to, 'admin@asako.com');
  assert.equal(payload.headers, undefined);
  assert.deepEqual(result, { sent: true, id: 'email-1' });
  assert.equal(service.getEmailConfig().demoRedirect.enabled, false);
});

test('la redirection de demonstration envoie candidat et administrateur vers le Gmail de test', async () => {
  process.env.EMAIL_DEMO_REDIRECT_ENABLED = 'true';
  process.env.EMAIL_DEMO_REDIRECT_TO = 'nakazandryaaron@gmail.com';
  const transport = mockTransport();
  service._setTransportForTests(transport);

  await service.notifyCandidatureCreated({
    candidature: { id: 31, date_candidature: '2026-10-28' },
    candidat: { prenom: 'Amina', nom: 'Diallo', email: 'amina@example.com' },
    offre: { titre: 'Developpeuse Full Stack', localisation: 'Dakar' },
    admins: [{ id: 7, prenom: 'Admin', nom: 'ASAKO', email: 'admin@asako.com' }],
  });

  assert.equal(transport.calls.length, 2);
  assert.deepEqual(
    transport.calls.map((call) => call.payload.to),
    ['nakazandryaaron@gmail.com', 'nakazandryaaron@gmail.com']
  );
  assert.deepEqual(transport.calls[0].payload.headers, {
    'X-ASAKO-Demo-Redirect': 'true',
    'X-ASAKO-Original-Recipient': 'amina@example.com',
  });
  assert.deepEqual(transport.calls[1].payload.headers, {
    'X-ASAKO-Demo-Redirect': 'true',
    'X-ASAKO-Original-Recipient': 'admin@asako.com',
  });
  // L'objet et le contenu restent ceux du destinataire reel.
  assert.match(transport.calls[1].payload.subject, /Nouvelle candidature/);
  assert.match(transport.calls[0].payload.html, /https:\/\/asako\.example\.com\/mon-espace/);
});

test('une cible de redirection invalide est ignoree au profit du destinataire reel', async () => {
  const logger = captureLogger();
  service._setLoggerForTests(logger);
  process.env.EMAIL_DEMO_REDIRECT_ENABLED = 'true';
  process.env.EMAIL_DEMO_REDIRECT_TO = 'pas-un-email';
  const transport = mockTransport();
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
  });

  assert.equal(transport.calls[0].payload.to, 'candidat@example.com');
  assert.equal(transport.calls[0].payload.headers, undefined);
  assert.deepEqual(result, { sent: true, id: 'email-1' });
  assert.equal(service.getEmailConfig().demoRedirect.enabled, false);
  assert.ok(logger.calls.warn.some((message) => /redirection ignoree/.test(message)));
});

test('les erreurs Resend sont journalisees sans exposer la cle API', async () => {
  const logger = captureLogger();
  service._setLoggerForTests(logger);
  process.env.RESEND_API_KEY = 're_secret_abcdef123456';
  const transport = mockTransport(() => ({
    error: { message: 'invalid api key re_secret_abcdef123456', statusCode: 403, name: 'validation_error' },
  }));
  service._setTransportForTests(transport);

  const result = await service.sendEmail({
    to: 'candidat@example.com',
    subject: 'Test',
    html: '<p>Test</p>',
  });

  const logged = logger.calls.error.join(' ');
  assert.deepEqual(result, { sent: false, reason: 'provider_error' });
  assert.match(logged, /envoi refuse par Resend \(HTTP 403\)/);
  assert.match(logged, /\[cle masquee\]/);
  assert.doesNotMatch(logged, /re_secret_abcdef123456/);
});

test('logEmailConfiguration ne journalise jamais la cle API', () => {
  const logger = captureLogger();
  service._setLoggerForTests(logger);

  service.logEmailConfiguration();

  const line = logger.calls.info.join(' ');
  assert.match(line, /expediteur="ASAKO <no-reply@example\.com>"/);
  assert.match(line, /frontend=https:\/\/asako\.example\.com/);
  assert.match(line, /cle RESEND=presente/);
  assert.doesNotMatch(line, /re_test_key/);
});
