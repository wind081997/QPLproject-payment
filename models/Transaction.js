const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // ✅ Make sure these fields are defined in your schema
    userId: {
        type: String,
        required: true
    },
    providerId: {
        type: String,
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    commission: {
        type: Number,
        default: 0
    },
    source: {
        type: String,
        enum: ['online', 'offline'],
        default: 'online'
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED'],
        default: 'PENDING'
    },
    xenditInvoiceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    weekEnding: {
        type: String
    },
    currency: {
        type: String,
        default: 'PHP'
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    xenditData: {
        payment_id: String,
        payment_method_id: String,
        ewallet_type: String,
        merchant_name: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);