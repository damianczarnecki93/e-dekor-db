// routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// ZMIANA: Pobiera wszystkich użytkowników
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

router.delete('/delete-user/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.userId);
        if (!userToDelete) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        if (userToDelete.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ msg: 'Nie można usunąć ostatniego administratora.' });
            }
        }
        await User.findByIdAndDelete(req.params.userId);
        res.json({ msg: 'Użytkownik został usunięty.' });
    } catch (err) { console.error(err.message); res.status(500).send('Błąd serwera'); }
});

router.post('/edit-password/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) { return res.status(400).json({ msg: 'Hasło musi mieć co najmniej 4 znaki.' }); }
    try {
        const user = await User.findById(req.params.userId);
        if (!user) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }
        user.password = newPassword;
        await user.save();
        res.json({ msg: 'Hasło zostało zmienione.' });
    } catch (err) { console.error(err.message); res.status(500).send('Błąd serwera'); }
});

// NOWA TRASA: Zmiana roli użytkownika
router.post('/change-role/:userId', [authMiddleware, adminMiddleware], async (req, res) => {
    const { newRole } = req.body;
    if (!['user', 'admin'].includes(newRole)) {
        return res.status(400).json({ msg: 'Nieprawidłowa rola.' });
    }
    try {
        const userToUpdate = await User.findById(req.params.userId);
        if (!userToUpdate) { return res.status(404).json({ msg: 'Nie znaleziono użytkownika.' }); }

        // Zapobieganie degradacji ostatniego admina
        if (userToUpdate.role === 'admin' && newRole === 'user') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ msg: 'Nie można zdegradować ostatniego administratora.' });
            }
        }
        
        const updatedUser = await User.findByIdAndUpdate(req.params.userId, { role: newRole }, { new: true });
        res.json({ msg: `Rola użytkownika ${updatedUser.username} została zmieniona na ${newRole}.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
