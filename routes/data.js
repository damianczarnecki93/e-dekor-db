// routes/data.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');
const Inventory = require('../models/Inventory');

// --- Listy Zamówień ---

// GET /api/data/lists - Pobiera wszystkie listy dla użytkownika
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select('listName updatedAt');
        res.json(lists);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// GET /api/data/list/:id - Pobiera jedną konkretną listę
router.get('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findOne({ _id: req.params.id, user: req.user.id });
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie została znaleziona.' });
        }
        res.json(list);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});


// POST /api/data/savelist - Zapisuje NOWĄ listę zamówienia
router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, items, clientName } = req.body;
    try {
        const newList = new ProductList({
            listName: listName || `Zamówienie z ${new Date().toLocaleDateString()}`,
            clientName: clientName, // Zachowujemy dla spójności
            items,
            user: req.user.id
        });
        await newList.save();
        res.status(201).json(newList);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// DELETE /api/data/list/:id - Usuwa listę zamówienia
router.delete('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie została znaleziona.' });
        }
        res.json({ msg: 'Lista została usunięta.' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});


// --- Inwentaryzacja (pozostaje bez zmian) ---

router.get('/inventory', authMiddleware, async (req, res) => {
    try {
        const inv = await Inventory.findOne({ user: req.user.id });
        res.json(inv || { items: [] });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

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
