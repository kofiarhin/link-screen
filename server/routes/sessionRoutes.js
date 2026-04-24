const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const { createSession, getSession, deleteSession } = require('../controllers/sessionController');

router.post('/', rateLimiter, createSession);
router.get('/:id', getSession);
router.delete('/:id', rateLimiter, deleteSession);

module.exports = router;
