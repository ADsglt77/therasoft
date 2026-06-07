/**
 * Gabarits d'emails transactionnels (HTML « inline » + version texte).
 * Mise en page en tableaux + styles en ligne (compatibilité Gmail/Outlook).
 * Le logo est intégré via CID (cid:tsxcare-logo).
 */

const COLORS = {
  bg: '#eef2f7',
  card: '#ffffff',
  panel: '#f6f9fc',
  border: '#e2e8f0',
  navy: '#03045E',
  blue: '#0077B6',
  cyan: '#00B4D8',
  success: '#2A9D8F',
  danger: '#E76F51',
  text: '#2f353a',
  textSoft: '#46505a',
  muted: '#6b7684',
  footer: '#94a3b8',
};

const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface DetailRow {
  label: string;
  value: string;
}

export interface BookingEmailData {
  prenom: string;
  modaliteLabel: string;
  dateLabel: string;
  timeLabel: string;
  siteLabel: string;
  medecinLabel: string;
  link: string;
}

export interface VerificationEmailData {
  prenom: string;
  link: string;
}

export interface PasswordResetEmailData {
  prenom: string;
  link: string;
}

// --- Briques réutilisables ---

function button(label: string, href: string, bg: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:10px;">
        <a href="${href}" target="_blank" style="display:inline-block; padding:14px 34px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function detailsBox(rows: DetailRow[]): string {
  const trs = rows
    .map(
      (r) => `<tr>
        <td style="padding:7px 0; font-size:13px; color:${COLORS.muted}; width:96px; vertical-align:top; white-space:nowrap;">${r.label}</td>
        <td style="padding:7px 0; font-size:14px; color:${COLORS.text}; font-weight:600;">${r.value}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.panel}; border:1px solid ${COLORS.border}; border-radius:12px;">
    <tr><td style="padding:6px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>
    </td></tr>
  </table>`;
}

function layout(opts: { accent: string; preheader: string; content: string }): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
</head>
<body style="margin:0; padding:0; background-color:${COLORS.bg}; font-family:${FONT}; color:${COLORS.text};">
  <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:${COLORS.card}; border-radius:16px; overflow:hidden; border:1px solid ${COLORS.border};">
          <tr>
            <td align="center" style="padding:28px 24px 18px;">
              <img src="cid:tsxcare-logo" alt="TsXcare" width="170" style="display:block; width:170px; max-width:65%; height:auto;">
            </td>
          </tr>
          <tr><td style="height:4px; background-color:${opts.accent}; line-height:4px; font-size:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:32px 40px 28px;">
              ${opts.content}
            </td>
          </tr>
          <tr><td style="height:1px; background-color:${COLORS.border}; line-height:1px; font-size:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:20px 40px 28px;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.footer};">Cet email vous a été envoyé automatiquement par TsXcare. Merci de ne pas y répondre.</p>
              <p style="margin:12px 0 0; font-size:12px; color:${COLORS.footer};">© ${year} TsXcare</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; color:${COLORS.navy};">${text}</h1>`;
}
function paragraph(text: string, color = COLORS.textSoft): string {
  return `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${color};">${text}</p>`;
}
function spacer(h = 24): string {
  return `<div style="height:${h}px; line-height:${h}px; font-size:0;">&nbsp;</div>`;
}

// --- Emails ---

export function verificationEmail({ prenom, link }: VerificationEmailData) {
  const content = `
    ${heading('Confirmez votre adresse email')}
    ${paragraph(`Bonjour ${prenom},`, COLORS.text)}
    ${paragraph(`Merci de votre inscription sur <strong>TsXcare</strong>. Pour activer la prise de rendez-vous, confirmez votre adresse email en cliquant sur le bouton ci-dessous.`)}
    <table role="presentation" width="100%"><tr><td align="center" style="padding:8px 0 24px;">${button('Vérifier mon adresse email', link, COLORS.blue)}</td></tr></table>
    <p style="margin:0 0 10px; font-size:13px; line-height:1.6; color:${COLORS.muted};">Ce lien expire dans 24 heures.</p>
    <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.muted};">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
      <a href="${link}" target="_blank" style="color:${COLORS.blue}; word-break:break-all;">${link}</a>
    </p>`;
  return {
    subject: 'Confirmez votre adresse email — TsXcare',
    html: layout({ accent: COLORS.cyan, preheader: 'Confirmez votre adresse email pour activer la prise de rendez-vous.', content }),
    text: `Bonjour ${prenom},

Merci de votre inscription sur TsXcare. Pour activer la prise de rendez-vous, confirmez votre adresse email :
${link}

Ce lien expire dans 24 heures.

Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.
— TsXcare`,
  };
}

