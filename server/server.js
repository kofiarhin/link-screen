const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const env = require('./config/env');
const app = require('./app');
const registerSignaling = require('./socket/signaling');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.CLIENT_URL },
});

registerSignaling(io);

mongoose
  .connect(env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
