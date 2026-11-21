const test = require('node:test');
const assert = require('node:assert/strict');
const Utilisateur = require('../models/utilisateur.model');
const { getPhoto } = require('../controllers/auth.controller');

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  },
  end() {
    this.ended = true;
  },
  send(body) {
    this.body = body;
  },
});

test('une photo de profil absente est renvoyee sans erreur HTTP', async () => {
  const originalGetPhoto = Utilisateur.getPhoto;
  Utilisateur.getPhoto = async () => ({ photo_data: null, photo_type: null });
  const res = createResponse();

  try {
    await getPhoto({ user: { id: 1 } }, res, (error) => {
      throw error;
    });
  } finally {
    Utilisateur.getPhoto = originalGetPhoto;
  }

  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
});

test('une photo de profil existante est renvoyee avec son type MIME', async () => {
  const image = Buffer.from('image');
  const originalGetPhoto = Utilisateur.getPhoto;
  Utilisateur.getPhoto = async () => ({ photo_data: image, photo_type: 'image/png' });
  const res = createResponse();

  try {
    await getPhoto({ user: { id: 1 } }, res, (error) => {
      throw error;
    });
  } finally {
    Utilisateur.getPhoto = originalGetPhoto;
  }

  assert.equal(res.headers['Content-Type'], 'image/png');
  assert.equal(res.body, image);
});
