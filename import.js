// import.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Połączono z MongoDB na potrzeby importu...');

        // Wyczyść kolekcję przed importem
        await Product.deleteMany({});
        console.log('Kolekcja produktów wyczyszczona.');

        const files = ['produkty.csv', 'produkty2.csv'];
        let allProducts = [];

        for (const file of files) {
            const filePath = path.join(__dirname, 'client', file);
            const csvFile = fs.readFileSync(filePath, 'utf8');

            // Konwersja z Windows-1250 na UTF-8
            const iconv = require('iconv-lite');
            const buf = fs.readFileSync(filePath);
            const utf8String = iconv.decode(buf, 'Windows-1250');

            const parsed = Papa.parse(utf8String, { header: true, skipEmptyLines: true });

            const products = parsed.data.map(p => ({
                kod_kreskowy: String(p.kod_kreskowy || "").trim(),
                nazwa_produktu: String(p.nazwa_produktu || "").trim(),
                cena: parseFloat(String(p.opis || "0").replace(',', '.')) || 0,
                opis: String(p.cena || "").trim()
            }));
            allProducts = allProducts.concat(products);
            console.log(`Przetworzono ${products.length} produktów z pliku ${file}.`);
        }

        // Wstaw produkty do bazy danych
        await Product.insertMany(allProducts, { ordered: false }).catch(err => {
            // Ignoruj błędy duplikatów, jeśli wystąpią
            if (err.code !== 11000) {
                console.error('Błąd wstawiania danych:', err);
            }
        });

        console.log(`Zakończono import. Łącznie zaimportowano ${await Product.countDocuments()} unikalnych produktów.`);

    } catch (error) {
        console.error('Krytyczny błąd importu:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Rozłączono z MongoDB.');
    }
};

// Aby uniknąć problemów z 'iconv-lite', zainstaluj go: npm install iconv-lite
importData();