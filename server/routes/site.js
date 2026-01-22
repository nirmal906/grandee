const express        = require('express');
const router         = express.Router();
const siteController = require('../controllers/siteController');

// Fetch all sites 
router.get('/', siteController.getSites);

// Get site by ID
router.get('/:id', siteController.getSiteById);

// Create a site 
router.post('/', siteController.createSite);

// Update a site 
router.put('/:id', siteController.updateSite);

// Delete a site
router.delete('/:id', siteController.deleteSite);

module.exports = router;