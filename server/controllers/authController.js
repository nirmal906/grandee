const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sequelize, Sequelize, RefreshToken, User, UserRole, Role } = require('../models');

const authController = {

    // Refresh Access Token using Refresh Token
    refreshToken: async (req, res) => {
        let transaction;
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token is required',
                });
            }

            transaction = await sequelize.transaction();

            // Step 1: Find valid refresh token (no eager loading of User yet)
            const tokenRecord = await RefreshToken.findOne({
                where: {
                    token: refreshToken,
                    expires_at: {
                        [Sequelize.Op.gt]: new Date()
                    }
                },
                transaction
            });

            if (!tokenRecord) {
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired refresh token',
                });
            }

            // Step 2: Fetch user with roles separately using the user_id from tokenRecord
            const user = await User.findByPk(tokenRecord.user_id, {
                include: [
                    {
                        model: UserRole,
                        as: 'userRoles',  
                        include: [
                            {
                                model: Role,
                                as: 'role',  
                                attributes: ['id', 'name'],
                            }
                        ]
                    }
                ],
                transaction
            });

            if (!user) {
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
            }

            const role = user.userRoles[0]?.role?.name || 'user';

            // Generate new tokens
            const payload = {
                userId: user.id,
                email: user.email,
                mobile: user.mobile,
                role,
            };

            const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
            });

            const newRefreshToken = crypto.randomBytes(64).toString('hex');

            // Delete old refresh token
            await RefreshToken.destroy({
                where: { token: refreshToken },
                transaction
            });

            // Store new refresh token
            const expiresAt = new Date();
            const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);
            expiresAt.setDate(expiresAt.getDate() + expiryDays);

            await RefreshToken.create({
                token: newRefreshToken,
                user_id: user.id,
                expires_at: expiresAt,
            }, { transaction });

            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Token refreshed successfully',
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    role
                },
            });

        } catch (err) {
            if (transaction) await transaction.rollback();
            console.error('Refresh token error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Generate Access Token (JWT)
    generateAccessToken: (payload) => {
        return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
        });
    },

    // Generate Refresh Token (Random string)
    generateRefreshToken: () => {
        return crypto.randomBytes(64).toString('hex');
    },

    // Store refresh token in database
    storeRefreshToken: async (userId, refreshToken, transaction = null) => {
        const expiresAt = new Date();
        const expiryDays = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        await RefreshToken.create({
            token: refreshToken,
            user_id: userId,
            expires_at: expiresAt,
        }, { transaction });
    },

    // Clean up expired refresh tokens for a user
    cleanupExpiredTokens: async (userId, transaction = null) => {
        await RefreshToken.destroy({
            where: {
                user_id: userId,
                expires_at: {
                    [Sequelize.Op.lt]: new Date()
                }
            },
            transaction
        });
    },
};

module.exports = authController;