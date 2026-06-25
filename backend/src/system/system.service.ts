import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocuSignService } from '../docusign/docusign.service';

const isSet = (v?: string) => !!(v && v.trim());

// A read-only health/configuration report for the admin "System" panel. It NEVER
// returns secret values — secrets are reported only as a Set / Missing boolean.
// Non-secret operational config (env name, public URLs, notify email) is shown
// as-is so admins can verify deployment without server access.
@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService, private docusign: DocuSignService) {}

  async status() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const smtp = isSet(process.env.SMTP_HOST) && isSet(process.env.SMTP_USER) && isSet(process.env.SMTP_PASS);
    const sendgrid = isSet(process.env.SENDGRID_API_KEY);
    const emailProvider = smtp ? 'SMTP' : sendgrid ? 'SendGrid' : 'None';

    const adminSecret = isSet(process.env.ADMIN_JWT_SECRET) || isSet(process.env.JWT_SECRET);
    const agentSecret = isSet(process.env.AGENT_JWT_SECRET) || isSet(process.env.JWT_SECRET);
    const hvSecret = isSet(process.env.HUMAN_VERIFICATION_SECRET);
    const dsConfigured = this.docusign.isConfigured();
    const googlePortal = isSet(process.env.GOOGLE_CLIENT_ID);
    const googleAdmin = isSet(process.env.ADMIN_GOOGLE_CLIENT_ID) || isSet(process.env.GOOGLE_CLIENT_ID);
    const signerDebug = isSet(process.env.SIGNER_METADATA_DEBUG);

    type State = 'ok' | 'warn' | 'off' | 'info';
    const item = (label: string, state: State, value: string, hint?: string) => ({ label, state, value, hint });

    return {
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      groups: [
        {
          title: 'Core',
          items: [
            item('Environment', process.env.NODE_ENV === 'production' ? 'ok' : 'warn', process.env.NODE_ENV || 'development'),
            item('Database', dbOk ? 'ok' : 'off', dbOk ? 'Connected' : 'Unreachable'),
            item('Admin JWT secret', adminSecret ? 'ok' : 'off', adminSecret ? 'Set' : 'Missing'),
            item('Agent JWT secret', agentSecret ? 'ok' : 'off', agentSecret ? 'Set' : 'Missing'),
            item('Human-verification secret', hvSecret ? 'ok' : 'warn', hvSecret ? 'Set' : 'Using fallback', hvSecret ? undefined : 'Set HUMAN_VERIFICATION_SECRET for production.'),
          ],
        },
        {
          title: 'Email',
          items: [
            item('Provider', emailProvider === 'None' ? 'off' : 'ok', emailProvider, emailProvider === 'None' ? 'No SMTP or SendGrid configured — emails are logged to console only.' : undefined),
            item('From address', 'info', process.env.SMTP_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || '—'),
          ],
        },
        {
          title: 'Integrations',
          items: [
            item('DocuSign e-signature', dsConfigured ? 'ok' : 'off', dsConfigured ? `Configured (${(process.env.DS_ENV || 'demo').toLowerCase()})` : 'Not configured'),
            item('Google sign-in · portal', googlePortal ? 'ok' : 'off', googlePortal ? 'Configured' : 'Off'),
            item('Google sign-in · admin', googleAdmin ? 'ok' : 'off', googleAdmin ? 'Configured' : 'Off'),
          ],
        },
        {
          title: 'URLs & notifications',
          items: [
            item('Portal base URL', 'info', process.env.PORTAL_BASE_URL || '—'),
            item('Admin base URL', 'info', process.env.ADMIN_BASE_URL || '—'),
            item('CORS origins', 'info', process.env.CORS_ORIGIN || '—'),
            item('Application notify email', 'info', process.env.AGENT_APPLICATION_NOTIFY_EMAIL || process.env.APPLICATION_NOTIFY_EMAIL || '—'),
          ],
        },
        {
          title: 'Analytics & geo',
          items: [
            item('GeoIP database', isSet(process.env.GEOIP_DB_PATH) ? 'ok' : 'warn', isSet(process.env.GEOIP_DB_PATH) ? 'Configured' : 'CDN headers only'),
            item('Analytics ingest key', isSet(process.env.ANALYTICS_INGEST_KEY) ? 'ok' : 'warn', isSet(process.env.ANALYTICS_INGEST_KEY) ? 'Set' : 'Open'),
          ],
        },
        {
          title: 'Debug flags',
          items: [
            item('Signer metadata debug', signerDebug ? 'warn' : 'ok', signerDebug ? 'ON' : 'Off', signerDebug ? 'Verbose signer logging is on — turn off in production.' : undefined),
          ],
        },
      ],
    };
  }
}
