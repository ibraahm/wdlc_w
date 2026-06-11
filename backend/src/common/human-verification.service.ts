import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

type Operator = '+' | '-';

interface ChallengePayload {
  v: 1;
  context: string;
  left: number;
  right: number;
  operator: Operator;
  exp: number;
  nonce: string;
}

export interface ChallengeResult {
  question: string;
  token: string;
  expiresAt: string;
}

@Injectable()
export class HumanVerificationService {
  private readonly logger = new Logger(HumanVerificationService.name);
  private readonly ttlMs = Number(process.env.HUMAN_VERIFICATION_TTL_SECONDS ?? '600') * 1000;

  private get secret(): string {
    const secret =
      process.env.HUMAN_VERIFICATION_SECRET ||
      process.env.ADMIN_JWT_SECRET ||
      process.env.AGENT_JWT_SECRET ||
      process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('HUMAN_VERIFICATION_SECRET or JWT secret must be configured');
    }
    return secret;
  }

  createChallenge(context = 'default'): ChallengeResult {
    const operator: Operator = randomInt(0, 2) === 0 ? '+' : '-';
    let left = randomInt(2, 13);
    let right = randomInt(1, 10);

    if (operator === '-' && right > left) {
      [left, right] = [right, left];
    }

    const payload: ChallengePayload = {
      v: 1,
      context,
      left,
      right,
      operator,
      exp: Date.now() + this.ttlMs,
      nonce: randomBytes(12).toString('hex'),
    };

    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = this.sign(encoded);
    const question = `What is ${left} ${operator} ${right}?`;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`human verification challenge created: context=${context} expiresAt=${new Date(payload.exp).toISOString()}`);
    }

    return {
      question,
      token: `${encoded}.${signature}`,
      expiresAt: new Date(payload.exp).toISOString(),
    };
  }

  verify(token: string | undefined, answer: string | undefined, context = 'default'): boolean {
    if (!token || !answer) {
      this.logger.warn(`human verification missing: context=${context} tokenPresent=${!!token} answerPresent=${!!answer}`);
      return false;
    }

    const [encoded, signature] = token.split('.');
    if (!encoded || !signature || !this.signatureMatches(encoded, signature)) {
      this.logger.warn(`human verification signature invalid: context=${context}`);
      return false;
    }

    let payload: ChallengePayload;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ChallengePayload;
    } catch {
      this.logger.warn(`human verification payload invalid: context=${context}`);
      return false;
    }

    if (payload.v !== 1 || payload.context !== context) {
      this.logger.warn(`human verification context invalid: expected=${context} got=${payload.context ?? 'none'}`);
      return false;
    }

    if (Date.now() > payload.exp) {
      this.logger.warn(`human verification expired: context=${context}`);
      return false;
    }

    const normalized = answer.trim();
    if (!/^-?\d+$/.test(normalized)) {
      this.logger.warn(`human verification answer format invalid: context=${context}`);
      return false;
    }

    const expected = this.answerFor(payload);
    const ok = Number(normalized) === expected;
    if (!ok) this.logger.warn(`human verification answer incorrect: context=${context}`);
    return ok;
  }

  private answerFor(payload: ChallengePayload): number {
    return payload.operator === '+'
      ? payload.left + payload.right
      : payload.left - payload.right;
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
  }

  private signatureMatches(encodedPayload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(encodedPayload), 'base64url');
    const received = Buffer.from(signature, 'base64url');
    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}
