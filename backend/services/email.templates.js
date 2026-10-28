const { formatFrDate, formatFrTime } = require('../utils/dates');

const BRAND = '#0f172a';
const ACCENT = '#0ea5e9';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const fullName = (person = {}) => [person.prenom, person.nom].filter(Boolean).join(' ').trim();

const normalizeStatusLabel = (statut) => {
  if (statut === 'Accepte') return 'Accepté';
  if (statut === 'Refuse') return 'Refusé';
  return statut || 'En attente';
};

const statusBadge = (statut) => {
  const label = normalizeStatusLabel(statut);
  const tones = {
    'Accepté': ['#ecfdf5', '#047857'],
    'Refusé': ['#fef2f2', '#b91c1c'],
    'Entretien': ['#eff6ff', '#1d4ed8'],
    'En attente': ['#fffbeb', '#b45309'],
  };
  const [background, color] = tones[label] || ['#f1f5f9', '#334155'];
  return `<span style="display:inline-block;padding:7px 14px;border-radius:999px;background-color:${background};color:${color};font-size:13px;font-weight:700;">${escapeHtml(label)}</span>`;
};

const detailsTable = (rows) => {
  const cells = rows
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([label, value]) => `
      <tr>
        <td style="padding:11px 0;border-bottom:1px solid #eef2f7;font-size:13px;line-height:1.5;color:${MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:11px 0;border-bottom:1px solid #eef2f7;font-size:14px;line-height:1.5;color:${BRAND};font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`)
    .join('');
  if (!cells) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">${cells}</table>`;
};

const paragraph = (html) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">${html}</p>`;

const button = (url, label) => {
  if (!url) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
      <tr>
        <td style="border-radius:10px;background-color:${BRAND};">
          <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
};

const changeList = (changes = []) => {
  const items = changes.filter(Boolean).map((change) => `<li style="margin:6px 0;">${escapeHtml(change)}</li>`);
  if (!items.length) return '';
  return `<ul style="margin:16px 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#334155;">${items.join('')}</ul>`;
};

