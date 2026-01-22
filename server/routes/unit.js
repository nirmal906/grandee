const express        = require('express');
const router         = express.Router();
const unitController = require('../controllers/unitController');

// Get all units (for dropdown/select)
router.get('/list', unitController.getUnits);

// Fetch all units with pagination
router.get('/', unitController.getUnit);

// Get unit by ID
router.get('/:id', unitController.getUnitById);

// Create a unit
router.post('/', unitController.createUnit);

// Update a unit
router.put('/:id', unitController.updateUnit);

// Delete a unit (hard delete)
router.delete('/:id', unitController.deleteUnit);

module.exports = router;