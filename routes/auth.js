// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    console.log('--- OTRZYMANO ZAPYTANIE DO /api/auth/register ---'); // <--- NOWY LOG
    const { username, password } = req.body;
    console.log(`Dane z formularza: username=${username}`); // <--- NOWY LOG

    try {
        if (!username || !password) {
            console.log('Błąd: Brak nazwy użytkownika lub hasła.'); // <--- NOWY LOG
            return res.status(400).json({ msg: 'Proszę podać wszystkie dane.' });
        }
        let user = await User.findOne({ username });
        if (user) {
            console.log('Błąd: Użytkownik o tym loginie już istnieje.'); // <--- NOWY LOG
            return res.status(400).json({ msg: 'Użytkownik o tym loginie już istnieje.' });
        }

        console.log('Tworzenie nowego użytkownika w bazie...'); // <--- NOWY LOG
        user = new User({ username, password }); // Status domyślnie 'pending'

        const savedUser = await user.save(); // Zapisujemy użytkownika
        console.log('Sukces! Zapisano użytkownika w bazie danych:'); // <--- NOWY LOG
        console.log(savedUser); // <--- NOWY LOG

        res.status(201).json({ msg: 'Rejestracja pomyślna. Oczekuj na akceptację administratora.' });

    } catch (err) {
        console.error('--- KRYTYCZNY BŁĄD PODCZAS REJESTRACJI ---'); // <--- NOWY LOG
        console.error(err); // <--- NOWY LOG
        res.status(500).send('Błąd serwera podczas rejestracji');
    }
});

// ... reszta pliku (logowanie i weryfikacja) pozostaje bez zmian ...
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Nieprawidłowy login lub hasło.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Nieprawidłowy login lub hasło.' });
        }
        if (user.status !== 'approved') {
            return res.status(403).json({ msg: 'Konto nieaktywne lub oczekuje na akceptację.' });
        }
        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({
            token,
            user: { username: user.username, role: user.role }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});
// routes/auth.js

// ... (istniejący kod dla /register, /login, /verify) ...

// NOWA TRASA: Zmiana hasła przez zalogowanego użytkownika
router.post('/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ msg: 'Proszę podać wszystkie dane.' });
    }
     if (newPassword.length < 4) {
        return res.status(400).json({ msg: 'Nowe hasło musi mieć co najmniej 4 znaki.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony.' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Stare hasło jest nieprawidłowe.' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ msg: 'Hasło zostało pomyślnie zmienione.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


module.exports = router;
