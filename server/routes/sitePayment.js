const express = require('express');
const router = express.Router();
const sitePaymentController = require('../controllers/sitePaymentController');
const authMiddleware        = require('../middleware/auth');

// Get payment summary for a site
router.get('/:site_id/summary', authMiddleware, sitePaymentController.getPaymentSummary);

// Get all payments for a site
router.get('/:site_id/payments', authMiddleware, sitePaymentController.getSitePayments);

// Create a new payment for a site
router.post('/:site_id/payments', authMiddleware, sitePaymentController.createPayment);

// Update a payment
router.put('/:site_id/payments/:payment_id', authMiddleware, sitePaymentController.updatePayment);

// Delete (cancel) a payment
router.delete('/:site_id/payments/:payment_id', authMiddleware, sitePaymentController.deletePayment);

module.exports = router;
