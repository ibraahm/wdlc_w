import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

type Operator = '+' | '-' | '×';

interface ChallengePayload {
  v: 2;
  context: string;
  left: number;
  right: number;
  operator: Operator;
  iat: number;
  exp: number;
  nonce: string;
}

export interface ChallengeResult {
  question: string;
  token: string;
  expiresAt: string;
}

/** Reject answers submitted faster than a human could read the question. */
const MIN_SOLVE_MS = 2000;
/** Wrong guesses allowed per challenge before it is burned. */
const MAX_ATTEMPTS = 5;

@Injectable()
export class HumanVerificationService {
  private readonly logger = new Logger(HumanVerificationService.name);
  private readonly ttlMs = Number(process.env.HUMAN_VERIFICATION_TTL_SECONDS ?? '600') * 1000;

  // Replay/brute-force guard: nonce -> { exp, attempts, consumed }.
  // In-memory by design - challenges are short-lived and single-instance
  // deployments are the norm here; worst case after a restart a token can be
  // replayed once within its TTL.
  private readonly seen = new Map<string, { exp: number; attempts: number; consumed: boolean }>();
  private lastSweep = 0;

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
    const pick = randomInt(0, 3);
    const operator: Operator = pick === 0 ? '+' : pick === 1 ? '-' : '×';
    let left: number;
    let right: number;

    if (operator === '×') {
      // Keep multiplication in comfortable mental-math range.
      left = randomInt(2, 10);
      right = randomInt(2, 10);
    } else {
      left = randomInt(2, 21);
      right = randomInt(1, 13);
      if (operator === '-' && right > left) [left, right] = [right, left];
    }

    const now = Date.now();
    const payload: ChallengePayload = {
      v: 2,
      context,
      left,
      right,
      operator,
      iat: now,
      exp: now + this.ttlMs,
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

    if (payload.v !== 2 || payload.context !== context) {
      this.logger.warn(`human verification context invalid: expected=${context} got=${payload.context ?? 'none'}`);
      return false;
    }

    const now = Date.now();
    if (now > payload.exp) {
      this.logger.warn(`human verification expired: context=${context}`);
      return false;
    }

    // Too fast to be a person reading the question.
    if (now - payload.iat < MIN_SOLVE_MS) {
      this.logger.warn(`human verification answered too quickly: context=${context} ms=${now - payload.iat}`);
      return false;
    }

    this.sweep(now);
    const state = this.seen.get(payload.nonce) ?? { exp: payload.exp, attempts: 0, consumed: false };
    if (state.consumed) {
      this.logger.warn(`human verification token replayed: context=${context}`);
      return false;
    }
    if (state.attempts >= MAX_ATTEMPTS) {
      this.logger.warn(`human verification attempts exhausted: context=${context}`);
      return false;
    }

    const normalized = answer.trim();
    if (!/^-?\d+$/.test(normalized)) {
      state.attempts += 1;
      this.seen.set(payload.nonce, state);
      this.logger.warn(`human verification answer format invalid: context=${context}`);
      return false;
    }

    const expected = this.answerFor(payload);
    const ok = Number(normalized) === expected;
    if (ok) {
      state.consumed = true; // single use - a correct token cannot be replayed
    } else {
      state.attempts += 1;
      this.logger.warn(`human verification answer incorrect: context=${context}`);
    }
    this.seen.set(payload.nonce, state);
    return ok;
  }

  private answerFor(payload: ChallengePayload): number {
    switch (payload.operator) {
      case '+': return payload.left + payload.right;
      case '-': return payload.left - payload.right;
      case '×': return payload.left * payload.right;
    }
  }

  /** Drop expired nonce records (at most once every 60s). */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [nonce, state] of this.seen) {
      if (now > state.exp) this.seen.delete(nonce);
    }
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
