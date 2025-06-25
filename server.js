const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Trasy API ---
// Ta sekcja MUSI być PRZED serwowaniem plików statycznych
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// --- Serwowanie plików statycznych ---
// Ten folder zawiera Twoje pliki index.html, skaner.js, itp.
app.use(express.static(path.join(__dirname, 'client')));

// --- Reguła "Catch-all" dla SPA ---
// Ta reguła musi być na samym końcu.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});

// --- Uruchomienie serwera ---
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('BŁĄD: Zmienna środowiskowa MONGODB_URI nie jest ustawiona.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('Połączono z MongoDB pomyślnie.');
    app.listen(PORT, () => console.log(`Serwer e-Dekor działa na porcie ${PORT}`));
})
.catch(err => {
    console.error('Krytyczny błąd połączenia z MongoDB:', err);
    process.exit(1);
});
