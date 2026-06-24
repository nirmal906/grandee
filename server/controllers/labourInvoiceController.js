const { LabourInvoice, LabourInvoiceItem, Labour, Vendor, Site, User } = require('../models');
const { Op } = require('sequelize');

// Helper: check if user is admin or superadmin
const isAdminRole = (role) => ['admin', 'superadmin'].includes(role?.toLowerCase());

// Helper: safely extract user id from req.user
// Auth middleware sets req.user.userId (from JWT decoded.userId)
const getUserId = (req) => {
    const id = req.user?.userId ?? req.user?.id ?? null;
    return id !== undefined && id !== null ? Number(id) : null;
};

// Helper: common include array for invoice list/detail
const getIncludeArray = () => [
    { model: Site,   as: 'site',    attributes: ['id', 'name', 'full_address'] },
    { model: Vendor, as: 'vendor',  attributes: ['id', 'name'] },
    { model: User,   as: 'creator', attributes: ['id', 'name', 'email'] },
    { model: User,   as: 'updater', attributes: ['id', 'name', 'email'] },
    {
        model: LabourInvoiceItem,
        as: 'items',
        include: [
            { model: Labour, as: 'labour', attributes: ['id', 'name', 'standard_rate'] },
        ],
    },
];

const generateLabourInvoiceNumber = async (transaction) => {
    const year = new Date().getFullYear();
    const prefix = `LI-${year}-`;
    const last = await LabourInvoice.findOne({
        where: { invoice_number: { [Op.like]: `${prefix}%` } },
        order: [['invoice_number', 'DESC']],
        transaction,
    });
    let nextSeq = 1;
    if (last && last.invoice_number) {
        const seq = parseInt(last.invoice_number.replace(prefix, ''), 10);
        if (!isNaN(seq)) nextSeq = seq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

const labourInvoiceController = {

    // ─────────────────────────────────────────────
    // GET all labour invoices (main table)
    // Admin/Superadmin: sees approved entries + can filter by approval_status
    // Others: sees only their own entries (all approval statuses)
    // ─────────────────────────────────────────────
    getLabourInvoices: async (req, res) => {
        try {
            const {
                page            = 1,
                limit           = 10,
                search          = '',
                status          = '',
                site_id         = '',
                vendor_id       = '',
                date_from       = '',
                date_to         = '',
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

            const validSortFields = ['date', 'site_id', 'vendor_id', 'invoice_number', 'debit_entry', 'credit_entry', 'created_at', 'updated_at'];
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
                    model:    Vendor,
                    as:       'vendor',
                    attributes: ['id', 'name'],
                    required: false,
                },
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'updater', attributes: ['id', 'name', 'email'] },
                {
                    model: LabourInvoiceItem,
                    as: 'items',
                    include: [
                        { model: Labour, as: 'labour', attributes: ['id', 'name', 'standard_rate'] },
                    ],
                },
            ];

            const { rows, count } = await LabourInvoice.findAndCountAll({
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
            console.error('getLabourInvoices error:', err);
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
                vendor_id = '',
                date_from = '',
                date_to   = '',
            } = req.query;

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            const whereClause = { approval_status: 'pending' };

            if (site_id)   whereClause.site_id   = site_id;
            if (vendor_id) whereClause.vendor_id  = vendor_id;

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
                { model: Vendor, as: 'vendor',  attributes: ['id', 'name'], required: false },
                { model: User,   as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User,   as: 'updater', attributes: ['id', 'name', 'email'] },
                {
                    model: LabourInvoiceItem,
                    as: 'items',
                    include: [
                        { model: Labour, as: 'labour', attributes: ['id', 'name', 'standard_rate'] },
                    ],
                },
            ];

            const { rows, count } = await LabourInvoice.findAndCountAll({
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
    // GET single invoice by ID
    // ─────────────────────────────────────────────
    getLabourInvoiceById: async (req, res) => {
        try {
            const { id }         = req.params;
            const labourInvoice = await LabourInvoice.findByPk(id, { include: getIncludeArray() });

            if (!labourInvoice) {
                return res.status(404).json({ success: false, message: 'Labour invoice not found' });
            }
            res.status(200).json({ success: true, data: labourInvoice });
        } catch (err) {
            console.error('getLabourInvoiceById error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch labour invoice' });
        }
    },

    // ─────────────────────────────────────────────
    // CREATE labour invoice
    // Admin/Superadmin: full fields, approval_status = approved
    // Others: site/vendor/date/items(workers only), approval_status = pending
    // ─────────────────────────────────────────────
    createLabourInvoice: async (req, res) => {
        const transaction = await LabourInvoice.sequelize.transaction();
        try {
            const { site_id, vendor_id, date, notes, debit_entry, credit_entry, status } = req.body;
            const userId   = getUserId(req);
            const userRole = req.user?.role;
            const isAdmin  = isAdminRole(userRole);
            const errors   = {};

            // ── Parse items from JSON string ──
            let items = [];
            try {
                items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
            } catch (parseErr) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors: { items: 'Invalid items JSON format' } });
            }

            if (!Array.isArray(items) || items.length === 0) {
                errors.items = 'At least one labour item is required';
            }

            // ── Common validations ──
            if (!site_id) {
                errors.site_id = 'Site is required';
            } else {
                const site = await Site.findByPk(site_id, { transaction });
                if (!site)               errors.site_id = 'Selected site does not exist';
                else if (!site.is_active) errors.site_id = 'Selected site is inactive';
            }

            if (!vendor_id) {
                errors.vendor_id = 'Vendor is required';
            } else {
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if (!vendor)               errors.vendor_id = 'Selected vendor does not exist';
                else if (!vendor.is_active) errors.vendor_id = 'Selected vendor is inactive';
            }

            if (!date) {
                errors.date = 'Date is required';
            } else if (isNaN(new Date(date).getTime())) {
                errors.date = 'Invalid date format';
            }

            // ── Validate each item ──
            const itemErrors = [];
            if (Array.isArray(items) && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const ie   = {};

                    if (!item.labour_id) {
                        ie.labour_id = 'Labour is required';
                    } else {
                        const labour = await Labour.findByPk(item.labour_id, { transaction });
                        if (!labour)              ie.labour_id = 'Selected labour does not exist';
                        else if (labour.status === 0) ie.labour_id = 'Selected labour is inactive';
                    }

                    if (item.no_of_workers === undefined || item.no_of_workers === null || item.no_of_workers === '') {
                        ie.no_of_workers = 'Number of workers is required';
                    } else if (isNaN(item.no_of_workers) || Number(item.no_of_workers) < 0) {
                        ie.no_of_workers = 'Number of workers must be a positive number';
                    } else if (!Number.isInteger(Number(item.no_of_workers))) {
                        ie.no_of_workers = 'Number of workers must be a whole number';
                    } else if (Number(item.no_of_workers) > 99999) {
                        ie.no_of_workers = 'Number of workers is too large';
                    }

                    // Admin-only: rate_per_worker per item
                    if (isAdmin) {
                        if (item.rate_per_worker === undefined || item.rate_per_worker === null || item.rate_per_worker === '') {
                            ie.rate_per_worker = 'Rate per worker is required';
                        } else if (isNaN(item.rate_per_worker) || Number(item.rate_per_worker) < 0) {
                            ie.rate_per_worker = 'Rate per worker must be a positive number';
                        } else if (Number(item.rate_per_worker) > 99999999.99) {
                            ie.rate_per_worker = 'Rate per worker is too large';
                        }
                    }

                    if (Object.keys(ie).length > 0) itemErrors.push({ index: i, ...ie });
                }
            }

            if (itemErrors.length > 0) errors.itemErrors = itemErrors;

            // ── Admin-only invoice-level field validations ──
            if (isAdmin) {
                if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                    if (isNaN(debit_entry) || Number(debit_entry) < 0) errors.debit_entry = 'Debit entry must be a positive number';
                    else if (Number(debit_entry) > 99999999.99)        errors.debit_entry = 'Debit entry is too large';
                }

                if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                    if (isNaN(credit_entry) || Number(credit_entry) < 0) errors.credit_entry = 'Credit entry must be a positive number';
                    else if (Number(credit_entry) > 99999999.99)         errors.credit_entry = 'Credit entry is too large';
                }

                // Validate total = sum of line totals = debit + credit
                if (itemErrors.length === 0 && !errors.debit_entry && !errors.credit_entry && Array.isArray(items) && items.length > 0) {
                    let totalAmount = 0;
                    for (const item of items) {
                        const workers = parseFloat(item.no_of_workers) || 0;
                        const rate    = parseFloat(item.rate_per_worker) || 0;
                        totalAmount  += parseFloat((workers * rate).toFixed(2));
                    }
                    totalAmount = parseFloat(totalAmount.toFixed(2));

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
            const autoInvoiceNumber = await generateLabourInvoiceNumber(transaction);

            // ── Create invoice ──
            const invoiceData = {
                site_id,
                vendor_id,
                date:            new Date(date),
                invoice_number:  autoInvoiceNumber,
                notes:           notes || null,
                debit_entry:     isAdmin ? (debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00) : null,
                credit_entry:    isAdmin ? (credit_entry ? Number(credit_entry).toFixed(2) : 0.00) : null,
                status:          isAdmin ? (status !== undefined ? Number(status) : 1) : 1,
                approval_status: isAdmin ? 'approved' : 'pending',
                rejection_reason: null,
                created_by:      userId,
                updated_by:      userId,
                created_at:      new Date(),
                updated_at:      new Date(),
            };

            const invoice = await LabourInvoice.create(invoiceData, { transaction });

            // ── Create items ──
            const itemRecords = items.map((item) => ({
                invoice_id:      invoice.id,
                labour_id:       item.labour_id,
                no_of_workers:   Number(item.no_of_workers),
                rate_per_worker: isAdmin ? Number(item.rate_per_worker).toFixed(2) : null,
            }));

            await LabourInvoiceItem.bulkCreate(itemRecords, { transaction });
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: isAdmin ? 'Labour invoice created successfully' : 'Labour invoice submitted for approval',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createLabourInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // UPDATE labour invoice
    // Non-admin: can only edit their own PENDING invoices (limited fields)
    // Admin: can edit any invoice (full fields)
    // ─────────────────────────────────────────────
    updateLabourInvoice: async (req, res) => {
        const transaction = await LabourInvoice.sequelize.transaction();
        try {
            const { id }     = req.params;
            const userId     = getUserId(req);
            const userRole   = req.user?.role;
            const isAdmin    = isAdminRole(userRole);

            const labourInvoice = await LabourInvoice.findByPk(id, { transaction });
            if (!labourInvoice) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour invoice not found' });
            }

            // Non-admin: can only edit their own pending invoices
            if (!isAdmin) {
                if (Number(labourInvoice.created_by) !== Number(userId)) {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'You can only edit your own invoices' });
                }
                if (labourInvoice.approval_status !== 'pending') {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'Only pending invoices can be edited' });
                }
            }

            const { site_id, vendor_id, date, notes, debit_entry, credit_entry, status } = req.body;
            const errors = {};

            // ── Parse items if provided ──
            let items = undefined;
            if (req.body.items !== undefined) {
                try {
                    items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
                } catch (parseErr) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: 'Validation failed', errors: { items: 'Invalid items JSON format' } });
                }

                if (!Array.isArray(items) || items.length === 0) {
                    errors.items = 'At least one labour item is required';
                }
            }

            // ── Common validations ──
            if (site_id !== undefined) {
                if (!site_id) {
                    errors.site_id = 'Site cannot be empty';
                } else {
                    const site = await Site.findByPk(site_id, { transaction });
                    if (!site)               errors.site_id = 'Selected site does not exist';
                    else if (!site.is_active) errors.site_id = 'Selected site is inactive';
                }
            }

            if (vendor_id !== undefined) {
                if (!vendor_id) {
                    errors.vendor_id = 'Vendor cannot be empty';
                } else {
                    const vendor = await Vendor.findByPk(vendor_id, { transaction });
                    if (!vendor)               errors.vendor_id = 'Selected vendor does not exist';
                    else if (!vendor.is_active) errors.vendor_id = 'Selected vendor is inactive';
                }
            }

            if (date !== undefined) {
                if (!date) errors.date = 'Date cannot be empty';
                else if (isNaN(new Date(date).getTime())) errors.date = 'Invalid date format';
            }

            // ── Validate items if provided ──
            const itemErrors = [];
            if (Array.isArray(items) && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const ie   = {};

                    if (!item.labour_id) {
                        ie.labour_id = 'Labour is required';
                    } else {
                        const labour = await Labour.findByPk(item.labour_id, { transaction });
                        if (!labour)              ie.labour_id = 'Selected labour does not exist';
                        else if (labour.status === 0) ie.labour_id = 'Selected labour is inactive';
                    }

                    if (item.no_of_workers === undefined || item.no_of_workers === null || item.no_of_workers === '') {
                        ie.no_of_workers = 'Number of workers cannot be empty';
                    } else if (isNaN(item.no_of_workers) || Number(item.no_of_workers) < 0) {
                        ie.no_of_workers = 'Number of workers must be a positive number';
                    } else if (!Number.isInteger(Number(item.no_of_workers))) {
                        ie.no_of_workers = 'Number of workers must be a whole number';
                    } else if (Number(item.no_of_workers) > 99999) {
                        ie.no_of_workers = 'Number of workers is too large';
                    }

                    // Admin-only: rate_per_worker per item
                    if (isAdmin) {
                        if (item.rate_per_worker !== undefined) {
                            if (item.rate_per_worker === null || item.rate_per_worker === '') ie.rate_per_worker = 'Rate per worker cannot be empty';
                            else if (isNaN(item.rate_per_worker) || Number(item.rate_per_worker) < 0) ie.rate_per_worker = 'Rate per worker must be a positive number';
                            else if (Number(item.rate_per_worker) > 99999999.99) ie.rate_per_worker = 'Rate per worker is too large';
                        }
                    }

                    if (Object.keys(ie).length > 0) itemErrors.push({ index: i, ...ie });
                }
            }

            if (itemErrors.length > 0) errors.itemErrors = itemErrors;

            // ── Admin-only invoice-level field validations ──
            if (isAdmin) {
                if (debit_entry !== undefined && debit_entry !== null && debit_entry !== '') {
                    if (isNaN(debit_entry) || Number(debit_entry) < 0) errors.debit_entry = 'Debit entry must be a positive number';
                    else if (Number(debit_entry) > 99999999.99)        errors.debit_entry = 'Debit entry is too large';
                }

                if (credit_entry !== undefined && credit_entry !== null && credit_entry !== '') {
                    if (isNaN(credit_entry) || Number(credit_entry) < 0) errors.credit_entry = 'Credit entry must be a positive number';
                    else if (Number(credit_entry) > 99999999.99)         errors.credit_entry = 'Credit entry is too large';
                }

                // Validate total = sum of line totals = debit + credit
                if (itemErrors.length === 0 && !errors.debit_entry && !errors.credit_entry && Array.isArray(items) && items.length > 0) {
                    let totalAmount = 0;
                    for (const item of items) {
                        const workers = parseFloat(item.no_of_workers) || 0;
                        const rate    = parseFloat(item.rate_per_worker) || 0;
                        totalAmount  += parseFloat((workers * rate).toFixed(2));
                    }
                    totalAmount = parseFloat(totalAmount.toFixed(2));

                    const finalDebit   = debit_entry  !== undefined ? (debit_entry  ? Number(debit_entry)  : 0) : Number(labourInvoice.debit_entry  || 0);
                    const finalCredit  = credit_entry !== undefined ? (credit_entry ? Number(credit_entry) : 0) : Number(labourInvoice.credit_entry || 0);
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

            if (site_id        !== undefined) updateData.site_id        = site_id;
            if (vendor_id      !== undefined) updateData.vendor_id      = vendor_id;
            if (date           !== undefined) updateData.date           = new Date(date);
            if (notes          !== undefined) updateData.notes          = notes || null;

            if (isAdmin) {
                if (debit_entry  !== undefined) updateData.debit_entry  = debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00;
                if (credit_entry !== undefined) updateData.credit_entry = credit_entry ? Number(credit_entry).toFixed(2) : 0.00;
                if (status       !== undefined) updateData.status       = Number(status);
            }

            await labourInvoice.update(updateData, { transaction });

            // ── Replace items if provided ──
            if (Array.isArray(items) && items.length > 0) {
                await LabourInvoiceItem.destroy({ where: { invoice_id: id }, transaction });

                const itemRecords = items.map((item) => ({
                    invoice_id:      id,
                    labour_id:       item.labour_id,
                    no_of_workers:   Number(item.no_of_workers),
                    rate_per_worker: isAdmin && item.rate_per_worker !== undefined ? Number(item.rate_per_worker).toFixed(2) : null,
                }));

                await LabourInvoiceItem.bulkCreate(itemRecords, { transaction });
            }

            await transaction.commit();

            res.status(200).json({ success: true, message: 'Labour invoice updated successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('updateLabourInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // APPROVE invoice (admin only)
    // Sets rate_per_worker per item, debit/credit on invoice
    // ─────────────────────────────────────────────
    approveLabourInvoice: async (req, res) => {
        const transaction = await LabourInvoice.sequelize.transaction();
        try {
            const userRole = req.user?.role;
            if (!isAdminRole(userRole)) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { id } = req.params;
            const { items: rawItems, item_rates, credit_entry, debit_entry, status } = req.body;
            const items = rawItems || item_rates;
            const userId = getUserId(req);

            const labourInvoice = await LabourInvoice.findByPk(id, {
                include: [{ model: LabourInvoiceItem, as: 'items' }],
                transaction,
            });
            if (!labourInvoice) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour invoice not found' });
            }
            if (labourInvoice.approval_status === 'approved') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Invoice is already approved' });
            }

            const errors = {};

            // ── Parse items ──
            let parsedItems = [];
            try {
                parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
            } catch (parseErr) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors: { items: 'Invalid items JSON format' } });
            }

            if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
                errors.items = 'Items with rates are required for approval';
            }

            // ── Validate each item rate ──
            const itemErrors = [];
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                for (let i = 0; i < parsedItems.length; i++) {
                    const item = parsedItems[i];
                    const ie   = {};

                    if (!item.item_id) {
                        ie.item_id = 'Item ID is required';
                    }

                    if (item.rate_per_worker === undefined || item.rate_per_worker === null || item.rate_per_worker === '') {
                        ie.rate_per_worker = 'Rate per worker is required for approval';
                    } else if (isNaN(item.rate_per_worker) || Number(item.rate_per_worker) < 0) {
                        ie.rate_per_worker = 'Rate per worker must be a positive number';
                    }

                    if (Object.keys(ie).length > 0) itemErrors.push({ index: i, ...ie });
                }
            }

            if (itemErrors.length > 0) errors.itemErrors = itemErrors;

            // ── Validate total = sum of line totals = debit + credit ──
            if (itemErrors.length === 0 && Array.isArray(parsedItems) && parsedItems.length > 0) {
                // Build map of item_id -> no_of_workers from existing items
                const existingItemsMap = {};
                for (const ei of labourInvoice.items) {
                    existingItemsMap[ei.id] = ei;
                }

                let totalAmount = 0;
                for (const item of parsedItems) {
                    const existingItem = existingItemsMap[item.item_id];
                    if (!existingItem) {
                        errors.items = `Item with ID ${item.item_id} not found on this invoice`;
                        break;
                    }
                    const workers = parseFloat(existingItem.no_of_workers) || 0;
                    const rate    = parseFloat(item.rate_per_worker) || 0;
                    totalAmount  += parseFloat((workers * rate).toFixed(2));
                }
                totalAmount = parseFloat(totalAmount.toFixed(2));

                if (!errors.items) {
                    const debitAmount  = Number(debit_entry  || 0);
                    const creditAmount = Number(credit_entry || 0);
                    const sum          = parseFloat((debitAmount + creditAmount).toFixed(2));
                    if (Math.abs(sum - totalAmount) > 0.01) {
                        errors.debit_entry = `Total (₹${totalAmount.toFixed(2)}) must equal Debit + Credit (₹${sum.toFixed(2)})`;
                    }
                }
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            // ── Update each item's rate_per_worker ──
            for (const item of parsedItems) {
                await LabourInvoiceItem.update(
                    { rate_per_worker: Number(item.rate_per_worker).toFixed(2) },
                    { where: { id: item.item_id, invoice_id: id }, transaction }
                );
            }

            // ── Update invoice ──
            await labourInvoice.update({
                debit_entry:      debit_entry  ? Number(debit_entry).toFixed(2)  : 0.00,
                credit_entry:     credit_entry ? Number(credit_entry).toFixed(2) : 0.00,
                status:           status !== undefined ? Number(status) : 1,
                approval_status:  'approved',
                rejection_reason: null,
                updated_by:       userId,
                updated_at:       new Date(),
            }, { transaction });

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour invoice approved successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('approveLabourInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // REJECT invoice (admin only)
    // ─────────────────────────────────────────────
    rejectLabourInvoice: async (req, res) => {
        const transaction = await LabourInvoice.sequelize.transaction();
        try {
            const userRole = req.user?.role;
            if (!isAdminRole(userRole)) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const { id }              = req.params;
            const { rejection_reason } = req.body;
            const userId              = getUserId(req);

            const labourInvoice = await LabourInvoice.findByPk(id, { transaction });
            if (!labourInvoice) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour invoice not found' });
            }
            if (labourInvoice.approval_status === 'approved') {
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Approved invoices cannot be rejected' });
            }

            await labourInvoice.update({
                approval_status:  'rejected',
                rejection_reason: rejection_reason || null,
                updated_by:       userId,
                updated_at:       new Date(),
            }, { transaction });

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour invoice rejected' });
        } catch (err) {
            await transaction.rollback();
            console.error('rejectLabourInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // DELETE invoice
    // Non-admin: only their own pending invoices
    // Admin: any invoice
    // ─────────────────────────────────────────────
    deleteLabourInvoice: async (req, res) => {
        const transaction = await LabourInvoice.sequelize.transaction();
        try {
            const { id }   = req.params;
            const userId   = getUserId(req);
            const userRole = req.user?.role;
            const isAdmin  = isAdminRole(userRole);

            const labourInvoice = await LabourInvoice.findByPk(id, { transaction });
            if (!labourInvoice) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Labour invoice not found' });
            }

            if (!isAdmin) {
                if (Number(labourInvoice.created_by) !== Number(userId)) {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'You can only delete your own invoices' });
                }
                if (labourInvoice.approval_status !== 'pending') {
                    await transaction.rollback();
                    return res.status(403).json({ success: false, message: 'Only pending invoices can be deleted' });
                }
            }

            // Delete items first (cascade), then invoice
            await LabourInvoiceItem.destroy({ where: { invoice_id: id }, transaction });
            await labourInvoice.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({ success: true, message: 'Labour invoice deleted successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('deleteLabourInvoice error:', err);
            res.status(500).json({ success: false, message: 'Failed to delete labour invoice' });
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

    // ─────────────────────────────────────────────
    // GET active vendors for dropdown
    // ─────────────────────────────────────────────
    getActiveVendors: async (req, res) => {
        try {
            const vendors = await Vendor.findAll({
                where:      { is_active: 1 },
                attributes: ['id', 'name'],
                order:      [['name', 'ASC']],
            });
            res.status(200).json({ success: true, data: vendors });
        } catch (err) {
            console.error('getActiveVendors error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
        }
    },

    // ─────────────────────────────────────────────
    // GET active sites for dropdown
    // ─────────────────────────────────────────────
    getActiveSites: async (req, res) => {
        try {
            const sites = await Site.findAll({
                where:      { is_active: true },
                attributes: ['id', 'name', 'full_address'],
                order:      [['name', 'ASC']],
            });
            res.status(200).json({ success: true, data: sites });
        } catch (err) {
            console.error('getActiveSites error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch sites' });
        }
    },
};

module.exports = labourInvoiceController;
