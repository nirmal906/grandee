const express        = require('express');
const router         = express.Router();
const siteController = require('../controllers/siteController');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');
const authMiddleware = require("../middleware/auth");

// Fetch all sites 
router.get('/', authMiddleware, siteController.getSites);

// Get site by ID
router.get('/:id', authMiddleware, siteController.getSiteById);

// Create a site 
router.post(
  '/',
  authMiddleware,
  uploadMiddleware.siteCheckoutUpload,
  handleMulterError,
  siteController.createSite
);

// Update a site 
router.put(
  '/:id',
  authMiddleware,
  uploadMiddleware.siteCheckoutUpload,
  handleMulterError,
  siteController.updateSite
);

// Delete a site
router.delete('/:id', authMiddleware, siteController.deleteSite);

module.exports = router;
