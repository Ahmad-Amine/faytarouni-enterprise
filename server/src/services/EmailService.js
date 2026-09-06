const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const { emailTemplateRepository } = require('../repositories');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host)
    return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolate(template, vars, { html = false } = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === undefined || value === null) return '';
    const normalized = String(value).replace(/[\r\n]+/g, ' ');
    return html ? escapeHtml(normalized) : normalized;
  });
}

async function sendTemplateEmail(to, templateKey, vars = {}, fallback) {
  const template = await emailTemplateRepository.findOne({ key: templateKey });
  const subject = interpolate(template?.subject || fallback.subject, vars);
  const html = interpolate(template?.bodyHtml || fallback.bodyHtml, vars, { html: true });

  const t = getTransporter();
  if (!t) {
    logger.info(`[email:dev-mode] Would send "${subject}" to ${to}`, { html });
    return { simulated: true };
  }

  return t.sendMail({ from: env.smtp.from, to, subject, html });
}

module.exports = { sendTemplateEmail };
