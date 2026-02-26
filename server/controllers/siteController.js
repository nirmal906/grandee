const { Site, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db'); 
const fs = require('fs');
const path = require('path');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const { resolveAllowedSiteIds } = require('./actionController');

const siteController = {
    
    // Get all sites with pagination, sorting and filtering
    getSites: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10, 
                sort = 'created_at', 
                order = 'desc',
                include_inactive = 'false',
                status,
                search
            } = req.query;
            const allowedIds = await resolveAllowedSiteIds(req.user);
            console.log(req.user);
            if(allowedIds.length === 0){
                return res.status(200).json({
                    success: true,
                    data: [],
                    meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
                });
            }

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }

            const validSortFields = ['name', 'full_address', 'start_date', 'total_budget', 'status', 'created_at', 'updated_at'];
            const validOrder = ['asc', 'desc'];
            const sortField  = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder  = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            const whereClause = {};
            whereClause = {
                id: { [Op.in]: allowedIds }
            };
            if (include_inactive !== 'true') {
                whereClause.is_active = true;
            }

            if (status && ['planning', 'active', 'completed'].includes(status)) {
                whereClause.status = status;
            }

            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { full_address: { [Op.like]: `%${search}%` } },
                    { pincode: { [Op.like]: `%${search}%` } },
                    { post_office_name: { [Op.like]: `%${search}%` } },
                    { district: { [Op.like]: `%${search}%` } },
                    { state: { [Op.like]: `%${search}%` } }
                ];
            }

            const { rows, count } = await Site.findAndCountAll({
                where: whereClause,
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true
            });

            // Add full photo URL to each site
            const responseData = rows.map(site => ({
                ...site.dataValues,
                checkout_photo: site.checkout_photo 
                    ? `${BASE_URL}/uploads/sites/checkout/${site.checkout_photo}` 
                    : null
            }));

            res.status(200).json({
                success: true,
                data: responseData,
                meta: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum)
                }
            });
        } catch (err) {
            console.error('getSites error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get site by ID
    getSiteById: async (req, res) => {
        try {
            const { id } = req.params;
            const { include_inactive = 'false' } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Site ID is required'
                });
            }

            const whereClause = { id };
            if (include_inactive !== 'true') {
                whereClause.is_active = true;
            }

            const site = await Site.findOne({
                where: whereClause,
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });

            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            // Add full photo URL
            const responseData = {
                ...site.dataValues,
                checkout_photo: site.checkout_photo 
                    ? `${BASE_URL}/uploads/sites/checkout/${site.checkout_photo}` 
                    : null
            };

            res.status(200).json({
                success: true,
                data: responseData
            });
        } catch (err) {
            console.error('getSiteById error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Create a new site
    createSite: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { 
                name,
                client_name,
                client_mobile,
                pincode,
                post_office_name,
                district,
                state,
                region,
                country,
                full_address,
                start_date, 
                total_budget, 
                status, 
                notes 
            } = req.body;

            const errors = {};

            // Existing validations (kept as-is)
            if (!name || !name.trim()) errors.name = 'Site name is required';
            if (!client_mobile || !client_mobile.trim()) {
                errors.client_mobile = 'Client mobile number is required';
            } else if (!/^[0-9]{10}$/.test(client_mobile.trim())) {
                errors.client_mobile = 'Mobile number must be exactly 10 digits';
            }
            if (pincode && !/^\d{6}$/.test(pincode.trim())) {
                errors.pincode = 'Pincode must be exactly 6 digits';
            }
            if (!start_date || !start_date.trim()) {
                errors.start_date = 'Start date is required';
            } else {
                const dateObj = new Date(start_date);
                if (isNaN(dateObj.getTime())) errors.start_date = 'Invalid date format';
            }
            if (total_budget === undefined || total_budget === null || total_budget === '') {
                errors.total_budget = 'Total budget is required';
            } else {
                const budgetNum = parseFloat(total_budget);
                if (isNaN(budgetNum) || budgetNum < 0) {
                    errors.total_budget = 'Total budget must be a positive number';
                }
            }
            if (!status || !status.trim()) {
                errors.status = 'Status is required';
            } else if (!['planning', 'active', 'completed'].includes(status)) {
                errors.status = 'Invalid status. Must be planning, active, or completed';
            }

            // Check duplicate name (case-insensitive)
            if (name && name.trim()) {
                const existingSite = await Site.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        name.trim().toLowerCase()
                    ),
                    transaction
                });
                if (existingSite) errors.name = 'A site with this name already exists';
            }

            // Optional: make photo required
            // if (!req.file) errors.checkout_photo = 'Checkout photo is required';

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const siteData = {
                name: name.trim(),
                client_name: client_name?.trim() || null,
                client_mobile: client_mobile.trim(),
                pincode: pincode?.trim() || null,
                post_office_name: post_office_name?.trim() || null,
                district: district?.trim() || null,
                state: state?.trim() || null,
                region: region?.trim() || null,
                country: country?.trim() || 'India',
                full_address: full_address?.trim() || null,
                start_date,
                total_budget: parseFloat(total_budget),
                status,
                notes: notes?.trim() || null,
                checkout_photo: req.file ? req.file.filename : null,
                created_by: req.user?.id || req.user?.userId,
                updated_by: req.user?.id || req.user?.userId,
                is_active: true
            };

            const site = await Site.create(siteData, { transaction });
            await transaction.commit();

            const createdSite = await Site.findByPk(site.id, {
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });

            // Add full URL
            if (createdSite.checkout_photo) {
                createdSite.checkout_photo = `${BASE_URL}/uploads/sites/checkout/${createdSite.checkout_photo}`;
            }

            return res.status(201).json({
                success: true,
                message: 'Site created successfully',
                data: createdSite
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createSite error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to create site',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Update a site
    updateSite: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { 
                name,
                client_name,
                client_mobile,
                pincode,
                post_office_name,
                district,
                state,
                region,
                country,
                full_address,
                start_date, 
                total_budget, 
                status, 
                notes,
                checkoutRemoved   // ← from frontend FormData
            } = req.body;

            const site = await Site.findOne({
                where: { id, is_active: true },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!site) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            const errors = {};

            // Existing validations (only when field is sent)
            if (name !== undefined) {
                if (!name || !name.trim()) errors.name = 'Site name is required';
                else if (name.trim() !== site.name) {
                    const existing = await Site.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.col('name')),
                            name.trim().toLowerCase()
                        ),
                        transaction
                    });
                    if (existing && existing.id !== site.id) {
                        errors.name = 'A site with this name already exists';
                    }
                }
            }

            if (client_mobile !== undefined) {
                if (!client_mobile || !client_mobile.trim()) {
                    errors.client_mobile = 'Client mobile number is required';
                } else if (!/^[0-9]{10}$/.test(client_mobile.trim())) {
                    errors.client_mobile = 'Mobile number must be exactly 10 digits';
                }
            }

            // ... other field validations if needed ...

            // Handle checkout photo
            let newPhotoFilename = site.checkout_photo;

            if (req.file) {
                // Replace existing photo
                if (site.checkout_photo) {
                    const oldPath = path.join(process.cwd(), 'uploads', 'sites', 'checkout', site.checkout_photo);
                    if (fs.existsSync(oldPath)) {
                        try {
                            fs.unlinkSync(oldPath);
                        } catch (unlinkErr) {
                            console.error('Error deleting old checkout photo:', unlinkErr);
                        }
                    }
                }
                newPhotoFilename = req.file.filename;
            } else if (checkoutRemoved === 'true' && site.checkout_photo) {
                // Remove existing photo
                const oldPath = path.join(process.cwd(), 'uploads', 'sites', 'checkout', site.checkout_photo);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                    } catch (unlinkErr) {
                        console.error('Error deleting checkout photo:', unlinkErr);
                    }
                }
                newPhotoFilename = null;
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const updateData = {
                updated_by: req.user?.id || req.user?.userId,
                checkout_photo: newPhotoFilename
            };

            if (name !== undefined) updateData.name = name.trim();
            if (client_name !== undefined) updateData.client_name = client_name?.trim() || null;
            if (client_mobile !== undefined) updateData.client_mobile = client_mobile.trim();
            if (pincode !== undefined) updateData.pincode = pincode?.trim() || null;
            if (post_office_name !== undefined) updateData.post_office_name = post_office_name?.trim() || null;
            if (district !== undefined) updateData.district = district?.trim() || null;
            if (state !== undefined) updateData.state = state?.trim() || null;
            if (region !== undefined) updateData.region = region?.trim() || null;
            if (country !== undefined) updateData.country = country?.trim() || 'India';
            if (full_address !== undefined) updateData.full_address = full_address?.trim() || null;
            if (start_date !== undefined) updateData.start_date = start_date;
            if (total_budget !== undefined) updateData.total_budget = parseFloat(total_budget);
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes?.trim() || null;

            await site.update(updateData, { transaction });
            await transaction.commit();

            const updatedSite = await Site.findByPk(site.id, {
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });

            if (updatedSite.checkout_photo) {
                updatedSite.checkout_photo = `${BASE_URL}/uploads/sites/checkout/${updatedSite.checkout_photo}`;
            }

            return res.status(200).json({
                success: true,
                message: 'Site updated successfully',
                data: updatedSite
            });
        } catch (err) {
            await transaction.rollback();
            console.error('updateSite error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update site',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Delete a site (soft delete by default)
    deleteSite: async (req, res) => {
        try {
            const { id } = req.params;
            const { permanent = 'false' } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Site ID is required'
                });
            }

            const site = await Site.findByPk(id);
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            // Delete checkout photo if exists
            if (site.checkout_photo) {
                const photoPath = path.join(process.cwd(), 'uploads', 'sites', 'checkout', site.checkout_photo);
                if (fs.existsSync(photoPath)) {
                    try {
                        fs.unlinkSync(photoPath);
                    } catch (err) {
                        console.error('Error deleting checkout photo on site delete:', err);
                    }
                }
            }

            if (permanent === 'true') {
                await site.destroy();
                return res.status(200).json({
                    success: true,
                    message: 'Site permanently deleted successfully'
                });
            } else {
                await site.update({ 
                    is_active: false,
                    updated_by: req.user?.id || req.user?.userId
                });
                return res.status(200).json({
                    success: true,
                    message: 'Site deactivated successfully'
                });
            }
        } catch (err) {
            console.error('deleteSite error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    }
};

module.exports = siteController;