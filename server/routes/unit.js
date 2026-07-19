const express        = require('express');
const router         = express.Router();
const unitController = require('../controllers/unitController');
const authMiddleware = require('../middleware/auth');

// Get all units (for dropdown/select)
router.get('/list', authMiddleware, unitController.getUnits);

// Fetch all units with pagination
router.get('/', authMiddleware, unitController.getUnit);

// Get unit by ID
router.get('/:id', authMiddleware, unitController.getUnitById);

// Create a unit
router.post('/', authMiddleware, unitController.createUnit);

// Update a unit
router.put('/:id', authMiddleware, unitController.updateUnit);

// Delete a unit (hard delete)
router.delete('/:id', authMiddleware, unitController.deleteUnit);

module.exports = router;