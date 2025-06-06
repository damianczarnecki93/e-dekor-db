// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// GET /api/admin/pending-users
router.get('/pending-users', [authMiddleware, adminMiddleware], async (req, res) => {
    console.log('--- OTRZYMANO ZAPYTANIE DO /api/admin/pending-users ---'); // <--- NOWY LOG
    try {
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        console.log('Znaleziono następujących użytkowników ze statusem "pending":'); // <--- NOWY LOG
        console.log(pendingUsers); // <--- NOWY LOG
        res.json(pendingUsers);
    } catch (err) {
        console.error('--- BŁĄD W /api/admin/pending-users ---'); // <--- NOWY LOG
        console.error(err.message); // <--- NOWY LOG
        res.status(500).send('Błąd serwera');
    }
});

// ... reszta pliku (approve/reject) pozostaje bez zmian ...
router.post('/approve-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'approved' }, { new: true });
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        res.json({ msg: 'Użytkownik został zatwierdzony.', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});
router.post('/reject-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'rejected' }, { new: true });
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        res.json({ msg: 'Użytkownik został odrzucony.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;