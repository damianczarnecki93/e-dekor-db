const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');

// Zapisywanie listy
router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, clientName, items } = req.body;
    try {
        const newList = new ProductList({
            user: req.user.id,
            listName,
            clientName,
            items
        });
        const savedList = await newList.save();
        res.status(201).json(savedList);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// Pobieranie wszystkich list
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find().populate('user', 'username').sort({ createdAt: -1 });
        res.json(lists);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
