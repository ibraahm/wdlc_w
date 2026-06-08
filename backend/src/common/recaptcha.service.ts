import { Injectable, Logger } from '@nestjs/common';

interface VerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Verifies Google reCAPTCHA v3 tokens.
 *
 * If RECAPTCHA_SECRET is not configured the check is skipped (returns true) so
 * the app keeps working in local/dev environments without keys. The minimum
 * passing score defaults to 0.5 and can be tuned via RECAPTCHA_MIN_SCORE.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret = process.env.RECAPTCHA_SECRET;
  private readonly minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');

  get enabled(): boolean {
    return !!this.secret;
  }

  /**
   * Returns true when the token passes (or when verification is disabled).
   * @param token  The g-recaptcha-response token from the client.
   * @param expectedAction  Optional action name to match (v3 only).
   */
  async verify(token?: string, expectedAction?: string): Promise<boolean> {
    if (!this.enabled) return true; // no secret configured — skip silently
    if (!token) return false;

    try {
      const body = new URLSearchParams({ secret: this.secret!, response: token });
      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = (await res.json()) as VerifyResponse;

      if (!data.success) {
        this.logger.warn(`reCAPTCHA failed: ${(data['error-codes'] ?? []).join(', ')}`);
        return false;
      }
      if (expectedAction && data.action && data.action !== expectedAction) {
        this.logger.warn(`reCAPTCHA action mismatch: got ${data.action}, expected ${expectedAction}`);
        return false;
      }
      if (typeof data.score === 'number' && data.score < this.minScore) {
        this.logger.warn(`reCAPTCHA score too low: ${data.score} < ${this.minScore}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error('reCAPTCHA verification request failed', err as Error);
      // Fail open on network errors so a Google outage doesn't block legitimate users.
      return true;
    }
  }
}
