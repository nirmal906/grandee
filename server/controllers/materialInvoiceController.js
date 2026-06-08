const { MaterialInvoice, MaterialInvoiceItem, MaterialInvoiceHistory, Material, Vendor, Site, User, Unit } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Define upload directory path
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'material-invoices');

// Helper function to create invoice snapshot
const createInvoiceSnapshot = (invoice, items) => {
    return JSON.stringify({
        site_id: invoice.site_id,
        vendor_id: invoice.vendor_id,
        date: invoice.date,
        invoice_number: invoice.invoice_number || null,
        additional_charges: invoice.additional_charges,
        debit_entry: invoice.debit_entry,
        credit_entry: invoice.credit_entry,
        invoice_photo: invoice.invoice_photo || null,
        notes: invoice.notes || null,
        status: invoice.status,
        items: items.map(item => ({
            material_id: item.material_id,
            quantity: item.quantity,
            rate: item.rate
        }))
    });
};

// Helper function to track changed fields
const getChangedFields = (oldInvoice, newData) => {
    const changes = {};
    const fieldsToTrack = [
        'site_id', 'vendor_id', 'date', 'invoice_number',
        'additional_charges', 'debit_entry', 'credit_entry',
        'status', 'invoice_photo', 'notes'
    ];
    fieldsToTrack.forEach(field => {
        if (newData[field] !== undefined) {
            const oldValue = oldInvoice[field];
            const newValue = newData[field];
            if (oldValue != newValue) {
                changes[field] = { from: oldValue, to: newValue };
            }
        }
    });
    return Object.keys(changes).length > 0 ? JSON.stringify(changes) : null;
};

