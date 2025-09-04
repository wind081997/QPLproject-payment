const express = require('express');
const router = express.Router();

// ✅ FIX: Import the controller functions properly
const { 
    handleInvoicePaid, 
    checkWebhookHealth,
    handleWebhookFailure,
    handleTestWebhook  // ✅ ADD THIS
} = require('../controllers/webhookController');

// ✅ FIX: Make sure handleInvoicePaid is defined before using it
if (!handleInvoicePaid) {
    console.error('❌ handleInvoicePaid is undefined!');
    throw new Error('handleInvoicePaid function not found in webhookController');
}

// ✅ ENHANCED: Webhook endpoint that handles both test and real webhooks
router.post('/xendit', handleTestWebhook);

// ✅ ADD THIS: Webhook health check route
router.get('/health', checkWebhookHealth);

module.exports = router;