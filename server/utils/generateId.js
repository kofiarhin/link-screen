const { nanoid } = require('nanoid');

module.exports = (size = 12) => nanoid(size);
