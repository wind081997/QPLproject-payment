const crypto = require('crypto');
const Order = require('../models/Orders');
const Transaction = require('../models/Transaction');
const Restaurant = require('../models/Restaurant');
const FailedWebhook = require('../models/FailedWebhook');
const fetch = require('node-fetch');

// ✅ Initialize global payment status store
if (!global.paymentStatusStore) {
    global.paymentStatusStore = new Map();
}

// ✅ ADD THIS: Enhanced webhook failure handling
const handleWebhookFailure = async (data, error) => {
    console.error('❌ Webhook processing failed:', error);
    
    try {
        // Store failed webhook attempt
        await FailedWebhook.create({
            xenditInvoiceId: data.id,
            externalId: data.external_id,
            webhookData: data,
            error: error.message,
            timestamp: new Date(),
            retryCount: 0
        });
        
        // Log for manual investigation
        console.error('🚨 CRITICAL: Webhook failed for payment:', {
            invoiceId: data.id,
            amount: data.amount,
            userId: data.user_id,
            error: error.message
        });
        
    } catch (dbError) {
        console.error('❌ Failed to log webhook failure:', dbError);
    }
};

// ✅ Main webhook handler - RENAME to handleInvoicePaid
const handleInvoicePaid = async (req, res) => {
    try {
        console.log('🔔 Webhook received:', req.body);
        
        // ✅ Handle Xendit's actual webhook format
        const webhookData = req.body;
        
        // ✅ Check if this is a payment success webhook
        if (webhookData.status === 'PAID' && webhookData.external_id) {
            console.log('✅ Processing payment success webhook');
            await processInvoicePaid(webhookData);
        } else if (webhookData.event === 'invoice.paid') {
            // ✅ Also handle the event-based format
            console.log('✅ Processing invoice.paid event');
            await processInvoicePaid(webhookData.data || webhookData);
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
        
        // ✅ Handle webhook failure
        await handleWebhookFailure(req.body, error);
        
        // ✅ Still respond with 200 to prevent retries
        res.status(200).json({ status: 'Error processed' });
    }
};

// ✅ ADD THIS: Rename the function to processInvoicePaid for clarity
async function processInvoicePaid(data) {
    try {
        console.log('✅ Webhook: Processing payment success for:', data.external_id);
        
        // ✅ Store payment success status with enhanced data
        global.paymentStatusStore.set(data.external_id, {
            status: 'PAID',
            timestamp: new Date(),
            invoiceId: data.id,
            paymentMethod: data.payment_method,
            amount: data.amount,
            isConfirmed: true,
            webhookData: {
                payment_id: data.payment_id,
                payment_method_id: data.payment_method_id,
                ewallet_type: data.ewallet_type,
                merchant_name: data.merchant_name
            }
        });

        // ✅ Also store in database for persistence
        try {
            await Transaction.findOneAndUpdate(
                { xenditInvoiceId: data.id },
                { 
                    'xenditData.payment_id': data.payment_id,
                    'xenditData.payment_method_id': data.payment_method_id,
                    'xenditData.ewallet_type': data.ewallet_type,
                    'xenditData.merchant_name': data.merchant_name
                },
                { upsert: true }
            );
            console.log('✅ Webhook data stored in database for persistence');
        } catch (error) {
            console.log('⚠️ Could not store webhook data in database:', error.message);
        }

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
        throw error; // Re-throw to be caught by the main handler
    }
}

// ✅ ENHANCED: Production-ready webhook health check
const checkWebhookHealth = async (req, res) => {
    try {
        console.log('🔍 Webhook health check requested');
        
        // Check if webhook processing is working
        const isHealthy = global.paymentStatusStore && 
                         typeof global.paymentStatusStore.get === 'function';
        
        if (isHealthy) {
            // ✅ ADD THIS: Test if webhook endpoint is actually reachable
            const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:8000/api/webhooks/xendit';
            
            try {
                // Test if webhook endpoint responds
                const testResponse = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'WebhookHealthCheck/1.0'
                    },
                    body: JSON.stringify({
                        test: true,
                        timestamp: new Date().toISOString(),
                        healthCheck: true
                    }),
                    timeout: 5000 // 5 second timeout
                });
                
                if (testResponse.ok) {
                    res.status(200).json({
                        success: true,
                        message: 'Webhook system is healthy and reachable',
                        status: 'active',
                        webhookUrl: webhookUrl,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    res.status(503).json({
                        success: false,
                        message: 'Webhook endpoint not responding correctly',
                        status: 'unreachable',
                        webhookUrl: webhookUrl,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (fetchError) {
                console.error('❌ Webhook endpoint test failed:', fetchError);
                res.status(503).json({
                    success: false,
                    message: 'Webhook endpoint is not reachable',
                    status: 'unreachable',
                    error: fetchError.message,
                    timestamp: new Date().toISOString()
                });
            }
        } else {
            res.status(503).json({
                success: false,
                message: 'Webhook system is not healthy',
                status: 'inactive',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Webhook health check failed:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook health check failed',
            status: 'error',
            timestamp: new Date().toISOString()
        });
    }
};

// ✅ ADD THIS: Handle test webhook requests
const handleTestWebhook = async (req, res) => {
    try {
        const { test, healthCheck } = req.body;
        
        if (test && healthCheck) {
            console.log('✅ Test webhook received - system is healthy');
            res.status(200).json({
                success: true,
                message: 'Test webhook received successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            // Handle regular webhook
            await handleInvoicePaid(req, res);
        }
    } catch (error) {
        console.error('❌ Test webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Test webhook failed',
            error: error.message
        });
    }
};

// ✅ FIX: Export ALL functions properly
module.exports = {
    handleInvoicePaid,      // ✅ Main webhook handler
    checkWebhookHealth,     // ✅ Health check
    handleWebhookFailure,   // ✅ Failure handler
    processInvoicePaid,     // ✅ Processing function
    handleTestWebhook       // ✅ Test webhook handler
};