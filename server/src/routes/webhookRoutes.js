const express = require('express');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

// The signature covers the exact bytes Meta sent, so this needs the raw body.
router.get('/whatsapp', whatsappController.verifyWebhook);
router.post('/whatsapp', express.raw({ type: () => true, limit: '2mb' }), whatsappController.receiveWebhook);

module.exports = router;
