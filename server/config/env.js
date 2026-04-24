require('dotenv').config();

const required = ['PORT', 'CLIENT_URL', 'MONGODB_URI'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  PORT: process.env.PORT,
  CLIENT_URL: process.env.CLIENT_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  SESSION_TTL_MS: parseInt(process.env.SESSION_TTL_MS || '3600000', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '20', 10),
};
