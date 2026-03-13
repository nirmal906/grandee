const { LabourEntry, Labour, Vendor, Site, User } = require('../models');
const { Op } = require('sequelize');

// Helper: check if user is admin or superadmin
const isAdminRole = (role) => ['admin', 'superadmin'].includes(role?.toLowerCase());

// Helper: safely extract user id from req.user
// Auth middleware sets req.user.userId (from JWT decoded.userId)
const getUserId = (req) => {
    const id = req.user?.userId ?? req.user?.id ?? null;
    return id !== undefined && id !== null ? Number(id) : null;
};

// Helper: calculate total
const calculateTotalAmount = (no_of_workers, rate_per_worker) => {
    const workers = parseFloat(no_of_workers) || 0;
    const rate    = parseFloat(rate_per_worker) || 0;
    return parseFloat((workers * rate).toFixed(2));
};

// Helper: common include array
const getIncludeArray = () => [
    { model: Site,   as: 'site',    attributes: ['id', 'name', 'full_address'] },
    { model: Labour, as: 'labour',  attributes: ['id', 'name', 'standard_rate'] },
    { model: Vendor, as: 'vendor',  attributes: ['id', 'name'] },
    { model: User,   as: 'creator', attributes: ['id', 'name', 'email'] },
    { model: User,   as: 'updater', attributes: ['id', 'name', 'email'] },
];

