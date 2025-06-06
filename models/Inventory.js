// models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [{
        ean: String,
        name: String,
        quantity: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);