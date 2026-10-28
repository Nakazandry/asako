const crypto = require('crypto');
const { Resend } = require('resend');
const templates = require('./email.templates');

// Expediteur de secours : domaine de test Resend. Il ne permet d'ecrire qu'a
// l'adresse du compte Resend, jamais aux candidats en production.
const DEFAULT_FROM = 'ASAKO <onboarding@resend.dev>';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';
// Frontend deploye : utilise comme secours en production si FRONTEND_URL est
// absent ou pointe encore vers localhost.
const DEFAULT_FRONTEND_URL_PRODUCTION = 'https://asako-beta.vercel.app';
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
const SECRET_PATTERN = /re_[A-Za-z0-9_-]{8,}/g;

let resendClient = null;
let resendClientApiKey = null;
let testTransport = null;
let logger = console;
const warningsEmitted = new Set();

const sentEvents = new Map();

const isProduction = () => String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

const warnOnce = (id, message) => {
  if (warningsEmitted.has(id)) return;
  warningsEmitted.add(id);
  logger.warn(message);
};

const maskEmail = (email) => {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
};

const normalizeRecipient = (value) => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

// Accepte "adresse@domaine.tld" et "Nom <adresse@domaine.tld>".
const isValidSender = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const angle = raw.match(/<([^>]+)>/);
  return Boolean(normalizeRecipient(angle ? angle[1] : raw));
};

const isLocalUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  try {
    return LOCAL_HOSTNAMES.has(new URL(raw).hostname.toLowerCase());
  } catch (_error) {
    return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(raw);
  }
};

const getFrontendUrl = () => {
  const fallback = isProduction() ? DEFAULT_FRONTEND_URL_PRODUCTION : DEFAULT_FRONTEND_URL;
  const configured = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
    .trim()
    .replace(/\/+$/, '');

  if (!configured) {
    warnOnce('frontend-url-missing', `[email] FRONTEND_URL absent : liens des e-mails -> ${fallback}`);
    return fallback;
  }

  if (isProduction() && isLocalUrl(configured)) {
    warnOnce(
      'frontend-url-local',
      `[email] FRONTEND_URL=${configured} est une adresse locale en production : liens des e-mails -> ${fallback}`
    );
    return fallback;
  }

  if (!/^https?:\/\//i.test(configured)) {
    const withScheme = `${isProduction() ? 'https' : 'http'}://${configured}`;
    warnOnce('frontend-url-scheme', `[email] FRONTEND_URL sans protocole : utilisation de ${withScheme}`);
    return withScheme;
  }

  return configured;
};

const getFrom = () => {
  const configured = String(process.env.EMAIL_FROM || '').trim();

  if (configured && isValidSender(configured)) {
    if (isProduction() && /@resend\.dev>?$/i.test(configured)) {
      warnOnce(
        'from-test-domain',
        "[email] EMAIL_FROM utilise onboarding@resend.dev : Resend n'autorise l'envoi que vers l'adresse du compte. Verifiez un domaine sur https://resend.com/domains."
      );
    }
    return configured;
  }

  if (configured) {
    warnOnce('from-invalid', '[email] EMAIL_FROM invalide : valeur ignoree, utilisation de l expediteur de secours.');
  } else if (isProduction()) {
    warnOnce(
      'from-missing-production',
      "[email] EMAIL_FROM absent en production : expediteur de secours onboarding@resend.dev (livraison limitee a l'adresse du compte Resend)."
    );
  } else {
    warnOnce('from-missing', '[email] EMAIL_FROM non defini : utilisation de onboarding@resend.dev (tests uniquement).');
  }

  return DEFAULT_FROM;
};

// Redirection de demonstration : desactivee par defaut (y compris en
// production). Elle exige explicitement EMAIL_DEMO_REDIRECT_ENABLED=true ET une
// adresse valide dans EMAIL_DEMO_REDIRECT_TO. Aucun compte n'est modifie.
const getDemoRedirect = () => {
  const enabled = TRUTHY_VALUES.has(String(process.env.EMAIL_DEMO_REDIRECT_ENABLED || '').trim().toLowerCase());
  if (!enabled) return { enabled: false, to: null };

  const target = normalizeRecipient(process.env.EMAIL_DEMO_REDIRECT_TO);
  if (!target) {
    warnOnce(
      'demo-redirect-target',
      '[email] EMAIL_DEMO_REDIRECT_ENABLED est actif mais EMAIL_DEMO_REDIRECT_TO est absente ou invalide : redirection ignoree, envoi vers les destinataires reels.'
    );
    return { enabled: false, to: null };
  }

  warnOnce(
    'demo-redirect-active',
    `[email] MODE DEMO actif : les e-mails sont rediriges vers ${maskEmail(target)} (aucun envoi aux destinataires reels).`
  );
  return { enabled: true, to: target };
};

