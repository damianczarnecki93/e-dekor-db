const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Podłączenie tras API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// --- NOWY ENDPOINT DO WYSZUKIWANIA PRODUKTÓW ---
app.get('/api/search', async (req, res) => {
  try {
    // Pobieramy szukaną frazę 'q' z adresu URL (np. /api/search?q=lampa)
    const { q } = req.query;

    // Sprawdzamy, czy użytkownik podał jakąś frazę
    if (!q || q.trim() === '') {
      return res.status(400).json({ msg: 'Proszę podać frazę do wyszukania.' });
    }

    // Pobieramy model produktu. Upewnij się, że ścieżka do pliku jest poprawna.
    const Product = require('./models/Product'); 

    // Używamy potoku agregacji ($aggregate) do wykonania zapytania do Atlas Search
    const products = await Product.aggregate([
      {
        $search: {
          index: 'searchProducts', // WAŻNE: Nazwa indeksu, który stworzyłeś w Atlas
          text: {
            query: q,
            path: ['name', 'category'], // Pola, które mają być przeszukiwane
            fuzzy: {
               maxEdits: 1 // Opcjonalnie: pozwala na jedną literówkę w zapytaniu
            }
          }
        }
      },
      {
        // Ograniczamy liczbę wyników, żeby nie przeciążać aplikacji
        $limit: 20
      },
      {
        // Określamy, które pola produktu mają zostać zwrócone
        $project: {
            _id: 1,
            name: 1,
            category: 1,
            price: 1,
            image: 1, // Użyj "image" lub "imageUrl" w zależności od nazwy pola w Twoim modelu
            score: { $meta: "searchScore" } // Specjalne pole z oceną trafności od Atlas
        }
      },
      {
        // Sortujemy wyniki od najbardziej do najmniej trafnych
        $sort: {
            score: -1
        }
      }
    ]);

    // Zwracamy znalezione produkty w formacie JSON
    res.status(200).json({ products });

  } catch (error) {
    console.error('Błąd podczas wyszukiwania w Atlas Search:', error);
    res.status(500).json({ msg: "Wystąpił błąd serwera podczas wyszukiwania" });
  }
});


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
