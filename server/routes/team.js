const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// Get available roles (Executive, Manager, Admin)
router.get('/roles', teamController.getRoles);

// Fetch all team members
router.get('/', teamController.getTeam);

// Get team member by ID
router.get('/:id', teamController.getTeamById);

// Create a team member
router.post('/', teamController.createTeam);

// Update a team member
router.put('/:id', teamController.updateTeam);

// Delete a team member (soft delete)
router.delete('/:id', teamController.deleteTeam);

module.exports = router;