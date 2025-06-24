const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'client/'); // Zapisz pliki bezpośrednio w folderze client
    },
    filename: function (req, file, cb) {
        // Użyj oryginalnej nazwy pliku przesłanej w żądaniu
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ username: 1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Błąd serwera');
    }
});

router.post('/approve-user/:id', adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        user.isApproved = true;
        await user.save();
        res.json({ msg: 'Użytkownik zatwierdzony' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.post('/edit-password/:id', adminMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.json({ msg: 'Hasło zmienione' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.post('/change-role/:id', adminMiddleware, async (req, res) => {
    const { newRole } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        user.role = newRole;
        await user.save();
        res.json({ msg: 'Rola zmieniona' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.delete('/delete-user/:id', adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Użytkownik nie znaleziony' });
        await user.deleteOne();
        res.json({ msg: 'Użytkownik usunięty' });
    } catch (err) {
        res.status(500).send('Błąd serwera');
    }
});

router.post('/upload-products', adminMiddleware, upload.single('productsFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'Nie załączono pliku.' });
    }
    res.json({ msg: `Plik ${req.file.originalname} został pomyślnie zaktualizowany.` });
});

module.exports = router;
