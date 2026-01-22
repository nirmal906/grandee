const express           = require('express');
const router            = express.Router();
const labourController  = require('../controllers/labourController');

// Fetch all labours with pagination
router.get('/', labourController.getLabours);

// Get labour by ID
router.get('/:id', labourController.getLabourById);

// Create a labour 
router.post('/', labourController.createLabour);

// Update a labour 
router.put('/:id', labourController.updateLabour);

// Delete a labour
router.delete('/:id', labourController.deleteLabour);

module.exports = router;