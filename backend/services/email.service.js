const crypto = require('crypto');
const { Resend } = require('resend');
const templates = require('./email.templates');

const DEFAULT_FROM = 'ASAKO <onboarding@resend.dev>';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

let resendClient = null;
let resendClientApiKey = null;
let testTransport = null;
let logger = console;
let warnedMissingApiKey = false;
let warnedDefaultFrom = false;

const sentEvents = new Map();

const getFrontendUrl = () => {
  const value = process.env.FRONTEND_URL || process.env.CLIENT_URL || DEFAULT_FRONTEND_URL;
  return String(value).trim().replace(/\/+$/, '');
};

const getFrom = () => {
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (from) return from;
  if (!warnedDefaultFrom) {
    warnedDefaultFrom = true;
    logger.warn('[email] EMAIL_FROM non defini : utilisation de onboarding@resend.dev (tests uniquement).');
  }
  return DEFAULT_FROM;
};

const normalizeRecipient = (value) => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const getTransport = () => {
  if (testTransport) return testTransport;
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!resendClient || resendClientApiKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendClientApiKey = apiKey;
  }
  return resendClient;
};

const forgetEvent = (key) => {
  if (key) sentEvents.delete(key);
};

const isDuplicateEvent = (key) => {
  if (!key) return false;
  const expiresAt = sentEvents.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sentEvents.delete(key);
    return false;
  }
  return true;
};

const rememberEvent = (key) => {
  if (!key) return;
  const now = Date.now();
  sentEvents.set(key, now + DEDUPE_TTL_MS);
  if (sentEvents.size > 500) {
    for (const [eventKey, expiresAt] of sentEvents) {
      if (expiresAt <= now) sentEvents.delete(eventKey);
    }
  }
};

const logError = (context, error) => {
  const message = error && error.message ? error.message : 'erreur inconnue';
  logger.error(`[email] ${context} : ${message}`);
};

const warnMissingApiKey = () => {
  if (warnedMissingApiKey) return;
  warnedMissingApiKey = true;
  logger.warn('[email] RESEND_API_KEY absente : les notifications e-mail sont desactivees.');
};

const sendEmail = async ({ to, subject, html, text, idempotencyKey }) => {
  const key = idempotencyKey || null;
  try {
    const recipient = normalizeRecipient(to);
    if (!recipient) return { sent: false, reason: 'invalid_recipient' };
    if (!subject || !html) return { sent: false, reason: 'invalid_content' };
    if (isDuplicateEvent(key)) return { sent: false, reason: 'duplicate' };

    const transport = getTransport();
    if (!transport) {
      warnMissingApiKey();
      return { sent: false, reason: 'not_configured' };
    }

    rememberEvent(key);

    const providerKey = key ? crypto.createHash('sha256').update(key).digest('hex') : null;
    const response = await transport.emails.send(
      {
        from: getFrom(),
        to: recipient,
        subject,
        html,
        text,
      },
      providerKey ? { idempotencyKey: providerKey } : undefined
    );

    if (response && response.error) {
      forgetEvent(key);
      logError('envoi refuse par Resend', new Error(response.error.message || 'erreur fournisseur'));
      return { sent: false, reason: 'provider_error' };
    }

    return { sent: true, id: response?.data?.id || response?.id || null };
  } catch (error) {
    forgetEvent(key);
    logError('echec envoi', error);
    return { sent: false, reason: 'send_error' };
  }
};

