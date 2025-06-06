// routes/data.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');
const Inventory = require('../models/Inventory');

// --- Product List (Zamówienie) ---

// GET /api/data/productlist
router.get('/productlist', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findOne({ user: req.user.id });
        if (!list) {
            return res.json({ clientName: '', items: [] }); // Zwróć pustą listę, jeśli nie istnieje
        }
        res.json(list);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// POST /api/data/productlist
router.post('/productlist', authMiddleware, async (req, res) => {
    const { clientName, items } = req.body;
    try {
        // findOneAndUpdate z opcją upsert:true stworzy nowy dokument, jeśli nie znajdzie pasującego.
        const updatedList = await ProductList.findOneAndUpdate(
            { user: req.user.id },
            { clientName, items, user: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(updatedList);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// --- Inventory (Inwentaryzacja) ---

// GET /api/data/inventory
router.get('/inventory', authMiddleware, async (req, res) => {
    try {
        const inv = await Inventory.findOne({ user: req.user.id });
        if (!inv) {
            return res.json({ items: [] });
        }
        res.json(inv);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// POST /api/data/inventory
router.post('/inventory', authMiddleware, async (req, res) => {
    const { items } = req.body;
    try {
        const updatedInv = await Inventory.findOneAndUpdate(
            { user: req.user.id },
            { items, user: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(updatedInv);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;