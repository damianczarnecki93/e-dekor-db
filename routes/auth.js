const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

console.log('[DIAGNOSTYKA-AUTH] Plik routes/auth.js został załadowany.');

// @route   GET api/auth
// @desc    Pobranie danych zalogowanego użytkownika
router.get('/', auth, async (req, res) => {
    console.log('[DIAGNOSTYKA-AUTH] Zapytanie GET /api/auth odebrane. Weryfikacja użytkownika...');
    try {
        const user = await User.findById(req.user.id).select('-password');
        console.log(`[DIAGNOSTYKA-AUTH] Znaleziono użytkownika: ${user.username}. Zwracam dane.`);
        res.json(user);
    } catch (err) {
        console.error('[DIAGNOSTYKA-AUTH] Błąd w GET /api/auth:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// @route   POST api/auth/login
// @desc    Logowanie użytkownika i pobranie tokenu
router.post('/login', async (req, res) => {
    console.log('[DIAGNOSTYKA-AUTH] Zapytanie POST /api/auth/login odebrane.');
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            console.warn(`[DIAGNOSTYKA-AUTH] Nieudane logowanie, użytkownik nie istnieje: ${username}`);
            return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`[DIAGNOSTYKA-AUTH] Nieudane logowanie, nieprawidłowe hasło dla: ${username}`);
            return res.status(400).json({ message: 'Nieprawidłowe dane logowania' });
        }
        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            console.log(`[DIAGNOSTYKA-AUTH] Pomyślne logowanie dla: ${username}. Token wygenerowany.`);
            res.json({ token });
        });
    } catch (err) {
        console.error('[DIAGNOSTYKA-AUTH] Błąd serwera w POST /api/auth/login:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// @route   POST api/auth/register
// @desc    Rejestracja nowego użytkownika
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Użytkownik o tej nazwie już istnieje.' });
        }
        user = new User({ username, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ message: 'Rejestracja zakończona pomyślnie.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

module.exports = router;
