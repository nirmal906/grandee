const jwt            = require('jsonwebtoken');
const { User }       = require('../models'); 
const authMiddleware = async (req, res, next) => {
    try{
        // Get token from Authorization header
        const authHeader = req.header('Authorization');
        const token      = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if(!token){
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.',
            });
        }
        // Verify access token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        // Check if user exists and is active
        const user = await User.findOne({
            where: { 
                id:     decoded.userId,
                status: 1
            },
        });
        if(!user){
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive. Authorization denied.',
            });
        }
        // Parse site_ids from DB — e.g. "3,2" → [3, 2]  |  null/empty → []
        const rawSiteIds    = user.site_ids || '';
        const parsedSiteIds = rawSiteIds
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n));
        // Attach user data to request object
        req.user = {
            userId:   decoded.userId,
            email:    decoded.email,
            mobile:   decoded.mobile,
            role:     decoded.role,       
            site_ids: parsedSiteIds,      
        };
        next();
    }catch(err){
        if(err.name === 'TokenExpiredError'){
            return res.status(401).json({
                success: false,
                message: 'Access token has expired. Please refresh your token.',
                code: 'TOKEN_EXPIRED'
            });
        }
        if(err.name === 'JsonWebTokenError'){
            return res.status(401).json({
                success: false,
                message: 'Invalid access token. Authorization denied.',
                code: 'INVALID_TOKEN'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token verification failed. Authorization denied.',
        });
    }
};
module.exports = authMiddleware;