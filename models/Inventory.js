const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    inventoryName: {
        type: String,
        required: true,
        default: () => `Inwentaryzacja z ${new Date().toLocaleDateString()}`
    },
    items: [{
        ean: String,
        kod_kreskowy: String,
        kod_produktu: String,
        nazwa_produktu: String,
        quantity: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('Inventory', InventorySchema);
