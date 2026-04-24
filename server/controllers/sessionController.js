const Session = require('../models/Session');
const generateId = require('../utils/generateId');
const env = require('../config/env');

const createSession = async (req, res, next) => {
  try {
    const id = generateId();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_MS);

    const session = new Session({ _id: id, expiresAt });
    await session.save();

    res.status(201).json({
      success: true,
      data: {
        id,
        link: `${env.CLIENT_URL}/session/${id}`,
        expiresAt,
      },
      message: 'Session created',
    });
  } catch (err) {
    next(err);
  }
};

const getSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session || !session.active) {
      return res.status(404).json({ success: false, error: 'Session not found or expired' });
    }

    res.json({
      success: true,
      data: { id: session._id, active: session.active, expiresAt: session.expiresAt },
      message: '',
    });
  } catch (err) {
    next(err);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: null, message: 'Session ended' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createSession, getSession, deleteSession };
