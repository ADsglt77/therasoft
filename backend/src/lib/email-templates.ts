/**
 * Gabarits d'emails transactionnels — version simple (sans carte) :
 * logo, contenu, et un pied de page léger. Styles en ligne (compatibilité
 * Gmail/Outlook). Le logo est intégré via CID (cid:tsxcare-logo).
 */

const COLORS = {
  text: '#2f353a',
  textSoft: '#46505a',
  muted: '#6b7684',
  navy: '#03045E',
  blue: '#0077B6',
  border: '#e2e8f0',
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

function button(label: string, href: string): string {
  return `<a href="${href}" target="_blank" style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#ffffff; background-color:${COLORS.blue}; text-decoration:none; border-radius:8px;">${label}</a>`;
}

function detailsList(rows: DetailRow[]): string {
  const items = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:6px 16px 6px 0; font-size:14px; color:${COLORS.muted}; white-space:nowrap; vertical-align:top;">${r.label}</td>
          <td style="padding:6px 0; font-size:14px; color:${COLORS.text}; font-weight:600;">${r.value}</td>
        </tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${items}</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px; font-size:20px; line-height:1.3; color:${COLORS.navy};">${text}</h1>`;
}

function paragraph(text: string, color = COLORS.textSoft): string {
  return `<p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:${color};">${text}</p>`;
}

function fallbackLink(link: string): string {
  return `<p style="margin:16px 0 0; font-size:12px; line-height:1.6; color:${COLORS.muted};">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
    <a href="${link}" target="_blank" style="color:${COLORS.blue}; word-break:break-all;">${link}</a>
  </p>`;
}

function layout(opts: { preheader: string; content: string }): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:${FONT}; color:${COLORS.text};">
  <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${opts.preheader}</span>
  <div style="max-width:520px; margin:0 auto; padding:32px 24px;">
    <img src="cid:tsxcare-logo" alt="TsXcare" width="150" style="display:block; height:auto; margin-bottom:28px;">
    ${opts.content}
    <hr style="border:none; border-top:1px solid ${COLORS.border}; margin:32px 0 16px;">
    <p style="margin:0; font-size:12px; line-height:1.6; color:${COLORS.muted};">Cet email vous a été envoyé automatiquement par TsXcare. Merci de ne pas y répondre.</p>
    <p style="margin:8px 0 0; font-size:12px; color:${COLORS.muted};">© ${year} TsXcare</p>
  </div>
</body>
</html>`;
}

// --- Emails ---

export function verificationEmail({ prenom, link }: VerificationEmailData) {
  const content = `
    ${heading('Confirmez votre adresse email')}
    ${paragraph(`Bonjour ${prenom},`, COLORS.text)}
    ${paragraph('Merci de votre inscription sur TsXcare. Pour activer la prise de rendez-vous, confirmez votre adresse email :')}
    ${button('Vérifier mon adresse email', link)}
    <p style="margin:16px 0 0; font-size:13px; color:${COLORS.muted};">Ce lien expire dans 24 heures.</p>
    ${fallbackLink(link)}`;
  return {
    subject: 'Confirmez votre adresse email — TsXcare',
    html: layout({ preheader: 'Confirmez votre adresse email pour activer la prise de rendez-vous.', content }),
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
    ${paragraph('Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau :')}
    ${button('Réinitialiser mon mot de passe', link)}
    <p style="margin:16px 0 0; font-size:13px; color:${COLORS.muted};">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
    ${fallbackLink(link)}`;
  return {
    subject: 'Réinitialisez votre mot de passe — TsXcare',
    html: layout({ preheader: 'Lien pour réinitialiser votre mot de passe.', content }),
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
    ${paragraph('Votre rendez-vous a bien été enregistré :')}
    ${detailsList(rows)}
    <p style="margin:20px 0 0;">${button('Voir mes rendez-vous', d.link)}</p>`;
  return {
    subject: 'Votre rendez-vous est confirmé — TsXcare',
    html: layout({ preheader: `Rendez-vous confirmé le ${d.dateLabel} à ${d.timeLabel}.`, content }),
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
    ${detailsList(rows)}
    <p style="margin:20px 0 0;">${button('Prendre un nouveau rendez-vous', d.link)}</p>`;
  return {
    subject: 'Votre rendez-vous a été annulé — TsXcare',
    html: layout({ preheader: `Rendez-vous annulé : ${d.dateLabel} à ${d.timeLabel}.`, content }),
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
