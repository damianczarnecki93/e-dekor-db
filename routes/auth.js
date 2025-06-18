const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Rejestracja nowego użytkownika
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Użytkownik o tej nazwie już istnieje' });
        }
        user = new User({
            username,
            password,
            role: 'user', // Domyślna rola
            isApproved: false // Nowi użytkownicy wymagają zatwierdzenia
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ msg: 'Rejestracja pomyślna. Oczekuj na zatwierdzenie konta przez administratora.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// @route   POST /api/auth/login
// @desc    Logowanie użytkownika
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Nieprawidłowe dane uwierzytelniające' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Nieprawidłowe dane uwierzytelniające' });
        }

        if (!user.isApproved) {
            return res.status(403).json({ msg: 'Konto nie zostało jeszcze zatwierdzone przez administratora.' });
        }

        const payload = {
            userId: user.id,
            role: user.role
        };
        
        // POPRAWKA: Zmieniono odpowiedź, aby zawierała obiekt `user`
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


// @route   GET /api/auth/verify
// @desc    Weryfikacja tokenu i odświeżenie danych użytkownika
// @access  Private
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        // authMiddleware dodaje req.userId
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'Nie znaleziono użytkownika' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


// @route   POST /api/auth/change-password
// @desc    Zmiana hasła przez zalogowanego użytkownika
// @access  Private
router.post('/change-password', authMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ msg: 'Nie znaleziono użytkownika' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Hasło zostało pomyślnie zmienione.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/register
// @desc    Rejestracja nowego użytkownika
// @access  Public
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Użytkownik o tej nazwie już istnieje' });
        }
        user = new User({
            username,
            password,
            role: 'user', // Domyślna rola
            isApproved: false // Nowi użytkownicy wymagają zatwierdzenia
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        res.status(201).json({ msg: 'Rejestracja pomyślna. Oczekuj na zatwierdzenie konta przez administratora.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// @route   POST /api/auth/login
// @desc    Logowanie użytkownika
// @access  Public
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Nieprawidłowe dane uwierzytelniające' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Nieprawidłowe dane uwierzytelniające' });
        }

        if (!user.isApproved) {
            return res.status(403).json({ msg: 'Konto nie zostało jeszcze zatwierdzone przez administratora.' });
        }

        const payload = {
            userId: user.id,
            role: user.role
        };
        
        // POPRAWKA: Zmieniono odpowiedź, aby zawierała obiekt `user`
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


// @route   GET /api/auth/verify
// @desc    Weryfikacja tokenu i odświeżenie danych użytkownika
// @access  Private
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        // authMiddleware dodaje req.userId
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'Nie znaleziono użytkownika' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


// @route   POST /api/auth/change-password
// @desc    Zmiana hasła przez zalogowanego użytkownika
// @access  Private
router.post('/change-password', authMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ msg: 'Nie znaleziono użytkownika' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Hasło zostało pomyślnie zmienione.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;
