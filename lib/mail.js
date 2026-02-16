const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || process.env.MAIL_TO;
const SITE_NAME = 'НейроКофейня';
const SITE_URL = process.env.BASE_URL || 'https://neurocup.ru';

function isConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

let _transporter = null;
function getTransporter() {
  if (!isConfigured()) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transporter;
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapHtml(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Inter,Arial,sans-serif;background:#f5f5f5;padding:20px;color:#333;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:24px 28px;color:#fff;text-align:center;">
<h1 style="margin:0;font-size:20px;">${SITE_NAME}</h1></div>
<div style="padding:28px;">${body}</div>
<div style="padding:16px 28px;background:#f9f9f9;text-align:center;font-size:12px;color:#999;">
<a href="${SITE_URL}" style="color:#4ecdc4;">${SITE_URL}</a></div></div></body></html>`;
}

/**
 * Send contact form message to cafe email.
 */
async function sendContactEmail(contact) {
  const transporter = getTransporter();
  if (!transporter || !CONTACT_EMAIL) {
    console.warn('Contact email not sent: SMTP not configured');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${SMTP_USER}>`,
      to: CONTACT_EMAIL,
      replyTo: contact.email,
      subject: `Вопрос с сайта от ${contact.name}`,
      text: `Имя: ${contact.name}\nEmail: ${contact.email}\n\nСообщение:\n${contact.message}`,
      html: wrapHtml(`
        <h2 style="margin-top:0;">Новое сообщение с сайта</h2>
        <p><strong>Имя:</strong> ${escapeHtml(contact.name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></p>
        <p><strong>Сообщение:</strong></p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(contact.message)}</div>
      `),
    });
    return true;
  } catch (err) {
    console.error('Send contact email error:', err);
    return false;
  }
}

/**
 * Send confirmation email to user who submitted contact form.
 */
async function sendContactConfirmation(contact) {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${SMTP_USER}>`,
      to: contact.email,
      subject: `Мы получили ваше сообщение — ${SITE_NAME}`,
      text: `Здравствуйте, ${contact.name}!\n\nМы получили ваше сообщение и ответим в ближайшее время.\n\nС уважением,\n${SITE_NAME}`,
      html: wrapHtml(`
        <h2 style="margin-top:0;">Спасибо за обращение!</h2>
        <p>Здравствуйте, <strong>${escapeHtml(contact.name)}</strong>!</p>
        <p>Мы получили ваше сообщение и ответим в ближайшее время.</p>
        <p style="color:#999;font-size:13px;">Ваше сообщение:</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap;">${escapeHtml(contact.message)}</div>
        <p style="margin-top:20px;">С уважением,<br><strong>${SITE_NAME}</strong></p>
      `),
    });
    return true;
  } catch (err) {
    console.error('Send contact confirmation error:', err);
    return false;
  }
}

/**
 * Send newsletter email to a list of subscribers.
 */
async function sendNewsletter(subscribers, subject, htmlContent, textContent) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Newsletter not sent: SMTP not configured');
    return { sent: 0, failed: 0 };
  }
  let sent = 0, failed = 0;
  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: `"${SITE_NAME}" <${SMTP_USER}>`,
        to: sub.email,
        subject,
        text: textContent || subject,
        html: wrapHtml(htmlContent),
      });
      sent++;
    } catch (err) {
      console.error(`Newsletter send to ${sub.email} failed:`, err.message);
      failed++;
    }
  }
  return { sent, failed };
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmation(user, order) {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${SMTP_USER}>`,
      to: user.email,
      subject: `Заказ оформлен — ${SITE_NAME}`,
      html: wrapHtml(`
        <h2 style="margin-top:0;">Ваш заказ оформлен!</h2>
        <p>Здравствуйте, <strong>${escapeHtml(user.firstName)}</strong>!</p>
        <p>Заказ <strong>#${order.id.slice(0,8)}</strong> на сумму <strong>${order.total} ₽</strong> принят.</p>
        <p>Статус: <strong>Ожидает оплаты</strong></p>
        <p><a href="${SITE_URL}/order-success.html?orderId=${order.id}" style="display:inline-block;background:#4ecdc4;color:#1a1a2e;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Отследить заказ</a></p>
      `),
    });
    return true;
  } catch (err) {
    console.error('Order email error:', err);
    return false;
  }
}

module.exports = { sendContactEmail, sendContactConfirmation, sendNewsletter, sendOrderConfirmation, isConfigured };
