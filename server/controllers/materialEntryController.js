const { MaterialEntry, Material, Vendor, Site, User } = require('../models');
const { Op } = require('sequelize');

const materialEntryController = {

    // Get all material entries with pagination, search, filters
    getMaterialEntries: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                status = '',
                material_id = '',
                vendor_id = '',
                site_id = '',
                date_from = '',
                date_to = '',
                sort = 'date',
                order = 'desc',
            } = req.query;

            const pageNum = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }

            const validSortFields = ['date', 'site_id', 'material_id', 'vendor_id', 'quantity', 'rate', 'additional_charges', 'created_at'];
            const sortField = validSortFields.includes(sort) ? sort : 'date';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const whereClause = {};

            if (status === '1' || status === '0') {
                whereClause.status = Number(status);
            }
            if (material_id) {
                whereClause.material_id = material_id;
            }
            if (vendor_id) {
                whereClause.vendor_id = vendor_id;
            }
            if (site_id) {
                whereClause.site_id = site_id;
            }
            if (date_from || date_to) {
                whereClause.date = {};
                if (date_from) whereClause.date[Op.gte] = new Date(date_from);
                if (date_to) whereClause.date[Op.lte] = new Date(date_to);
            }

            const { rows, count } = await MaterialEntry.findAndCountAll({
                where: whereClause,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                include: [
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'full_address'],
                        where: search ? { name: { [Op.like]: `%${search}%` } } : undefined,
                        required: false
                    },
                    {
                        model: Material,
                        as: 'material',
                        attributes: ['id', 'name', 'standard_rate', 'unit_id'],
                        include: [{
                            model: require('../models').Unit,
                            as: 'unit',
                            attributes: ['id', 'name']
                        }],
                        where: search ? { name: { [Op.like]: `%${search}%` } } : undefined,
                        required: false
                    },
                    {
                        model: Vendor,
                        as: 'vendor',
                        attributes: ['id', 'name'],
                        required: false
                    },
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
                distinct: true
            });

            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: limitNum
            });
        } catch (err) {
            console.error('getMaterialEntries error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single entry by ID
    getMaterialEntryById: async (req, res) => {
        try {
            const { id } = req.params;
            const entry = await MaterialEntry.findByPk(id, {
                include: [
                    { 
                        model: Site, 
                        as: 'site', 
                        attributes: ['id', 'name', 'full_address'] 
                    },
                    { 
                        model: Material, 
                        as: 'material', 
                        include: [{ 
                            model: require('../models').Unit, 
                            as: 'unit' 
                        }] 
                    },
                    { 
                        model: Vendor, 
                        as: 'vendor', 
                        attributes: ['id', 'name'], 
                        required: false 
                    },
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

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message: 'Material entry not found'
                });
            }

            res.status(200).json({
                success: true,
                data: entry
            });
        } catch (err) {
            console.error('getMaterialEntryById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch material entry'
            });
        }
    },

    // Create material entry
    createMaterialEntry: async (req, res) => {
        const transaction = await MaterialEntry.sequelize.transaction();
        try {
            const {
                site_id,
                material_id,
                vendor_id,
                date,
                quantity,
                rate,
                additional_charges = 0,
                debit_entry,
                credit_entry,
                status
            } = req.body;

            const userId = req.user?.id;
            const errors = {};

            // Site validation
            if (!site_id) {
                errors.site_id = 'Site is required';
            } else {
                const site = await Site.findByPk(site_id, { transaction });
                if (!site) {
                    errors.site_id = 'Selected site does not exist';
                } else if (!site.is_active) {
                    errors.site_id = 'Selected site is inactive';
                }
            }

            // Material validation
            if (!material_id) {
                errors.material_id = 'Material is required';
            } else {
                const material = await Material.findByPk(material_id, { transaction });
                if (!material) {
                    errors.material_id = 'Selected material does not exist';
                } else if (material.status === 0) {
                    errors.material_id = 'Selected material is inactive';
                }
            }

            // Vendor optional - only validate if provided
            if (vendor_id !== undefined && vendor_id !== null && vendor_id !== '') {
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if (!vendor) {
                    errors.vendor_id = 'Selected vendor does not exist';
                } else if (!vendor.is_active) {
                    errors.vendor_id = 'Selected vendor is inactive';
                }
            }

            // Date validation
            if (!date) {
                errors.date = 'Date is required';
            } else {
                const entryDate = new Date(date);
                if (isNaN(entryDate.getTime())) {
                    errors.date = 'Invalid date format';
                }
            }

            // Quantity validation
            if (quantity === undefined || quantity === null || quantity === '') {
                errors.quantity = 'Quantity is required';
            } else if (isNaN(quantity) || Number(quantity) <= 0) {
                errors.quantity = 'Quantity must be greater than 0';
            }

            // Rate validation
            if (rate === undefined || rate === null || rate === '') {
                errors.rate = 'Rate is required';
            } else if (isNaN(rate) || Number(rate) < 0) {
                errors.rate = 'Rate must be a positive number';
            }

            // Additional charges
            if (additional_charges !== undefined) {
                if (isNaN(additional_charges) || Number(additional_charges) < 0) {
                    errors.additional_charges = 'Additional charges must be ≥ 0';
                }
            }

            // Debit entry validation
            if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                if (isNaN(debit_entry) || Number(debit_entry) < 0) {
                    errors.debit_entry = 'Debit entry must be a positive number';
                } else if (Number(debit_entry) > 99999999.99) {
                    errors.debit_entry = 'Debit entry is too large';
                }
            }

            // Credit entry validation
            if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                if (isNaN(credit_entry) || Number(credit_entry) < 0) {
                    errors.credit_entry = 'Credit entry must be a positive number';
                } else if (Number(credit_entry) > 99999999.99) {
                    errors.credit_entry = 'Credit entry is too large';
                }
            }

            // Status
            if (status !== undefined && ![0, 1].includes(Number(status))) {
                errors.status = 'Status must be 0 or 1';
            }

            // Total calculation validation
            const totalAmount = calculateTotalAmount(quantity, rate, additional_charges);
            const debitAmount = Number(debit_entry || 0);
            const creditAmount = Number(credit_entry || 0);
            const sum = parseFloat((debitAmount + creditAmount).toFixed(2));

            if (Math.abs(sum - totalAmount) > 0.01) {
                errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const entryData = {
                site_id,
                material_id,
                vendor_id: vendor_id || null,
                date: new Date(date),
                quantity: Number(quantity),
                rate: Number(rate).toFixed(2),
                additional_charges: Number(additional_charges || 0).toFixed(2),
                debit_entry: debit_entry ? Number(debit_entry).toFixed(2) : 0.00,
                credit_entry: credit_entry ? Number(credit_entry).toFixed(2) : 0.00,
                status: status !== undefined ? Number(status) : 1,
                created_by: userId,
                updated_by: userId
            };

            await MaterialEntry.create(entryData, { transaction });
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: 'Material entry created successfully'
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createMaterialEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update material entry
    updateMaterialEntry: async (req, res) => {
        const transaction = await MaterialEntry.sequelize.transaction();
        try {
            const { id } = req.params;
            const {
                site_id,
                material_id,
                vendor_id,
                date,
                quantity,
                rate,
                additional_charges,
                debit_entry,
                credit_entry,
                status
            } = req.body;
            const userId = req.user?.id;
            const entry = await MaterialEntry.findByPk(id, { transaction });
            
            if (!entry) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Material entry not found'
                });
            }
            
            const errors = {};

            // Site validation
            if (site_id !== undefined) {
                if (!site_id) {
                    errors.site_id = 'Site cannot be empty';
                } else {
                    const site = await Site.findByPk(site_id, { transaction });
                    if (!site) {
                        errors.site_id = 'Selected site does not exist';
                    } else if (!site.is_active) {
                        errors.site_id = 'Selected site is inactive';
                    }
                }
            }

            // Material validation
            if (material_id !== undefined) {
                if (!material_id) {
                    errors.material_id = 'Material cannot be empty';
                } else {
                    const material = await Material.findByPk(material_id, { transaction });
                    if (!material) errors.material_id = 'Selected material does not exist';
                    else if (material.status === 0) errors.material_id = 'Selected material is inactive';
                }
            }

            // Vendor validation
            if (vendor_id !== undefined) {
                if (vendor_id !== null && vendor_id !== '') {
                    const vendor = await Vendor.findByPk(vendor_id, { transaction });
                    if (!vendor) {
                        errors.vendor_id = 'Selected vendor does not exist';
                    } else if (!vendor.is_active) {
                        errors.vendor_id = 'Selected vendor is inactive';
                    }
                }
            }

            // Date validation
            if (date !== undefined) {
                if (!date) {
                    errors.date = 'Date cannot be empty';
                } else {
                    const d = new Date(date);
                    if (isNaN(d.getTime())) errors.date = 'Invalid date format';
                }
            }

            // Quantity validation
            if (quantity !== undefined) {
                if (quantity === null || quantity === '' || isNaN(quantity) || Number(quantity) <= 0) {
                    errors.quantity = 'Quantity must be greater than 0';
                }
            }

            // Rate validation
            if (rate !== undefined) {
                if (rate === null || rate === '' || isNaN(rate) || Number(rate) < 0) {
                    errors.rate = 'Rate must be a positive number';
                }
            }

            // Additional charges validation
            if (additional_charges !== undefined) {
                if (isNaN(additional_charges) || Number(additional_charges) < 0) {
                    errors.additional_charges = 'Additional charges must be ≥ 0';
                }
            }

            // Debit entry validation
            if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                if (isNaN(debit_entry) || Number(debit_entry) < 0) {
                    errors.debit_entry = 'Debit entry must be a positive number';
                } else if (Number(debit_entry) > 99999999.99) {
                    errors.debit_entry = 'Debit entry is too large';
                }
            }

            // Credit entry validation
            if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                if (isNaN(credit_entry) || Number(credit_entry) < 0) {
                    errors.credit_entry = 'Credit entry must be a positive number';
                } else if (Number(credit_entry) > 99999999.99) {
                    errors.credit_entry = 'Credit entry is too large';
                }
            }

            // Status validation
            if (status !== undefined && ![0, 1].includes(Number(status))) {
                errors.status = 'Status must be 0 or 1';
            }

            // Total calculation validation for update
            const finalQuantity = quantity !== undefined ? Number(quantity) : Number(entry.quantity);
            const finalRate = rate !== undefined ? Number(rate) : Number(entry.rate);
            const finalCharges = additional_charges !== undefined ? Number(additional_charges) : Number(entry.additional_charges);
            const totalAmount = calculateTotalAmount(finalQuantity, finalRate, finalCharges);
            const finalDebit = debit_entry !== undefined ? (debit_entry ? Number(debit_entry) : 0) : Number(entry.debit_entry);
            const finalCredit = credit_entry !== undefined ? (credit_entry ? Number(credit_entry) : 0) : Number(entry.credit_entry);
            const sum = parseFloat((finalDebit + finalCredit).toFixed(2));

            if (Math.abs(sum - totalAmount) > 0.01) {
                errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const updateData = { updated_by: userId, updated_at: new Date() };
            if (site_id !== undefined) updateData.site_id = site_id;
            if (material_id !== undefined) updateData.material_id = material_id;
            if (vendor_id !== undefined) updateData.vendor_id = vendor_id || null;
            if (date !== undefined) updateData.date = new Date(date);
            if (quantity !== undefined) updateData.quantity = Number(quantity);
            if (rate !== undefined) updateData.rate = Number(rate).toFixed(2);
            if (additional_charges !== undefined) updateData.additional_charges = Number(additional_charges || 0).toFixed(2);
            if (debit_entry !== undefined) updateData.debit_entry = debit_entry ? Number(debit_entry).toFixed(2) : 0.00;
            if (credit_entry !== undefined) updateData.credit_entry = credit_entry ? Number(credit_entry).toFixed(2) : 0.00;
            if (status !== undefined) updateData.status = Number(status);

            await entry.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Material entry updated successfully'
            });
        } catch (err) {
            await transaction.rollback();
            console.error('updateMaterialEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete entry
    deleteMaterialEntry: async (req, res) => {
        const transaction = await MaterialEntry.sequelize.transaction();
        try {
            const { id } = req.params;
            const entry = await MaterialEntry.findByPk(id, { transaction });
            
            if (!entry) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Material entry not found'
                });
            }
            
            await entry.destroy({ transaction });
            await transaction.commit();
            
            res.status(200).json({
                success: true,
                message: 'Material entry deleted successfully'
            });
        } catch (err) {
            await transaction.rollback();
            console.error('deleteMaterialEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete material entry'
            });
        }
    },

    // Get active materials for dropdown
    getActiveMaterials: async (req, res) => {
        try {
            const materials = await Material.findAll({
                where: { status: 1 },
                attributes: ['id', 'name', 'standard_rate'],
                include: [{
                    model: require('../models').Unit,
                    as: 'unit',
                    attributes: ['name']
                }],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: materials
            });
        } catch (err) {
            console.error('getActiveMaterials error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch materials'
            });
        }
    },

    // Get active vendors for dropdown
    getActiveVendors: async (req, res) => {
        try {
            const vendors = await Vendor.findAll({
                where: { is_active: 1 },
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: vendors
            });
        } catch (err) {
            console.error('getActiveVendors error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vendors'
            });
        }
    },

    // Get active sites for dropdown
    getActiveSites: async (req, res) => {
        try {
            const sites = await Site.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'full_address'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: sites
            });
        } catch (err) {
            console.error('getActiveSites error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sites'
            });
        }
    }
};

// Helper Function
const calculateTotalAmount = (quantity, rate, additional_charges) => {
    const qty = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    const charges = parseFloat(additional_charges) || 0;
    return qty * r + charges;
};

module.exports = materialEntryController;