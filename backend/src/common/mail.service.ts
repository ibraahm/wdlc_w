import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub mailer — logs to console in dev.
 * Replace sendRaw() with Resend / SendGrid / NodeMailer in production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private sendRaw(to: string, subject: string, text: string) {
    // Production: call your transactional email provider here.
    this.logger.log(`[MAIL] To: ${to} | Subject: ${subject}\n${text}`);
  }

  sendEmailVerification(to: string, token: string) {
    const link = `${process.env.PORTAL_BASE_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
    this.sendRaw(
      to,
      'Verify your World Direct Link account',
      `Click the link below to verify your email (valid 24 hours):\n\n${link}\n\nIf you did not sign up, ignore this email.`,
    );
  }

  sendPasswordReset(to: string, token: string, portal: 'admin' | 'agent') {
    const base =
      portal === 'admin'
        ? process.env.ADMIN_BASE_URL || 'http://localhost:3002'
        : process.env.PORTAL_BASE_URL || 'http://localhost:3001';
    const link = `${base}/reset-password?token=${token}`;
    this.sendRaw(
      to,
      'Reset your World Direct Link password',
      `Click the link below to reset your password (valid 30 minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
    );
  }
}
