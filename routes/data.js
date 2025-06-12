// routes/data.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');
const Inventory = require('../models/Inventory');
const User = require('../models/User'); // Potrzebne do populate

// --- Listy Zamówień ---

// ZMIANA: Pobiera wszystkie listy od wszystkich użytkowników i dodaje dane autora
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find({})
            .populate('user', 'username') // Dołączamy nazwę użytkownika z kolekcji User
            .sort({ updatedAt: -1 });
        res.json(lists);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Błąd serwera' });
    }
});

// ZMIANA: Pozwala każdemu wczytać listę po ID
router.get('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie została znaleziona.' });
        }
        res.json(list);
    } catch (err) {
        res.status(500).json({ msg: 'Błąd serwera' });
    }
});

// ZMIANA: Zapisuje nową listę z ID aktualnego użytkownika jako autora
router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, items, clientName } = req.body;
    try {
        const newList = new ProductList({
            listName: listName || `Zamówienie z ${new Date().toLocaleDateString()}`,
            clientName: clientName,
            items,
            user: req.user.id // Zapisujemy, kto jest autorem listy
        });
        await newList.save();
        res.status(201).json(newList);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Błąd serwera podczas zapisu listy.' });
    }
});

// ZMIANA: Usuwanie listy dozwolone tylko dla autora lub admina
router.delete('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie została znaleziona.' });
        }

        // Sprawdzenie uprawnień
        const user = await User.findById(req.user.id);
        if (list.user.toString() !== req.user.id && user.role !== 'admin') {
            return res.status(403).json({ msg: 'Brak uprawnień do usunięcia tej listy.' });
        }

        await ProductList.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Lista została usunięta.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Błąd serwera' });
    }
});

// --- Inwentaryzacja (bez zmian) ---
router.get('/inventory', authMiddleware, async (req, res) => {
    try {
        const inv = await Inventory.findOne({ user: req.user.id });
        res.json(inv || { items: [] });
    } catch (err) { res.status(500).send('Błąd serwera'); }
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
    } catch (err) { res.status(500).send('Błąd serwera'); }
});

module.exports = router;
