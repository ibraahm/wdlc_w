import Joi from 'joi';

/**
 * Boot-time environment validation. Fails fast with a clear message if a
 * required variable is missing or malformed, rather than surfacing as a runtime
 * 500 deep in a request. Production tightens several rules (real secrets, a
 * Postgres URL, distinct admin/agent secrets).
 */
const isProd = process.env.NODE_ENV === 'production';

const PLACEHOLDERS = [
  'change-me-to-a-long-random-string',
  'change-me-admin-secret-openssl-rand-hex-32',
  'change-me-agent-secret-openssl-rand-hex-32',
];

// Each secret is OPTIONAL at the field level - the cross-field .custom() below
// enforces presence. In development a shared JWT_SECRET fallback is allowed; in
// production both per-portal secrets are required and must differ. When a secret
// IS provided in production it must be long and not a known placeholder.
const secretField = isProd
  ? Joi.string()
      .min(32)
      .invalid(...PLACEHOLDERS)
      .optional()
  : Joi.string().min(8).optional();

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),

  DATABASE_URL: isProd
    ? Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required()
    : Joi.string().required(),

  // JWT_SECRET is a shared fallback; ADMIN/AGENT are the per-portal secrets.
  // Presence is enforced per-portal in the cross-field check below.
  JWT_SECRET: secretField,
  ADMIN_JWT_SECRET: secretField,
  AGENT_JWT_SECRET: secretField,

  // Public base URLs used to build links in emails (verify, reset, invites).
  // In production these MUST be real https URLs - a localhost fallback would
  // silently send users broken/insecure links.
  PORTAL_BASE_URL: isProd
    ? Joi.string().uri({ scheme: ['https'] }).required()
    : Joi.string().uri().optional(),
  ADMIN_BASE_URL: isProd
    ? Joi.string().uri({ scheme: ['https'] }).required()
    : Joi.string().uri().optional(),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent', '')
    .optional(),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  SEED_ADMIN_EMAIL: Joi.string().email().allow('').optional(),
  SEED_ADMIN_PASSWORD: Joi.string().allow('').optional(),

  HUMAN_VERIFICATION_SECRET: secretField.allow('').optional(),
  HUMAN_VERIFICATION_TTL_SECONDS: Joi.number().integer().min(60).max(3600).optional(),
  SENDGRID_API_KEY: Joi.string().allow('').optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().allow('').optional(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_SECURE: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM_EMAIL: Joi.string().email().allow('').optional(),
  SMTP_FROM_NAME: Joi.string().allow('').optional(),
  AGENT_APPLICATION_NOTIFY_EMAIL: Joi.string().email().allow('').optional(),
  APPLICATION_NOTIFY_EMAIL: Joi.string().email().allow('').optional(),

  // Google sign-in for the agent portal (optional). When unset, the feature is
  // disabled end-to-end and password login is unaffected.
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  ADMIN_GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
})
  // In production the admin & agent portals must each have their OWN secret -
  // a shared JWT_SECRET fallback is not accepted, so a token minted for one
  // portal can never be replayed against the other.
  .custom((value, helpers) => {
    if (!isProd) return value;
    if (!value.ADMIN_JWT_SECRET || !value.AGENT_JWT_SECRET) {
      return helpers.message({
        custom: 'Set distinct ADMIN_JWT_SECRET and AGENT_JWT_SECRET in production (the shared JWT_SECRET fallback is not allowed)',
      });
    }
    if (value.ADMIN_JWT_SECRET === value.AGENT_JWT_SECRET) {
      return helpers.message({
        custom: 'ADMIN_JWT_SECRET and AGENT_JWT_SECRET must differ in production',
      });
    }
    return value;
  })
  .unknown(true);
