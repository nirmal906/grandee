const express        = require('express');
const router         = express.Router();
const vendorController = require('../controllers/vendorController');

// Fetch all vendors
router.get('/', vendorController.getVendors);

// Get vendor by ID
router.get('/:id', vendorController.getVendorById);

// Create a vendor 
router.post('/', vendorController.createVendor);

// Update a vendor 
router.put('/:id', vendorController.updateVendor);

// Delete a vendor
router.delete('/:id', vendorController.deleteVendor);

module.exports = router;