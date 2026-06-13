#!/usr/bin/env node
/**
 * Standalone SMTP test — proves a real email leaves the server.
 *   node backend/scripts/send-test-email.js recipient@example.com
 * Reads SMTP_* from backend/.env and sends a test message. No DB, no Nest.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Minimal .env reader (SMTP_* only — avoids parsing complex URLs).
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}

const to = process.argv[2] || env.AGENT_APPLICATION_NOTIFY_EMAIL || env.SMTP_FROM_EMAIL;
if (!to) { console.error('Usage: node send-test-email.js <recipient>'); process.exit(1); }

const port = parseInt(env.SMTP_PORT || '587', 10);
const secure = ['1', 'true', 'yes'].includes(String(env.SMTP_SECURE).toLowerCase());

(async () => {
  const t = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    logger: true,   // verbose SMTP conversation to stdout
    debug: true,
  });
  try {
    await t.verify();
    console.log('\n✓ verify OK\n');
    const info = await t.sendMail({
      from: `"${env.SMTP_FROM_NAME || 'World Direct Link'}" <${env.SMTP_FROM_EMAIL || env.SMTP_USER}>`,
      to,
      subject: 'World Direct Link — SMTP test',
      text: 'This is a test email confirming outbound SMTP works.',
      html: '<p>This is a <strong>test email</strong> confirming outbound SMTP works.</p>',
    });
    console.log('\n✓ SENT  messageId=%s  accepted=%j  rejected=%j  response=%s',
      info.messageId, info.accepted, info.rejected, info.response);
  } catch (err) {
    console.error('\n✘ FAILED:', err.message);
    process.exit(2);
  }
})();
