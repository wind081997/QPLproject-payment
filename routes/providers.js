const router = require('express').Router();
const providerController = require('../controllers/providerController');
// const { verifyToken } = require('../middleware/verifyToken'); // Comment this out

// Register provider with Xendit sub-account
router.post('/register', providerController.registerProvider); // Remove verifyToken

// Get provider's Xendit account status
router.get('/xendit-status/:providerId', providerController.getXenditStatus); // Remove verifyToken

// Update payout method
router.put('/payout-method/:providerId', providerController.updatePayoutMethod); // Remove verifyToken

module.exports = router;