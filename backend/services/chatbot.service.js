const Candidature = require('../models/candidature.model');
const Entretien = require('../models/entretien.model');
const Offre = require('../models/offre.model');
const Competence = require('../models/competence.model');
const gemini = require('./gemini.service');
const { redactPersonalData } = require('./cv.service');

const MAX_ELEMENTS = 10;
const MAX_TEXTE = 400;
const MAX_CONTEXTE = 8000;
const MAX_COMPETENCES = 30;

const REGLES_COMMUNES = [
  "Tu es l'assistant IA d'ASAKO, plateforme de gestion de recrutement.",
  "Tu reponds en francais, de facon concise et professionnelle (environ 200 mots maximum).",
  'Tu utilises uniquement les DONNEES FOURNIES dans le message. Tu ne dois jamais inventer une offre, un statut, une date, une competence ou un entretien.',
  "Si l'information demandee n'est pas dans les donnees, tu l'indiques clairement et tu proposes la prochaine etape utile.",
  'Tu ne divulgues jamais de donnees personnelles (nom, prenom, e-mail, telephone, adresse) et tu ne les cites pas.',
  "Tu ne prends aucune decision de recrutement: tu n'acceptes, ne rejettes et ne classes jamais une candidature. La decision appartient toujours a l'etre humain.",
];

const SYSTEM_INSTRUCTIONS = {
  candidat: [
    ...REGLES_COMMUNES,
    'Tu assistes un candidat: ses candidatures, ses entretiens, la comparaison de ses competences avec une offre, des conseils de CV et la preparation d entretien.',
    "Tu ne parles que du candidat connecte: les donnees fournies sont deja limitees a son perimetre.",
  ].join('\n'),
  admin: [
    ...REGLES_COMMUNES,
    "Tu assistes un recruteur: offres publiees, candidatures recues, competences des candidats, points forts et competences manquantes par rapport a une offre.",
    'Tu fournis une synthese objective pour aider a la preselection, sans jamais decider a la place du recruteur.',
    'Les candidats sont designes par des identifiants internes (candidature / candidat), jamais par leur identite.',
  ].join('\n'),
};

const texte = (value, max = MAX_TEXTE) => {
  const str = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!str) return 'non renseigne';
  return str.length > max ? `${str.slice(0, max)}...` : str;
};

// Anonymise les champs libres (lettre de motivation, description d'offre...).
const anonyme = (value, max = MAX_TEXTE) => redactPersonalData(texte(value, max));

// Les champs libres saisis par un candidat peuvent contenir son identite:
// on masque explicitement les noms de la ligne avant l'envoi a l'IA.
const nomsDe = (row) =>
  [row?.nom, row?.prenom, `${row?.prenom ?? ''} ${row?.nom ?? ''}`, `${row?.nom ?? ''} ${row?.prenom ?? ''}`]
    .map((nom) => String(nom ?? '').trim())
    .filter((nom) => nom.length >= 2);

const anonymeCandidat = (value, row, max = 300) =>
  redactPersonalData(texte(value, max), { noms: nomsDe(row) });

const dateCourte = (value) => {
  if (!value) return 'non renseignee';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'non renseignee' : parsed.toISOString().slice(0, 10);
};

const borner = (value) =>
  value.length > MAX_CONTEXTE ? `${value.slice(0, MAX_CONTEXTE)}\n[contexte tronque]` : value;

const offresEnTexte = (offres) => {
  const lignes = ['OFFRES PUBLIEES :'];
  if (!offres.length) {
    lignes.push('- aucune offre disponible');
    return lignes;
  }
  offres.forEach((offre) => {
    lignes.push(
      `- Offre #${offre.id} | ${anonyme(offre.titre, 120)} | Lieu : ${anonyme(offre.localisation, 80)} | Salaire : ${anonyme(offre.salaire, 60)} | Date limite : ${dateCourte(offre.date_limite)} | Description : ${anonyme(offre.description)}`
    );
  });
  return lignes;
};

