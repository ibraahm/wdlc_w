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
// enforces that every portal ends up with a usable secret (per-portal OR the
// shared JWT_SECRET fallback), matching assertSecrets() in main.ts. When a
// secret IS provided in production it must be long and not a known placeholder.
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
  // Require that the admin & agent portals end up with usable, distinct secrets
  // in production: either both per-portal secrets, or a shared JWT_SECRET.
  .custom((value, helpers) => {
    if (!isProd) return value;
    const admin = value.ADMIN_JWT_SECRET || value.JWT_SECRET;
    const agent = value.AGENT_JWT_SECRET || value.JWT_SECRET;
    if (!admin || !agent) {
      return helpers.message({
        custom: 'Set ADMIN_JWT_SECRET and AGENT_JWT_SECRET (or a shared JWT_SECRET) in production',
      });
    }
    if (value.ADMIN_JWT_SECRET && value.AGENT_JWT_SECRET && value.ADMIN_JWT_SECRET === value.AGENT_JWT_SECRET) {
      return helpers.message({
        custom: 'ADMIN_JWT_SECRET and AGENT_JWT_SECRET must differ in production',
      });
    }
    return value;
  })
  .unknown(true);
