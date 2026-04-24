const rateLimit = require('express-rate-limit');
const env = require('../config/env');

module.exports = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
  },
});
