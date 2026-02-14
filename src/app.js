const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { sanitizeInput } = require('./middlewares/sanitize.middleware');

const app = express();

// ─── Trust Proxy (required behind Render/Nginx reverse proxy) ─────
app.set('trust proxy', 1);

// ─── Security Headers ──────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting (global) ────────────────────────────────────────
app.use(globalLimiter);

// ─── CORS ──────────────────────────────────────────────────────────
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
  corsOptions.origin = (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  };
} else {
  // No CORS_ORIGIN set → allow all origins (dev / early production)
  corsOptions.origin = true;
}

app.use(cors(corsOptions));

// ─── Body Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Response Compression ──────────────────────────────────────────
app.use(compression());

// ─── Input Sanitization (XSS Prevention) ───────────────────────────
app.use(sanitizeInput);

// ─── Health Check ──────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ecommerce Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error Handling ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