const labourEntryController = {

    // ─────────────────────────────────────────────
    // GET all labour entries (main transaction table)
    // Admin/Superadmin: sees approved entries + can filter by approval_status
    // Others: sees only their own entries (all approval statuses)
    // ─────────────────────────────────────────────
    getLabourEntries: async (req, res) => {
        try {
            const {
                page            = 1,
                limit           = 10,
                search          = '',
                status          = '',
                labour_id       = '',
                site_id         = '',
                date_from       = '',
                date_to         = '',
                vendor_id       = '',
                approval_status = '',
                sort            = 'date',
                order           = 'desc',
            } = req.query;

            const userRole = req.user?.role;
            const userId   = getUserId(req);
            const isAdmin  = isAdminRole(userRole);

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
            }

            const validSortFields = ['date', 'site_id', 'labour_id', 'no_of_workers', 'rate_per_worker', 'debit_entry', 'credit_entry', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'date';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            const whereClause = {};

            // Non-admin only sees their own entries
            if (!isAdmin) {
                if (!userId) {
                    return res.status(401).json({ success: false, message: 'Unauthorized: user not identified' });
                }
                whereClause.created_by = userId;
            } else {
                // Admin sees approved entries by default in main table
                // But can also filter
                if (approval_status) {
                    whereClause.approval_status = approval_status;
                } else {
                    whereClause.approval_status = 'approved';
                }
            }

            if (status === '1' || status === '0') whereClause.status = Number(status);
            if (labour_id)  whereClause.labour_id  = labour_id;
            if (vendor_id)  whereClause.vendor_id  = vendor_id;
            if (site_id)    whereClause.site_id    = site_id;

            if (date_from || date_to) {
                whereClause.date = {};
                if (date_from) whereClause.date[Op.gte] = new Date(date_from);
                if (date_to)   whereClause.date[Op.lte] = new Date(date_to);
            }

            const includeArray = [
                {
                    model:    Site,
                    as:       'site',
                    attributes: ['id', 'name', 'full_address'],
                    where:    search ? { name: { [Op.like]: `%${search}%` } } : undefined,
                    required: !!search,
                },
                {
                    model:    Labour,
                    as:       'labour',
                    attributes: ['id', 'name', 'standard_rate'],
                    where:    search ? { name: { [Op.like]: `%${search}%` } } : undefined,
                    required: false,
                },
                {
                    model:    Vendor,
                    as:       'vendor',
                    attributes: ['id', 'name'],
                    required: false,
                },
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'updater', attributes: ['id', 'name', 'email'] },
            ];

            const { rows, count } = await LabourEntry.findAndCountAll({
                where:    whereClause,
                order:    [[sortField, sortOrder]],
                limit:    limitNum,
                offset:   (pageNum - 1) * limitNum,
                include:  includeArray,
                distinct: true,
            });

            res.status(200).json({
                success: true,
                data:    rows,
                total:   count,
                page:    pageNum,
                limit:   limitNum,
            });
        } catch (err) {
            console.error('getLabourEntries error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // GET pending approvals (admin only)
    // ─────────────────────────────────────────────
    getPendingApprovals: async (req, res) => {
        try {
            const userRole = req.user?.role;
            if (!isAdminRole(userRole)) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const {
                page      = 1,
                limit     = 10,
                search    = '',
                site_id   = '',
                labour_id = '',
                date_from = '',
                date_to   = '',
            } = req.query;

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            const whereClause = { approval_status: 'pending' };

            if (site_id)   whereClause.site_id   = site_id;
            if (labour_id) whereClause.labour_id = labour_id;

            if (date_from || date_to) {
                whereClause.date = {};
                if (date_from) whereClause.date[Op.gte] = new Date(date_from);
                if (date_to)   whereClause.date[Op.lte] = new Date(date_to);
            }

            const includeArray = [
                {
                    model:    Site,
                    as:       'site',
                    attributes: ['id', 'name'],
                    where:    search ? { name: { [Op.like]: `%${search}%` } } : undefined,
                    required: !!search,
                },
                { model: Labour, as: 'labour',  attributes: ['id', 'name', 'standard_rate'], required: false },
                { model: Vendor, as: 'vendor',  attributes: ['id', 'name'], required: false },
                { model: User,   as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User,   as: 'updater', attributes: ['id', 'name', 'email'] },
            ];

            const { rows, count } = await LabourEntry.findAndCountAll({
                where:    whereClause,
                order:    [['date', 'DESC']],
                limit:    limitNum,
                offset:   (pageNum - 1) * limitNum,
                include:  includeArray,
                distinct: true,
            });

            res.status(200).json({ success: true, data: rows, total: count, page: pageNum, limit: limitNum });
        } catch (err) {
            console.error('getPendingApprovals error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // GET single entry by ID
    // ─────────────────────────────────────────────
    getLabourEntryById: async (req, res) => {
        try {
            const { id }      = req.params;
            const labourEntry = await LabourEntry.findByPk(id, { include: getIncludeArray() });

            if (!labourEntry) {
                return res.status(404).json({ success: false, message: 'Labour entry not found' });
            }
            res.status(200).json({ success: true, data: labourEntry });
        } catch (err) {
            console.error('getLabourEntryById error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch labour entry' });
        }
    },

    // ─────────────────────────────────────────────
    // CREATE labour entry
    // Admin/Superadmin: full fields, approval_status = approved
    // Others: site/vendor/labour/date/workers only, approval_status = pending
    // ─────────────────────────────────────────────
    createLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try {
            const { site_id, labour_id, vendor_id, date, no_of_workers, rate_per_worker, debit_entry, credit_entry, status } = req.body;
            const userId   = getUserId(req);
            const userRole = req.user?.role;
            const isAdmin  = isAdminRole(userRole);
            const errors   = {};

            // ── Common validations ──
            if (!site_id) {
                errors.site_id = 'Site is required';
            } else {
                const site = await Site.findByPk(site_id, { transaction });
                if (!site)          errors.site_id = 'Selected site does not exist';
                else if (!site.is_active) errors.site_id = 'Selected site is inactive';
            }

            if (!labour_id) {
                errors.labour_id = 'Labour is required';
            } else {
                const labour = await Labour.findByPk(labour_id, { transaction });
                if (!labour)              errors.labour_id = 'Selected labour does not exist';
                else if (labour.status === 0) errors.labour_id = 'Selected labour is inactive';
            }

            if (vendor_id) {
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if (!vendor)             errors.vendor_id = 'Selected vendor does not exist';
                else if (vendor.status === 0) errors.vendor_id = 'Selected vendor is inactive';
            }

            if (!date) {
                errors.date = 'Date is required';
            } else if (isNaN(new Date(date).getTime())) {
                errors.date = 'Invalid date format';
            }

            if (no_of_workers === undefined || no_of_workers === null || no_of_workers === '') {
                errors.no_of_workers = 'Number of workers is required';
            } else if (isNaN(no_of_workers) || Number(no_of_workers) < 0) {
                errors.no_of_workers = 'Number of workers must be a positive number';
            } else if (!Number.isInteger(Number(no_of_workers))) {
                errors.no_of_workers = 'Number of workers must be a whole number';
            } else if (Number(no_of_workers) > 99999) {
                errors.no_of_workers = 'Number of workers is too large';
            }

            // ── Admin-only field validations ──
            if (isAdmin) {
                if (rate_per_worker === undefined || rate_per_worker === null || rate_per_worker === '') {
                    errors.rate_per_worker = 'Rate per worker is required';
                } else if (isNaN(rate_per_worker) || Number(rate_per_worker) < 0) {
                    errors.rate_per_worker = 'Rate per worker must be a positive number';
                } else if (Number(rate_per_worker) > 99999999.99) {
                    errors.rate_per_worker = 'Rate per worker is too large';
                }

                if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                    if (isNaN(debit_entry) || Number(debit_entry) < 0) errors.debit_entry = 'Debit entry must be a positive number';
                    else if (Number(debit_entry) > 99999999.99)        errors.debit_entry = 'Debit entry is too large';
                }

                if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                    if (isNaN(credit_entry) || Number(credit_entry) < 0) errors.credit_entry = 'Credit entry must be a positive number';
                    else if (Number(credit_entry) > 99999999.99)         errors.credit_entry = 'Credit entry is too large';
                }

                if (!errors.rate_per_worker && !errors.no_of_workers && !errors.debit_entry && !errors.credit_entry) {
                    const totalAmount  = calculateTotalAmount(no_of_workers, rate_per_worker);
                    const debitAmount  = Number(debit_entry  || 0);
                    const creditAmount = Number(credit_entry || 0);
                    const sum          = parseFloat((debitAmount + creditAmount).toFixed(2));
                    if (Math.abs(sum - totalAmount) > 0.01) {
                        errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
                    }
                }

                if (status !== undefined && ![0, 1].includes(Number(status))) {
                    errors.status = 'Status must be 0 or 1';
                }
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            const labourEntryData = {
                site_id,
                labour_id,
                vendor_id:      vendor_id || null,
                date:           new Date(date),
                no_of_workers:  Number(no_of_workers),
                rate_per_worker: isAdmin ? Number(rate_per_worker).toFixed(2) : null,
                debit_entry:    isAdmin ? (debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00) : null,
                credit_entry:   isAdmin ? (credit_entry ? Number(credit_entry).toFixed(2) : 0.00) : null,
                status:         isAdmin ? (status !== undefined ? Number(status) : 1) : 1,
                approval_status: isAdmin ? 'approved' : 'pending',
                rejection_reason: null,
                created_by:     userId,
                updated_by:     userId,
                created_at:     new Date(),
                updated_at:     new Date(),
            };

            await LabourEntry.create(labourEntryData, { transaction });
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: isAdmin ? 'Labour entry created successfully' : 'Labour entry submitted for approval',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createLabourEntry error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // UPDATE labour entry
    // Non-admin: can only edit their own PENDING entries (limited fields)
    // Admin: can edit any entry (full fields)
    // ─────────────────────────────────────────────
    updateLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try {
            const { id }     = req.params;
            const userId     = getUserId(req);
            const userRole   = req.user?.role;
            const isAdmin    = isAdminRole(userRole);

            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if (!labourEntry) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour entry not found' });
            }

            // Non-admin: can only edit their own pending entries
            if (!isAdmin) {
                if (Number(labourEntry.created_by) !== Number(userId)) {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'You can only edit your own entries' });
                }
                if (labourEntry.approval_status !== 'pending') {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'Only pending entries can be edited' });
                }
            }

            const { site_id, labour_id, vendor_id, date, no_of_workers, rate_per_worker, debit_entry, credit_entry, status } = req.body;
            const errors = {};

            // ── Common validations ──
            if (site_id !== undefined) {
                if (!site_id) {
                    errors.site_id = 'Site cannot be empty';
                } else {
                    const site = await Site.findByPk(site_id, { transaction });
                    if (!site)          errors.site_id = 'Selected site does not exist';
                    else if (!site.is_active) errors.site_id = 'Selected site is inactive';
                }
            }

            if (labour_id !== undefined) {
                if (!labour_id) {
                    errors.labour_id = 'Labour cannot be empty';
                } else {
                    const labour = await Labour.findByPk(labour_id, { transaction });
                    if (!labour)              errors.labour_id = 'Selected labour does not exist';
                    else if (labour.status === 0) errors.labour_id = 'Selected labour is inactive';
                }
            }

            if (vendor_id !== undefined && vendor_id) {
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if (!vendor)             errors.vendor_id = 'Selected vendor does not exist';
                else if (vendor.status === 0) errors.vendor_id = 'Selected vendor is inactive';
            }

            if (date !== undefined) {
                if (!date) errors.date = 'Date cannot be empty';
                else if (isNaN(new Date(date).getTime())) errors.date = 'Invalid date format';
            }

            if (no_of_workers !== undefined) {
                if (no_of_workers === null || no_of_workers === '') errors.no_of_workers = 'Number of workers cannot be empty';
                else if (isNaN(no_of_workers) || Number(no_of_workers) < 0) errors.no_of_workers = 'Number of workers must be a positive number';
                else if (!Number.isInteger(Number(no_of_workers))) errors.no_of_workers = 'Number of workers must be a whole number';
                else if (Number(no_of_workers) > 99999) errors.no_of_workers = 'Number of workers is too large';
            }

            // ── Admin-only field validations ──
            if (isAdmin) {
                if (rate_per_worker !== undefined) {
                    if (rate_per_worker === null || rate_per_worker === '') errors.rate_per_worker = 'Rate per worker cannot be empty';
                    else if (isNaN(rate_per_worker) || Number(rate_per_worker) < 0) errors.rate_per_worker = 'Rate per worker must be a positive number';
                    else if (Number(rate_per_worker) > 99999999.99) errors.rate_per_worker = 'Rate per worker is too large';
                }

                if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                    if (isNaN(debit_entry) || Number(debit_entry) < 0) errors.debit_entry = 'Debit entry must be a positive number';
                    else if (Number(debit_entry) > 99999999.99)        errors.debit_entry = 'Debit entry is too large';
                }

                if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                    if (isNaN(credit_entry) || Number(credit_entry) < 0) errors.credit_entry = 'Credit entry must be a positive number';
                    else if (Number(credit_entry) > 99999999.99)         errors.credit_entry = 'Credit entry is too large';
                }

                if (!errors.rate_per_worker && !errors.no_of_workers && !errors.debit_entry && !errors.credit_entry) {
                    const finalWorkers = no_of_workers !== undefined ? Number(no_of_workers) : Number(labourEntry.no_of_workers);
                    const finalRate    = rate_per_worker !== undefined ? Number(rate_per_worker) : Number(labourEntry.rate_per_worker || 0);
                    const totalAmount  = calculateTotalAmount(finalWorkers, finalRate);
                    const finalDebit   = debit_entry  !== undefined ? (debit_entry  ? Number(debit_entry)  : 0) : Number(labourEntry.debit_entry  || 0);
                    const finalCredit  = credit_entry !== undefined ? (credit_entry ? Number(credit_entry) : 0) : Number(labourEntry.credit_entry || 0);
                    const sum          = parseFloat((finalDebit + finalCredit).toFixed(2));
                    if (Math.abs(sum - totalAmount) > 0.01) {
                        errors.debit_entry = `Total Amount (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
                    }
                }

                if (status !== undefined && ![0, 1].includes(Number(status))) {
                    errors.status = 'Status must be 0 or 1';
                }
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            const updateData = { updated_by: userId, updated_at: new Date() };

            if (site_id     !== undefined) updateData.site_id       = site_id;
            if (labour_id   !== undefined) updateData.labour_id     = labour_id;
            if (vendor_id   !== undefined) updateData.vendor_id     = vendor_id || null;
            if (date        !== undefined) updateData.date          = new Date(date);
            if (no_of_workers !== undefined) updateData.no_of_workers = Number(no_of_workers);

            if (isAdmin) {
                if (rate_per_worker !== undefined) updateData.rate_per_worker = Number(rate_per_worker).toFixed(2);
                if (debit_entry     !== undefined) updateData.debit_entry     = debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00;
                if (credit_entry    !== undefined) updateData.credit_entry    = credit_entry ? Number(credit_entry).toFixed(2) : 0.00;
                if (status          !== undefined) updateData.status          = Number(status);
            }

            await labourEntry.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({ success: true, message: 'Labour entry updated successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('updateLabourEntry error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // APPROVE entry (admin only)
    // Sets rate, paid, debit and moves to approved
    // ─────────────────────────────────────────────
    approveLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try {
            const userRole = req.user?.role;
            if (!isAdminRole(userRole)) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { id } = req.params;
            const { rate_per_worker, credit_entry, debit_entry, status } = req.body;
            const userId = getUserId(req);

            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if (!labourEntry) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour entry not found' });
            }
            if (labourEntry.approval_status === 'approved') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Entry is already approved' });
            }

            const errors = {};

            if (rate_per_worker === undefined || rate_per_worker === null || rate_per_worker === '') {
                errors.rate_per_worker = 'Rate per worker is required for approval';
            } else if (isNaN(rate_per_worker) || Number(rate_per_worker) < 0) {
                errors.rate_per_worker = 'Rate per worker must be a positive number';
            }

            if (!errors.rate_per_worker) {
                const totalAmount  = calculateTotalAmount(labourEntry.no_of_workers, rate_per_worker);
                const debitAmount  = Number(debit_entry  || 0);
                const creditAmount = Number(credit_entry || 0);
                const sum          = parseFloat((debitAmount + creditAmount).toFixed(2));
                if (Math.abs(sum - totalAmount) > 0.01) {
                    errors.debit_entry = `Total (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
                }
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            await labourEntry.update({
                rate_per_worker:  Number(rate_per_worker).toFixed(2),
                credit_entry:     credit_entry ? Number(credit_entry).toFixed(2) : 0.00,
                debit_entry:      debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00,
                status:           status !== undefined ? Number(status) : 1,
                approval_status:  'approved',
                rejection_reason: null,
                updated_by:       userId,
                updated_at:       new Date(),
            }, { transaction });

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour entry approved successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('approveLabourEntry error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // REJECT entry (admin only)
    // ─────────────────────────────────────────────
    rejectLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try {
            const userRole = req.user?.role;
            if (!isAdminRole(userRole)) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { id }              = req.params;
            const { rejection_reason } = req.body;
            const userId              = getUserId(req);

            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if (!labourEntry) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour entry not found' });
            }
            if (labourEntry.approval_status === 'approved') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Approved entries cannot be rejected' });
            }

            await labourEntry.update({
                approval_status:  'rejected',
                rejection_reason: rejection_reason || null,
                updated_by:       userId,
                updated_at:       new Date(),
            }, { transaction });

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour entry rejected' });
        } catch (err) {
            await transaction.rollback();
            console.error('rejectLabourEntry error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // DELETE entry
    // Non-admin: only their own pending entries
    // Admin: any entry
    // ─────────────────────────────────────────────
    deleteLabourEntry: async (req, res) => {
        const transaction = await LabourEntry.sequelize.transaction();
        try {
            const { id }   = req.params;
            const userId   = getUserId(req);
            const userRole = req.user?.role;
            const isAdmin  = isAdminRole(userRole);

            const labourEntry = await LabourEntry.findByPk(id, { transaction });
            if (!labourEntry) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour entry not found' });
            }

            if (!isAdmin) {
                if (Number(labourEntry.created_by) !== Number(userId)) {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'You can only delete your own entries' });
                }
                if (labourEntry.approval_status !== 'pending') {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'Only pending entries can be deleted' });
                }
            }

            await labourEntry.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour entry deleted successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('deleteLabourEntry error:', err);
            res.status(500).json({ success: false, message: 'Failed to delete labour entry' });
        }
    },

    // ─────────────────────────────────────────────
    // GET active labours for dropdown
    // ─────────────────────────────────────────────
    getActiveLabours: async (req, res) => {
        try {
            const labours = await Labour.findAll({
                where:      { status: 1 },
                attributes: ['id', 'name', 'standard_rate'],
                order:      [['name', 'ASC']],
            });
            res.status(200).json({ success: true, data: labours });
        } catch (err) {
            console.error('getActiveLabours error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch labours' });
        }
    },
};

module.exports = labourEntryController;