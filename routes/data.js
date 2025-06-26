const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');
const Inventory = require('../models/Inventory');

// ZAPIS LUB AKTUALIZACJA LISTY ZAMÓWIEŃ
router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, clientName, items, listId } = req.body;
    try {
        if (listId) {
            // Aktualizacja istniejącej listy
            const updatedList = await ProductList.findOneAndUpdate(
                { _id: listId, user: req.user.id }, // Upewnij się, że użytkownik jest właścicielem
                { listName, clientName, items },
                { new: true, upsert: false }
            );
            if (!updatedList) return res.status(404).json({ msg: 'Lista nie znaleziona lub brak uprawnień.' });
            return res.json(updatedList);
        } else {
            // Tworzenie nowej listy
            const newList = new ProductList({ user: req.user.id, listName, clientName, items });
            const savedList = await newList.save();
            return res.status(201).json(savedList);
        }
    } catch (err) {
        console.error('Błąd zapisu listy:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// POBIERANIE WSZYSTKICH LIST ZAMÓWIEŃ
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find({ user: req.user.id }).populate('user', 'username').sort({ updatedAt: -1 });
        res.json(lists);
    } catch (err) {
        console.error('Błąd pobierania list:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// POBIERANIE JEDNEJ LISTY ZAMÓWIEŃ
router.get('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list || list.user.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Lista nie znaleziona lub brak dostępu.' });
        }
        res.json(list);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// ZAPIS INWENTARYZACJI
router.post('/inventory', authMiddleware, async (req, res) => {
    const { inventoryName, items } = req.body;
    if (!inventoryName || !items || items.length === 0) {
        return res.status(400).json({ msg: "Nazwa i pozycje inwentaryzacji są wymagane." });
    }
    try {
        const newInventory = new Inventory({ user: req.user.id, inventoryName, items });
        await newInventory.save();
        res.status(201).json({ msg: 'Inwentaryzacja została zapisana.' });
    } catch (err) {
        console.error('Błąd zapisu inwentaryzacji:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// POBIERANIE ZAPISANYCH INWENTARYZACJI
router.get('/inventories', authMiddleware, async (req, res) => {
    try {
        const inventories = await Inventory.find({ user: req.user.id }).populate('user', 'username').sort({ createdAt: -1 });
        res.json(inventories);
    } catch (err) {
        console.error('Błąd pobierania inwentaryzacji:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
