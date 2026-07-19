const { User }        = require('../models'); 
const { Role }        = require('../models'); 
const { UserRole }    = require('../models'); 
const { Op }          = require('sequelize');
const { sequelize }   = require('../models');
const PROTECTED_ROLES = ['Admin', 'Superadmin'];
const roleController  = {
    
    // Get all roles with pagination, search, and filters
    getRole: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const whereClause = search ? {
                name: {
                    [Op.like]: `%${search}%`
                }
            } : {};
            let orderClause;
            if(sortBy === 'name'){
                orderClause = [
                    [sequelize.literal('CASE WHEN id = 2 THEN 1 WHEN id = 3 THEN 2 ELSE 3 END'), 'ASC'],
                    ['name', sortOrder.toUpperCase()]
                ];
            }else{
                orderClause = [
                    [sequelize.literal('CASE WHEN id = 2 THEN 1 WHEN id = 3 THEN 2 ELSE 3 END'), 'ASC'],
                    [sortBy, sortOrder.toUpperCase()]
                ];
            }
            // Get roles with pagination
            const { count, rows: roles } = await Role.findAndCountAll({
                where: whereClause,
                limit: parseInt(limit),
                offset: offset,
                order: orderClause,
                attributes: ['id', 'name', 'created_at', 'updated_at']
            });
            // Mark protected roles
            const rolesWithMetadata = roles.map(role => ({
                ...role.toJSON(),
                is_protected: PROTECTED_ROLES.includes(role.name),
                is_editable: !PROTECTED_ROLES.includes(role.name),
                is_deletable: !PROTECTED_ROLES.includes(role.name)
            }));
            res.status(200).json({
                success: true,
                message: 'Roles fetched successfully',
                data: {
                    roles: rolesWithMetadata,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / parseInt(limit))
                    }
                }
            });
        }catch(err){
            console.error('getRoles error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single role by ID 
    getRoleById: async (req, res) => {
        try{
            const { id } = req.params;
            const role = await Role.findByPk(id, {
                attributes: ['id', 'name', 'created_at', 'updated_at']
            });
            if(!role){
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            // Add metadata
            const roleData = {
                ...role.toJSON(),
                is_protected: PROTECTED_ROLES.includes(role.name),
                is_editable: !PROTECTED_ROLES.includes(role.name),
                is_deletable: !PROTECTED_ROLES.includes(role.name)
            };
            res.status(200).json({
                success: true,
                message: 'Role fetched successfully',
                data: roleData
            });
        }catch(err){
            console.error('getRoleById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch role'
            });
        }
    },

    // Create a role 
    createRole: async (req, res) => {
        const transaction = await User.sequelize.transaction();
        try{
            const { name } = req.body;
            // Validation
            if(!name || name.trim() === ''){
                return res.status(400).json({
                    success: false,
                    message: 'Role name is required'
                });
            }
            const trimmedName = name.trim();
            // Check if role name is unique (case-insensitive)
            const existingRole = await Role.findOne({
                where: {
                    name: {
                        [Op.like]: trimmedName
                    }
                }
            });
            if(existingRole){
                return res.status(400).json({
                    success: false,
                    message: 'Role name already exists. Please use a different name.'
                });
            }
            // Prevent creating protected role names
            if(PROTECTED_ROLES.some(pr => pr.toLowerCase() === trimmedName.toLowerCase())){
                return res.status(400).json({
                    success: false,
                    message: 'Cannot create a role with a protected role name'
                });
            }
            // Create role
            const newRole = await Role.create({
                name: trimmedName
            }, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: newRole
            });
        }catch(err){
            await transaction.rollback();
            console.error('createRole error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a role
    updateRole: async (req, res) => {
        const transaction  = await User.sequelize.transaction();
        try{
            const { id }   = req.params;
            const { name } = req.body;
            // Validation
            if(!name || name.trim() === ''){
                return res.status(400).json({
                    success: false,
                    message: 'Role name is required'
                });
            }
            const trimmedName = name.trim();
            // Find role
            const role = await Role.findByPk(id);
            if(!role){
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            // Check if role is protected
            if(PROTECTED_ROLES.includes(role.name)){
                return res.status(403).json({
                    success: false,
                    message: `Cannot edit '${role.name}' role. This is a system-protected role.`
                });
            }
            // Check if new name is unique (excluding current role)
            const existingRole = await Role.findOne({
                where: {
                    name: {
                        [Op.like]: trimmedName
                    },
                    id: {
                        [Op.ne]: id
                    }
                }
            });
            if(existingRole){
                return res.status(400).json({
                    success: false,
                    message: 'Role name already exists. Please use a different name.'
                });
            }
            // Prevent updating to protected role names
            if(PROTECTED_ROLES.some(pr => pr.toLowerCase() === trimmedName.toLowerCase())){
                return res.status(400).json({
                    success: false,
                    message: 'Cannot update to a protected role name'
                });
            }
            // Update role
            await role.update({
                name: trimmedName
            }, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Role updated successfully',
                data: role
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateRole error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete a role 
    deleteRole: async (req, res) => {
        const transaction = await User.sequelize.transaction();
        try{
            const { id } = req.params;
            // Find role
            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            // Check if role is protected
            if(PROTECTED_ROLES.includes(role.name)){
                return res.status(403).json({
                    success: false,
                    message: `Cannot delete '${role.name}' role. This is a system-protected role.`
                });
            }
            // Check if any users are mapped to this role
            const usersWithRole = await UserRole.count({
                where: { role_id: id }
            });
            if(usersWithRole > 0){
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete this role. ${usersWithRole} user(s) are currently assigned to this role. Please reassign them to another role before deleting.`,
                    data: {
                        mapped_users_count: usersWithRole
                    }
                });
            }
            // Delete role
            await role.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Role deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteRole error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete role'
            });
        }
    },
};
module.exports = roleController;