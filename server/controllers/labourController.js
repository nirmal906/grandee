const { Labour, User } = require('../models');
const { Op }                 = require('sequelize');
const labourController = {
    
    // Get all labours with pagination, search, and filters
    getLabours: async (req, res) => {
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
            const validSortFields = ['name', 'standard_rate', 'status', 'created_at', 'updated_at'];
            const validOrder = ['asc', 'desc'];
            const sortField  = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder  = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            // Build where clause for labours
            const whereClause = {};
            if(search){
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === '1' || status === '0'){
                whereClause.status = Number(status);
            }
            // Fetch labours with pagination
            const { rows, count } = await Labour.findAndCountAll({
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
            console.error('getLabours error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single labour by ID
    getLabourById: async (req, res) => {
        try{
            const { id } = req.params;
            const labour = await Labour.findByPk(id, {
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
            if(!labour){
                return res.status(404).json({
                    success : false,
                    message : 'Labour not found'
                });
            }
            res.status(200).json({
                success : true,
                data    : labour
            });
        }catch(err){
            console.error('getLabourById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch labour'
            });
        }
    },

    // Create a labour
    createLabour: async (req, res) => {
        const transaction = await Labour.sequelize.transaction();
        try{
            const { name, standard_rate, status } = req.body;
            const userId = req.user?.id;
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Name is required';
            }else if(name.trim().length > 255){
                errors.name = 'Name must not exceed 255 characters';
            }else{
                // Check for duplicate name
                const existingLabour = await Labour.findOne({
                    where: { name: name.trim() },
                    transaction
                });
                if(existingLabour){
                    errors.name = 'Labour name already exists';
                }
            }
            // Standard rate validation
            if(standard_rate === undefined || standard_rate === null || standard_rate === ''){
                errors.standard_rate = 'Standard rate is required';
            }else if(isNaN(standard_rate) || Number(standard_rate) < 0){
                errors.standard_rate = 'Standard rate must be a positive number';
            }else if(Number(standard_rate) > 99999999.99){
                errors.standard_rate = 'Standard rate is too large';
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
            const labourData = {
                name           : name.trim(),
                standard_rate  : Number(standard_rate).toFixed(2),
                status         : status !== undefined ? Number(status) : 1,
                created_by     : userId,
                updated_by     : userId,
                created_at     : new Date(),
                updated_at     : new Date()
            };
            await Labour.create(labourData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Labour created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createLabour error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a labour
    updateLabour: async (req, res) => {
        const transaction = await Labour.sequelize.transaction();
        try{
            const { id } = req.params;
            const { name, standard_rate, status } = req.body;
            const userId = req.user?.id;
            // Check if labour exists
            const labour = await Labour.findByPk(id, { transaction });
            if(!labour){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Labour not found'
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
                    // Check for duplicate name (excluding current labour)
                    const existingLabour = await Labour.findOne({
                        where: {
                            name: name.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if(existingLabour){
                        errors.name = 'Labour name already exists';
                    }
                }
            }
            // Standard rate validation
            if(standard_rate !== undefined){
                if(standard_rate === null || standard_rate === ''){
                    errors.standard_rate = 'Standard rate cannot be empty';
                }else if(isNaN(standard_rate) || Number(standard_rate) < 0){
                    errors.standard_rate = 'Standard rate must be a positive number';
                }else if(Number(standard_rate) > 99999999.99){
                    errors.standard_rate = 'Standard rate is too large';
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
            if(standard_rate !== undefined) updateData.standard_rate = Number(standard_rate).toFixed(2);
            if(status !== undefined) updateData.status = Number(status);
            await labour.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Labour updated successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateLabour error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete a labour (hard delete)
    deleteLabour: async (req, res) => {
        const transaction = await Labour.sequelize.transaction();
        try{
            const { id } = req.params;
            const labour = await Labour.findByPk(id, { transaction });
            
            if(!labour){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Labour not found'
                });
            }
            
            await labour.destroy({ transaction });
            await transaction.commit();
            
            res.status(200).json({
                success: true,
                message: 'Labour deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteLabour error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete labour'
            });
        }
    }
};

module.exports = labourController;