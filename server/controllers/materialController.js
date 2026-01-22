const { Material, Unit, User } = require('../models');
const { Op }                   = require('sequelize');
const materialController       = {
    
    // Get all materials with pagination, search, and filters
    getMaterials: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                unit   = '',
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
            // Build where clause for materials
            const whereClause = {};
            if(search){
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === '1' || status === '0'){
                whereClause.status = Number(status);
            }
            if(unit){
                whereClause.unit_id = unit;
            }
            // Fetch materials with pagination
            const { rows, count } = await Material.findAndCountAll({
                where    : whereClause,
                order    : [[sortField, sortOrder]],
                limit    : limitNum,
                offset   : (pageNum - 1) * limitNum,
                include  : [
                    {
                        model      : Unit,
                        as         : 'unit',
                        attributes : ['id', 'name']
                    },
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
            console.error('getMaterials error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single material by ID
    getMaterialById: async (req, res) => {
        try{
            const { id } = req.params;
            const material = await Material.findByPk(id, {
                include: [
                    {
                        model      : Unit,
                        as         : 'unit',
                        attributes : ['id', 'name']
                    },
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
            if(!material){
                return res.status(404).json({
                    success : false,
                    message : 'Material not found'
                });
            }
            res.status(200).json({
                success : true,
                data    : material
            });
        }catch(err){
            console.error('getMaterialById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch material'
            });
        }
    },

    // Create a material
    createMaterial: async (req, res) => {
        const transaction = await Material.sequelize.transaction();
        try{
            const { name, unit_id, standard_rate, status } = req.body;
            const userId = req.user?.id; // From auth middleware
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Name is required';
            }else if(name.trim().length > 255){
                errors.name = 'Name must not exceed 255 characters';
            }else{
                // Check for duplicate name
                const existingMaterial = await Material.findOne({
                    where: { name: name.trim() },
                    transaction
                });
                if(existingMaterial){
                    errors.name = 'Material name already exists';
                }
            }
            // Unit validation
            if(!unit_id){
                errors.unit_id = 'Unit is required';
            }else{
                const unitExists = await Unit.findByPk(unit_id, { transaction });
                if(!unitExists){
                    errors.unit_id = 'Invalid unit selected';
                }else if(unitExists.status === 0){
                    errors.unit_id = 'Selected unit is inactive';
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
            const materialData = {
                name           : name.trim(),
                unit_id        : unit_id,
                standard_rate  : Number(standard_rate).toFixed(2),
                status         : status !== undefined ? Number(status) : 1,
                created_by     : userId,
                updated_by     : userId,
                created_at     : new Date(),
                updated_at     : new Date()
            };
            await Material.create(materialData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Material created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createMaterial error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a material
    updateMaterial: async (req, res) => {
        const transaction = await Material.sequelize.transaction();
        try{
            const { id } = req.params;
            const { name, unit_id, standard_rate, status } = req.body;
            const userId = req.user?.id;
            // Check if material exists
            const material = await Material.findByPk(id, { transaction });
            if(!material){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
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
                    // Check for duplicate name (excluding current material)
                    const existingMaterial = await Material.findOne({
                        where: {
                            name: name.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if(existingMaterial){
                        errors.name = 'Material name already exists';
                    }
                }
            }
            // Unit validation
            if(unit_id !== undefined){
                if(!unit_id){
                    errors.unit_id = 'Unit cannot be empty';
                }else{
                    const unitExists = await Unit.findByPk(unit_id, { transaction });
                    if(!unitExists){
                        errors.unit_id = 'Invalid unit selected';
                    }else if(unitExists.status === 0){
                        errors.unit_id = 'Selected unit is inactive';
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
            if(unit_id !== undefined) updateData.unit_id = unit_id;
            if(standard_rate !== undefined) updateData.standard_rate = Number(standard_rate).toFixed(2);
            if(status !== undefined) updateData.status = Number(status);
            await material.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Material updated successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateMaterial error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete a material (hard delete)
    deleteMaterial: async (req, res) => {
        const transaction = await Material.sequelize.transaction();
        try{
            const { id } = req.params;
            const material = await Material.findByPk(id, { transaction });
            if(!material){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }
            await material.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Material deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteMaterial error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete material'
            });
        }
    }
};
module.exports = materialController;