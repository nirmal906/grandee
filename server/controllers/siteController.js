const { Site, User } = require('../models');
const { Op }         = require('sequelize');
const { sequelize }  = require('../config/db'); 
const siteController = {
    
    // Get all sites with pagination, sorting and filtering
    getSites: async (req, res) => {
        try{
            const { 
                page = 1, 
                limit = 10, 
                sort = 'created_at', 
                order = 'desc',
                include_inactive = 'false',
                status,
                search
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination params
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            // Validate sort & order
            const validSortFields = ['name', 'full_address', 'start_date', 'total_budget', 'status', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            // Build where clause
            const whereClause = {};
            // Include inactive sites if requested
            if (include_inactive !== 'true') {
                whereClause.is_active = true;
            }
            // Filter by status
            if (status && ['planning', 'active', 'completed'].includes(status)) {
                whereClause.status = status;
            }
            // Search by name, full_address, pincode, or location fields
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
            // Fetch sites
            const { rows, count } = await Site.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true
            });
            res.status(200).json({
                success: true,
                data: rows,
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
            // Build where clause
            const whereClause = { id };
            if (include_inactive !== 'true') {
                whereClause.is_active = true;
            }
            const site = await Site.findOne({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });
            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }
            res.status(200).json({
                success: true,
                data: site
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
            // Validate required fields
            if (!name || !name.trim()) {
                errors.name = 'Site name is required';
            }
            // Validate client mobile (required)
            if (!client_mobile || !client_mobile.trim()) {
                errors.client_mobile = 'Client mobile number is required';
            } else if (!/^[0-9]{10}$/.test(client_mobile.trim())) {
                errors.client_mobile = 'Mobile number must be exactly 10 digits';
            }
            if (!pincode || !pincode.trim()) {
                errors.pincode = 'Pincode is required';
            } else if (!/^\d{6}$/.test(pincode.trim())) {
                errors.pincode = 'Pincode must be exactly 6 digits';
            }
            if (!district || !district.trim()) {
                errors.district = 'District is required';
            }
            if (!state || !state.trim()) {
                errors.state = 'State is required';
            }
            if (!full_address || !full_address.trim()) {
                errors.full_address = 'Full address is required';
            }
            if (!start_date || !start_date.trim()) {
                errors.start_date = 'Start date is required';
            } else {
                const dateObj = new Date(start_date);
                if (isNaN(dateObj.getTime())) {
                    errors.start_date = 'Invalid date format';
                }
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
            // Check for duplicate site name (case-insensitive)
            if (name && name.trim()) {
                const existingSite = await Site.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        name.trim().toLowerCase()
                    ),
                    transaction
                });
                
                if (existingSite) {
                    errors.name = 'A site with this name already exists';
                }
            }
            // If any validation errors, rollback and return
            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            // Create site data
            const siteData = {
                name: name.trim(),
                client_name: client_name?.trim() || null,
                client_mobile: client_mobile.trim(),
                pincode: pincode.trim(),
                post_office_name: post_office_name?.trim() || null,
                district: district.trim(),
                state: state.trim(),
                region: region?.trim() || null,
                country: country?.trim() || 'India',
                full_address: full_address.trim(),
                start_date: start_date,
                total_budget: parseFloat(total_budget),
                status: status,
                notes: notes?.trim() || null,
                created_by: req.user?.id || req.user?.userId,
                updated_by: req.user?.id || req.user?.userId,
                is_active: true
            };
            const site = await Site.create(siteData, { transaction });
            await transaction.commit();
            const createdSite = await Site.findOne({
                where: { id: site.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });
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
                notes 
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
            // Validate name
            if (name !== undefined) {
                if (!name || !name.trim()) {
                    errors.name = 'Site name is required';
                } else if (name.trim() !== site.name) {
                    const existingSite = await Site.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.col('name')),
                            name.trim().toLowerCase()
                        ),
                        transaction
                    });
                    
                    if (existingSite && existingSite.id !== site.id) {
                        errors.name = 'A site with this name already exists';
                    }
                }
            }
            // Validate client_mobile
            if (client_mobile !== undefined) {
                if (!client_mobile || !client_mobile.trim()) {
                    errors.client_mobile = 'Client mobile number is required';
                } else if (!/^[0-9]{10}$/.test(client_mobile.trim())) {
                    errors.client_mobile = 'Mobile number must be exactly 10 digits';
                }
            }
            // Validate pincode
            if (pincode !== undefined) {
                if (!pincode || !pincode.trim()) {
                    errors.pincode = 'Pincode is required';
                } else if (!/^\d{6}$/.test(pincode.trim())) {
                    errors.pincode = 'Pincode must be exactly 6 digits';
                }
            }
            // Validate district
            if (district !== undefined) {
                if (!district || !district.trim()) {
                    errors.district = 'District is required';
                }
            }
            // Validate state
            if (state !== undefined) {
                if (!state || !state.trim()) {
                    errors.state = 'State is required';
                }
            }
            // Validate full_address
            if (full_address !== undefined) {
                if (!full_address || !full_address.trim()) {
                    errors.full_address = 'Full address is required';
                }
            }
            // Validate start_date
            if (start_date !== undefined) {
                if (!start_date || !start_date.trim()) {
                    errors.start_date = 'Start date is required';
                } else {
                    const dateObj = new Date(start_date);
                    if (isNaN(dateObj.getTime())) {
                        errors.start_date = 'Invalid date format';
                    }
                }
            }
            // Validate total_budget
            if (total_budget !== undefined) {
                if (total_budget === null || total_budget === '') {
                    errors.total_budget = 'Total budget is required';
                } else {
                    const budgetNum = parseFloat(total_budget);
                    if (isNaN(budgetNum) || budgetNum < 0) {
                        errors.total_budget = 'Total budget must be a positive number';
                    }
                }
            }
            // Validate status
            if (status !== undefined) {
                if (!status || !status.trim()) {
                    errors.status = 'Status is required';
                } else if (!['planning', 'active', 'completed'].includes(status)) {
                    errors.status = 'Invalid status. Must be planning, active, or completed';
                }
            }
            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            // Build update data
            const updateData = {
                updated_by: req.user?.id || req.user?.userId
            };
            if (name !== undefined) updateData.name = name.trim();
            if (client_name !== undefined) updateData.client_name = client_name?.trim() || null;
            if (client_mobile !== undefined) updateData.client_mobile = client_mobile.trim();
            if (pincode !== undefined) updateData.pincode = pincode.trim();
            if (post_office_name !== undefined) updateData.post_office_name = post_office_name?.trim() || null;
            if (district !== undefined) updateData.district = district.trim();
            if (state !== undefined) updateData.state = state.trim();
            if (region !== undefined) updateData.region = region?.trim() || null;
            if (country !== undefined) updateData.country = country?.trim() || 'India';
            if (full_address !== undefined) updateData.full_address = full_address.trim();
            if (start_date !== undefined) updateData.start_date = start_date;
            if (total_budget !== undefined) updateData.total_budget = parseFloat(total_budget);
            if (status !== undefined) updateData.status = status;
            if (notes !== undefined) updateData.notes = notes?.trim() || null;
            await site.update(updateData, { transaction });
            await transaction.commit();
            const updatedSite = await Site.findOne({
                where: { id: site.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });
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
            if (permanent === 'true') {
                // Permanent delete
                await site.destroy();
                return res.status(200).json({
                    success: true,
                    message: 'Site permanently deleted successfully'
                });
            } else {
                // Soft delete
                await site.update({ 
                    is_active: false,
                    updated_by: req.user?.id
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