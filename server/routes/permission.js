const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const authMiddleware       = require('../middleware/auth');

// Fetch all roles
router.get('/', authMiddleware, permissionController.getRoles);

// Get permissions for a specific role
router.get('/role/:roleId', authMiddleware, permissionController.getRolePermissions);

// Update permissions for a role
router.put('/role/:roleId', authMiddleware, permissionController.updateRolePermissions);

// Get permissions for a specific user (admin only)
router.get('/user/:userId', authMiddleware, permissionController.getUserPermissions);

module.exports = router;
