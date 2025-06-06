// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Podstawowe middleware ---
app.use(cors()); // Umożliwia zapytania z innych domen (np. z twojego frontendu)
app.use(express.json()); // Pozwala na odczytywanie danych JSON z zapytań

// --- Połączenie z bazą danych MongoDB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Połączono z MongoDB!'))
    .catch(err => console.error('Błąd połączenia z MongoDB:', err));

// --- Definicje API (Routes) ---
// Tutaj podłączymy nasze pliki z logiką dla endpointów
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/data', require('./routes/data'));
// Dodaj w przyszłości: app.use('/api/products', require('./routes/products'));

// --- Serwowanie plików frontendu ---
app.use(express.static(path.join(__dirname, 'client')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});


// --- Uruchomienie serwera ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer uruchomiony na porcie ${PORT}`));