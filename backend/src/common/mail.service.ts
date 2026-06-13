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
    this.smtpTransport = hasSmtpConfig()
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: boolEnv(process.env.SMTP_SECURE, false),
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
              }
            : undefined,
        })
      : null;

    if (!this.smtpTransport && hasSendGridConfig()) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
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
          <a href="${link}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">Verify Email</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not sign up, you can safely ignore this email.</p>
      `),
    );
  }

  /** Activation credential email — one-time setup link (48h) instead of a password. */
  sendPortalWelcome(to: string, token: string, firstName: string, branchCode: string) {
    const base = process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    const link = `${base}/reset-password?token=${token}&welcome=1`;
    return this.sendRaw(
      to,
      'Your World Direct Link agent portal access',
      emailLayout('Welcome to World Direct Link', `
        <p>Hello ${firstName},</p>
        <p>Your agent account has been approved. Your branch code is <strong>${branchCode}</strong> — keep it for all correspondence.</p>
        <p>Set your password to access the agent portal (training and resources). This link expires in <strong>48 hours</strong>.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">Set Up My Account</a>
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
          <a href="${link}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">Reset Password</a>
        </p>
        <p style="font-size:13px;color:#6b7280">Or copy this link: <a href="${link}">${link}</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not request a password reset, ignore this email. Your password will not change.</p>
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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <tr><td style="background:#1a56db;padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:700">World Direct Link</span>
      </td></tr>
      <tr><td style="padding:32px">
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px">${heading}</h2>
        ${body}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
        &copy; ${new Date().getFullYear()} World Direct Link, Corp. All rights reserved.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
