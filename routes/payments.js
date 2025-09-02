const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

// ✅ ADD THIS MISSING ROUTE
router.post("/create-pending-invoice", paymentController.createPendingInvoice);

// ... existing routes ...
router.post("/create-invoice", paymentController.createInvoice);
router.post("/create-order-after-payment", paymentController.createOrderAfterPayment);
router.get("/check-status/:tempOrderId", paymentController.checkPaymentStatus);

module.exports = router;