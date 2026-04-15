const { User, UserRole, Role, Permission } = require('../models');
const { Op }  = require('sequelize');
const MODULES = [
    { name: 'dashboard', label: 'Dashboard' },
    { name: 'permission', label: 'Permission' },
    { name: 'role', label: 'Role' },
    { name: 'site', label: 'Site' },
    { name: 'team', label: 'Team' },
    { name: 'unit', label: 'Unit' },
    { name: 'material', label: 'Material Master' },
    { name: 'materialinvoice', label: 'Material Invoices' },
    { name: 'labour', label: 'Labour Master' },
    { name: 'labourinvoice', label: 'Labour Invoices' },
    { name: 'approvelabourinvoice', label: 'Approve Labour Invoices' },
    { name: 'vendor', label: 'Vendor' },
    { name: 'vendorsummary', label: 'Vendor Summary' },
];
const permissionController = {

    // Get all roles with pagination and sorting
    getRoles: async (req, res) => {
        try{
            const { page = 1, limit = 10, sort = 'name', order = 'asc' } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination params
            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            // Validate sort & order
            const validSortFields = ['name', 'createdAt', 'updatedAt'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            // Fetch roles
            const { rows, count } = await Role.findAndCountAll({
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                distinct : true
            });
            res.status(200).json({
                success        : true,
                data           : rows,
                meta           : {
                    total      : count,
                    page       : pageNum,
                    limit      : limitNum,
                    totalPages : Math.ceil(count / limitNum)
                }
            });
        }catch(err){
            console.error('getRole error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get permissions for a specific role
    getRolePermissions: async (req, res) => {
        try{
            const { roleId } = req.params;
            if(!roleId){
                return res.status(400).json({
                    success: false,
                    message: 'Role ID is required'
                });
            }
            // Get existing permissions for the role
            const permissions = await Permission.findAll({
                where: { 
                    role_id: roleId,
                    status: 1 
                }
            });
            // Create a permissions map for easy lookup
            const permissionsMap = {};
            permissions.forEach(permission => {
                permissionsMap[permission.module] = {
                    can_add    : permission.can_add,
                    can_edit   : permission.can_edit,
                    can_delete : permission.can_delete,
                    can_view   : permission.can_view
                };
            });
            // Format response with all modules and their permissions
            const formattedData = MODULES.map(module => ({
                module_name    : module.name,
                module_label   : module.label,
                permissions    : permissionsMap[module.name] || {
                    can_add    : false,
                    can_edit   : false,
                    can_delete : false,
                    can_view   : false
                }
            }));
            res.status(200).json({
                success: true,
                data: formattedData
            });
        }catch(err){
            console.error('getRolePermissions error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch role permissions'
            });
        }
    },

    // Update permissions for a role
    updateRolePermissions: async (req, res) => {
        try{
            const { roleId } = req.params;
            const { permissions } = req.body;
            if(!roleId){
                return res.status(400).json({
                    success: false,
                    message: 'Role ID is required'
                });
            }
            if(!Array.isArray(permissions)){
                return res.status(400).json({
                    success: false,
                    message: 'Permissions must be an array'
                });
            }
            // Verify role exists
            const role = await Role.findByPk(roleId);
            if(!role){
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            // Validate module names
            const validModuleNames = MODULES.map(m => m.name);
            const invalidModules   = permissions.filter(p => !validModuleNames.includes(p.module_name));
            if(invalidModules.length > 0){
                return res.status(400).json({
                    success: false,
                    message: `Invalid module names: ${invalidModules.map(m => m.module_name).join(', ')}`
                });
            }
            // Process each permission
            const updatePromises = permissions.map(async (permData) => {
                const { module_name, can_add, can_edit, can_delete, can_view } = permData;
                // Find existing permission or create new one
                const [permission, created] = await Permission.findOrCreate({
                    where          : {
                        role_id    : roleId,
                        module     : module_name
                    },
                    defaults       : {
                        can_add    : can_add || false,
                        can_edit   : can_edit || false,
                        can_delete : can_delete || false,
                        can_view   : can_view || false,
                        status     : 1
                    }
                });
                // Update if not newly created
                if(!created){
                    await permission.update({
                        can_add    : can_add || false,
                        can_edit   : can_edit || false,
                        can_delete : can_delete || false,
                        can_view   : can_view || false
                    });
                }
                return permission;
            });
            await Promise.all(updatePromises);
            res.status(200).json({
                success: true,
                message: 'Permissions updated successfully'
            });
        }catch(err){
            console.error('updateRolePermissions error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to update permissions'
            });
        }
    },

    // User based role permission 
    getUserPermissions: async (req, res) => {
        try{
            const { userId } = req.params;
            // Fetch the user
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Fetch the role for the user
            const userRole = await UserRole.findOne({
                where: { user_id: userId }
            });
            if(!userRole){
                return res.status(404).json({
                    success: false,
                    message: 'No role assigned to user'
                });
            }
            // Fetch permissions for the role
            const permissions = await Permission.findAll({
                where: {
                    role_id: userRole.role_id,
                    status: 1
                },
                attributes: ['module', 'can_add', 'can_edit', 'can_delete', 'can_view']
            });
            res.json({
                success: true,
                data: { permissions }
            });
        }catch(error){
            console.error('Error fetching user permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
};
module.exports = permissionController;