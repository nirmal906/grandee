const { User, Role, UserRole } = require('../models'); 
const { Op }                   = require('sequelize');
const bcrypt                   = require('bcryptjs'); 
const teamController           = {
    
    // Get all users with pagination, search, and filters
    getTeam: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                role   = '',
                sort   = 'name',
                order  = 'asc',
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            // Validate sort and order
            const validSortFields = ['name', 'email', 'status', 'created_at', 'updated_at'];
            const validOrder = ['asc', 'desc'];
            const sortField  = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder  = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            // Build where clause for users
            const userWhere  = {};
            if(search){
                userWhere[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } }, 
                    { email: { [Op.like]: `%${search}%` } },
                    { mobile: { [Op.like]: `%${search}%` } },
                ];
            }
            if(status === '1' || status === '0'){
                userWhere.status = Number(status);
            }
            // Build the include for roles
            let roleWhere = { 
                name: { [Op.notIn]: ['Superadmin'] }
            };
            // If filtering by specific role, change to exact match
            if(role && !['Superadmin'].includes(role)){
                roleWhere = { name: role };
            }
            let roleInclude = {
                model          : UserRole,
                as             : 'userRoles', 
                attributes     : ['role_id'],
                required       : true,
                include        : [{
                    model      : Role,
                    as         : 'role', 
                    attributes : ['id', 'name'],
                    where      : roleWhere,
                    required   : true
                }]
            };
            // Fetch users with pagination and roles
            const { rows, count } = await User.findAndCountAll({
                where    : userWhere,
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                include  : [roleInclude],
                distinct : true,
                subQuery : false
            });
            res.status(200).json({
                success  : true,
                data     : rows,
                total    : count,
                page     : pageNum,
                limit    : limitNum
            });
        }catch(err){
            console.error('getTeam error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single user by ID with roles
    getTeamById: async (req, res) => {
        try{
            const { id } = req.params;
            const user   = await User.findByPk(id, {
                include            : [{
                    model          : UserRole,
                    as             : 'userRoles', 
                    attributes     : ['role_id', 'is_primary'],
                    include        : [{
                        model      : Role,
                        as         : 'role',
                        attributes : ['id', 'name']
                    }]
                }],
            });
            if(!user){
                return res.status(404).json({
                    success : false,
                    message : 'User not found'
                });
            }
            res.status(200).json({
                success : true,
                data    : user
            });
        }catch(err){
            console.error('getTeamById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
            });
        }
    },

    // Create a user with role assignment
    createTeam: async (req, res) => {
        const transaction = await User.sequelize.transaction();
        try{
            const { 
                name, 
                email, 
                mobile, 
                gender, 
                password, 
                status, 
                site_ids,
                role
            } = req.body;
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Name is required';
            }else 
            if(name.trim().length > 255){
                errors.name = 'Name must not exceed 255 characters';
            }
            // Email validation
            if(!email || !email.trim()){
                errors.email = 'Email is required';
            }else 
            if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
                errors.email = 'Invalid email format';
            }else{
                const existingEmail = await User.findOne({
                    where: { email: email.trim().toLowerCase() },
                    transaction,
                });
                if(existingEmail){
                    errors.email = 'Email already exists';
                }
            }
            // Mobile validation
            if(!mobile || !mobile.trim()){
                errors.mobile = 'Mobile number is required';
            }else 
            if(!/^[0-9]{10}$/.test(mobile.trim())){
                errors.mobile = 'Mobile number must be exactly 10 digits';
            }else 
            if(!/^\+?[1-9]\d{1,14}$/.test(mobile.trim())){
                errors.mobile = 'Invalid mobile number format';
            }else{
                const existingMobile = await User.findOne({
                    where: { mobile: mobile.trim() },
                    transaction,
                });
                console.log(existingMobile)
                if(existingMobile){
                    errors.mobile = 'Mobile number already exists';
                }
            }
            // Gender validation
            if(!gender || !['Male', 'Female', 'Others'].includes(gender)){
                errors.gender = 'Gender must be Male, Female, or Others';
            }
            // Password validation
            if(!password || !password.trim()){
                errors.password = 'Password is required';
            }else 
            if(password.length < 6){
                errors.password = 'Password must be at least 6 characters';
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            // Role validation
            let validRoleId = null;
            let roleRecord  = null;
            if(!role){
                errors.role = 'Role is required';
            }else{
                // Validate that the role exists and is one of the allowed roles
                roleRecord = await Role.findOne({
                    where    : { 
                        id   : role,
                        name : { [Op.notIn]: ['Superadmin'] }
                    },
                    transaction
                });
                if(!roleRecord){
                    errors.role = 'Invalid role selected';
                }else{
                    validRoleId = roleRecord.id;
                }
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            // Hash password
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            const userData = {
                name       : name.trim(),
                email      : email.trim().toLowerCase(),
                mobile     : mobile.trim(),
                gender,
                password   : hashedPassword,
                site_ids   : site_ids,
                status     : status !== undefined ? Number(status) : 1,
                created_at : new Date(),
                updated_at : new Date()
            };
            const user = await User.create(userData, { transaction });
            // Create user roles
            if(validRoleId){
                const roleData = {
                    user_id    : user.id,
                    role_id    : validRoleId,
                    is_primary : 1, 
                    created_at : new Date(),
                    updated_at : new Date(),
                };
                await UserRole.create(roleData, { transaction });
            }
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Team member created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createTeam error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a user
    updateTeam: async (req, res) => {
        const transaction = await User.sequelize.transaction();
        try{
            const { id } = req.params;
            const { 
                name, 
                email, 
                mobile, 
                gender, 
                password, 
                status, 
                role,
                site_ids
            } = req.body;
            // Check if user exists
            const user = await User.findByPk(id, { transaction });
            if(!user){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            const errors = {};
            // Name validation
            if(name !== undefined){
                if(!name || !name.trim()){
                    errors.name = 'Name cannot be empty';
                }else 
                if(name.trim().length > 255){
                    errors.name = 'Name must not exceed 255 characters';
                }
            }
            // Email validation
            if(email !== undefined){
                if(!email || !email.trim()){
                    errors.email = 'Email cannot be empty';
                }else 
                if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
                    errors.email = 'Invalid email format';
                }else{
                    const existingEmail = await User.findOne({
                        where: {
                            email: email.trim().toLowerCase(),
                            id: { [Op.ne]: id },
                        },
                        transaction,
                    });
                    if(existingEmail){
                        errors.email = 'Email already exists';
                    }
                }
            }
            // Mobile validation
            if(mobile !== undefined){
                if(!mobile || !mobile.trim()){
                    errors.mobile = 'Mobile number cannot be empty';
                }else 
                if(!/^\+?[1-9]\d{1,14}$/.test(mobile.trim())){
                    errors.mobile = 'Invalid mobile number format';
                }else 
                if(!/^\+?[1-9]\d{1,14}$/.test(mobile.trim())){
                    errors.mobile = 'Invalid mobile number format';
                }else{
                    const existingMobile = await User.findOne({
                        where: {
                            mobile: mobile.trim(),
                            id: { [Op.ne]: id },
                        },
                        transaction,
                    });
                    if(existingMobile){
                        errors.mobile = 'Mobile number already exists';
                    }
                }
            }
            // Gender validation
            if(gender !== undefined && !['Male', 'Female', 'Others'].includes(gender)){
                errors.gender = 'Gender must be Male, Female, or Others';
            }
            // Password validation
            if(password && password.length < 6){
                errors.password = 'Password must be at least 6 characters';
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            // Role validation
            let validRoleId = null;
            let roleRecord = null;
            if(role !== undefined){
                if(!role){
                    errors.role = 'Role cannot be empty';
                }else{
                    // Validate that the role exists and is one of the allowed roles
                    roleRecord = await Role.findOne({
                        where: { 
                            id: role,
                            name: { [Op.notIn]: ['Superadmin'] }
                        },
                        transaction
                    });
                    if(!roleRecord){
                        errors.role = 'Invalid role selected';
                    }else{
                        validRoleId = roleRecord.id;
                    }
                }
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData                                 = { updated_at: new Date() };
            if(name !== undefined) updateData.name           = name.trim();
            if(email !== undefined) updateData.email         = email.trim().toLowerCase();
            if(mobile !== undefined) updateData.mobile       = mobile.trim();
            if(gender !== undefined) updateData.gender       = gender;
            if(site_ids !== undefined) updateData.site_ids   = site_ids;
            if(password) updateData.password                 = await bcrypt.hash(password.trim(), 10);
            if(status !== undefined) updateData.status       = Number(status);
            await user.update(updateData, { transaction });
            // Handle role update if provided
            if(validRoleId){
                // Remove existing roles for this user
                await UserRole.destroy({
                    where: { user_id: id },
                    transaction
                });
                // Create new role assignment
                const roleData = {
                    user_id    : id,
                    role_id    : validRoleId,
                    is_primary : 1,
                    created_at : new Date(),
                    updated_at : new Date(),
                };
                await UserRole.create(roleData, { transaction });
            }
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Team member updated successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateTeam error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a user (hard delete)
    deleteTeam: async (req, res) => {
        const transaction = await User.sequelize.transaction();
        try{
            const { id } = req.params;
            const user   = await User.findByPk(id, { transaction });
            if(!user){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // First delete associated user roles
            await UserRole.destroy({
                where: { user_id: id },
                transaction
            });
            // Then delete the user
            await user.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteTeam error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    },

    // Get available roles (Executive, Manager, Admin only)
    getRoles: async (req, res) => {
        try{
            const roles = await Role.findAll({
                where: {
                    name: { [Op.notIn]: ['Superadmin'] }
                },
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: roles
            });
        }catch(err){
            console.error('getRoles error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch roles'
            });
        }
    }
};

module.exports = teamController;