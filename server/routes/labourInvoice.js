const express = require('express');
const router  = express.Router();
const labourInvoiceController = require('../controllers/labourInvoiceController');
const authMiddleware          = require('../middleware/auth');

// ── Dropdown data ──
router.get('/active-labours', authMiddleware, labourInvoiceController.getActiveLabours);
router.get('/active-vendors', authMiddleware, labourInvoiceController.getActiveVendors);
router.get('/active-sites',   authMiddleware, labourInvoiceController.getActiveSites);

// ── Admin approval queue ──
router.get('/pending-approvals', authMiddleware, labourInvoiceController.getPendingApprovals);

// ── Approve / Reject actions ──
router.post('/:id/approve', authMiddleware, labourInvoiceController.approveLabourInvoice);
router.post('/:id/reject',  authMiddleware, labourInvoiceController.rejectLabourInvoice);

// ── CRUD ──
router.get('/',    authMiddleware, labourInvoiceController.getLabourInvoices);
router.get('/:id', authMiddleware, labourInvoiceController.getLabourInvoiceById);
router.post('/',   authMiddleware, labourInvoiceController.createLabourInvoice);
router.put('/:id', authMiddleware, labourInvoiceController.updateLabourInvoice);
router.delete('/:id', authMiddleware, labourInvoiceController.deleteLabourInvoice);

module.exports = router;
