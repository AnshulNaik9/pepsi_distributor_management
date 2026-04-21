const express = require('express');
const router = express.Router();
const { Expense } = require('../models');

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ message: 'Internal Error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const expense = await Expense.create(req.body);
    res.status(201).json(expense);
  } catch (e) {
    res.status(400).json({ message: 'Bad Request' });
  }
});

module.exports = router;
