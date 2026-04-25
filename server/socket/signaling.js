const Session = require('../models/Session');
const { SOCKET_EVENTS } = require('../constants/constants');

const isExpired = (session) => session.expiresAt <= new Date();

module.exports = (io) => {
  io.on('connection', (socket) => {
    const emitSessionMissing = () => {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session not found or expired' });
    };

    const handleHostJoin = async ({ sessionId, hostToken }) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session || !session.active || isExpired(session)) {
          emitSessionMissing();
          return;
        }

        if (!hostToken || hostToken !== session.hostToken) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid host token' });
          return;
        }

        session.hostSocketId = socket.id;
        session.status = session.viewerSocketId ? 'connected' : 'waiting';
        await session.save();

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = 'host';

        if (session.viewerSocketId) {
          io.to(socket.id).emit(SOCKET_EVENTS.VIEWER_READY);
        }
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join session' });
      }
    };

    const handleViewerJoin = async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session || !session.active || isExpired(session)) {
          emitSessionMissing();
          return;
        }

        if (!session.hostSocketId) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Host is not connected' });
          return;
        }

        if (session.viewerSocketId && session.viewerSocketId !== socket.id) {
          const existing = io.sockets.sockets.get(session.viewerSocketId);
          if (existing?.connected) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session is full' });
            return;
          }
        }

        session.viewerSocketId = socket.id;
        session.status = 'connected';
        await session.save();

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = 'viewer';

        io.to(session.hostSocketId).emit(SOCKET_EVENTS.VIEWER_READY);
      } catch (err) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to join session' });
      }
    };

    const handleOffer = ({ sessionId, sdp }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.OFFER, { sdp });
    };

    const handleAnswer = ({ sessionId, sdp }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.ANSWER, { sdp });
    };

    const handleIceCandidate = ({ sessionId, candidate }) => {
      socket.to(sessionId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { candidate });
    };

    const handleSessionEnd = async ({ sessionId }) => {
      try {
        const session = await Session.findById(sessionId);
        if (!session) return;

        session.active = false;
        session.status = 'ended';
        session.hostSocketId = null;
        session.viewerSocketId = null;
        await session.save();

        socket.to(sessionId).emit(SOCKET_EVENTS.SESSION_END);
      } catch {
        // non-critical
      }
    };

    const handleDisconnect = async () => {
      const { sessionId, role } = socket;
      if (!sessionId || !role) return;

      const session = await Session.findById(sessionId);
      if (!session) return;

      if (role === 'host') {
        session.active = false;
        session.status = 'ended';
        session.hostSocketId = null;
        session.viewerSocketId = null;
        await session.save();
        socket.to(sessionId).emit(SOCKET_EVENTS.SESSION_END);
        return;
      }

      if (role === 'viewer' && session.viewerSocketId === socket.id) {
        session.viewerSocketId = null;
        session.status = 'waiting';
        await session.save();

        if (session.hostSocketId) {
          io.to(session.hostSocketId).emit(SOCKET_EVENTS.VIEWER_LEFT, {
            reason: 'viewer-disconnected',
          });
        }
      }
    };

    socket.on(SOCKET_EVENTS.HOST_JOIN, handleHostJoin);
    socket.on(SOCKET_EVENTS.VIEWER_JOIN, handleViewerJoin);
    socket.on(SOCKET_EVENTS.OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SOCKET_EVENTS.SESSION_END, handleSessionEnd);
    socket.on('disconnect', handleDisconnect);
  });
};
