const router = require('express').Router();
const paymentController = require('../controllers/paymentController');

router.post("/create-invoice", paymentController.createInvoice);

module.exports = router;