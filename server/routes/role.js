const express        = require('express');
const router         = express.Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');

// Fetch all roles
router.get('/', authMiddleware, roleController.getRole);

// Get role by ID
router.get('/:id', authMiddleware, roleController.getRoleById);

// Create a role
router.post('/', authMiddleware, roleController.createRole);

// Update a role
router.put('/:id', authMiddleware, roleController.updateRole);

// Delete a role
router.delete('/:id', authMiddleware, roleController.deleteRole);

module.exports = router;
