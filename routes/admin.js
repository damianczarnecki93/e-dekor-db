// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// ZMIANA: Trasa pobiera wszystkich użytkowników, a nie tylko oczekujących
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ role: -1, username: 1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

router.post('/approve-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'approved' }, { new: true });
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        res.json({ msg: 'Użytkownik został zatwierdzony.', user });
    } catch (err) { console.error(err.message); res.status(500).send('Błąd serwera'); }
});

router.post('/reject-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { status: 'rejected' }, { new: true });
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        res.json({ msg: 'Użytkownik został odrzucony.' });
    } catch (err) { console.error(err.message); res.status(500).send('Błąd serwera'); }
});

router.delete('/delete-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        res.json({ msg: 'Użytkownik został usunięty.' });
    } catch (err) { console.error(err.message); res.status(500).send('Błąd serwera'); }
});

// NOWA TRASA: Edycja hasła użytkownika przez admina
router.post('/edit-password/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ msg: 'Hasło musi mieć co najmniej 4 znaki.' });
    }
    try {
        const user = await User.findById(req.params.userId);
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        user.password = newPassword; // Model User ma hook 'pre-save', który zahashuje hasło
        await user.save();
        res.json({ msg: 'Hasło zostało zmienione.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
