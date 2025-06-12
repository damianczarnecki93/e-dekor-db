// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// GET /api/admin/pending-users
router.get('/pending-users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        res.json(pendingUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// POST /api/admin/approve-user/:userId
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

// POST /api/admin/reject-user/:userId
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

// NOWA TRASA: Usuwanie użytkownika
// DELETE /api/admin/delete-user/:userId
router.delete('/delete-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) {
            return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' });
        }
        res.json({ msg: 'Użytkownik został usunięty.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;
