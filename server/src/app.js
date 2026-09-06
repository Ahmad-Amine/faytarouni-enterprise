const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middlewares/errorHandler');
const { applySecurity, globalLimiter } = require('./middlewares/security');
const { issueCsrfCookie, verifyCsrf } = require('./middlewares/csrf');

const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

applySecurity(app);

// CLIENT_URL may be a single origin or a comma-separated list (e.g. a
// Railway preview deployment alongside production). Trailing slashes are
// stripped since browsers never include one in the Origin header, so a
// mismatched env value wouldn't otherwise silently break every request.
const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim().replace(/\/+$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header at all).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(issueCsrfCookie);
app.use(verifyCsrf);

if (!env.isProd) app.use(morgan('dev'));

app.use(env.apiPrefix, globalLimiter);

app.get('/health', (req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }));

app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}`, publicRoutes);
app.use(`${env.apiPrefix}`, customerRoutes);
app.use(`${env.apiPrefix}/admin`, adminRoutes);

// This backend is deployed as its own standalone Railway service, with the
// frontend deployed separately (see client/README-deploy or the project
// README) — so this API never serves the built frontend itself. Any
// unmatched route is simply a 404.
app.all('*', (req, res, next) => next(ApiError.notFound(`Route ${req.originalUrl} not found.`)));

app.use(errorHandler);

module.exports = app;
