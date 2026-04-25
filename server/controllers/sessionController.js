const Session = require('../models/Session');
const generateId = require('../utils/generateId');
const env = require('../config/env');

const isExpired = (session) => session.expiresAt <= new Date();

const createSession = async (req, res, next) => {
  try {
    const sessionId = generateId();
    const hostToken = generateId(24);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_MS);

    const session = new Session({ _id: sessionId, hostToken, expiresAt, status: 'waiting' });
    await session.save();

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        hostToken,
        hostUrl: `${env.CLIENT_URL}/session/${sessionId}?hostToken=${hostToken}`,
        viewerUrl: `${env.CLIENT_URL}/session/${sessionId}`,
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session || !session.active || isExpired(session)) {
      return res.status(404).json({ success: false, message: 'Session not found or expired' });
    }

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        active: session.active,
        status: session.status,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session || isExpired(session)) {
      return res.status(404).json({ success: false, message: 'Session not found or expired' });
    }

    session.active = false;
    session.status = 'ended';
    await session.save();

    return res.json({ success: true, data: { sessionId: session._id } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSession, getSession, deleteSession };
