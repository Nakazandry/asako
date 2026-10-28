const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const service = require('../services/email.service');

const providerKey = (value) => crypto.createHash('sha256').update(value).digest('hex');

const ENV_KEYS = ['RESEND_API_KEY', 'EMAIL_FROM', 'FRONTEND_URL', 'CLIENT_URL'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const silentLogger = { warn() {}, error() {} };

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
