const express = require('express');
const router = express.Router();

// Ta funkcja przyjmuje model 'Product' jako argument
module.exports = function(Product) {
  /**
   * Trasa do pobierania produktów, z obsługą wyszukiwania.
   */
  router.get('/', async (req, res) => {
    try {
      const { search } = req.query;
      let products;

      if (search && search.trim() !== '') {
        // Logika wyszukiwania Atlas Search
        products = await Product.aggregate([
          {
            $search: {
              index: 'searchProducts', // Nazwa indeksu z Atlas
              text: {
                query: search,
                path: ['name', 'category'],
                fuzzy: {
                  maxEdits: 1
                }
              }
            }
          }
        ]);
      } else {
        // Domyślna logika: pobierz wszystkie produkty
        products = await Product.find({});
      }

      res.status(200).json(products);
    } catch (error) {
      console.error('Błąd podczas pobierania danych produktów:', error);
      res.status(500).json({ message: 'Błąd serwera' });
    }
  });

  // Zwracamy skonfigurowany router
  return router;
};
