const express = require('express');
const router = express.Router();
const sitePaymentController = require('../controllers/sitePaymentController');

// Get payment summary for a site
router.get('/:site_id/summary', sitePaymentController.getPaymentSummary);

// Get all payments for a site
router.get('/:site_id/payments', sitePaymentController.getSitePayments);

// Create a new payment for a site
router.post('/:site_id/payments', sitePaymentController.createPayment);

// Update a payment
router.put('/:site_id/payments/:payment_id', sitePaymentController.updatePayment);

// Delete (cancel) a payment
router.delete('/:site_id/payments/:payment_id', sitePaymentController.deletePayment);

module.exports = router;