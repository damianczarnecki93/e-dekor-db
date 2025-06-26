const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');

// Zapisywanie lub aktualizacja listy zamówień
router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, clientName, items, listId } = req.body;
    try {
        if (listId) {
            // Aktualizacja istniejącej listy
            let list = await ProductList.findById(listId);
            if (!list) return res.status(404).json({ msg: 'Lista nie znaleziona.' });
            if (list.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Brak autoryzacji.' });
            
            list.listName = listName;
            list.clientName = clientName;
            list.items = items;
            await list.save();
            res.json(list);
        } else {
            // Tworzenie nowej listy
            const newList = new ProductList({
                user: req.user.id,
                listName,
                clientName,
                items
            });
            const savedList = await newList.save();
            res.status(201).json(savedList);
        }
    } catch (err) {
        console.error('Błąd zapisu listy:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// Pobieranie wszystkich list
router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find()
            .populate('user', 'username')
            .sort({ updatedAt: -1 });
        res.json(lists);
    } catch (err) {
        console.error('Błąd pobierania list:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// Pobieranie pojedynczej listy po ID
router.get('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie znaleziona.' });
        }
        res.json(list);
    } catch (err) {
        console.error('Błąd pobierania listy:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// Usuwanie listy
router.delete('/list/:id', authMiddleware, async (req, res) => {
     try {
        const list = await ProductList.findById(req.params.id);
        if (!list) {
            return res.status(404).json({ msg: 'Lista nie znaleziona.' });
        }
        // Sprawdzenie czy użytkownik jest właścicielem listy lub adminem
        if (list.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Brak autoryzacji.' });
        }
        await list.deleteOne();
        res.json({ msg: 'Lista została usunięta.' });
    } catch (err) {
        console.error('Błąd usuwania listy:', err.message);
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;
