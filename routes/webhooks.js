const router = require('express').Router();
const webhookController = require('../controllers/webhookController');

router.post("/xendit", webhookController.handleXenditWebhook);

module.exports = router;