const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Residence types endpoint - to be implemented' });
});

router.get('/:id/checklist-template', (req, res) => {
  res.json({ message: 'Checklist template endpoint - to be implemented' });
});

module.exports = router;
