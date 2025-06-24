const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const ProductList = require('../models/ProductList');

router.post('/savelist', authMiddleware, async (req, res) => {
    const { listName, items, clientName } = req.body;
    try {
        const newList = new ProductList({ listName, items, clientName, user: req.userId });
        const savedList = await newList.save();
        res.status(201).json(savedList);
    } catch (err) {
        console.error("Błąd zapisu listy:", err.message);
        res.status(500).json({ msg: 'Błąd serwera podczas zapisu listy.' });
    }
});

router.put('/list/:id', authMiddleware, async (req, res) => {
    try {
        const { items, clientName } = req.body;
        let list = await ProductList.findById(req.params.id);
        if (!list) return res.status(404).json({ msg: 'Lista nie znaleziona' });
        if (list.user.toString() !== req.userId) return res.status(401).json({ msg: 'Brak autoryzacji' });
        
        list.items = items;
        list.clientName = clientName;
        list.updatedAt = Date.now();
        await list.save();
        res.json(list);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.get('/lists', authMiddleware, async (req, res) => {
    try {
        const lists = await ProductList.find({ user: req.userId }).sort({ updatedAt: -1 }).populate('user', 'username');
        res.json(lists);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.get('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list) return res.status(404).json({ msg: 'Lista nie znaleziona' });
        if (list.user.toString() !== req.userId) return res.status(401).json({ msg: 'Brak autoryzacji' });
        res.json(list);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.delete('/list/:id', authMiddleware, async (req, res) => {
    try {
        const list = await ProductList.findById(req.params.id);
        if (!list) return res.status(404).json({ msg: 'Lista nie znaleziona' });
        if (list.user.toString() !== req.userId) return res.status(401).json({ msg: 'Brak autoryzacji' });
        await list.deleteOne();
        res.json({ msg: 'Lista usunięta' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
