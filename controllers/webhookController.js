const crypto = require('crypto');
const Order = require('../models/Orders');
const Transaction = require('../models/Transaction');
const Restaurant = require('../models/Restaurant');

module.exports = {
    handleXenditWebhook: async (req, res) => {
        try {
            const signature = req.headers['x-callback-token'];
            
            // ✅ Verify webhook token
            if (signature !== process.env.XENDIT_WEBHOOK_SECRET) {
                console.log('❌ Invalid webhook signature');
                return res.status(400).json({
                    status: false,
                    message: "Invalid webhook signature"
                });
            }

            const event = req.body;
            console.log('🔔 Webhook received:', event);

            switch (event.status || event.event) {
                case 'PAID':
                case 'invoice.paid':
                    await handleInvoicePaid(event);
                    break;
                case 'EXPIRED':
                case 'invoice.expired':
                    await handleInvoiceExpired(event);
                    break;
                case 'FAILED':
                case 'invoice.failed':
                    await handleInvoiceFailed(event);
                    break;
                default:
                    console.log(`ℹ️ Unhandled event: ${event.status || event.event}`);
            }

            res.status(200).json({ status: true });
        } catch (error) {
            console.error('❌ Webhook handling error:', error);
            res.status(500).json({
                status: false,
                message: error.message
            });
        }
    }
};

async function handleInvoicePaid(data) {
    try {
        console.log('✅ Payment successful for invoice:', data.id);
        
        // ✅ HERE: Create the actual order after payment confirmation
        // We'll find the temp order data and create the real order
        
        // For now, just log the success
        console.log('💰 Payment confirmed via webhook');
        
    } catch (error) {
        console.error('❌ Error handling invoice paid:', error);
    }
}

async function handleInvoiceExpired(data) {
    try {
        console.log('⏰ Invoice expired:', data.id);
        // Clean up any temp data if needed
    } catch (error) {
        console.error('❌ Error handling invoice expired:', error);
    }
}

async function handleInvoiceFailed(data) {
    try {
        console.log('💸 Payment failed for invoice:', data.id);
        // Clean up any temp data if needed
    } catch (error) {
        console.error('❌ Error handling invoice failed:', error);
    }
}