const express            = require("express");
const router             = express.Router();
const actionController   = require('../controllers/actionController');
const authController     = require('../controllers/authController');
const location           = require('../services/location');
const authMiddleware     = require("../middleware/auth");

// PUBLIC ROUTES 
router.post('/login', actionController.loginUser);
router.post('/refresh/token', authController.refreshToken);

// PROTECTED ROUTES 
router.post('/logout', authMiddleware, actionController.logoutUser);

// DASHBOARD ROUTES
router.get('/dashboard/stats', authMiddleware, actionController.getDashboardStats);
router.get('/dashboard/sites', authMiddleware, actionController.getActiveSites);
router.get('/dashboard/transactions', authMiddleware, actionController.getTransactions); 
router.get('/dashboard/material-pending', authMiddleware, actionController.getMaterialPending);
router.get('/dashboard/labour-pending', authMiddleware, actionController.getLabourPending);

// SITE SUMMARY ROUTES
router.get('/dashboard/site-summary', authMiddleware, actionController.getSiteSummary);
router.get('/dashboard/payout-pending/:site_id', authMiddleware, actionController.getSitePayoutPending);
router.patch('/material-invoice/:entry_id/mark-paid', authMiddleware, actionController.markMaterialEntryPaid);
router.patch('/labour-invoice/:entry_id/mark-paid', authMiddleware, actionController.markLabourEntryPaid);


// SEARCH POST OFFICES BY PINCODE
router.get('/search/pincode/:pincode', async (req, res) => {
    try{
        const { pincode } = req.params;
        const result      = await location.searchByPincode(pincode);
        if(!result.success){
            return res.status(404).json({
                success: false,
                message: result.message,
                data: []
            });
        }
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    }catch(error){
        console.error('Pincode search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later!',
            data: []
        });
    }
});

// SEARCH POST OFFICES BY BRANCH NAME
router.get('/search/postoffice', async (req, res) => {
    try{
        const { name } = req.query;
        if(!name || name.trim().length < 2){
            return res.status(400).json({
                success: false,
                message: 'Post office name must be at least 2 characters',
                data: []
            });
        }
        const result = await location.searchByPostOffice(name);
        if(!result.success){
            return res.status(404).json({
                success: false,
                message: result.message,
                data: []
            });
        }
        res.status(200).json({
            success: true,
            message: result.message,
            data: result.data
        });
    }catch(error){
        console.error('Post office search error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later!',
            data: []
        });
    }
});

module.exports = router;