// models/ProductList.js
const mongoose = require('mongoose');

const ProductListSchema = new mongoose.Schema({
    // ZMIANA: Usunięto 'unique: true', aby użytkownik mógł mieć wiele list
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listName: { type: String, required: true }, // Zmieniono z clientName na listName
    items: [{
        ean: String,
        name: String,
        description: String,
        quantity: Number,
        price: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('ProductList', ProductListSchema);
