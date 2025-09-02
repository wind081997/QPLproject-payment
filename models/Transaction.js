const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  xenditInvoiceId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PHP'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'EXPIRED'],
    default: 'PENDING'
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