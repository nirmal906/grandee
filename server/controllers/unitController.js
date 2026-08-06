const { Unit, User } = require('../models'); 
const { Op }         = require('sequelize');
const unitController = {

    // Get all units with pagination, search, and filters
    getUnit: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
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
            const validSortFields = ['name', 'status', 'created_at', 'updated_at'];
            const validOrder = ['asc', 'desc'];
            const sortField  = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder  = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            // Build where clause
            const whereClause = {};
            if(search){
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === '1' || status === '0'){
                whereClause.status = Number(status);
            }
            // Fetch units with pagination and creator/updater info
            const { rows, count } = await Unit.findAndCountAll({
                where    : whereClause,
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                include  : [
                    {
                        model      : User,
                        as         : 'creator',
                        attributes : ['id', 'name', 'email']
                    },
                    {
                        model      : User,
                        as         : 'updater',
                        attributes : ['id', 'name', 'email']
                    }
                ],
                distinct : true
            });
            res.status(200).json({
                success  : true,
                data     : rows,
                total    : count,
                page     : pageNum,
                limit    : limitNum
            });
        }catch(err){
            console.error('getUnit error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single unit by ID
    getUnitById: async (req, res) => {
        try{
            const { id } = req.params;
            const unit   = await Unit.findByPk(id, {
                include: [
                    {
                        model      : User,
                        as         : 'creator',
                        attributes : ['id', 'name', 'email']
                    },
                    {
                        model      : User,
                        as         : 'updater',
                        attributes : ['id', 'name', 'email']
                    }
                ]
            });
            if(!unit){
                return res.status(404).json({
                    success : false,
                    message : 'Unit not found'
                });
            }
            res.status(200).json({
                success : true,
                data    : unit
            });
        }catch(err){
            console.error('getUnitById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch unit'
            });
        }
    },

    // Create a unit
    createUnit: async (req, res) => {
        const transaction = await Unit.sequelize.transaction();
        try{
            const { name, status } = req.body;
            const userId = req.user?.id; // Assuming you have authentication middleware
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Name is required';
            }else if(name.trim().length > 255){
                errors.name = 'Name must not exceed 255 characters';
            }else{
                // Check for duplicate name
                const existingUnit = await Unit.findOne({
                    where: { name: name.trim() },
                    transaction
                });
                if(existingUnit){
                    errors.name = 'Unit name already exists';
                }
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const unitData = {
                name       : name.trim(),
                status     : status !== undefined ? Number(status) : 1,
                created_by : userId,
                updated_by : userId,
                created_at : new Date(),
                updated_at : new Date()
            };
            await Unit.create(unitData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Unit created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createUnit error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a unit
    updateUnit: async (req, res) => {
        const transaction = await Unit.sequelize.transaction();
        try{
            const { id } = req.params;
            const { name, status } = req.body;
            const userId = req.user?.id; // Assuming you have authentication middleware
            // Check if unit exists
            const unit = await Unit.findByPk(id, { transaction });
            if(!unit){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Unit not found'
                });
            }
            const errors = {};
            // Name validation
            if(name !== undefined){
                if(!name || !name.trim()){
                    errors.name = 'Name cannot be empty';
                }else if(name.trim().length > 255){
                    errors.name = 'Name must not exceed 255 characters';
                }else{
                    // Check for duplicate name (excluding current unit)
                    const existingUnit = await Unit.findOne({
                        where: {
                            name: name.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if(existingUnit){
                        errors.name = 'Unit name already exists';
                    }
                }
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData = { 
                updated_by : userId,
                updated_at : new Date() 
            };
            if(name !== undefined) updateData.name = name.trim();
            if(status !== undefined) updateData.status = Number(status);
            await unit.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Unit updated successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateUnit error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete a unit (hard delete)
    deleteUnit: async (req, res) => {
        const transaction = await Unit.sequelize.transaction();
        try{
            const { id } = req.params;
            const unit = await Unit.findByPk(id, { transaction });
            if(!unit){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Unit not found'
                });
            }
            await unit.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Unit deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteUnit error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete unit'
            });
        }
    },

    // Get all units (for dropdown/select purposes)
    getUnits: async (req, res) => {
        try{
            const units = await Unit.findAll({
                where: { status: 1 }, // Only active units
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: units
            });
        }catch(err){
            console.error('getUnits error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch units'
            });
        }
    }
};

module.exports = unitController;