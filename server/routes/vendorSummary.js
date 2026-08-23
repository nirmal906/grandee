const express = require('express');
const router  = express.Router();
const vendorSummaryController = require('../controllers/vendorSummaryController');
const authMiddleware          = require('../middleware/auth');

// All vendors summary
router.get('/', authMiddleware, vendorSummaryController.getAllVendorsSummary);

// Single vendor detail (per-site breakdown)
router.get('/:vendorId', authMiddleware, vendorSummaryController.getVendorDetail);

// Vendor + Site invoices list
router.get('/:vendorId/site/:siteId', authMiddleware, vendorSummaryController.getVendorSiteInvoices);

router.post('/:vendorId/payment', authMiddleware, vendorSummaryController.recordVendorPayment);

// Advance Payment / Additional Payment — split a payment across active sites
router.post('/:vendorId/split-payment', authMiddleware, vendorSummaryController.recordSplitPayment);

router.get('/:vendorId/pending-invoices', authMiddleware, vendorSummaryController.getPendingInvoicesByVendor);

module.exports = router;
