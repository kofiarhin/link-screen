const Session = require('../models/Session');
const { SOCKET_EVENTS } = require('../constants/constants');

// sessionId -> { hostSocketId }
const roomMeta = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on(SOCKET_EVENTS.HOST_JOIN, async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session || !session.active) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not found or expired' });
          return;
        }

        const room = io.sockets.adapter.rooms.get(sessionId);
        if (room && room.size >= 2) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session is full' });
          return;
        }

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = 'host';
        roomMeta.set(sessionId, { hostSocketId: socket.id });
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join session' });
      }
    });

    socket.on(SOCKET_EVENTS.VIEWER_JOIN, async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session || !session.active) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not found or expired' });
          return;
        }

        const room = io.sockets.adapter.rooms.get(sessionId);
        if (room && room.size >= 2) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session is full' });
          return;
        }

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = 'viewer';

        const meta = roomMeta.get(sessionId);
        if (meta) {
          io.to(meta.hostSocketId).emit(SOCKET_EVENTS.VIEWER_READY);
        }
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join session' });
      }
    });

    socket.on(SOCKET_EVENTS.OFFER, ({ sessionId, sdp }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.OFFER, { sdp });
    });

    socket.on(SOCKET_EVENTS.ANSWER, ({ sessionId, sdp }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.ANSWER, { sdp });
    });

    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ sessionId, candidate }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { candidate });
    });

    socket.on(SOCKET_EVENTS.SESSION_END, async ({ sessionId }) => {
      try {
        await Session.findByIdAndUpdate(sessionId, { active: false });
        socket.to(sessionId).emit(SOCKET_EVENTS.SESSION_END);
        roomMeta.delete(sessionId);
      } catch (err) {
        // session cleanup failure is non-critical
      }
    });

    socket.on('disconnect', async () => {
      const { sessionId, role } = socket;
      if (!sessionId || role !== 'host') return;

      try {
        await Session.findByIdAndUpdate(sessionId, { active: false });
        socket.to(sessionId).emit(SOCKET_EVENTS.SESSION_END);
        roomMeta.delete(sessionId);
      } catch (err) {
        // cleanup failure is non-critical
      }
    });
  });
};
