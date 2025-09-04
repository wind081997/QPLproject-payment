const mongoose = require('mongoose');

const failedWebhookSchema = new mongoose.Schema({
    xenditInvoiceId: {
        type: String,
        required: true,
        index: true
    },
    externalId: {
        type: String,
        required: true
    },
    webhookData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    error: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    retryCount: {
        type: Number,
        default: 0
    },
    resolved: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FailedWebhook', failedWebhookSchema);
