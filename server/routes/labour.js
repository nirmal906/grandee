const express           = require('express');
const router            = express.Router();
const labourController  = require('../controllers/labourController');
const authMiddleware    = require('../middleware/auth');

// Fetch all labours with pagination
router.get('/', authMiddleware, labourController.getLabours);

// Get labour by ID
router.get('/:id', authMiddleware, labourController.getLabourById);

// Create a labour
router.post('/', authMiddleware, labourController.createLabour);

// Update a labour
router.put('/:id', authMiddleware, labourController.updateLabour);

// Delete a labour
router.delete('/:id', authMiddleware, labourController.deleteLabour);

module.exports = router;
