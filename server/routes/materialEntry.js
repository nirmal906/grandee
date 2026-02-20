const express = require('express');
const router = express.Router();
const materialEntryController = require('../controllers/materialEntryController'); 
const authMiddleware = require("../middleware/auth");
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Get active materials for dropdown 
router.get('/active-materials', authMiddleware, materialEntryController.getActiveMaterials);

// Get active vendors for dropdown 
router.get('/active-vendors', authMiddleware, materialEntryController.getActiveVendors);

// Fetch all material entries with pagination
router.get('/', authMiddleware, materialEntryController.getMaterialEntries);

// Get material entry history
router.get('/:id/history', authMiddleware, materialEntryController.getMaterialEntryHistory);

// Get material entry by ID
router.get('/:id', authMiddleware, materialEntryController.getMaterialEntryById);

// Create a material entry
router.post(
  '/',
  authMiddleware,
  uploadMiddleware.materialEntryUpload, 
  handleMulterError,
  materialEntryController.createMaterialEntry
);

// Update a material entry
router.put(
  '/:id',
  authMiddleware,
  uploadMiddleware.materialEntryUpload,
  handleMulterError,
  materialEntryController.updateMaterialEntry
);

// Delete a material entry
router.delete('/:id', authMiddleware, materialEntryController.deleteMaterialEntry);

module.exports = router;