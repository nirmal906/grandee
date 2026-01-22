const express        = require('express');
const router         = express.Router();
const roleController = require('../controllers/roleController');

// Fetch all roles 
router.get('/', roleController.getRole);

// Get role by ID
router.get('/:id', roleController.getRoleById);

// Create a role 
router.post('/', roleController.createRole);

// Update a role 
router.put('/:id', roleController.updateRole);

// Delete a role
router.delete('/:id', roleController.deleteRole);

module.exports = router;