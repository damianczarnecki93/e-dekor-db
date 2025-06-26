const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Upewnij się, że ścieżka do modelu jest poprawna
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Konfiguracja Multer do obsługi przesyłania plików
const upload = multer({ dest: 'uploads/' });

// --- Trasa do pobierania wszystkich użytkowników (TYLKO DLA ADMINA) ---
// GET /api/admin/users
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        // Znajdź wszystkich użytkowników, ale nie wysyłaj ich haseł
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('Błąd serwera przy pobieraniu użytkowników:', err.message);
        res.status(500).send('Błąd serwera');
    }
});

// --- Trasa do zatwierdzania użytkownika (TYLKO DLA ADMINA) ---
// POST /api/admin/approve-user/:id
router.post('/approve-user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        }
        user.isApproved = true;
        await user.save();
        res.json({ msg: 'Użytkownik został zatwierdzony.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// --- Trasa do usuwania użytkownika (TYLKO DLA ADMINA) ---
// DELETE /api/admin/delete-user/:id
router.delete('/delete-user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        }
        await user.deleteOne(); // Użyj deleteOne() dla Mongoose v6+
        res.json({ msg: 'Użytkownik został usunięty.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

// --- Trasa do zmiany hasła użytkownika przez admina ---
router.post('/edit-password/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ msg: 'Hasło musi mieć co najmniej 6 znaków.' });
    }
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        }
        user.password = newPassword; // Model User powinien automatycznie zahashować hasło przed zapisem (jeśli masz taki pre-save hook)
        await user.save();
        res.json({ msg: `Hasło dla ${user.username} zostało zmienione.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});


// --- Trasa do przesyłania plików produktowych ---
router.post('/upload-products', [authMiddleware, adminMiddleware, upload.single('productsFile')], (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Nie przesłano pliku.' });
        }
        
        const tempPath = req.file.path;
        // Używamy oryginalnej nazwy pliku, aby wiedzieć, który plik nadpisać
        const targetPath = path.resolve(__dirname, '..', 'client', req.file.originalname);

        // Przenosimy plik z folderu tymczasowego 'uploads' do folderu 'client'
        fs.rename(tempPath, targetPath, err => {
            if (err) {
                console.error("Błąd podczas przenoszenia pliku:", err);
                return res.status(500).json({ msg: 'Błąd zapisu pliku na serwerze.' });
            }
            res.json({ msg: `Plik ${req.file.originalname} został pomyślnie zaktualizowany.` });
        });

    } catch (error) {
        console.error("Błąd w trasie upload-products:", error);
        res.status(500).json({ msg: 'Wystąpił wewnętrzny błąd serwera.' });
    }
});

module.exports = router;
