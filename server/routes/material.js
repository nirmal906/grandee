const express            = require('express');
const router             = express.Router();
const materialController = require('../controllers/materialController');

// Fetch all materials with pagination
router.get('/', materialController.getMaterials);

// Get material by ID
router.get('/:id', materialController.getMaterialById);

// Create a material 
router.post('/', materialController.createMaterial);

// Update a material 
router.put('/:id', materialController.updateMaterial);

// Delete a material
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;