const materialInvoiceController = {

    // Get all material invoices with pagination, search, filters
    getMaterialInvoices: async (req, res) => {
        try {
            const {
                page = 1, limit = 10, search = '', status = '',
                vendor_id = '', site_id = '', date_from = '', date_to = '',
                sort = 'date', order = 'desc',
            } = req.query;

            const pageNum = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
            }

            const validSortFields = ['date', 'site_id', 'vendor_id', 'additional_charges', 'created_at', 'invoice_number'];
            const sortField = validSortFields.includes(sort) ? sort : 'date';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const whereClause = {};
            if (status === '1' || status === '0') whereClause.status = Number(status);
            if (vendor_id) whereClause.vendor_id = vendor_id;
            if (site_id) whereClause.site_id = site_id;
            if (date_from || date_to) {
                whereClause.date = {};
                if (date_from) whereClause.date[Op.gte] = new Date(date_from);
                if (date_to) whereClause.date[Op.lte] = new Date(date_to);
            }
            if (search) {
                whereClause[Op.or] = [{ invoice_number: { [Op.like]: `%${search}%` } }];
            }

            const { rows, count } = await MaterialInvoice.findAndCountAll({
                where: whereClause,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'full_address'], required: false },
                    { model: Vendor, as: 'vendor', attributes: ['id', 'name'], required: false },
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] },
                    {
                        model: MaterialInvoiceItem, as: 'items',
                        include: [{
                            model: Material, as: 'material',
                            attributes: ['id', 'name', 'standard_rate', 'unit_id'],
                            include: [{ model: Unit, as: 'unit', attributes: ['id', 'name'] }]
                        }]
                    }
                ],
                distinct: true
            });

            res.status(200).json({ success: true, data: rows, total: count, page: pageNum, limit: limitNum });
        } catch (err) {
            console.error('getMaterialInvoices error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // Get single invoice by ID
    getMaterialInvoiceById: async (req, res) => {
        try {
            const { id } = req.params;
            const invoice = await MaterialInvoice.findByPk(id, {
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'full_address'] },
                    { model: Vendor, as: 'vendor', attributes: ['id', 'name'], required: false },
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] },
                    {
                        model: MaterialInvoiceItem, as: 'items',
                        include: [{ model: Material, as: 'material', include: [{ model: Unit, as: 'unit' }] }]
                    }
                ]
            });

            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Material invoice not found' });
            }
            res.status(200).json({ success: true, data: invoice });
        } catch (err) {
            console.error('getMaterialInvoiceById error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch material invoice' });
        }
    },

    // Create material invoice
    createMaterialInvoice: async (req, res) => {
        const transaction = await MaterialInvoice.sequelize.transaction();
        try {
            const {
                site_id, vendor_id, date, invoice_number,
                additional_charges = 0, debit_entry, credit_entry, notes, status
            } = req.body;

            // Parse items from JSON string
            let items = [];
            try {
                items = JSON.parse(req.body.items);
            } catch (e) {
                items = [];
            }

            const userId = req.user?.id;
            const errors = {};

            // Site validation
            if (!site_id) {
                errors.site_id = 'Site is required';
            } else {
                const site = await Site.findByPk(site_id, { transaction });
                if (!site) errors.site_id = 'Selected site does not exist';
                else if (!site.is_active) errors.site_id = 'Selected site is inactive';
            }

            // Vendor validation
            if (!vendor_id) {
                errors.vendor_id = 'Vendor is required';
            } else {
                const vendor = await Vendor.findByPk(vendor_id, { transaction });
                if (!vendor) errors.vendor_id = 'Selected vendor does not exist';
                else if (!vendor.is_active) errors.vendor_id = 'Selected vendor is inactive';
            }

            // Date validation
            if (!date) {
                errors.date = 'Date is required';
            } else {
                const invoiceDate = new Date(date);
                if (isNaN(invoiceDate.getTime())) errors.date = 'Invalid date format';
            }

            // Additional charges validation
            if (additional_charges !== undefined) {
                if (isNaN(additional_charges) || Number(additional_charges) < 0) {
                    errors.additional_charges = 'Additional charges must be \u2265 0';
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

            // Items validation — only if items provided
            const hasItems = Array.isArray(items) && items.length > 0 && items.some(i => i.material_id);
            if (hasItems) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item.material_id) {
                        errors[`items[${i}].material_id`] = 'Material is required';
                    } else {
                        const material = await Material.findByPk(item.material_id, { transaction });
                        if (!material) errors[`items[${i}].material_id`] = 'Selected material does not exist';
                        else if (material.status === 0) errors[`items[${i}].material_id`] = 'Selected material is inactive';
                    }
                    if (item.quantity === undefined || item.quantity === null || item.quantity === '') {
                        errors[`items[${i}].quantity`] = 'Quantity is required';
                    } else if (isNaN(item.quantity) || Number(item.quantity) <= 0) {
                        errors[`items[${i}].quantity`] = 'Quantity must be greater than 0';
                    }
                    if (item.rate === undefined || item.rate === null || item.rate === '') {
                        errors[`items[${i}].rate`] = 'Rate is required';
                    } else if (isNaN(item.rate) || Number(item.rate) < 0) {
                        errors[`items[${i}].rate`] = 'Rate must be a positive number';
                    }
                }
            }

            // Manual total amount validation — items இல்லாத போது required
            if (!hasItems) {
                const manualTotal = parseFloat(req.body.manual_total_amount);
                if (!req.body.manual_total_amount || isNaN(manualTotal) || manualTotal <= 0) {
                    errors.manual_total_amount = 'Invoice total amount is required';
                }
            }

            // File handling
            let invoicePhotoFilename = null;
            if (req.file) invoicePhotoFilename = req.file.filename;

            // Total amount calculation
            let totalAmount = 0;
            if (hasItems) {
                const itemsTotal = items.reduce((sum, item) => {
                    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                }, 0);
                totalAmount = parseFloat((itemsTotal + (parseFloat(additional_charges) || 0)).toFixed(2));
            } else {
                // items இல்லாத போது manual total = total amount
                totalAmount = parseFloat(parseFloat(req.body.manual_total_amount || 0).toFixed(2));
            }

            // Debit + Credit = Total Amount validation
            const debitAmount = Number(debit_entry || 0);
            const creditAmount = Number(credit_entry || 0);
            const sum = parseFloat((debitAmount + creditAmount).toFixed(2));

            if (Object.keys(errors).length === 0 && Math.abs(sum - totalAmount) > 0.01) {
                errors.debit_entry = `Total Amount (\u20B9${totalAmount.toFixed(2)}) must equal Debit + Credit (\u20B9${sum.toFixed(2)})`;
            }

            if (Object.keys(errors).length > 0) {
                if (req.file) {
                    const filePath = path.join(UPLOAD_DIR, req.file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            const invoiceData = {
                site_id,
                vendor_id,
                date: new Date(date),
                invoice_number: invoice_number || null,
                additional_charges: Number(additional_charges || 0).toFixed(2),
                debit_entry: debit_entry ? Number(debit_entry).toFixed(2) : '0.00',
                credit_entry: credit_entry ? Number(credit_entry).toFixed(2) : '0.00',
                invoice_photo: invoicePhotoFilename,
                notes: notes || null,
                status: status !== undefined ? Number(status) : 1,
                created_by: userId,
                updated_by: userId,
            };

            const newInvoice = await MaterialInvoice.create(invoiceData, { transaction });

            // Create invoice items — only if hasItems
            if (hasItems) {
                const itemsData = items.map(item => ({
                    invoice_id: newInvoice.id,
                    material_id: item.material_id,
                    quantity: Number(item.quantity),
                    rate: Number(item.rate).toFixed(2)
                }));
                await MaterialInvoiceItem.bulkCreate(itemsData, { transaction });
            }

            // Create history entry
            const snapshot = createInvoiceSnapshot(invoiceData, hasItems ? items : []);
            await MaterialInvoiceHistory.create({
                invoice_id: newInvoice.id,
                action_type: 'created',
                snapshot,
                changed_fields: null,
                performed_by: userId,
                performed_at: new Date()
            }, { transaction });

            await transaction.commit();
            res.status(201).json({ success: true, message: 'Material invoice created successfully' });
        } catch (err) {
            if (req.file) {
                const filePath = path.join(UPLOAD_DIR, req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            await transaction.rollback();
            console.error('createMaterialInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // Update material invoice
    updateMaterialInvoice: async (req, res) => {
        const transaction = await MaterialInvoice.sequelize.transaction();
        try {
            const { id } = req.params;
            const {
                site_id, vendor_id, date, invoice_number,
                additional_charges, debit_entry, credit_entry,
                notes, status, invoiceRemoved
            } = req.body;

            // Parse items from JSON string if provided
            let items = undefined;
            if (req.body.items !== undefined) {
                try {
                    items = JSON.parse(req.body.items);
                } catch (e) {
                    items = [];
                }
            }

            const userId = req.user?.id;
            const invoice = await MaterialInvoice.findByPk(id, {
                include: [{ model: MaterialInvoiceItem, as: 'items' }],
                transaction
            });

            if (!invoice) {
                if (req.file) {
                    const filePath = path.join(UPLOAD_DIR, req.file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Material invoice not found' });
            }

            const errors = {};

            // Site validation
            if (site_id !== undefined) {
                if (!site_id) {
                    errors.site_id = 'Site cannot be empty';
                } else {
                    const site = await Site.findByPk(site_id, { transaction });
                    if (!site) errors.site_id = 'Selected site does not exist';
                    else if (!site.is_active) errors.site_id = 'Selected site is inactive';
                }
            }

            // Vendor validation
            if (vendor_id !== undefined) {
                if (!vendor_id) {
                    errors.vendor_id = 'Vendor cannot be empty';
                } else {
                    const vendor = await Vendor.findByPk(vendor_id, { transaction });
                    if (!vendor) errors.vendor_id = 'Selected vendor does not exist';
                    else if (!vendor.is_active) errors.vendor_id = 'Selected vendor is inactive';
                }
            }

            // Date validation
            if (date !== undefined) {
                if (!date) errors.date = 'Date cannot be empty';
                else {
                    const d = new Date(date);
                    if (isNaN(d.getTime())) errors.date = 'Invalid date format';
                }
            }

            // Additional charges validation
            if (additional_charges !== undefined) {
                if (isNaN(additional_charges) || Number(additional_charges) < 0) {
                    errors.additional_charges = 'Additional charges must be \u2265 0';
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

            // Items validation — only if items provided AND has valid material_id
            const hasNewItems = Array.isArray(items) && items.length > 0 && items.some(i => i.material_id);

            if (items !== undefined && hasNewItems) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (!item.material_id) {
                        errors[`items[${i}].material_id`] = 'Material is required';
                    } else {
                        const material = await Material.findByPk(item.material_id, { transaction });
                        if (!material) errors[`items[${i}].material_id`] = 'Selected material does not exist';
                        else if (material.status === 0) errors[`items[${i}].material_id`] = 'Selected material is inactive';
                    }
                    if (item.quantity === undefined || item.quantity === null || item.quantity === '') {
                        errors[`items[${i}].quantity`] = 'Quantity is required';
                    } else if (isNaN(item.quantity) || Number(item.quantity) <= 0) {
                        errors[`items[${i}].quantity`] = 'Quantity must be greater than 0';
                    }
                    if (item.rate === undefined || item.rate === null || item.rate === '') {
                        errors[`items[${i}].rate`] = 'Rate is required';
                    } else if (isNaN(item.rate) || Number(item.rate) < 0) {
                        errors[`items[${i}].rate`] = 'Rate must be a positive number';
                    }
                }
            }

            // File handling
            let newInvoicePhoto = invoice.invoice_photo;
            if (req.file) {
                if (invoice.invoice_photo) {
                    const oldPath = path.join(UPLOAD_DIR, invoice.invoice_photo);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                newInvoicePhoto = req.file.filename;
            } else if (invoiceRemoved === 'true' && invoice.invoice_photo) {
                const oldPath = path.join(UPLOAD_DIR, invoice.invoice_photo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                newInvoicePhoto = null;
            }

            // Total amount calculation for update
            let totalAmount = 0;

            if (hasNewItems) {
                // New items provided — calculate from new items
                const newItemsTotal = items.reduce((sum, item) => {
                    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                }, 0);
                const finalCharges = additional_charges !== undefined ? Number(additional_charges) : Number(invoice.additional_charges);
                totalAmount = parseFloat((newItemsTotal + finalCharges).toFixed(2));
            } else if (items !== undefined && !hasNewItems) {
                // items = [] (empty array sent) — manual mode, use manual_total_amount
                totalAmount = parseFloat(parseFloat(req.body.manual_total_amount || 0).toFixed(2));
            } else {
                // items not sent at all — check existing items
                const hasExistingItems = invoice.items && invoice.items.length > 0;
                if (hasExistingItems) {
                    // existing items-ல் இருந்து calculate
                    const existingItemsTotal = invoice.items.reduce((sum, item) => {
                        return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    }, 0);
                    const finalCharges = additional_charges !== undefined ? Number(additional_charges) : Number(invoice.additional_charges);
                    totalAmount = parseFloat((existingItemsTotal + finalCharges).toFixed(2));
                } else {
                    // existing items இல்லை — manual total or existing debit+credit
                    if (req.body.manual_total_amount) {
                        totalAmount = parseFloat(parseFloat(req.body.manual_total_amount).toFixed(2));
                    } else {
                        totalAmount = parseFloat((
                            (debit_entry !== undefined ? Number(debit_entry || 0) : Number(invoice.debit_entry)) +
                            (credit_entry !== undefined ? Number(credit_entry || 0) : Number(invoice.credit_entry))
                        ).toFixed(2));
                    }
                }
            }

            // Debit + Credit = Total Amount validation
            const finalDebit = debit_entry !== undefined ? (debit_entry ? Number(debit_entry) : 0) : Number(invoice.debit_entry);
            const finalCredit = credit_entry !== undefined ? (credit_entry ? Number(credit_entry) : 0) : Number(invoice.credit_entry);
            const sum = parseFloat((finalDebit + finalCredit).toFixed(2));

            if (Object.keys(errors).length === 0 && Math.abs(sum - totalAmount) > 0.01) {
                errors.debit_entry = `Total Amount (\u20B9${totalAmount.toFixed(2)}) must equal Debit + Credit (\u20B9${sum.toFixed(2)})`;
            }

            if (Object.keys(errors).length > 0) {
                if (req.file) {
                    const filePath = path.join(UPLOAD_DIR, req.file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                await transaction.rollback();
                return res.status(400).json({ success: false, message: 'Validation failed', errors });
            }

            const updateData = {
                updated_by: userId,
                updated_at: new Date(),
                invoice_photo: newInvoicePhoto
            };

            if (site_id !== undefined) updateData.site_id = site_id;
            if (vendor_id !== undefined) updateData.vendor_id = vendor_id;
            if (date !== undefined) updateData.date = new Date(date);
            if (invoice_number !== undefined) updateData.invoice_number = invoice_number || null;
            if (additional_charges !== undefined) updateData.additional_charges = Number(additional_charges || 0).toFixed(2);
            if (debit_entry !== undefined) updateData.debit_entry = debit_entry ? Number(debit_entry).toFixed(2) : '0.00';
            if (credit_entry !== undefined) updateData.credit_entry = credit_entry ? Number(credit_entry).toFixed(2) : '0.00';
            if (notes !== undefined) updateData.notes = notes || null;
            if (status !== undefined) updateData.status = Number(status);

            const changedFields = getChangedFields(invoice, updateData);
            await invoice.update(updateData, { transaction });

            // Handle items replacement
            let finalItems = invoice.items;
            if (items !== undefined) {
                // Always delete old items
                await MaterialInvoiceItem.destroy({ where: { invoice_id: id }, transaction });

                if (hasNewItems) {
                    // New items insert பண்ணு
                    const itemsData = items.map(item => ({
                        invoice_id: invoice.id,
                        material_id: item.material_id,
                        quantity: Number(item.quantity),
                        rate: Number(item.rate).toFixed(2)
                    }));
                    await MaterialInvoiceItem.bulkCreate(itemsData, { transaction });
                    finalItems = items;
                } else {
                    // Empty array — no items
                    finalItems = [];
                }
            }

            // History entry
            const historyData = {
                site_id: updateData.site_id !== undefined ? updateData.site_id : invoice.site_id,
                vendor_id: updateData.vendor_id !== undefined ? updateData.vendor_id : invoice.vendor_id,
                date: updateData.date !== undefined ? updateData.date : invoice.date,
                invoice_number: updateData.invoice_number !== undefined ? updateData.invoice_number : invoice.invoice_number,
                additional_charges: updateData.additional_charges !== undefined ? updateData.additional_charges : invoice.additional_charges,
                debit_entry: updateData.debit_entry !== undefined ? updateData.debit_entry : invoice.debit_entry,
                credit_entry: updateData.credit_entry !== undefined ? updateData.credit_entry : invoice.credit_entry,
                notes: updateData.notes !== undefined ? updateData.notes : invoice.notes,
                status: updateData.status !== undefined ? updateData.status : invoice.status,
                invoice_photo: newInvoicePhoto
            };

            const snapshot = createInvoiceSnapshot(historyData, finalItems);
            await MaterialInvoiceHistory.create({
                invoice_id: invoice.id,
                action_type: 'updated',
                snapshot,
                changed_fields: changedFields,
                performed_by: userId,
                performed_at: new Date()
            }, { transaction });

            await transaction.commit();
            res.status(200).json({ success: true, message: 'Material invoice updated successfully' });
        } catch (err) {
            if (req.file) {
                const filePath = path.join(UPLOAD_DIR, req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            await transaction.rollback();
            console.error('updateMaterialInvoice error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // Delete invoice
    deleteMaterialInvoice: async (req, res) => {
        const transaction = await MaterialInvoice.sequelize.transaction();
        try {
            const { id } = req.params;
            const invoice = await MaterialInvoice.findByPk(id, { transaction });

            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: 'Material invoice not found' });
            }

            if (invoice.invoice_photo) {
                const filePath = path.join(UPLOAD_DIR, invoice.invoice_photo);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await invoice.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({ success: true, message: 'Material invoice deleted successfully' });
        } catch (err) {
            await transaction.rollback();
            console.error('deleteMaterialInvoice error:', err);
            res.status(500).json({ success: false, message: 'Failed to delete material invoice' });
        }
    },

    // Get material invoice history
    getMaterialInvoiceHistory: async (req, res) => {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const pageNum = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            const invoice = await MaterialInvoice.findByPk(id);
            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Material invoice not found' });
            }

            const { rows, count } = await MaterialInvoiceHistory.findAndCountAll({
                where: { invoice_id: id },
                order: [['performed_at', 'DESC']],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                include: [{ model: User, as: 'performer', attributes: ['id', 'name', 'email'] }]
            });

            res.status(200).json({ success: true, data: rows, total: count, page: pageNum, limit: limitNum });
        } catch (err) {
            console.error('getMaterialInvoiceHistory error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch material invoice history' });
        }
    },

    // Get active materials for dropdown
    getActiveMaterials: async (req, res) => {
        try {
            const materials = await Material.findAll({
                where: { status: 1 },
                attributes: ['id', 'name', 'standard_rate'],
                include: [{ model: Unit, as: 'unit', attributes: ['name'] }],
                order: [['name', 'ASC']]
            });
            res.status(200).json({ success: true, data: materials });
        } catch (err) {
            console.error('getActiveMaterials error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch materials' });
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
            res.status(200).json({ success: true, data: vendors });
        } catch (err) {
            console.error('getActiveVendors error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
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
            res.status(200).json({ success: true, data: sites });
        } catch (err) {
            console.error('getActiveSites error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch sites' });
        }
    }
};

module.exports = materialInvoiceController;