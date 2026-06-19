import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import nodemailer, { type Transporter } from 'nodemailer';

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

function hasSmtpConfig() {
  return !!process.env.SMTP_HOST;
}

function hasSendGridConfig() {
  return !!process.env.SENDGRID_API_KEY;
}

function boolEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpTransport: Transporter | null;

  constructor() {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = boolEnv(process.env.SMTP_SECURE, false);
    this.smtpTransport = hasSmtpConfig()
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure, // true for 465; false for 587 (STARTTLS)
          requireTLS: !secure, // force STARTTLS upgrade on 587 - many hosts (Yahoo) reject plain
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
              }
            : undefined,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
        })
      : null;

    if (!this.smtpTransport && hasSendGridConfig()) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    }

    // Verify SMTP credentials at boot so failures are visible immediately
    // (auth, host, port, TLS) instead of silently swallowed on first send.
    if (this.smtpTransport) {
      this.smtpTransport.verify()
        .then(() => this.logger.log(`SMTP ready: ${process.env.SMTP_HOST}:${port} as ${process.env.SMTP_USER}`))
        .catch((err: Error) =>
          this.logger.error(`SMTP verify FAILED (${process.env.SMTP_HOST}:${port} as ${process.env.SMTP_USER}): ${err.message}`),
        );
    }
  }

  private fromAddress() {
    return {
      email: process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'info@worlddirectlink.com',
      name: process.env.SMTP_FROM_NAME || 'World Direct Link',
    };
  }

  private async sendRaw(to: string, subject: string, html: string, attachments: MailAttachment[] = []) {
    const from = this.fromAddress();

    if (!this.smtpTransport && !hasSendGridConfig()) {
      const linkMatch = html.match(/href="(https?:\/\/[^"]+)"/);
      const link = linkMatch ? linkMatch[1] : '(no link found)';
      this.logger.log(
        `DEV MAIL | To: ${to} | Subject: ${subject} | Link: ${link} | Attachments: ${attachments.length}`,
      );
      return;
    }

    try {
      if (this.smtpTransport) {
        await this.smtpTransport.sendMail({
          to,
          from: `"${from.name}" <${from.email}>`,
          subject,
          html,
          attachments,
        });
        return;
      }

      await sgMail.send({
        to,
        from,
        subject,
        html,
        attachments: attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString('base64'),
          type: attachment.contentType,
          disposition: 'attachment',
        })),
      });
    } catch (err) {
      // Surface the real reason (auth, connection, sender not allowed) and, so a
      // credential/reset email is never lost during setup, log the recovery link.
      const linkMatch = html.match(/href="(https?:\/\/[^"]+)"/);
      this.logger.error(
        `Email send FAILED | To: ${to} | Subject: ${subject} | Reason: ${(err as Error).message}` +
          (linkMatch ? ` | Recovery link: ${linkMatch[1]}` : ''),
      );
      throw err;
    }
  }

  sendEmailVerification(to: string, token: string) {
    const link = `${process.env.PORTAL_BASE_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
    return this.sendRaw(
      to,
      'Verify your World Direct Link account',
      emailLayout('Verify your email address', `
        <p>Thank you for registering with <strong>World Direct Link</strong>.</p>
        <p>Click the button below to verify your email address. This link is valid for <strong>24 hours</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#0b1f3a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Verify Email</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not sign up, you can safely ignore this email.</p>
      `),
    );
  }

  /** Activation credential email - one-time setup link (48h) instead of a password. */
  /** A staff reply to a public form submission (contact / claim / support). */
  sendSubmissionReply(to: string, subject: string, message: string) {
    const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    return this.sendRaw(
      to,
      subject,
      emailLayout('World Direct Link', `
        <p>${safe}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="font-size:12px;color:#6b7280">This message is in reference to your submission on worlddirectlink.com. You may reply to this email.</p>
      `),
    );
  }

  sendPortalWelcome(to: string, token: string, firstName: string, branchCode: string) {
    const base = process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    const link = `${base}/reset-password?token=${token}&welcome=1`;
    return this.sendRaw(
      to,
      'Your World Direct Link agent portal access',
      emailLayout('Welcome to World Direct Link', `
        <p>Hello ${escapeHtml(firstName)},</p>
        <p>Your agent account has been approved. Your branch code is <strong>${escapeHtml(branchCode)}</strong> - keep it for all correspondence.</p>
        <p>Set your password to access the agent portal (training and resources). This link expires in <strong>48 hours</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#0b1f3a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Set Up My Account</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">If this wasn't expected, contact compliance before using the link.</p>
      `),
    );
  }

  sendPasswordReset(to: string, token: string, portal: 'admin' | 'agent') {
    const base =
      portal === 'admin'
        ? process.env.ADMIN_BASE_URL || 'http://localhost:3002'
        : process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    const link = `${base}/reset-password?token=${token}`;
    return this.sendRaw(
      to,
      'Reset your World Direct Link password',
      emailLayout('Password reset request', `
        <p>We received a request to reset the password for your <strong>World Direct Link</strong> account.</p>
        <p>Click the button below to choose a new password. This link expires in <strong>30 minutes</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#0b1f3a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Reset Password</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not request a password reset, ignore this email. Your password will not change.</p>
      `),
    );
  }

  sendAdminInvite(to: string, token: string, name: string) {
    const base = process.env.ADMIN_BASE_URL || 'http://localhost:3002';
    const link = `${base}/reset-password?token=${token}`;
    return this.sendRaw(
      to,
      'You have been invited to the World Direct Link admin console',
      emailLayout('Welcome to World Direct Link', `
        <p>Hello ${escapeHtml(name)},</p>
        <p>You have been invited to the <strong>World Direct Link</strong> admin console.
        Click the button below to set your password. This link expires in <strong>48 hours</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#0b1f3a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Set Your Password</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">After setting your password you can also sign in with Google using this email address.</p>
      `),
    );
  }

  sendAgentApplicationNotification(params: {
    to?: string;
    applicationId: string;
    applicantName: string;
    businessName?: string | null;
    email: string;
    phone: string;
    pdf: Buffer;
  }) {
    const to =
      params.to ||
      process.env.AGENT_APPLICATION_NOTIFY_EMAIL ||
      process.env.APPLICATION_NOTIFY_EMAIL ||
      'info@worlddirectlink.com';
    const subject = `Agent application received: ${params.businessName || params.applicantName}`;
    return this.sendRaw(
      to,
      subject,
      emailLayout('Agent application received', `
        <p>A new Become an Agent application was submitted.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b7280">Application ID</td><td style="padding:6px 0;font-weight:600">${escapeHtml(params.applicationId)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Applicant</td><td style="padding:6px 0;font-weight:600">${escapeHtml(params.applicantName)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Business</td><td style="padding:6px 0;font-weight:600">${escapeHtml(params.businessName || 'Not provided')}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0;font-weight:600">${escapeHtml(params.email)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0;font-weight:600">${escapeHtml(params.phone)}</td></tr>
        </table>
        <p>The signed application PDF is attached.</p>
      `),
      [
        {
          filename: `agent-application-${params.applicationId}.pdf`,
          content: params.pdf,
          contentType: 'application/pdf',
        },
      ],
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailLayout(heading: string, body: string): string {
  const navy = '#0b1f3a';
  const gold = '#c8960c';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eceae3;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#2c2c2c">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e3ddcf">
      <tr><td style="height:4px;background:${gold};line-height:4px;font-size:0">&nbsp;</td></tr>
      <tr><td style="background:${navy};padding:30px 36px;text-align:center">
        <div style="color:#ffffff;font-size:23px;font-weight:700;letter-spacing:.5px">WORLD DIRECT LINK</div>
        <div style="color:${gold};font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-top:7px">Corp. &bull; NMLS #1119263</div>
      </td></tr>
      <tr><td style="padding:36px">
        <h1 style="margin:0 0 18px;color:${navy};font-size:21px;font-weight:700">${heading}</h1>
        <div style="font-size:15px;line-height:1.65;color:#3a3a3a">${body}</div>
      </td></tr>
      <tr><td style="background:#f7f6f2;padding:22px 36px;border-top:1px solid #ece9e1">
        <div style="font-size:12px;color:#6b7280;line-height:1.6">
          <strong style="color:${navy}">World Direct Link, Corp.</strong> &bull; NMLS #1119263<br>
          This is an automated message — please don't reply directly to it.
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-top:10px">&copy; ${new Date().getFullYear()} World Direct Link, Corp. All rights reserved.</div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
