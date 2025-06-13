const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware do parsowania JSON
app.use(express.json());

// Logika tras API - na razie uproszczona, aby nie powodować błędów
// Zwracamy przykładowe dane, żeby sprawdzić, czy API w ogóle odpowiada
app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    // Symulacja pomyślnego logowania
    res.json({
        token: 'fake-token-for-testing',
        user: { id: '123', username: username, role: 'user' }
    });
});

app.get('/api/auth/verify', (req, res) => {
    // Symulacja pomyślnej weryfikacji
    res.json({ id: '123', username: 'testuser', role: 'user' });
});


// Serwowanie plików statycznych z folderu 'client'
app.use(express.static(path.join(__dirname, 'client')));

// Dla każdej innej trasy, serwuj plik index.html
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer diagnostyczny uruchomiony na porcie ${PORT}`));
