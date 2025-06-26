const mongoose = require('mongoose');

const ProductListSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listName: { type: String, required: true },
    clientName: { type: String, default: '' },
    items: [
        {
            ean: String,
            kod_kreskowy: String,
            kod_produktu: String,
            nazwa_produktu: String,
            cena: String,
            quantity: Number
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('ProductList', ProductListSchema);
