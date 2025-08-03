const express = require('express');
const Lead = require('../models/models'); // ✅ corrected path
const router = express.Router();

// GET all leads, sorted by latest message timestamp
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.aggregate([
      {
        $addFields: {
          lastMessageTime: { $last: "$messages.timestamp" }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
router.get('/:number', async (req, res) => {
  const { number } = req.params;
  try {
    const lead = await Lead.findOne({ number });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      number: lead.number,
      name: lead.name,
      messages: lead.messages.sort((a, b) => a.timestamp - b.timestamp),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;