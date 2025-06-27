const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

/**
 * Zmodyfikowana trasa do pobierania produktów.
 * Obsługuje teraz opcjonalne wyszukiwanie za pomocą Atlas Search.
 */
router.get('/', async (req, res) => {
  try {
    // Sprawdzamy, czy w adresie URL jest parametr 'search' (np. /api/data?search=lampa)
    const { search } = req.query; 
    let products;

    if (search && search.trim() !== '') {
      // JEŚLI JEST WYSZUKIWANIE: Używamy potoku agregacji z Atlas Search
      products = await Product.aggregate([
        {
          $search: {
            index: 'searchProducts', // WAŻNE: Nazwa indeksu, który został stworzony w Atlas
            text: {
              query: search,
              path: ['name', 'category'], // Przeszukujemy pola 'name' i 'category'
              fuzzy: {
                maxEdits: 1 // Zezwalamy na 1 literówkę w zapytaniu
              }
            }
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
