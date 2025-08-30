const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

router.post("/create-pending-invoice", paymentController.createPendingInvoice);
router.post("/create-order-after-payment", paymentController.createOrderAfterPayment);
router.post("/create-invoice", paymentController.createInvoice);

module.exports = router;