const { LabourEntry, Labour, Vendor, Site, User } = require('../models');
const { Op } = require('sequelize');
const labourEntryController = {
    
    // Get all labour entries with pagination, search, and filters
    getLabourEntries: async (req, res) => {
        try{
            const{
                page       = 1,
                limit      = 10,
                search     = '',
                status     = '',
                labour_id  = '',
                site_id    = '',
                date_from  = '',
                date_to    = '',
                vendor_id  = '',
                sort       = 'date',
                order      = 'desc',
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
            const validSortFields = ['date', 'site_id', 'labour_id', 'no_of_workers', 'rate_per_worker', 'debit_entry', 'credit_entry', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'date';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            // Build where clause
            const whereClause = {};
            if(status === '1' || status === '0'){
                whereClause.status = Number(status);
            }
            if(labour_id){
                whereClause.labour_id = labour_id;
            }
            if(vendor_id){
                whereClause.vendor_id = vendor_id;
            }
            if(site_id){
                whereClause.site_id = site_id;
            }
            if(date_from || date_to){
                whereClause.date = {};
                if(date_from){
                    whereClause.date[Op.gte] = new Date(date_from);
                }
                if(date_to){
                    whereClause.date[Op.lte] = new Date(date_to);
                }
            }
            // Build include array for search
            const includeArray = [
                {
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name', 'full_address'],
                    where: search ? {
                        name: { [Op.like]: `%${search}%` }
                    } : undefined,
                    required: search ? true : false
                },
                {
                    model: Labour,
                    as: 'labour',
                    attributes: ['id', 'name', 'standard_rate'],
                    where: search ? {
                        name: { [Op.like]: `%${search}%` }
                    } : undefined,
                    required: false
                },
                {
                    model: Vendor,
                    as: 'vendor',
                    attributes: ['id', 'name'],
                    where: vendor_id ? { id: vendor_id } : undefined,
                    required: vendor_id ? true : false
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
            ];
            const { rows, count } = await LabourEntry.findAndCountAll({
                where: whereClause,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                include: includeArray,
                distinct: true
            });
            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: limitNum
            });
        }catch(err){
            console.error('getLabourEntries error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Get single labour entry by ID
    getLabourEntryById: async (req, res) => {
        try{
            const { id }      = req.params;
            const labourEntry = await LabourEntry.findByPk(id, {
                include: [
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'full_address']
                    },
                    {
                        model: Labour,
                        as: 'labour',
                        attributes: ['id', 'name', 'standard_rate']
                    },
                    {
                        model: Vendor,
                        as: 'vendor',
                        attributes: ['id', 'name']
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
            if(!labourEntry){
                return res.status(404).json({
                    success: false,
                    message: 'Labour entry not found'
                });
            }
            res.status(200).json({
                success: true,
                data: labourEntry
            });
        }catch(err){
            console.error('getLabourEntryById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch labour entry'
            });
        }
    },

    // Create a labour entry
    createLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try{
            const { site_id, labour_id, vendor_id, date, no_of_workers, rate_per_worker, debit_entry, credit_entry, status } = req.body;
            const userId = req.user?.id;
            const errors = {};
            // Site ID validation
            if(!site_id){
                errors.site_id = 'Site is required';
            }else{
                const site = await Site.findByPk(site_id, { transaction });
                if(!site){
                    errors.site_id = 'Selected site does not exist';
                }else 
                if(!site.is_active){
                    errors.site_id = 'Selected site is inactive';
                }
            }
            // Labour ID validation
            if(!labour_id){
                errors.labour_id = 'Labour is required';
            }else{
                const labour = await Labour.findByPk(labour_id, { transaction });
                if(!labour){
                    errors.labour_id = 'Selected labour does not exist';
                }else
                if(labour.status === 0){
                    errors.labour_id = 'Selected labour is inactive';
                }
            }
            // Vendor ID validation
            if(!vendor_id){
                errors.vendor_id = 'Vendor is required';
            }else{
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if(!vendor){
                    errors.vendor_id = 'Selected vendor does not exist';
                }else
                if(vendor.status === 0){
                    errors.vendor_id = 'Selected vendor is inactive';
                }
            }
            // Date validation
            if(!date){
                errors.date = 'Date is required';
            }else{
                const entryDate = new Date(date);
                if(isNaN(entryDate.getTime())){
                    errors.date = 'Invalid date format';
                }
            }
            // No of workers validation
            if(no_of_workers === undefined || no_of_workers === null || no_of_workers === ''){
                errors.no_of_workers   = 'Number of workers is required';
            }else 
            if(isNaN(no_of_workers) || Number(no_of_workers) < 0){
                errors.no_of_workers   = 'Number of workers must be a positive number';
            }else 
            if(!Number.isInteger(Number(no_of_workers))){
                errors.no_of_workers   = 'Number of workers must be a whole number';
            }else 
            if(Number(no_of_workers) > 99999){
                errors.no_of_workers   = 'Number of workers is too large';
            }
            // Rate per worker validation
            if(rate_per_worker === undefined || rate_per_worker === null || rate_per_worker === ''){
                errors.rate_per_worker = 'Rate per worker is required';
            }else 
            if(isNaN(rate_per_worker) || Number(rate_per_worker) < 0){
                errors.rate_per_worker = 'Rate per worker must be a positive number';
            }else 
            if(Number(rate_per_worker) > 99999999.99){
                errors.rate_per_worker = 'Rate per worker is too large';
            }
            // Debit entry validation
            if(debit_entry !== undefined && debit_entry !== null && debit_entry !== ''){
                if(isNaN(debit_entry) || Number(debit_entry) < 0){
                    errors.debit_entry = 'Debit entry must be a positive number';
                }else 
                if(Number(debit_entry) > 99999999.99){
                    errors.debit_entry = 'Debit entry is too large';
                }
            }
            // Credit entry validation
            if(credit_entry !== undefined && credit_entry !== null && credit_entry !== ''){
                if(isNaN(credit_entry) || Number(credit_entry) < 0){
                    errors.credit_entry = 'Credit entry must be a positive number';
                }else 
                if(Number(credit_entry) > 99999999.99){
                    errors.credit_entry = 'Credit entry is too large';
                }
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            // Total calculation validation
            const totalAmount  = calculateTotalAmount(no_of_workers, rate_per_worker);
            const debitAmount  = Number(debit_entry || 0);
            const creditAmount = Number(credit_entry || 0);
            const sum          = parseFloat((debitAmount + creditAmount).toFixed(2));
            if(Math.abs(sum - totalAmount) > 0.01){
                errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const labourEntryData = {
                site_id           : site_id,
                labour_id         : labour_id,
                vendor_id         : vendor_id,
                date              : new Date(date),
                no_of_workers     : Number(no_of_workers),
                rate_per_worker   : Number(rate_per_worker).toFixed(2),
                debit_entry       : debit_entry ? Number(debit_entry).toFixed(2) : 0.00,
                credit_entry      : credit_entry ? Number(credit_entry).toFixed(2) : 0.00,
                status            : status !== undefined ? Number(status) : 1,
                created_by        : userId,
                updated_by        : userId,
                created_at        : new Date(),
                updated_at        : new Date()
            };
            await LabourEntry.create(labourEntryData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Labour entry created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createLabourEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Update a labour entry
    updateLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try{
            const { id } = req.params;
            const { site_id, labour_id, vendor_id, date, no_of_workers, rate_per_worker, debit_entry, credit_entry, status } = req.body;
            const userId = req.user?.id;
            // Check if labour entry exists
            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if(!labourEntry){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Labour entry not found'
                });
            }
            const errors = {};
            // Site ID validation
            if(site_id !== undefined){
                if(!site_id){
                    errors.site_id = 'Site cannot be empty';
                }else{
                    const site = await Site.findByPk(site_id, { transaction });
                    if(!site){
                        errors.site_id = 'Selected site does not exist';
                    }else 
                    if(!site.is_active){
                        errors.site_id = 'Selected site is inactive';
                    }
                }
            }
            // Labour ID validation
            if(labour_id !== undefined){
                if(!labour_id){
                    errors.labour_id = 'Labour cannot be empty';
                }else{
                    const labour = await Labour.findByPk(labour_id, { transaction });
                    if(!labour){
                        errors.labour_id = 'Selected labour does not exist';
                    }else 
                    if(labour.status === 0){
                        errors.labour_id = 'Selected labour is inactive';
                    }
                }
            }
            // Vendor ID validation
            if(vendor_id !== undefined){
                if(!vendor_id){
                    errors.vendor_id = 'Vendor cannot be empty';
                }else{
                    const vendor = await Vendor.findByPk(vendor_id, { transaction });
                    if(!vendor){
                        errors.vendor_id = 'Selected vendor does not exist';
                    }else 
                    if(vendor.status === 0){
                        errors.vendor_id = 'Selected vendor is inactive';
                    }
                }
            }
            // Date validation
            if(date !== undefined){
                if(!date){
                    errors.date = 'Date cannot be empty';
                }else{
                    const entryDate = new Date(date);
                    if(isNaN(entryDate.getTime())){
                        errors.date = 'Invalid date format';
                    }
                }
            }
            // No of workers validation
            if(no_of_workers !== undefined) {
                if(no_of_workers === null || no_of_workers === ''){
                    errors.no_of_workers = 'Number of workers cannot be empty';
                }else 
                if(isNaN(no_of_workers) || Number(no_of_workers) < 0){
                    errors.no_of_workers = 'Number of workers must be a positive number';
                }else 
                if(!Number.isInteger(Number(no_of_workers))){
                    errors.no_of_workers = 'Number of workers must be a whole number';
                }else 
                if(Number(no_of_workers) > 99999){
                    errors.no_of_workers = 'Number of workers is too large';
                }
            }
            // Rate per worker validation
            if(rate_per_worker !== undefined){
                if(rate_per_worker === null || rate_per_worker === ''){
                    errors.rate_per_worker = 'Rate per worker cannot be empty';
                }else 
                if(isNaN(rate_per_worker) || Number(rate_per_worker) < 0){
                    errors.rate_per_worker = 'Rate per worker must be a positive number';
                }else 
                if(Number(rate_per_worker) > 99999999.99){
                    errors.rate_per_worker = 'Rate per worker is too large';
                }
            }
            // Debit entry validation
            if(debit_entry !== undefined && debit_entry !== null && debit_entry !== ''){
                if(isNaN(debit_entry) || Number(debit_entry) < 0){
                    errors.debit_entry = 'Debit entry must be a positive number';
                }else 
                if(Number(debit_entry) > 99999999.99){
                    errors.debit_entry = 'Debit entry is too large';
                }
            }
            // Credit entry validation
            if(credit_entry !== undefined && credit_entry !== null && credit_entry !== ''){
                if(isNaN(credit_entry) || Number(credit_entry) < 0){
                    errors.credit_entry = 'Credit entry must be a positive number';
                }else 
                if(Number(credit_entry) > 99999999.99){
                    errors.credit_entry = 'Credit entry is too large';
                }
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            // Total calculation validation for update
            const finalNoOfWorkers   = no_of_workers !== undefined ? Number(no_of_workers) : Number(labourEntry.no_of_workers);
            const finalRatePerWorker = rate_per_worker !== undefined ? Number(rate_per_worker) : Number(labourEntry.rate_per_worker);
            const totalAmount        = calculateTotalAmount(finalNoOfWorkers, finalRatePerWorker);
            const finalDebit         = debit_entry !== undefined ? (debit_entry ? Number(debit_entry) : 0) : Number(labourEntry.debit_entry);
            const finalCredit        = credit_entry !== undefined ? (credit_entry ? Number(credit_entry) : 0) : Number(labourEntry.credit_entry);
            const sum                = parseFloat((finalDebit + finalCredit).toFixed(2));
            if(Math.abs(sum - totalAmount) > 0.01){
                errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
            }
            // Allow small floating point differences (0.01)
            if(Math.abs(sum - totalAmount) > 0.01){
                errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit (₹${finalDebit.toFixed(2)}) + Credit (₹${finalCredit.toFixed(2)}). Current sum: ₹${sum.toFixed(2)}`;
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
                updated_by: userId,
                updated_at: new Date()
            };
            if(site_id !== undefined) updateData.site_id                 = site_id;
            if(labour_id !== undefined) updateData.labour_id             = labour_id;
            if(vendor_id !== undefined) updateData.vendor_id             = vendor_id;
            if(date !== undefined) updateData.date                       = new Date(date);
            if(no_of_workers !== undefined) updateData.no_of_workers     = Number(no_of_workers);
            if(rate_per_worker !== undefined) updateData.rate_per_worker = Number(rate_per_worker).toFixed(2);
            if(debit_entry !== undefined) updateData.debit_entry         = debit_entry ? Number(debit_entry).toFixed(2) : 0.00;
            if(credit_entry !== undefined) updateData.credit_entry       = credit_entry ? Number(credit_entry).toFixed(2) : 0.00;
            if(status !== undefined) updateData.status                   = Number(status);
            await labourEntry.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Labour entry updated successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateLabourEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Delete a labour entry
    deleteLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try{
            const { id }      = req.params;
            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if(!labourEntry){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Labour entry not found'
                });
            }
            await labourEntry.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Labour entry deleted successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteLabourEntry error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete labour entry'
            });
        }
    },

    // Get active labours for dropdown
    getActiveLabours: async (req, res) => {
        try{
            const labours = await Labour.findAll({
                where: { status: 1 },
                attributes: ['id', 'name', 'standard_rate'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: labours
            });
        } catch (err) {
            console.error('getActiveLabours error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch labours'
            });
        }
    },

    // Get active sites for dropdown
    getActiveSites: async (req, res) => {
        try{
            const sites = await Site.findAll({
                where: { is_active: true },
                attributes: ['id', 'name', 'full_address'],
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                data: sites
            });
        }catch(err){
            console.error('getActiveSites error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sites'
            });
        }
    }
};

// Helper Function
const calculateTotalAmount   = (no_of_workers, rate_per_worker) => {
  const workers              = parseFloat(no_of_workers) || 0;
  const rate                 = parseFloat(rate_per_worker) || 0;
  return parseFloat((workers * rate).toFixed(2));
};

module.exports = labourEntryController;