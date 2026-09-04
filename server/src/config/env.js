require('dotenv').config();

// Railway's MongoDB plugin injects MONGO_URL (not MONGO_URI) — accept either.
const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL;

const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CSRF_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (!mongoUri) missing.unshift('MONGO_URI (or MONGO_URL)');
if (missing.length > 0) {
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

// A short or copy-pasted-placeholder secret is only marginally better than
// no secret at all — a 32+ character random value is what actually makes
// tokens/CSRF cookies resistant to brute-forcing. Only enforced in
// production so local dev can still use quick throwaway values.
if (isProd) {
  const weak = required.filter((key) => process.env[key].length < 32);
  if (weak.length > 0) {
    console.error(
      `[env] Refusing to start in production: ${weak.join(', ')} ${weak.length > 1 ? 'are' : 'is'} shorter than 32 characters. ` +
        'Generate strong values with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cookieDomain: process.env.COOKIE_DOMAIN || 'localhost',

  emailTokenTtlHours: Number(process.env.EMAIL_TOKEN_TTL_HOURS || 24),
  resetTokenTtlHours: Number(process.env.RESET_TOKEN_TTL_HOURS || 1),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Faytarouni Barbershop <no-reply@faytarouni.test>',
  },

  admin: {
    name: process.env.ADMIN_NAME || 'Studio Owner',
    email: (process.env.ADMIN_EMAIL || 'owner@faytarouni.test').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe_123!',
    phone: process.env.ADMIN_PHONE || '10000000000',
  },

  csrfSecret: process.env.CSRF_SECRET,

  rateLimit: {
    windowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
  },
};
