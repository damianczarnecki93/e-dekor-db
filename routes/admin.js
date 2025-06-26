// Plik: /routes/admin.js

const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Upewnij się, że ścieżka jest poprawna
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Konfiguracja Multer do obsługi przesyłania plików do pamięci
const upload = multer({ storage: multer.memoryStorage() });

// --- Trasa do pobierania wszystkich użytkowników (TYLKO DLA ADMINA) ---
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error('Błąd serwera przy pobieraniu użytkowników:', err.message);
        res.status(500).json({ msg: 'Błąd serwera podczas pobierania użytkowników' });
    }
});

// --- Trasa do zatwierdzania użytkownika (TYLKO DLA ADMINA) ---
router.post('/approve-user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        }
        res.json({ msg: 'Użytkownik został zatwierdzony.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Błąd serwera' });
    }
});

// --- Trasa do usuwania użytkownika (TYLKO DLA ADMINA) ---
router.delete('/delete-user/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        }
        res.json({ msg: 'Użytkownik został usunięty.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Błąd serwera' });
    }
});

// --- Trasa do importu plików produktowych (CSV) ---
router.post('/upload-products', [authMiddleware, adminMiddleware, upload.single('productsFile')], (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'Nie przesłano pliku.' });
        }
        
        // Używamy oryginalnej nazwy pliku, aby wiedzieć, który plik nadpisać
        const targetFilename = req.body.filename; // 'produkty.csv' or 'produkty2.csv'
        if (!targetFilename) {
            return res.status(400).json({ msg: 'Nie określono nazwy pliku docelowego.' });
        }

        const targetPath = path.resolve(__dirname, '..', 'client', targetFilename);

        // Zapisujemy plik z bufora pamięci do docelowej lokalizacji
        fs.writeFile(targetPath, req.file.buffer, (err) => {
            if (err) {
                console.error("Błąd podczas zapisu pliku:", err);
                return res.status(500).json({ msg: 'Błąd zapisu pliku na serwerze.' });
            }
            res.json({ msg: `Plik ${targetFilename} został pomyślnie zaktualizowany.` });
        });

    } catch (error) {
        console.error("Błąd w trasie upload-products:", error);
        res.status(500).json({ msg: 'Wystąpił wewnętrzny błąd serwera.' });
    }
});

module.exports = router;
