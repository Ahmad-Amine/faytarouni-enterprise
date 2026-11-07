// Submits every template to Meta for approval, then prints each one's status.
// Safe to run again: templates that already exist are left as they are, so
// rerunning is also how to check on approval.
//
//   $env:WHATSAPP_ACCESS_TOKEN = "..."
//   $env:WHATSAPP_BUSINESS_ACCOUNT_ID = "..."
//   npm run whatsapp:templates
const { WHATSAPP_TEMPLATES, STAFF_BROADCAST_TEMPLATE } = require('../config/whatsappTemplates');

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const accountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
const graphUrl = (process.env.WHATSAPP_GRAPH_URL || 'https://graph.facebook.com').replace(/\/+$/, '');

const SAMPLE_VALUES = {
  name: 'Ahmad',
  businessName: 'Faytarouni Barbershop',
  date: 'Mon, Nov 9, 2026',
  time: '3:00 PM',
  barberName: 'Marcus',
  body: 'The shop opens at 10:00 on Friday',
};

function toMetaTemplate({ body, metaName, metaLanguage, metaCategory }) {
  const names = [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]))];
  const text = body.replace(/\{\{(\w+)\}\}/g, (_, name) => `{{${names.indexOf(name) + 1}}}`);
  const component = { type: 'BODY', text };
  if (names.length > 0) component.example = { body_text: [names.map((name) => SAMPLE_VALUES[name])] };
  return { name: metaName, language: metaLanguage, category: metaCategory, components: [component] };
}

async function graph(path, options = {}) {
  const response = await fetch(`${graphUrl}/${version}/${accountId}/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  return { ok: response.ok, body: await response.json().catch(() => ({})) };
}

async function main() {
  if (!token || !accountId) {
    console.error('Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID first.');
    process.exitCode = 1;
    return;
  }

  const templates = [...WHATSAPP_TEMPLATES.filter((t) => t.metaName), STAFF_BROADCAST_TEMPLATE];
  const { ok, body: existing } = await graph('message_templates?fields=name,status&limit=100');
  if (!ok) {
    console.error(`Meta refused the request: ${existing.error?.message || 'unknown error'}`);
    process.exitCode = 1;
    return;
  }
  const existingNames = new Set((existing.data || []).map((t) => t.name));

  let failed = 0;
  for (const template of templates) {
    if (existingNames.has(template.metaName)) continue;
    const result = await graph('message_templates', { method: 'POST', body: JSON.stringify(toMetaTemplate(template)) });
    if (result.ok) {
      console.log(`Submitted  ${template.metaName}`);
    } else {
      failed += 1;
      const { error_user_msg: userMessage, message } = result.body.error || {};
      console.error(`Failed     ${template.metaName}: ${userMessage || message || 'unknown error'}`);
    }
  }

  const { body: latest } = await graph('message_templates?fields=name,status&limit=100');
  console.log('\nStatus on Meta:');
  const wanted = new Set(templates.map((t) => t.metaName));
  (latest.data || [])
    .filter((t) => wanted.has(t.name))
    .forEach((t) => console.log(`  ${t.status.padEnd(10)} ${t.name}`));

  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  console.error(`Could not reach Meta: ${err.message}`);
  process.exitCode = 1;
});
