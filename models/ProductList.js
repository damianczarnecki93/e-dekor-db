// models/ProductList.js
const mongoose = require('mongoose');

const ProductListSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    clientName: { type: String, default: '' },
    items: [{
        ean: String,
        name: String,
        description: String,
        quantity: Number,
        price: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('ProductList', ProductListSchema);