const layout = ({ title, preheader, heading, content, cta, ctaLabel, footerNote, frontendUrl }) => {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safeTitle}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .email-heading { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f6fb;font-family:${FONT};color:${BRAND};">
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader || title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f6fb;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
          <tr>
            <td style="background-color:${BRAND};padding:26px 32px;">
              <div style="font-family:${FONT};font-size:24px;font-weight:800;letter-spacing:1.5px;line-height:1;color:#ffffff;">ASAKO<span style="color:${ACCENT};">.</span></div>
              <div style="margin-top:6px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Recrutement et talents</div>
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:34px 32px 30px;">
              <h1 class="email-heading" style="margin:0 0 20px;font-family:${FONT};font-size:25px;line-height:1.3;font-weight:800;color:${BRAND};">${escapeHtml(heading)}</h1>
              ${content}
              ${button(cta, ctaLabel)}
            </td>
          </tr>
          <tr>
            <td class="email-padding" style="padding:22px 32px;background-color:#f8fafc;border-top:1px solid ${BORDER};">
              ${footerNote ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">${escapeHtml(footerNote)}</p>` : ''}
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">Cet e-mail a été envoyé automatiquement par ASAKO. Merci de ne pas y répondre.</p>
              ${frontendUrl ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;"><a href="${escapeHtml(frontendUrl)}" target="_blank" style="color:${ACCENT};text-decoration:none;">${escapeHtml(frontendUrl)}</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const candidatureConfirmation = ({ candidat = {}, offre = {}, dateCandidature, frontendUrl }) => {
  const prenom = candidat.prenom || '';
  const offreTitre = offre.titre || 'votre offre';
  const subject = `Candidature reçue : ${offreTitre}`;
  const content = [
    paragraph(`Bonjour ${escapeHtml(prenom || 'à vous')},`),
    paragraph(`Nous confirmons la bonne réception de votre candidature pour l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong>.`),
    detailsTable([
      ['Offre', offreTitre],
      ['Lieu', offre.localisation],
      ['Date de candidature', formatFrDate(dateCandidature)],
      ['Statut', 'En attente'],
    ]),
    paragraph('Notre équipe va étudier votre dossier. Vous recevrez un nouvel e-mail dès que le statut de votre candidature évoluera.'),
  ].join('');
  const text = [
    `Bonjour ${prenom || ''},`,
    '',
    `Nous confirmons la bonne réception de votre candidature pour l'offre "${offreTitre}".`,
    offre.localisation ? `Lieu : ${offre.localisation}` : '',
    formatFrDate(dateCandidature) ? `Date de candidature : ${formatFrDate(dateCandidature)}` : '',
    'Statut : En attente',
    '',
    "Notre équipe va étudier votre dossier. Vous recevrez un nouvel e-mail dès que le statut de votre candidature évoluera.",
    '',
    `${frontendUrl}/mon-espace`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Votre candidature pour ${offreTitre} a bien été reçue.`,
      heading: 'Votre candidature a bien été reçue',
      content,
      cta: `${frontendUrl}/mon-espace`,
      ctaLabel: 'Suivre ma candidature',
      footerNote: 'Vous recevez cet e-mail car vous avez postulé via ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

const nouvelleCandidatureRecruteur = ({ recruteur = {}, candidat = {}, offre = {}, dateCandidature, frontendUrl }) => {
  const candidatNom = fullName(candidat) || 'Un candidat';
  const offreTitre = offre.titre || 'votre offre';
  const subject = `Nouvelle candidature : ${candidatNom} - ${offreTitre}`;
  const content = [
    paragraph(`Bonjour ${escapeHtml(recruteur.prenom || '')},`),
    paragraph(`Une nouvelle candidature vient d'être déposée pour l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong>.`),
    detailsTable([
      ['Candidat', candidatNom],
      ['E-mail', candidat.email],
      ['Offre', offreTitre],
      ['Lieu', offre.localisation],
      ['Date de candidature', formatFrDate(dateCandidature)],
    ]),
    paragraph('Connectez-vous à votre espace recruteur pour consulter le CV et poursuivre le traitement de la candidature.'),
  ].join('');
  const text = [
    `Bonjour ${recruteur.prenom || ''},`,
    '',
    `Une nouvelle candidature a été déposée pour l'offre "${offreTitre}".`,
    `Candidat : ${candidatNom}`,
    candidat.email ? `E-mail : ${candidat.email}` : '',
    offre.localisation ? `Lieu : ${offre.localisation}` : '',
    formatFrDate(dateCandidature) ? `Date de candidature : ${formatFrDate(dateCandidature)}` : '',
    '',
    'Connectez-vous à votre espace recruteur pour consulter le CV et poursuivre le traitement de la candidature.',
    '',
    `${frontendUrl}/candidatures`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Nouvelle candidature de ${candidatNom} pour ${offreTitre}.`,
      heading: 'Nouvelle candidature reçue',
      content,
      cta: `${frontendUrl}/candidatures`,
      ctaLabel: 'Voir les candidatures',
      footerNote: 'Vous recevez cet e-mail en tant que recruteur ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

const changementStatut = ({ candidat = {}, offre = {}, statut, ancienStatut, frontendUrl }) => {
  const prenom = candidat.prenom || '';
  const offreTitre = offre.titre || 'votre offre';
  const statutLabel = normalizeStatusLabel(statut);
  const subject = `Mise à jour de votre candidature : ${offreTitre}`;
  const content = [
    paragraph(`Bonjour ${escapeHtml(prenom || 'à vous')},`),
    paragraph(`Le statut de votre candidature pour l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong> vient d'être mis à jour.`),
    `<div style="margin:22px 0 8px;">${statusBadge(statut)}</div>`,
    detailsTable([
      ['Candidat', fullName(candidat)],
      ['Offre', offreTitre],
      ['Lieu', offre.localisation],
      ['Ancien statut', ancienStatut ? normalizeStatusLabel(ancienStatut) : ''],
      ['Nouveau statut', statutLabel],
    ]),
    paragraph('Vous pouvez consulter le détail de votre candidature et suivre son avancement depuis votre espace personnel.'),
  ].join('');
  const text = [
    `Bonjour ${prenom || ''},`,
    '',
    `Le statut de votre candidature pour l'offre "${offreTitre}" a été mis à jour.`,
    ancienStatut ? `Ancien statut : ${normalizeStatusLabel(ancienStatut)}` : '',
    `Nouveau statut : ${statutLabel}`,
    offre.localisation ? `Lieu : ${offre.localisation}` : '',
    '',
    'Vous pouvez consulter le détail de votre candidature depuis votre espace personnel.',
    '',
    `${frontendUrl}/mon-espace`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Votre candidature pour ${offreTitre} est maintenant : ${statutLabel}.`,
      heading: 'Votre candidature a été mise à jour',
      content,
      cta: `${frontendUrl}/mon-espace`,
      ctaLabel: 'Voir ma candidature',
      footerNote: 'Vous recevez cet e-mail car vous avez postulé via ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

const interviewRows = (offre = {}, entretien = {}, candidat = {}) => [
  ['Candidat', fullName(candidat)],
  ['Offre', offre.titre],
  ['Lieu de l\'offre', offre.localisation],
  ['Date', formatFrDate(entretien.date_entretien)],
  ['Heure', formatFrTime(entretien.heure_entretien)],
  ['Type', entretien.type_entretien],
  ['Lieu de l\'entretien', entretien.lieu],
  ['Commentaire', entretien.commentaire],
];

const entretienPlanifie = ({ candidat = {}, offre = {}, entretien = {}, frontendUrl }) => {
  const prenom = candidat.prenom || '';
  const offreTitre = offre.titre || 'votre offre';
  const subject = `Entretien planifié : ${offreTitre}`;
  const day = formatFrDate(entretien.date_entretien);
  const heure = formatFrTime(entretien.heure_entretien);
  const content = [
    paragraph(`Bonjour ${escapeHtml(prenom || 'à vous')},`),
    paragraph(`Un entretien a été planifié dans le cadre de votre candidature à l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong>.`),
    detailsTable(interviewRows(offre, entretien, candidat)),
    paragraph('Merci de vous présenter à l\'heure indiquée. Si vous ne pouvez pas être disponible, contactez rapidement notre équipe.'),
  ].join('');
  const text = [
    `Bonjour ${prenom || ''},`,
    '',
    `Un entretien a été planifié pour votre candidature à l'offre "${offreTitre}".`,
    day ? `Date : ${day}` : '',
    heure ? `Heure : ${heure}` : '',
    entretien.type_entretien ? `Type : ${entretien.type_entretien}` : '',
    entretien.lieu ? `Lieu : ${entretien.lieu}` : '',
    entretien.commentaire ? `Commentaire : ${entretien.commentaire}` : '',
    '',
    "Merci de vous présenter à l'heure indiquée. Si vous ne pouvez pas être disponible, contactez rapidement notre équipe.",
    '',
    `${frontendUrl}/mon-espace`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Entretien pour ${offreTitre}${day ? ` le ${day}` : ''}${heure ? ` à ${heure}` : ''}.`,
      heading: 'Votre entretien est planifié',
      content,
      cta: `${frontendUrl}/mon-espace`,
      ctaLabel: 'Voir mon espace',
      footerNote: 'Vous recevez cet e-mail car vous avez postulé via ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

const entretienModifie = ({ candidat = {}, offre = {}, entretien = {}, reprogramme, changements = [], frontendUrl }) => {
  const prenom = candidat.prenom || '';
  const offreTitre = offre.titre || 'votre offre';
  const subject = `${reprogramme ? 'Entretien reprogrammé' : 'Entretien modifié'} : ${offreTitre}`;
  const day = formatFrDate(entretien.date_entretien);
  const heure = formatFrTime(entretien.heure_entretien);
  const content = [
    paragraph(`Bonjour ${escapeHtml(prenom || 'à vous')},`),
    paragraph(`Votre entretien pour l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong> a été ${reprogramme ? 'reprogrammé' : 'modifié'}.`),
    changeList(changements),
    detailsTable(interviewRows(offre, entretien, candidat)),
    paragraph('Merci de prendre en compte ces nouvelles informations.'),
  ].join('');
  const text = [
    `Bonjour ${prenom || ''},`,
    '',
    `Votre entretien pour l'offre "${offreTitre}" a été ${reprogramme ? 'reprogrammé' : 'modifié'}.`,
    ...changements,
    day ? `Date : ${day}` : '',
    heure ? `Heure : ${heure}` : '',
    entretien.type_entretien ? `Type : ${entretien.type_entretien}` : '',
    entretien.lieu ? `Lieu : ${entretien.lieu}` : '',
    '',
    'Merci de prendre en compte ces nouvelles informations.',
    '',
    `${frontendUrl}/mon-espace`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `Votre entretien pour ${offreTitre} a été ${reprogramme ? 'reprogrammé' : 'modifié'}.`,
      heading: reprogramme ? 'Votre entretien a été reprogrammé' : 'Votre entretien a été modifié',
      content,
      cta: `${frontendUrl}/mon-espace`,
      ctaLabel: 'Voir mon espace',
      footerNote: 'Vous recevez cet e-mail car vous avez postulé via ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

const entretienAnnule = ({ candidat = {}, offre = {}, entretien = {}, frontendUrl }) => {
  const prenom = candidat.prenom || '';
  const offreTitre = offre.titre || 'votre offre';
  const subject = `Entretien annulé : ${offreTitre}`;
  const day = formatFrDate(entretien.date_entretien);
  const heure = formatFrTime(entretien.heure_entretien);
  const content = [
    paragraph(`Bonjour ${escapeHtml(prenom || 'à vous')},`),
    paragraph(`Nous vous informons que l'entretien prévu pour l'offre <strong style="color:${BRAND};">${escapeHtml(offreTitre)}</strong> a été annulé.`),
    detailsTable([
      ['Candidat', fullName(candidat)],
      ['Offre', offreTitre],
      ['Date', day],
      ['Heure', heure],
      ['Type', entretien.type_entretien],
      ['Lieu', entretien.lieu],
    ]),
    paragraph('Notre équipe reviendra vers vous pour la suite de votre candidature. Nous vous remercions de votre compréhension.'),
  ].join('');
  const text = [
    `Bonjour ${prenom || ''},`,
    '',
    `Nous vous informons que l'entretien prévu pour l'offre "${offreTitre}" a été annulé.`,
    day ? `Date : ${day}` : '',
    heure ? `Heure : ${heure}` : '',
    entretien.type_entretien ? `Type : ${entretien.type_entretien}` : '',
    entretien.lieu ? `Lieu : ${entretien.lieu}` : '',
    '',
    'Notre équipe reviendra vers vous pour la suite de votre candidature. Nous vous remercions de votre compréhension.',
    '',
    `${frontendUrl}/mon-espace`,
  ].filter(Boolean).join('\n');
  return {
    subject,
    html: layout({
      title: subject,
      preheader: `L'entretien pour ${offreTitre} est annulé.`,
      heading: 'Votre entretien a été annulé',
      content,
      cta: `${frontendUrl}/mon-espace`,
      ctaLabel: 'Voir mon espace',
      footerNote: 'Vous recevez cet e-mail car vous avez postulé via ASAKO.',
      frontendUrl,
    }),
    text,
  };
};

module.exports = {
  escapeHtml,
  candidatureConfirmation,
  nouvelleCandidatureRecruteur,
  changementStatut,
  entretienPlanifie,
  entretienModifie,
  entretienAnnule,
};
