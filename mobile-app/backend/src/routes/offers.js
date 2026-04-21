const express = require('express');
const router = express.Router();
const { Offer } = require('../models');

// GET /api/offers
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true });
    res.json(offers);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/offers
router.post('/', async (req, res) => {
  try {
    const offer = await Offer.create(req.body);
    res.status(201).json(offer);
  } catch (e) {
    res.status(400).json({ message: 'Bad Request' });
  }
});

module.exports = router;
