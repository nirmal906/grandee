const { Vendor, User } = require('../models');
const { Op }           = require('sequelize');
const { sequelize }    = require('../config/db');

const vendorController = {
    
    // Get all vendors with pagination, sorting and filtering
    getVendors: async (req, res) => {
        try{
            const { 
                page             = 1, 
                limit            = 10, 
                sort             = 'created_at', 
                order            = 'desc',
                include_inactive = 'false',
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
            const validSortFields = ['name', 'phone', 'email', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            
            // Build where clause
            const whereClause = {};
            
            // Include inactive vendors if requested
            if(include_inactive !== 'true'){
                whereClause.is_active = true;
            }
            
            // Search by name, phone, email, location fields, or pincode
            if(search){
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { phone: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { pincode: { [Op.like]: `%${search}%` } },
                    { post_office_name: { [Op.like]: `%${search}%` } },
                    { district: { [Op.like]: `%${search}%` } },
                    { state: { [Op.like]: `%${search}%` } },
                    { full_address: { [Op.like]: `%${search}%` } }
                ];
            }
            
            // Fetch vendors
            const { rows, count } = await Vendor.findAndCountAll({
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
        }catch(err){
            console.error('getVendors error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get vendor by ID
    getVendorById: async (req, res) => {
        try{
            const { id } = req.params;
            const { include_inactive = 'false' } = req.query;
            
            if(!id){
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }
            
            // Build where clause
            const whereClause = { id };
            if(include_inactive !== 'true'){
                whereClause.is_active = true;
            }
            
            const vendor = await Vendor.findOne({
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
            
            if(!vendor){
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: vendor
            });
        }catch(err){
            console.error('getVendorById error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Create a new vendor
    createVendor: async (req, res) => {
        const transaction = await sequelize.transaction();
        try{
            const{ 
                name,
                phone,
                email,
                pincode,
                post_office_name,
                district,
                state,
                region,
                country,
                full_address,
                notes 
            } = req.body;
            
            const errors = {};

            // Name (required)
            if (!name || !name.trim()) {
                errors.name = 'Vendor name is required';
            }

            // Phone (optional) — validate format only when provided
            if (phone && phone.trim() && !/^[0-9]{10}$/.test(phone.trim())) {
                errors.phone = 'Phone number must be exactly 10 digits';
            }

            // Email (optional)
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                errors.email = 'Invalid email format';
            }

            // Pincode (optional)
            if (pincode && !/^\d{6}$/.test(pincode.trim())) {
                errors.pincode = 'Pincode must be exactly 6 digits';
            }
            
            // Check for duplicate vendor name (case-insensitive)
            if(name && name.trim()){
                const existingVendor = await Vendor.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        name.trim().toLowerCase()
                    ),
                    transaction
                });
                if(existingVendor){
                    errors.name = 'A vendor with this name already exists';
                }
            }
            
            // Check for duplicate phone
            if(phone && phone.trim()){
                const existingPhone = await Vendor.findOne({
                    where: { phone: phone.trim() },
                    transaction
                });
                if(existingPhone){
                    errors.phone = 'A vendor with this phone number already exists';
                }
            }
            
            // Check for duplicate email
            if(email && email.trim()){
                const existingEmail = await Vendor.findOne({
                    where: sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('email')),
                        email.trim().toLowerCase()
                    ),
                    transaction
                });
                if(existingEmail){
                    errors.email = 'A vendor with this email already exists';
                }
            }
            
            // If any validation errors, rollback and return
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            const vendorData = {
                name: name.trim(),
                phone: phone && phone.trim() ? phone.trim() : null,
                email: email ? email.trim().toLowerCase() : null,
                pincode: pincode ? pincode.trim() : null,
                post_office_name: post_office_name ? post_office_name.trim() : null,
                district: district ? district.trim() : null,
                state: state ? state.trim() : null,
                region: region ? region.trim() : null,
                country: country ? country.trim() : 'India',
                full_address: full_address ? full_address.trim() : null,
                notes: notes ? notes.trim() : null,
                created_by: req.user?.id || req.user?.userId,
                updated_by: req.user?.id || req.user?.userId,
                is_active: true
            };
            const vendor = await Vendor.create(vendorData, { transaction });
            await transaction.commit();
            const createdVendor = await Vendor.findOne({
                where: { id: vendor.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });
            
            return res.status(201).json({
                success: true,
                message: 'Vendor created successfully',
                data: createdVendor
            });
        }catch(err){
            await transaction.rollback();
            console.error('createVendor error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to create vendor',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Update a vendor
    updateVendor: async (req, res) => {
        const transaction = await sequelize.transaction();
        try{
            const { id } = req.params;
            const { 
                name,
                phone,
                email,
                pincode,
                post_office_name,
                district,
                state,
                region,
                country,
                full_address,
                notes 
            } = req.body;
            
            const vendor = await Vendor.findOne({
                where: { id, is_active: true },
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            
            if(!vendor){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            
            const errors = {};
            
            // Validate name
            if(name !== undefined){
                if(!name || !name.trim()){
                    errors.name = 'Vendor name is required';
                }else if(name.trim() !== vendor.name){
                    const existingVendor = await Vendor.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.col('name')),
                            name.trim().toLowerCase()
                        ),
                        transaction
                    });
                    if(existingVendor && existingVendor.id !== vendor.id){
                        errors.name = 'A vendor with this name already exists';
                    }
                }
            }
            
            // Validate phone (optional)
            if(phone !== undefined){
                if(!phone || !phone.trim()){
                    // Phone is optional — clearing it is allowed
                }else if(!/^[0-9]{10}$/.test(phone.trim())){
                    errors.phone = 'Phone number must be exactly 10 digits';
                }else if(phone.trim() !== vendor.phone){
                    const existingPhone = await Vendor.findOne({
                        where: { phone: phone.trim() },
                        transaction
                    });
                    if(existingPhone && existingPhone.id !== vendor.id){
                        errors.phone = 'A vendor with this phone number already exists';
                    }
                }
            }
            
            // Validate email
            if(email !== undefined){
                if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
                    errors.email = 'Invalid email format';
                }else 
                if(email && email.trim().toLowerCase() !== vendor.email){
                    const existingEmail = await Vendor.findOne({
                        where: sequelize.where(
                            sequelize.fn('LOWER', sequelize.col('email')),
                            email.trim().toLowerCase()
                        ),
                        transaction
                    });
                    if(existingEmail && existingEmail.id !== vendor.id){
                        errors.email = 'A vendor with this email already exists';
                    }
                }
            }
            
            // Validate pincode
            const updatedPincode = pincode !== undefined ? pincode : vendor.pincode;
            if(updatedPincode && !/^\d{6}$/.test(updatedPincode.trim())){
                errors.pincode = 'Pincode must be exactly 6 digits';
            }
            
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            
            const updateData = {
                updated_by: req.user?.id || req.user?.userId
            };
            
            if(name !== undefined) updateData.name = name.trim();
            if(phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null;
            if(email !== undefined) updateData.email = email.trim().toLowerCase();
            if(pincode !== undefined) updateData.pincode = pincode.trim();
            if(post_office_name !== undefined) updateData.post_office_name = post_office_name?.trim() || null;
            if(district !== undefined) updateData.district = district.trim();
            if(state !== undefined) updateData.state = state.trim();
            if(region !== undefined) updateData.region = region?.trim() || null;
            if(country !== undefined) updateData.country = country?.trim() || 'India';
            if(full_address !== undefined) updateData.full_address = full_address.trim();
            if(notes !== undefined) updateData.notes = notes?.trim() || null;
            
            await vendor.update(updateData, { transaction });
            await transaction.commit();
            
            const updatedVendor = await Vendor.findOne({
                where: { id: vendor.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] }
                ]
            });
            
            return res.status(200).json({
                success: true,
                message: 'Vendor updated successfully',
                data: updatedVendor
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateVendor error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update vendor',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Delete a vendor (soft delete by default)
    deleteVendor: async (req, res) => {
        try{
            const { id } = req.params;
            const { permanent = 'false' } = req.query;
            
            if(!id){
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }
            
            const vendor = await Vendor.findByPk(id);
            
            if(!vendor){
                return res.status(404).json({
                    success: false,
                    message: 'Vendor not found'
                });
            }
            
            if(permanent === 'true'){
                // Permanent delete
                await vendor.destroy();
                return res.status(200).json({
                    success: true,
                    message: 'Vendor permanently deleted successfully'
                });
            }else{
                // Soft delete
                await vendor.update({ 
                    is_active: false,
                    updated_by: req.user?.id || req.user?.userId
                });
                return res.status(200).json({
                    success: true,
                    message: 'Vendor deactivated successfully'
                });
            }
        }catch(err){
            console.error('deleteVendor error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    }
};

module.exports = vendorController;