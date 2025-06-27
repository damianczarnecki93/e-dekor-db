const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Upewniamy się, że model jest zaimportowany

// Trasa do pobierania produktów, teraz z obsługą wyszukiwania
router.get('/', async (req, res) => {
  try {
    const { search } = req.query; // Sprawdzamy, czy w adresie URL jest parametr 'search'
    let products;

    if (search && search.trim() !== '') {
      // JEŚLI JEST WYSZUKIWANIE: Używamy potoku agregacji z Atlas Search
      products = await Product.aggregate([
        {
          $search: {
            index: 'searchProducts', // Nazwa indeksu, który został stworzony w Atlas
            text: {
              query: search,
              path: ['name', 'category'], // Pola do przeszukania
              fuzzy: {
                maxEdits: 1 // Zezwalamy na 1 literówkę
              }
            }
          }
        },
        {
          // Ograniczamy wyniki do 50, aby nie przeciążać aplikacji
          $limit: 50 
        },
        {
          // Dodajemy pole 'score' z oceną trafności od Atlas Search
          $addFields: {
            score: { $meta: 'searchScore' }
          }
        }
      ]);
    } else {
      // JEŚLI NIE MA WYSZUKIWANIA: Działamy jak dotychczas - pobieramy wszystkie produkty
      products = await Product.find({});
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Błąd podczas pobierania danych produktów:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;
