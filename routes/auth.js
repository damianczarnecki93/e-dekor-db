const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
require('dotenv').config();

// Rejestracja
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ msg: 'Użytkownik już istnieje' });

        const isAdmin = (await User.countDocuments()) === 0; // Pierwszy użytkownik zostaje adminem
        user = new User({ username, password, role: isAdmin ? 'admin' : 'user', isApproved: isAdmin });
        await user.save();
        res.status(201).json({ msg: `Użytkownik ${username} zarejestrowany. Oczekuje na zatwierdzenie przez administratora.` });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// Logowanie
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: 'Nieprawidłowe dane logowania' });
        if (!user.isApproved) return res.status(403).json({ msg: 'Konto nie zostało jeszcze zatwierdzone.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Nieprawidłowe dane logowania' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { username: user.username, role: user.role } });
        });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

// Weryfikacja tokenu
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        res.json(user);
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
