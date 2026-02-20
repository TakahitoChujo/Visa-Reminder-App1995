const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/settings', authenticateToken, (req, res) => {
  res.json({ message: 'Reminder settings endpoint - to be implemented' });
});

router.put('/settings', authenticateToken, (req, res) => {
  res.json({ message: 'Update reminder settings - to be implemented' });
});

module.exports = router;
