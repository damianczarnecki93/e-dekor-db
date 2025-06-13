const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware do parsowania JSON
app.use(express.json());

// Łączenie z bazą danych MongoDB
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(() => console.log('Połączono z MongoDB...'))
    .catch(err => console.error('Nie udało się połączyć z MongoDB...', err));

// Definicja tras API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// Serwowanie plików statycznych z folderu 'client'
app.use(express.static(path.join(__dirname, 'client')));

// Dla każdej innej trasy, serwuj plik index.html
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serwer uruchomiony na porcie ${PORT}`));
