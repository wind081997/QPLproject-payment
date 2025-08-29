const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    providerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant', 
        required: true 
    },
    orderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order', 
        required: true 
    },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    source: { 
        type: String, 
        enum: ['online', 'cash'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed'], 
        default: 'pending' 
    },
    xenditInvoiceId: String,
    weekEnding: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);