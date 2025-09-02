const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// ✅ This should match what Xendit is trying to POST to
router.post('/xendit', webhookController.handleWebhook);

module.exports = router;