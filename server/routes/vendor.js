const express        = require('express');
const router         = express.Router();
const vendorController = require('../controllers/vendorController');
const authMiddleware   = require('../middleware/auth');

// Fetch all vendors
router.get('/', authMiddleware, vendorController.getVendors);

// Get vendor by ID
router.get('/:id', authMiddleware, vendorController.getVendorById);

// Create a vendor
router.post('/', authMiddleware, vendorController.createVendor);

// Update a vendor
router.put('/:id', authMiddleware, vendorController.updateVendor);

// Delete a vendor
router.delete('/:id', authMiddleware, vendorController.deleteVendor);

module.exports = router;
