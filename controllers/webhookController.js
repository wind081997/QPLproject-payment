const crypto = require('crypto');
const Order = require('../models/Orders');
const Transaction = require('../models/Transaction');
const Restaurant = require('../models/Restaurant');

// ✅ Initialize global payment status store
if (!global.paymentStatusStore) {
    global.paymentStatusStore = new Map();
}

// ✅ Main webhook handler
const handleWebhook = async (req, res) => {
    try {
        console.log('🔔 Webhook received:', req.body);
        
        // ✅ FIX: Handle Xendit's actual webhook format
        const webhookData = req.body;
        
        // ✅ Check if this is a payment success webhook
        if (webhookData.status === 'PAID' && webhookData.external_id) {
            console.log('✅ Processing payment success webhook');
            await handleInvoicePaid(webhookData);
        } else if (webhookData.event === 'invoice.paid') {
            // ✅ Also handle the event-based format
            console.log('✅ Processing invoice.paid event');
            await handleInvoicePaid(webhookData.data || webhookData);
        } else {
            console.log('⚠️ Unknown webhook format:', {
                status: webhookData.status,
                event: webhookData.event,
                external_id: webhookData.external_id
            });
        }
        
        // ✅ Always respond with 200 to acknowledge receipt
        res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        // ✅ Still respond with 200 to prevent retries
        res.status(200).json({ status: 'Error processed' });
    }
};

async function handleInvoicePaid(data) {
    try {
        console.log('✅ Webhook: Processing payment success for:', data.external_id);
        
        // ✅ Store payment success status
        global.paymentStatusStore.set(data.external_id, {
            status: 'PAID',
            timestamp: new Date(),
            invoiceId: data.id,
            paymentMethod: data.payment_method,
            amount: data.amount,
            isConfirmed: true
        });

        console.log('✅ Webhook: Payment status stored in global store');
        console.log('✅ Store size after storing:', global.paymentStatusStore.size);
        console.log('✅ Available keys:', Array.from(global.paymentStatusStore.keys()));

        // ✅ Clean up old entries after 15 minutes
        setTimeout(() => {
            global.paymentStatusStore.delete(data.external_id);
            console.log('✅ Cleaned up payment status for:', data.external_id);
        }, 15 * 60 * 1000);

        console.log('✅ Webhook: Payment status stored successfully');
    } catch (error) {
        console.error('❌ Webhook: Error handling invoice paid:', error);
    }
}

module.exports = {
    handleWebhook
};