export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
export const BCRYPT_ROUNDS = 12;

// Access token lifetimes
export const ADMIN_AT_EXPIRES = '15m';   // short - admin portal is sensitive
export const AGENT_AT_EXPIRES = '30m';

// Refresh token lifetimes
export const ADMIN_RT_DAYS = 7;
export const AGENT_RT_DAYS = 30;

// Email tokens
export const EMAIL_VERIFY_HOURS = 24;
export const PASSWORD_RESET_MINUTES = 30;

// JWT issuer / audience. Tokens are verified against these in the passport
// strategies so a token minted by another system (or for the wrong portal)
// is rejected even if it were somehow signed with a matching secret.
export const JWT_ISSUER = 'wdlc';
export const JWT_AUDIENCE_ADMIN = 'wdlc-admin';
export const JWT_AUDIENCE_AGENT = 'wdlc-agent';
