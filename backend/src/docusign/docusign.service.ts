import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createSign } from 'crypto';
import { readFileSync } from 'fs';

export type DocuSignCc = { name: string; email: string; routingOrder?: number };

export type SendDocumentInput = {
  pdfBase64: string;
  fileName: string;
  emailSubject: string;
  signer: { name: string; email: string };
  cc?: DocuSignCc[];
  // Signature placement: by anchor text (default) or absolute coordinates.
  anchorString?: string;
  anchorXOffset?: number;
  anchorYOffset?: number;
  page?: number;
  x?: number;
  y?: number;
};

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Sends World Direct Link documents out for e-signature via DocuSign using JWT
// Grant (the app impersonates a configured user — no interactive login). The
// uploaded PDF is streamed straight to DocuSign; nothing is persisted here.
@Injectable()
export class DocuSignService {
  private readonly logger = new Logger(DocuSignService.name);
  private cachedToken: { token: string; expiresAt: number } | null = null;

  private get cfg() {
    const isProd = (process.env.DS_ENV || 'demo').toLowerCase() === 'production';
    return {
      isProd,
      oauthBase: isProd ? 'account.docusign.com' : 'account-d.docusign.com',
      integrationKey: (process.env.DS_INTEGRATION_KEY || '').trim(),
      userId: (process.env.DS_USER_ID || '').trim(),
      accountId: (process.env.DS_ACCOUNT_ID || '').trim(),
    };
  }

  private privateKey(): string | null {
    const inline = process.env.DS_PRIVATE_KEY;
    if (inline && inline.trim()) return inline.includes('\\n') ? inline.replace(/\\n/g, '\n') : inline;
    const path = process.env.DS_PRIVATE_KEY_PATH || './private.key';
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  }

  isConfigured(): boolean {
    const { integrationKey, userId } = this.cfg;
    return !!(integrationKey && userId && this.privateKey());
  }

  // The one-time consent URL an admin must open and accept before JWT
  // impersonation works (surfaced in errors so setup is self-explanatory).
  consentUrl(): string {
    const { oauthBase, integrationKey } = this.cfg;
    const redirect = encodeURIComponent(process.env.DS_CONSENT_REDIRECT || 'https://www.docusign.com');
    return `https://${oauthBase}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=${redirect}`;
  }

  private buildAssertion(): string {
    const { oauthBase, integrationKey, userId } = this.cfg;
    const key = this.privateKey();
    if (!key) throw new ServiceUnavailableException('DocuSign private key is not available.');
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(
      JSON.stringify({
        iss: integrationKey,
        sub: userId,
        aud: oauthBase,
        iat: now,
        exp: now + 3600,
        scope: 'signature impersonation',
      }),
    );
    const signingInput = `${header}.${payload}`;
    let signature: Buffer;
    try {
      signature = createSign('RSA-SHA256').update(signingInput).sign(key);
    } catch {
      throw new ServiceUnavailableException('DocuSign private key is invalid (could not sign the JWT).');
    }
    return `${signingInput}.${base64Url(signature)}`;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'DocuSign is not configured. Set DS_INTEGRATION_KEY, DS_USER_ID and the RSA private key.',
      );
    }
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.token;
    }
    const { oauthBase } = this.cfg;
    const res = await fetch(`https://${oauthBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.buildAssertion(),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err = String(body.error ?? '');
      if (err === 'consent_required') {
        throw new BadRequestException(
          `DocuSign consent is required. Open this URL once, sign in as the impersonated user and accept, then retry: ${this.consentUrl()}`,
        );
      }
      this.logger.error(`DocuSign token request failed: ${res.status} ${JSON.stringify(body)}`);
      throw new ServiceUnavailableException('Could not authenticate with DocuSign.');
    }
    const token = String(body.access_token);
    const expiresIn = Number(body.expires_in ?? 3600);
    this.cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  }

  // Resolve the account ID + per-account API base URI for the impersonated user.
  private async getAccountInfo(token: string): Promise<{ accountId: string; baseUri: string }> {
    const { oauthBase, accountId: preferred } = this.cfg;
    const res = await fetch(`https://${oauthBase}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ServiceUnavailableException('Could not load the DocuSign account.');
    const info = (await res.json()) as { accounts?: Array<{ account_id: string; base_uri: string; is_default: boolean }> };
    const accounts = info.accounts ?? [];
    const account = (preferred && accounts.find((a) => a.account_id === preferred)) || accounts.find((a) => a.is_default) || accounts[0];
    if (!account) throw new ServiceUnavailableException('No DocuSign account is available for this user.');
    return { accountId: account.account_id, baseUri: account.base_uri };
  }

  async sendDocumentForSignature(input: SendDocumentInput): Promise<{ envelopeId: string }> {
    const token = await this.getAccessToken();
    const { accountId, baseUri } = await this.getAccountInfo(token);

    const useCoords = input.page != null && input.x != null && input.y != null;
    const signHere: Record<string, unknown> = useCoords
      ? { documentId: '1', pageNumber: String(input.page), xPosition: String(input.x), yPosition: String(input.y) }
      : {
          anchorString: input.anchorString || 'Signature:',
          anchorUnits: 'pixels',
          anchorXOffset: String(input.anchorXOffset ?? 0),
          anchorYOffset: String(input.anchorYOffset ?? 0),
        };
    const dateSigned: Record<string, unknown> = useCoords
      ? { documentId: '1', pageNumber: String(input.page), xPosition: String((input.x ?? 0) + 220), yPosition: String(input.y) }
      : {
          anchorString: input.anchorString || 'Signature:',
          anchorUnits: 'pixels',
          anchorXOffset: String((input.anchorXOffset ?? 0) + 220),
          anchorYOffset: String(input.anchorYOffset ?? 0),
        };

    const envelope = {
      emailSubject: input.emailSubject,
      documents: [
        {
          documentBase64: input.pdfBase64,
          name: input.fileName,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: input.signer.email,
            name: input.signer.name,
            recipientId: '1',
            routingOrder: '1',
            tabs: { signHereTabs: [signHere], dateSignedTabs: [dateSigned] },
          },
        ],
        carbonCopies: (input.cc ?? []).map((c, i) => ({
          email: c.email,
          name: c.name || c.email,
          recipientId: String(2 + i),
          routingOrder: String(c.routingOrder ?? 2),
        })),
      },
      status: 'sent',
    };

    const res = await fetch(`${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      this.logger.error(`DocuSign envelope create failed: ${res.status} ${JSON.stringify(body)}`);
      const message = typeof body.message === 'string' ? body.message : 'DocuSign rejected the envelope.';
      throw new BadRequestException(message);
    }
    return { envelopeId: String(body.envelopeId) };
  }
}
