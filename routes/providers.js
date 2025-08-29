const router = require('express').Router();
const providerController = require('../controllers/providerController');

router.post("/register", providerController.registerProvider);

module.exports = router;