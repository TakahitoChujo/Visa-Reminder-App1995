const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authenticateToken, (req, res) => {
  res.json({ message: 'Device token registration - to be implemented' });
});

module.exports = router;
