const { PDFParse } = require('pdf-parse');

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_CHARS = 12000;
const MIN_USEFUL_CHARS = 40;
const MASQUE = '[masque]';

class CvError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CvError';
    this.code = code;
  }
}

const maxBytes = () => Number(process.env.AI_CV_MAX_BYTES) || DEFAULT_MAX_BYTES;
const maxChars = () => Number(process.env.AI_CV_MAX_CHARS) || DEFAULT_MAX_CHARS;

const normalize = (text) =>
  String(text ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const assertPdf = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new CvError('INVALID_FILE', 'Fichier CV absent');
  }
  if (buffer.length > maxBytes()) {
    throw new CvError('TOO_LARGE', 'Le CV depasse la taille autorisee');
  }
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new CvError('INVALID_FILE', 'Le fichier CV doit etre un PDF');
  }
};

let extracteur = null;

const readText = async (buffer) => {
  if (extracteur) return extracteur(buffer);

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text || '';
  } catch (_error) {
    throw new CvError('UNREADABLE', "Le contenu du CV n'a pas pu etre lu");
  } finally {
    try {
      await parser.destroy();
    } catch (_error) {
      // Rien a faire: le parseur est deja inutilisable.
    }
  }
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Retire les donnees personnelles directement identifiables avant tout envoi a l'IA:
// adresses e-mail, numeros de telephone, liens et noms connus du candidat.
const redactPersonalData = (text, { noms = [] } = {}) => {
  let output = String(text ?? '');

  output = output.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, MASQUE);
  output = output.replace(/https?:\/\/\S+/gi, MASQUE);
  output = output.replace(/(?:\+?\d[\s.-]?){8,}\d/g, MASQUE);

  noms
    .map((nom) => String(nom ?? '').trim())
    .filter((nom) => nom.length >= 2)
    .sort((a, b) => b.length - a.length)
    .forEach((nom) => {
      output = output.replace(new RegExp(escapeRegExp(nom), 'gi'), MASQUE);
    });

  return output;
};

const extractCvText = async (buffer) => {
  assertPdf(buffer);
  const raw = normalize(await readText(buffer));

  if (raw.length < MIN_USEFUL_CHARS) {
    throw new CvError('EMPTY', "Aucun texte exploitable n'a ete trouve dans le CV");
  }

  const limite = maxChars();
  return {
    text: raw.length > limite ? raw.slice(0, limite) : raw,
    truncated: raw.length > limite,
  };
};

// Prepare le texte de CV utilisable par l'IA: extrait, borne et anonymise.
const prepareCvText = async (buffer, { noms = [] } = {}) => {
  const { text, truncated } = await extractCvText(buffer);
  return { text: redactPersonalData(text, { noms }), truncated };
};

const _setExtractorForTests = (fn) => {
  extracteur = fn;
};

const _resetForTests = () => {
  extracteur = null;
};

module.exports = {
  extractCvText,
  prepareCvText,
  redactPersonalData,
  CvError,
  _setExtractorForTests,
  _resetForTests,
};
