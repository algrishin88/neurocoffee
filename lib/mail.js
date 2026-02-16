const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.MAIL_TO;

function isConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS && CONTACT_EMAIL);
}

function createTransporter() {
  if (!isConfigured()) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Send contact form message to cafe email.
 * @param {{ name: string, email: string, message: string }} contact
 * @returns {Promise<boolean>} true if sent, false if skipped or failed
 */
async function sendContactEmail(contact) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Contact email not sent: SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS, CONTACT_EMAIL)');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"НейроКофейня" <${SMTP_USER}>`,
      to: CONTACT_EMAIL,
      replyTo: contact.email,
      subject: `Вопрос с сайта от ${contact.name}`,
      text: `Имя: ${contact.name}\nEmail: ${contact.email}\n\nСообщение:\n${contact.message}`,
      html: `<p><strong>Имя:</strong> ${escapeHtml(contact.name)}</p><p><strong>Email:</strong> <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></p><p><strong>Сообщение:</strong></p><p>${escapeHtml(contact.message).replace(/\n/g, '<br>')}</p>`,
    });
    return true;
  } catch (err) {
    console.error('Send contact email error:', err);
    return false;
  }
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendContactEmail, isConfigured };
