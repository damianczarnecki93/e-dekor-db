const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// --- Middleware ---
// Umożliwia żądania z innych domen (CORS)
app.use(cors());
// Umożliwia parsowanie ciała żądania w formacie JSON
app.use(express.json());


// --- Routing ---

// 1. Serwowanie plików statycznych z katalogu 'client'
// Ta reguła musi być przed regułą "catch-all", aby poprawnie serwować pliki JS, CSS, obrazy itp.
app.use(express.static(path.join(__dirname, 'client')));

// 2. Definicje tras API
// Te trasy pozwalają na komunikację frontendu z backendem
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// 3. Reguła "Catch-all" dla aplikacji jednostronicowej (SPA)
// Ta reguła powinna być na końcu. Obsługuje ona wszystkie inne żądania GET,
// zwracając główny plik index.html, co jest kluczowe dla działania routingu po stronie klienta.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'index.html'));
});


// --- Uruchomienie serwera ---

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Sprawdzenie, czy MONGODB_URI jest zdefiniowane
if (!MONGODB_URI) {
    console.error('BŁĄD: Zmienna środowiskowa MONGODB_URI nie jest ustawiona.');
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
