const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// ✅ Make sure these routes exist
router.post("/create-pending-invoice", paymentController.createPendingInvoice);
router.post("/create-order-after-payment", paymentController.createOrderAfterPayment);
router.get("/check-status/:tempOrderId", paymentController.checkPaymentStatus); // ✅ This was missing!

module.exports = router;