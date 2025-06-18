const express = require('express');
const mongoose = require('mongoose');
const cors =require('cors');
const path = require('path');
require('dotenv').config();

// --- DODANO LINIĘ DIAGNOSTYCZNĄ ---
// Ta linia wyświetli wszystkie zmienne środowiskowe w logach Render
console.log('--- Zmienne Środowiskowe ---');
console.log(process.env);
console.log('---------------------------');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());


// --- Routing ---

// 1. Serwowanie plików statycznych z katalogu 'client'
app.use(express.static(path.join(__dirname, 'client')));

// 2. Definicje tras API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// 3. Reguła "Catch-all" dla aplikacji jednostronicowej (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});


// --- Uruchomienie serwera ---

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Sprawdzenie, czy MONGODB_URI jest zdefiniowane
if (!MONGODB_URI) {
    console.error('BŁĄD: Zmienna środowiskowa MONGODB_URI nie jest ustawiona. Sprawdź konfigurację na Render.com.');
    process.exit(1); // Zakończ proces, jeśli brakuje kluczowej konfiguracji
}

// Połączenie z bazą danych, a NASTĘPNIE uruchomienie serwera
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Połączono z MongoDB pomyślnie.');
    app.listen(PORT, () => console.log(`Serwer e-Dekor działa na porcie ${PORT}`));
})
.catch(err => {
    console.error('Krytyczny błąd połączenia z MongoDB:', err);
    process.exit(1); // Zakończ proces w przypadku błędu połączenia z bazą
});
