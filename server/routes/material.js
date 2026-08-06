const express            = require('express');
const router             = express.Router();
const materialController = require('../controllers/materialController');
const authMiddleware     = require('../middleware/auth');

// Fetch all materials with pagination
router.get('/', authMiddleware, materialController.getMaterials);

// Get material by ID
router.get('/:id', authMiddleware, materialController.getMaterialById);

// Create a material
router.post('/', authMiddleware, materialController.createMaterial);

// Update a material
router.put('/:id', authMiddleware, materialController.updateMaterial);

// Delete a material
router.delete('/:id', authMiddleware, materialController.deleteMaterial);

module.exports = router;
