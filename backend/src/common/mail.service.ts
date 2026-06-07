import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

const isDev = () => !process.env.SENDGRID_API_KEY || process.env.NODE_ENV === 'development';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor() {
    if (!isDev()) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    }
  }

  private async sendRaw(to: string, subject: string, html: string) {
    if (isDev()) {
      const linkMatch = html.match(/href="(https?:\/\/[^"]+)"/);
      const link = linkMatch ? linkMatch[1] : '(no link found)';
      this.logger.log(
        `\n${'─'.repeat(60)}\n📧  DEV MAIL\n    To:      ${to}\n    Subject: ${subject}\n    Link:    ${link}\n${'─'.repeat(60)}`,
      );
      return;
    }
    await sgMail.send({
      to,
      from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@worlddirectlink.com', name: 'World Direct Link' },
      subject,
      html,
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
        <p style="font-size:13px;color:#6b7280">If you did not request a password reset, ignore this email — your password will not change.</p>
      `),
    );
  }
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
