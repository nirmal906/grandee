const express = require('express');
const router = express.Router();
const materialInvoiceController = require('../controllers/materialInvoiceController');
const authMiddleware = require('../middleware/auth');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Get active materials for dropdown
router.get('/active-materials', authMiddleware, materialInvoiceController.getActiveMaterials);

// Get active vendors for dropdown
router.get('/active-vendors', authMiddleware, materialInvoiceController.getActiveVendors);

// Get active sites for dropdown
router.get('/active-sites', authMiddleware, materialInvoiceController.getActiveSites);

// Fetch all material invoices with pagination
router.get('/', authMiddleware, materialInvoiceController.getMaterialInvoices);

// Get material invoice history
router.get('/:id/history', authMiddleware, materialInvoiceController.getMaterialInvoiceHistory);

// Get material invoice by ID
router.get('/:id', authMiddleware, materialInvoiceController.getMaterialInvoiceById);

// Create a material invoice
router.post(
    '/',
    authMiddleware,
    uploadMiddleware.materialInvoiceUpload,
    handleMulterError,
    materialInvoiceController.createMaterialInvoice
);

// Update a material invoice
router.put(
    '/:id',
    authMiddleware,
    uploadMiddleware.materialInvoiceUpload,
    handleMulterError,
    materialInvoiceController.updateMaterialInvoice
);

// Delete a material invoice
router.delete('/:id', authMiddleware, materialInvoiceController.deleteMaterialInvoice);

module.exports = router;