const getEmailConfig = () => {
  const demo = getDemoRedirect();
  return {
    environment: isProduction() ? 'production' : 'development',
    providerConfigured: Boolean(String(process.env.RESEND_API_KEY || '').trim()),
    from: getFrom(),
    frontendUrl: getFrontendUrl(),
    dedupeTtlHours: Math.round(DEDUPE_TTL_MS / (60 * 60 * 1000)),
    demoRedirect: { enabled: demo.enabled, to: demo.to },
  };
};

// Journalise la configuration active au demarrage (jamais la cle API).
const logEmailConfiguration = () => {
  const config = getEmailConfig();
  const demo = config.demoRedirect.enabled ? `activee vers ${maskEmail(config.demoRedirect.to)}` : 'desactivee';
  const line = `[email] env=${config.environment} expediteur="${config.from}" frontend=${config.frontendUrl} cle RESEND=${config.providerConfigured ? 'presente' : 'ABSENTE'} redirection demo=${demo}`;
  if (typeof logger.info === 'function') logger.info(line);
  else logger.warn(line);
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

// Masque toute cle API (Resend ou token "re_...") avant journalisation.
const redactSecrets = (value) => {
  let text = String(value === null || value === undefined ? '' : value);
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (apiKey) text = text.split(apiKey).join('[cle masquee]');
  return text.replace(SECRET_PATTERN, '[cle masquee]');
};

const logError = (context, error) => {
  const message = error && error.message ? error.message : 'erreur inconnue';
  logger.error(`[email] ${context} : ${redactSecrets(message)}`);
};

const warnMissingApiKey = () => {
  warnOnce('missing-api-key', '[email] RESEND_API_KEY absente : les notifications e-mail sont desactivees.');
};

const warnResendTestSender = (from) => {
  if (!/@resend\.dev>?$/i.test(String(from || ''))) return;
  warnOnce(
    'provider-test-domain',
    "[email] Expéditeur onboarding@resend.dev : Resend n'accepte que les envois vers l'adresse du compte. Configurez un domaine verifie dans EMAIL_FROM, ou activez EMAIL_DEMO_REDIRECT_TO pour la demonstration."
  );
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

    const from = getFrom();
    const demo = getDemoRedirect();
    const redirected = Boolean(demo.enabled && demo.to && demo.to !== recipient);
    const finalRecipient = redirected ? demo.to : recipient;

    rememberEvent(key);

    const providerKey = key ? crypto.createHash('sha256').update(key).digest('hex') : null;
    const payload = {
      from,
      to: finalRecipient,
      subject,
      html,
      text,
    };
    if (redirected) {
      // Trace exploitable dans Resend : le destinataire reel reste visible cote
      // serveur, sans jamais recevoir l'e-mail.
      payload.headers = {
        'X-ASAKO-Demo-Redirect': 'true',
        'X-ASAKO-Original-Recipient': recipient,
      };
    }

    const response = await transport.emails.send(
      payload,
      providerKey ? { idempotencyKey: providerKey } : undefined
    );

    if (response && response.error) {
      forgetEvent(key);
      const providerError = response.error;
      const detail = typeof providerError === 'string'
        ? providerError
        : (providerError && providerError.message) || 'erreur fournisseur';
      const status = providerError && providerError.statusCode ? ` (HTTP ${providerError.statusCode})` : '';
      logError(`envoi refuse par Resend${status}`, new Error(detail));
      warnResendTestSender(from);
      return { sent: false, reason: 'provider_error' };
    }

    const id = response?.data?.id || response?.id || null;
    return redirected ? { sent: true, id, redirectedTo: finalRecipient } : { sent: true, id };
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
  warningsEmitted.clear();
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
  getEmailConfig,
  logEmailConfiguration,
  _resetForTests,
  _setTransportForTests,
  _setLoggerForTests,
};
