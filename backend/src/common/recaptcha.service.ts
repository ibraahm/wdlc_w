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
 * If RECAPTCHA_SECRET is not configured the check is skipped only outside
 * production so local/dev environments can work without keys. The minimum
 * passing score defaults to 0.5 and can be tuned via RECAPTCHA_MIN_SCORE.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret = process.env.RECAPTCHA_SECRET;
  private readonly minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5');
  private readonly enforce = process.env.NODE_ENV === 'production';

  get enabled(): boolean {
    return !!this.secret;
  }

  /**
   * Returns true when the token passes (or when verification is disabled).
   * @param token  The g-recaptcha-response token from the client.
   * @param expectedAction  Optional action name to match (v3 only).
   */
  async verify(token?: string, expectedAction?: string): Promise<boolean> {
    if (!this.enforce) {
      this.logger.log(
        `reCAPTCHA verify start: enabled=${this.enabled} enforce=${this.enforce} tokenPresent=${!!token} expectedAction=${expectedAction ?? 'none'}`,
      );
    }
    if (!this.enabled) {
      // reCAPTCHA is intentionally not configured — skip silently in all environments.
      // The feature is opt-in; "fail-closed" only applies when a key IS set.
      if (this.enforce) {
        this.logger.warn('reCAPTCHA blocked: RECAPTCHA_SECRET is not configured');
      } else {
        this.logger.log('reCAPTCHA skipped: RECAPTCHA_SECRET is not configured');
      }
      return !this.enforce;
    }

    if (!token) {
      this.logger.warn(
        `reCAPTCHA token missing: enforce=${this.enforce} expectedAction=${expectedAction ?? 'none'}`,
      );
      return !this.enforce;
    }

    const MAX_ATTEMPTS = 2;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const body = new URLSearchParams({ secret: this.secret!, response: token });
        const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const data = (await res.json()) as VerifyResponse;

        if (!data.success) {
          this.logger.warn(
            `reCAPTCHA failed: enforce=${this.enforce} errors=${(data['error-codes'] ?? []).join(', ')}`,
          );
          return !this.enforce;
        }
        if (expectedAction && data.action && data.action !== expectedAction) {
          this.logger.warn(
            `reCAPTCHA action mismatch: enforce=${this.enforce} got=${data.action} expected=${expectedAction}`,
          );
          return !this.enforce;
        }
        if (typeof data.score === 'number' && data.score < this.minScore) {
          this.logger.warn(
            `reCAPTCHA score too low: enforce=${this.enforce} score=${data.score} minScore=${this.minScore}`,
          );
          return !this.enforce;
        }
        if (!this.enforce) {
          this.logger.log(
            `reCAPTCHA passed: action=${data.action ?? 'none'} score=${data.score ?? 'none'}`,
          );
        }
        return true;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500));
      }
    }

    this.logger.error('reCAPTCHA verification request failed after retries', lastErr as Error);
    // Fail closed in production; fail open in dev so a network outage doesn't block local work.
    return !this.enforce;
  }
}