const buildCandidateContext = async (user) => {
  const [candidatures, entretiens, competences, offres] = await Promise.all([
    Candidature.list({ userId: user.id, limit: MAX_ELEMENTS, offset: 0 }),
    Entretien.list({ userId: user.id, limit: MAX_ELEMENTS, offset: 0 }),
    Competence.listByCandidat(user.id),
    Offre.list({ limit: MAX_ELEMENTS, offset: 0 }),
  ]);

  const lignes = [`PROFIL DU CANDIDAT CONNECTE (identifiant interne #${user.id})`];

  lignes.push('', 'COMPETENCES DECLAREES :');
  if (!competences.length) {
    lignes.push('- aucune competence renseignee');
  } else {
    competences.slice(0, MAX_COMPETENCES).forEach((competence) => {
      lignes.push(`- ${anonyme(competence.nom, 80)} : niveau ${Number(competence.niveau) || 0}/100`);
    });
  }

  lignes.push('', 'CANDIDATURES DU CANDIDAT :');
  if (!candidatures.rows.length) {
    lignes.push('- aucune candidature');
  } else {
    candidatures.rows.slice(0, MAX_ELEMENTS).forEach((candidature) => {
      lignes.push(
        `- Candidature #${candidature.id} | Offre : ${anonyme(candidature.offre_titre, 120)} | Statut : ${anonyme(candidature.statut, 40)} | Deposee le : ${dateCourte(candidature.date_candidature)} | Lettre de motivation : ${anonymeCandidat(candidature.lettre_motivation, candidature)}`
      );
    });
  }

  lignes.push('', 'ENTRETIENS DU CANDIDAT :');
  if (!entretiens.rows.length) {
    lignes.push('- aucun entretien programme');
  } else {
    entretiens.rows.slice(0, MAX_ELEMENTS).forEach((entretien) => {
      lignes.push(
        `- Entretien #${entretien.id} | Offre : ${anonyme(entretien.offre_titre, 120)} | Date : ${dateCourte(entretien.date_entretien)} ${anonyme(entretien.heure_entretien, 10)} | Type : ${anonyme(entretien.type_entretien, 40)} | Lieu : ${anonyme(entretien.lieu, 120)} | Reponse du candidat : ${anonyme(entretien.reponse_candidat, 40)} | Resultat : ${anonyme(entretien.resultat, 120)}`
      );
    });
  }

  lignes.push('', ...offresEnTexte(offres.rows.slice(0, MAX_ELEMENTS)));

  return borner(lignes.join('\n'));
};

const buildAdminContext = async () => {
  const [offres, candidatures] = await Promise.all([
    Offre.list({ limit: MAX_ELEMENTS, offset: 0 }),
    Candidature.list({ limit: MAX_ELEMENTS, offset: 0 }),
  ]);

  const competencesParCandidature = await Promise.all(
    candidatures.rows.map((candidature) =>
      Competence.listByCandidat(candidature.utilisateur_id).catch(() => [])
    )
  );

  const lignes = ['PERIMETRE RECRUTEUR (donnees anonymisees)'];

  lignes.push('', ...offresEnTexte(offres.rows.slice(0, MAX_ELEMENTS)));

  lignes.push('', 'CANDIDATURES RECUES :');
  if (!candidatures.rows.length) {
    lignes.push('- aucune candidature');
  } else {
    candidatures.rows.slice(0, MAX_ELEMENTS).forEach((candidature, index) => {
      const competences = competencesParCandidature[index] || [];
      const listeCompetences = competences.length
        ? competences
            .slice(0, MAX_COMPETENCES)
            .map((competence) => `${anonyme(competence.nom, 60)} (${Number(competence.niveau) || 0}/100)`)
            .join(', ')
        : 'aucune competence renseignee';

      lignes.push(
        `- Candidature #${candidature.id} | Candidat #${candidature.utilisateur_id} | Offre : ${anonyme(candidature.offre_titre, 120)} | Statut : ${anonyme(candidature.statut, 40)} | Deposee le : ${dateCourte(candidature.date_candidature)} | Lettre de motivation : ${anonymeCandidat(candidature.lettre_motivation, candidature)} | Competences : ${listeCompetences}`
      );
    });
  }

  return borner(lignes.join('\n'));
};

const buildContext = async (user) => {
  if (!user || !user.id) return '';
  if (user.role === 'admin') return buildAdminContext();
  return buildCandidateContext(user);
};

const ask = async ({ user, question, history = [] }) => {
  const contexte = await buildContext(user);
  const instruction = SYSTEM_INSTRUCTIONS[user?.role] || SYSTEM_INSTRUCTIONS.candidat;

  const prompt = [
    'DONNEES DISPONIBLES DANS ASAKO (fournies par le backend, deja anonymisees) :',
    contexte || 'aucune donnee disponible',
    '',
    '---',
    `QUESTION : ${String(question ?? '').trim()}`,
  ].join('\n');

  const { text } = await gemini.generate({
    systemInstruction: instruction,
    prompt,
    history,
  });

  return { answer: text };
};

module.exports = {
  buildContext,
  buildCandidateContext,
  buildAdminContext,
  ask,
  SYSTEM_INSTRUCTIONS,
};