export function passwordResetEmail({ prenom, link }: PasswordResetEmailData) {
  const content = `
    ${heading('Réinitialisez votre mot de passe')}
    ${paragraph(`Bonjour ${prenom},`, COLORS.text)}
    ${paragraph('Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.')}
    <table role="presentation" width="100%"><tr><td align="center" style="padding:8px 0 24px;">${button('Réinitialiser mon mot de passe', link, COLORS.blue)}</td></tr></table>
    <p style="margin:0 0 10px; font-size:13px; line-height:1.6; color:${COLORS.muted};">Ce lien expire dans 1 heure.</p>
    <p style="margin:0 0 10px; font-size:13px; line-height:1.6; color:${COLORS.muted};">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
    <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.muted};">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
      <a href="${link}" target="_blank" style="color:${COLORS.blue}; word-break:break-all;">${link}</a>
    </p>`;
  return {
    subject: 'Réinitialisez votre mot de passe — TsXcare',
    html: layout({ accent: COLORS.cyan, preheader: 'Lien pour réinitialiser votre mot de passe.', content }),
    text: `Bonjour ${prenom},

Vous avez demandé à réinitialiser votre mot de passe. Choisissez-en un nouveau ici :
${link}

Ce lien expire dans 1 heure.

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.
— TsXcare`,
  };
}

export function bookingConfirmationEmail(d: BookingEmailData) {
  const rows: DetailRow[] = [
    { label: 'Date', value: d.dateLabel },
    { label: 'Heure', value: d.timeLabel },
    { label: 'Examen', value: d.modaliteLabel },
    { label: 'Lieu', value: d.siteLabel },
    { label: 'Médecin', value: d.medecinLabel },
  ];
  const content = `
    ${heading('Votre rendez-vous est confirmé')}
    ${paragraph(`Bonjour ${d.prenom},`, COLORS.text)}
    ${paragraph('Votre rendez-vous a bien été enregistré. Voici le récapitulatif :')}
    ${detailsBox(rows)}
    ${spacer(24)}
    <table role="presentation" width="100%"><tr><td align="center">${button('Voir mes rendez-vous', d.link, COLORS.blue)}</td></tr></table>
    ${spacer(20)}
    <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.muted};">Besoin de modifier ou d'annuler ? Rendez-vous dans « Mes rendez-vous ».</p>`;
  return {
    subject: 'Votre rendez-vous est confirmé — TsXcare',
    html: layout({ accent: COLORS.success, preheader: `Rendez-vous confirmé le ${d.dateLabel} à ${d.timeLabel}.`, content }),
    text: `Bonjour ${d.prenom},

Votre rendez-vous est confirmé :
- Date : ${d.dateLabel}
- Heure : ${d.timeLabel}
- Examen : ${d.modaliteLabel}
- Lieu : ${d.siteLabel}
- Médecin : ${d.medecinLabel}

Vos rendez-vous : ${d.link}
— TsXcare`,
  };
}

export function bookingCancellationEmail(d: BookingEmailData) {
  const rows: DetailRow[] = [
    { label: 'Date', value: d.dateLabel },
    { label: 'Heure', value: d.timeLabel },
    { label: 'Examen', value: d.modaliteLabel },
    { label: 'Lieu', value: d.siteLabel },
    { label: 'Médecin', value: d.medecinLabel },
  ];
  const content = `
    ${heading('Votre rendez-vous a été annulé')}
    ${paragraph(`Bonjour ${d.prenom},`, COLORS.text)}
    ${paragraph('Le rendez-vous suivant a bien été annulé :')}
    ${detailsBox(rows)}
    ${spacer(24)}
    <table role="presentation" width="100%"><tr><td align="center">${button('Prendre un nouveau rendez-vous', d.link, COLORS.blue)}</td></tr></table>
    ${spacer(20)}
    <p style="margin:0; font-size:13px; line-height:1.6; color:${COLORS.muted};">Si vous n'êtes pas à l'origine de cette annulation, contactez votre médecin.</p>`;
  return {
    subject: 'Votre rendez-vous a été annulé — TsXcare',
    html: layout({ accent: COLORS.danger, preheader: `Rendez-vous annulé : ${d.dateLabel} à ${d.timeLabel}.`, content }),
    text: `Bonjour ${d.prenom},

Le rendez-vous suivant a été annulé :
- Date : ${d.dateLabel}
- Heure : ${d.timeLabel}
- Examen : ${d.modaliteLabel}
- Lieu : ${d.siteLabel}
- Médecin : ${d.medecinLabel}

Prendre un nouveau rendez-vous : ${d.link}
— TsXcare`,
  };
}
