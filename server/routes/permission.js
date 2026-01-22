const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');

// Fetch all roles 
router.get('/', permissionController.getRoles);

// Get permissions for a specific role
router.get('/role/:roleId', permissionController.getRolePermissions);

// Update permissions for a role
router.put('/role/:roleId', permissionController.updateRolePermissions);

// Get permissions for a specific user (admin only)
router.get('/user/:userId', permissionController.getUserPermissions);

module.exports = router;