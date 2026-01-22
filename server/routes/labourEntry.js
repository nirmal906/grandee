const express = require('express');
const router  = express.Router();
const labourEntryController  = require('../controllers/labourEntryController');
const authMiddleware = require("../middleware/auth");

// Get active labours (must be before /:id)
router.get('/active-labours', authMiddleware, labourEntryController.getActiveLabours);

// Fetch all labour entries with pagination
router.get('/', authMiddleware, labourEntryController.getLabourEntries);

// Get labour entry by ID
router.get('/:id', authMiddleware, labourEntryController.getLabourEntryById);

// Create a labour entry
router.post('/', authMiddleware, labourEntryController.createLabourEntry);

// Update a labour entry
router.put('/:id', authMiddleware, labourEntryController.updateLabourEntry);

// Delete a labour entry
router.delete('/:id', authMiddleware, labourEntryController.deleteLabourEntry);

module.exports = router;