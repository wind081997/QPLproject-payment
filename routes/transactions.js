const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Xendit = require('xendit-node');

const xenditClient = new Xendit({
    secretKey: process.env.XENDIT_API_KEY
});
const { Invoice } = xenditClient;
const invoice = new Invoice({});

// Get all transactions
router.get('/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('providerId')
            .populate('orderId');
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new transaction and Xendit invoice
router.post('/create-transaction', async (req, res) => {
    try {
        const {
            providerId,
            orderId,
            amount,
            commission,
            source,
            weekEnding
        } = req.body;

        // Create Xendit invoice first
        const xenditInvoice = await invoice.createInvoice({
            externalID: `ORDER-${orderId}`,
            amount: amount,
            description: `Payment for Order #${orderId}`,
            currency: 'IDR'
        });

        // Create transaction record
        const transaction = new Transaction({
            providerId,
            orderId,
            amount,
            commission,
            source,
            weekEnding: new Date(weekEnding),
            xenditInvoiceId: xenditInvoice.id,
            status: 'pending'
        });

        await transaction.save();

        res.json({
            transaction,
            paymentUrl: xenditInvoice.invoice_url
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update transaction status
router.post('/webhook', async (req, res) => {
    try {
        const { invoice_id, status } = req.body;
        
        if (status === 'PAID') {
            await Transaction.findOneAndUpdate(
                { xenditInvoiceId: invoice_id },
                { status: 'completed' }
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;