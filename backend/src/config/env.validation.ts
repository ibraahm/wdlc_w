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

// In production, secrets must be present, long, and not a known placeholder.
const prodSecret = Joi.string()
  .min(32)
  .invalid(...PLACEHOLDERS)
  .required();
const devSecret = Joi.string().min(8).optional();
const secret = isProd ? prodSecret : devSecret;

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),

  DATABASE_URL: isProd
    ? Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required()
    : Joi.string().required(),

  // Either a shared JWT_SECRET or per-portal secrets must satisfy validation.
  // We validate each individually; main.ts asserts at least one path is set.
  JWT_SECRET: secret,
  ADMIN_JWT_SECRET: secret,
  AGENT_JWT_SECRET: secret,

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .optional(),
  CORS_ORIGIN: Joi.string().optional(),
  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().optional(),

  RECAPTCHA_SECRET: Joi.string().optional(),
  SENDGRID_API_KEY: Joi.string().optional(),
})
  // Require that the admin & agent portals end up with usable, distinct secrets
  // in production: either both per-portal secrets, or a shared JWT_SECRET.
  .custom((value, helpers) => {
    if (!isProd) return value;
    const admin = value.ADMIN_JWT_SECRET || value.JWT_SECRET;
    const agent = value.AGENT_JWT_SECRET || value.JWT_SECRET;
    if (!admin || !agent) {
      return helpers.error('any.custom', {
        message: 'Set ADMIN_JWT_SECRET and AGENT_JWT_SECRET (or a shared JWT_SECRET) in production',
      });
    }
    if (value.ADMIN_JWT_SECRET && value.AGENT_JWT_SECRET && value.ADMIN_JWT_SECRET === value.AGENT_JWT_SECRET) {
      return helpers.error('any.custom', {
        message: 'ADMIN_JWT_SECRET and AGENT_JWT_SECRET must differ in production',
      });
    }
    return value;
  })
  .unknown(true);
