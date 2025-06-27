const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Dodajemy moduł 'path'
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- POPRAWKA: Tworzymy absolutną ścieżkę do modelu ---
// To rozwiązanie jest bardziej odporne na różnice w środowiskach (lokalne vs. serwer)
const productModelPath = path.resolve(__dirname, 'models', 'Product.js');
console.log(`[DEBUG] Próba załadowania modelu Product z: ${productModelPath}`); // Logowanie ścieżki dla celów diagnostycznych
const Product = require(productModelPath);

// --- Podłączenie tras API ---
// Przekazujemy załadowany model 'Product' do routera '/api/data'
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data')(Product)); // Ta linia jest kluczowa dla nowego podejścia
app.use('/api/admin', require('./routes/admin'));

// --- Serwowanie plików statycznych z folderu 'client' ---
app.use(express.static(path.join(__dirname, 'client')));

// --- Reguła "Catch-all" - serwuje index.html dla każdej innej trasy ---
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Krytyczny błąd: Brak MONGODB_URI w zmiennych środowiskowych.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('Krytyczny błąd: Brak JWT_SECRET w zmiennych środowiskowych.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Połączono z MongoDB.');
        app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
    })
    .catch(err => {
        console.error('Błąd połączenia z MongoDB:', err);
        process.exit(1);
    });
