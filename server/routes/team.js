const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');

// Get available roles (Executive, Manager, Admin)
router.get('/roles', authMiddleware, teamController.getRoles);

// Fetch all team members
router.get('/', authMiddleware, teamController.getTeam);

// Get team member by ID
router.get('/:id', authMiddleware, teamController.getTeamById);

// Create a team member
router.post('/', authMiddleware, teamController.createTeam);

// Update a team member
router.put('/:id', authMiddleware, teamController.updateTeam);

// Delete a team member (soft delete)
router.delete('/:id', authMiddleware, teamController.deleteTeam);

module.exports = router;
