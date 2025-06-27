const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs'); // Dodajemy moduł File System do odczytu folderów

dotenv.config();

// === SKRYPT DIAGNOSTYCZNY: LOGOWANIE STRUKTURY PLIKÓW ===
// Ten kod pomoże nam zrozumieć, jak Render organizuje pliki.
try {
    const startPath = path.resolve(__dirname);
    console.log('--- START DIAGNOSTYKI PLIKÓW ---');
    console.log(`[DIAGNOSTYKA] Bieżący katalog (__dirname): ${startPath}`);
    
    const itemsInCurrentDir = fs.readdirSync(startPath);
    console.log(`[DIAGNOSTYKA] Zawartość katalogu ${startPath}:`, itemsInCurrentDir);

    // Sprawdzamy, czy folder 'models' istnieje w bieżącym katalogu
    const modelsPath = path.join(startPath, 'models');
    if (fs.existsSync(modelsPath)) {
        console.log(`[DIAGNOSTYKA] Folder 'models' ZNALEZIONY w: ${modelsPath}`);
        const filesInModelsDir = fs.readdirSync(modelsPath);
        console.log("[DIAGNOSTYKA] Zawartość folderu 'models':", filesInModelsDir);
    } else {
        console.error(`[DIAGNOSTYKA] KRYTYCZNY BŁĄD: Nie znaleziono folderu 'models' pod ścieżką: ${modelsPath}`);
    }
    console.log('--- KONIEC DIAGNOSTYKI ---');
} catch (e) {
    console.error('[DIAGNOSTYKA] Błąd podczas listowania plików:', e);
}
// === KONIEC SKRYPTU DIAGNOSTYCZNEGO ===


const app = express();
app.use(cors());
app.use(express.json());

// Import modelu. Błąd prawdopodobnie wystąpi tutaj, ale logi diagnostyczne powyżej pomogą go rozwiązać.
const Product = require('./models/Product');

// Podłączenie tras API. Przekazujemy model do pliku z trasami.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data')(Product));
app.use('/api/admin', require('./routes/admin'));

// Serwowanie plików statycznych z folderu 'client'
app.use(express.static(path.join(__dirname, 'client')));

// Reguła "Catch-all"
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
