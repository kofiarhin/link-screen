const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const sessionRoutes = require('./routes/sessionRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: env.CLIENT_URL }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: null, message: 'OK' });
});

app.use('/api/sessions', sessionRoutes);

app.use(errorHandler);

module.exports = app;