const sendCandidatureConfirmation = ({ candidature = {}, candidat = {}, offre = {} }) => {
  try {
    const data = {
      candidat: {
        prenom: candidat.prenom || candidature.prenom,
        nom: candidat.nom || candidature.nom,
      },
      offre,
      dateCandidature: candidature.date_candidature,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.candidatureConfirmation(data);
    return sendEmail({
      to: candidat.email || candidature.email,
      subject,
      html,
      text,
      idempotencyKey: candidature.id ? `candidature:${candidature.id}:confirmation` : null,
    });
  } catch (error) {
    logError('confirmation candidature', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const sendNouvelleCandidatureRecruteur = ({ candidature = {}, candidat = {}, offre = {}, recruteur = {} }) => {
  try {
    const data = {
      recruteur,
      candidat: {
        prenom: candidat.prenom || candidature.prenom,
        nom: candidat.nom || candidature.nom,
        email: candidat.email || candidature.email,
      },
      offre,
      dateCandidature: candidature.date_candidature,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.nouvelleCandidatureRecruteur(data);
    return sendEmail({
      to: recruteur.email,
      subject,
      html,
      text,
      idempotencyKey: candidature.id && recruteur.id
        ? `candidature:${candidature.id}:recruteur:${recruteur.id}`
        : null,
    });
  } catch (error) {
    logError('notification recruteur', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const notifyCandidatureCreated = async ({ candidature = {}, candidat = {}, offre = {}, admins = [] }) => {
  const tasks = [sendCandidatureConfirmation({ candidature, candidat, offre })];
  const contacted = new Set();
  (admins || []).forEach((recruteur) => {
    if (!recruteur || !recruteur.email) return;
    const recipient = normalizeRecipient(recruteur.email);
    if (!recipient || contacted.has(recipient)) return;
    contacted.add(recipient);
    tasks.push(sendNouvelleCandidatureRecruteur({ candidature, candidat, offre, recruteur }));
  });
  await Promise.allSettled(tasks);
};

const sendChangementStatut = ({ candidature = {}, statut, ancienStatut }) => {
  try {
    const offre = {
      titre: candidature.offre_titre,
      localisation: candidature.offre_localisation,
    };
    const data = {
      candidat: { prenom: candidature.prenom, nom: candidature.nom },
      offre,
      statut,
      ancienStatut,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.changementStatut(data);
    return sendEmail({
      to: candidature.email,
      subject,
      html,
      text,
      idempotencyKey: candidature.id
        ? `candidature:${candidature.id}:statut:${ancienStatut || 'initial'}:${statut}`
        : null,
    });
  } catch (error) {
    logError('changement de statut', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const sendEntretienPlanifie = ({ candidature = {}, entretien = {} }) => {
  try {
    const data = {
      candidat: { prenom: candidature.prenom, nom: candidature.nom },
      offre: {
        titre: candidature.offre_titre,
        localisation: candidature.offre_localisation,
      },
      entretien,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.entretienPlanifie(data);
    return sendEmail({
      to: candidature.email,
      subject,
      html,
      text,
      idempotencyKey: entretien.id ? `entretien:${entretien.id}:planifie` : null,
    });
  } catch (error) {
    logError('planification entretien', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const sendEntretienModifie = ({ candidature = {}, entretien = {}, reprogramme = false, changements = [] }) => {
  try {
    const data = {
      candidat: { prenom: candidature.prenom, nom: candidature.nom },
      offre: {
        titre: candidature.offre_titre,
        localisation: candidature.offre_localisation,
      },
      entretien,
      reprogramme,
      changements,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.entretienModifie(data);
    const slotKey = [
      entretien.date_entretien,
      entretien.heure_entretien,
      entretien.type_entretien,
      entretien.lieu,
    ].map((value) => (value === null || value === undefined ? '' : String(value))).join('|');
    return sendEmail({
      to: candidature.email,
      subject,
      html,
      text,
      idempotencyKey: entretien.id ? `entretien:${entretien.id}:modifie:${slotKey}` : null,
    });
  } catch (error) {
    logError('modification entretien', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const sendEntretienAnnule = ({ candidature = {}, entretien = {} }) => {
  try {
    const data = {
      candidat: { prenom: candidature.prenom, nom: candidature.nom },
      offre: {
        titre: candidature.offre_titre,
        localisation: candidature.offre_localisation,
      },
      entretien,
      frontendUrl: getFrontendUrl(),
    };
    const { subject, html, text } = templates.entretienAnnule(data);
    return sendEmail({
      to: candidature.email,
      subject,
      html,
      text,
      idempotencyKey: entretien.id ? `entretien:${entretien.id}:annule` : null,
    });
  } catch (error) {
    logError('annulation entretien', error);
    return Promise.resolve({ sent: false, reason: 'template_error' });
  }
};

const _resetForTests = () => {
  resendClient = null;
  resendClientApiKey = null;
  testTransport = null;
  logger = console;
  warnedMissingApiKey = false;
  warnedDefaultFrom = false;
  sentEvents.clear();
};

const _setTransportForTests = (transport) => {
  testTransport = transport;
};

const _setLoggerForTests = (nextLogger) => {
  logger = nextLogger || console;
};

module.exports = {
  sendEmail,
  notifyCandidatureCreated,
  sendCandidatureConfirmation,
  sendNouvelleCandidatureRecruteur,
  sendChangementStatut,
  sendEntretienPlanifie,
  sendEntretienModifie,
  sendEntretienAnnule,
  _resetForTests,
  _setTransportForTests,
  _setLoggerForTests,
};
