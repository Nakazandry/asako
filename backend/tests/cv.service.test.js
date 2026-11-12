const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/cv.service');

const ENV_KEYS = ['AI_CV_MAX_BYTES', 'AI_CV_MAX_CHARS'];
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const restoreEnv = () => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
};

const pdfBuffer = (content = 'contenu') =>
  Buffer.concat([Buffer.from('%PDF-1.7\n', 'latin1'), Buffer.from(content, 'utf8')]);

test.beforeEach(() => {
  service._resetForTests();
  restoreEnv();
  delete process.env.AI_CV_MAX_BYTES;
  delete process.env.AI_CV_MAX_CHARS;
});

test.after(() => {
  service._resetForTests();
  restoreEnv();
});

test('un fichier non PDF est refuse avant tout parsing', async () => {
  await assert.rejects(
    () => service.extractCvText(Buffer.from('ceci nest pas un pdf')),
    (error) => {
      assert.equal(error.name, 'CvError');
      assert.equal(error.code, 'INVALID_FILE');
      return true;
    }
  );

  await assert.rejects(() => service.extractCvText(undefined), (error) => error.code === 'INVALID_FILE');
});

test('un CV trop volumineux est refuse', async () => {
  process.env.AI_CV_MAX_BYTES = '10';

  await assert.rejects(
    () => service.extractCvText(pdfBuffer('x'.repeat(50))),
    (error) => error.code === 'TOO_LARGE'
  );
});

test('un PDF structurellement invalide remonte une erreur de lecture', async () => {
  await assert.rejects(
    () => service.extractCvText(pdfBuffer('pas un vrai pdf')),
    (error) => error.name === 'CvError' && error.code === 'UNREADABLE'
  );
});

test('un texte vide ou insuffisant est refuse', async () => {
  service._setExtractorForTests(async () => '  trop court  ');

  await assert.rejects(
    () => service.extractCvText(pdfBuffer()),
    (error) => error.code === 'EMPTY'
  );
});

test('prepareCvText anonymise puis borne le texte transmis a l IA', async () => {
  process.env.AI_CV_MAX_CHARS = '80';
  service._setExtractorForTests(async () =>
    [
      'Alice Martin',
      'Developpeuse React senior',
      'Contact : alice.martin@example.com',
      'Telephone : 06 12 34 56 78',
      'Portfolio : https://alice.example.com',
      'Experiences : 5 ans chez ACME sur des applications React et Node.js.',
    ].join('\n')
  );

  const { text, truncated } = await service.prepareCvText(pdfBuffer(), {
    noms: ['Alice Martin', 'Alice', 'Martin'],
  });

  assert.equal(truncated, true);
  assert.ok(text.length <= 80);
  assert.doesNotMatch(text, /alice\.martin@example\.com|06 12 34 56 78|alice\.example\.com/i);
  assert.doesNotMatch(text, /Alice|Martin/);
  assert.match(text, /\[masque\]/);
});

test('redactPersonalData masque les donnees identifiantes sans toucher au reste', () => {
  const output = service.redactPersonalData(
    'Nom: Alice Martin. Email: alice@example.com. Tel: +33 6 12 34 56 78. Site: https://x.test. Competences: React, Node.js.',
    { noms: ['Alice Martin'] }
  );

  assert.doesNotMatch(output, /alice@example\.com|\+33 6 12 34 56 78|Alice Martin|https:\/\/x\.test/i);
  assert.match(output, /React, Node\.js/);
});
