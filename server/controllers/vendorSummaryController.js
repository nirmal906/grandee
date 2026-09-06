const { Vendor, Site, MaterialInvoice, MaterialInvoiceItem, LabourInvoice, LabourInvoiceItem, Material, Labour, User } = require('../models');
const { Op, sequelize } = require('../models');
const { Unit } = require('../models');

// ─────────────────────────────────────────────
// Generate a unique invoice number for system-generated "split payment"
// invoices (Advance Payment / Additional Payment). Reuses the same
// MI-YYYY-NNNNN sequence as regular material invoices so numbering stays
// consistent across the app. Must run inside the caller's transaction so
// concurrent split-payment invoices don't collide.
// ─────────────────────────────────────────────
const generateSplitPaymentInvoiceNumber = async (transaction) => {
    const year = new Date().getFullYear();
    const prefix = `MI-${year}-`;
    const last = await MaterialInvoice.findOne({
        where: { invoice_number: { [Op.like]: `${prefix}%` } },
        order: [['invoice_number', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    let nextSeq = 1;
    if (last && last.invoice_number) {
        const seq = parseInt(last.invoice_number.replace(prefix, ''), 10);
        if (!isNaN(seq)) nextSeq = seq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

// Same idea, for system-generated split-payment Labour invoices — reuses the
// LI-YYYY-NNNNN sequence so numbering stays consistent with regular labour
// invoices.
const generateSplitPaymentLabourInvoiceNumber = async (transaction) => {
    const year = new Date().getFullYear();
    const prefix = `LI-${year}-`;
    const last = await LabourInvoice.findOne({
        where: { invoice_number: { [Op.like]: `${prefix}%` } },
        order: [['invoice_number', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    let nextSeq = 1;
    if (last && last.invoice_number) {
        const seq = parseInt(last.invoice_number.replace(prefix, ''), 10);
        if (!isNaN(seq)) nextSeq = seq + 1;
    }
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
};

const vendorSummaryController = {

    // ─────────────────────────────────────────────
    // GET all vendors summary — aggregate totals
    // ─────────────────────────────────────────────
    getAllVendorsSummary: async (req, res) => {
        try {
            const { search = '', sort = 'name', order = 'asc' } = req.query;

            const whereClause = { is_active: 1 };
            if (search) {
                whereClause.name = { [Op.like]: `%${search}%` };
            }

            const vendors = await Vendor.findAll({
                where: whereClause,
                attributes: ['id', 'name', 'phone'],
                order: [[sort === 'name' ? 'name' : 'id', order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC']],
            });

            const summaryData = [];

            for (const vendor of vendors) {
                // Material invoices — only active
                const materialInvoices = await MaterialInvoice.findAll({
                    where: { vendor_id: vendor.id, status: 1 },
                    attributes: ['debit_entry', 'credit_entry', 'date', 'updated_at'],
                });

                // Labour invoices — only active + approved
                const labourInvoices = await LabourInvoice.findAll({
                    where: { vendor_id: vendor.id, status: 1, approval_status: 'approved' },
                    attributes: ['debit_entry', 'credit_entry', 'date', 'updated_at'],
                });

                let materialBilled = 0, materialPaid = 0;
                materialInvoices.forEach(inv => {
                    materialBilled += parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0);
                    materialPaid   += parseFloat(inv.credit_entry || 0);
                });

                let labourBilled = 0, labourPaid = 0;
                labourInvoices.forEach(inv => {
                    labourBilled += parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0);
                    labourPaid   += parseFloat(inv.credit_entry || 0);
                });

                const totalBilled  = parseFloat((materialBilled + labourBilled).toFixed(2));
                const totalPaid    = parseFloat((materialPaid + labourPaid).toFixed(2));
                const totalBalance = parseFloat((totalBilled - totalPaid).toFixed(2));

                // Last purchase = most recent invoice date (material or labour)
                // Last paid date = most recent update on an invoice that has received a payment
                const allInvoices = [...materialInvoices, ...labourInvoices];
                const lastPurchase = allInvoices.reduce((latest, inv) => {
                    if (!inv.date) return latest;
                    const d = new Date(inv.date);
                    return (!latest || d > latest) ? d : latest;
                }, null);
                const lastPaidDate = allInvoices.reduce((latest, inv) => {
                    if (parseFloat(inv.credit_entry || 0) <= 0 || !inv.updated_at) return latest;
                    const d = new Date(inv.updated_at);
                    return (!latest || d > latest) ? d : latest;
                }, null);

                // Only include vendors that have at least one invoice
                if (materialInvoices.length > 0 || labourInvoices.length > 0) {
                    summaryData.push({
                        vendor_id:              vendor.id,
                        vendor_name:            vendor.name,
                        vendor_phone:           vendor.phone,
                        material_invoices_count: materialInvoices.length,
                        labour_invoices_count:   labourInvoices.length,
                        material_billed:        parseFloat(materialBilled.toFixed(2)),
                        material_paid:          parseFloat(materialPaid.toFixed(2)),
                        material_balance:       parseFloat((materialBilled - materialPaid).toFixed(2)),
                        labour_billed:          parseFloat(labourBilled.toFixed(2)),
                        labour_paid:            parseFloat(labourPaid.toFixed(2)),
                        labour_balance:         parseFloat((labourBilled - labourPaid).toFixed(2)),
                        total_billed:           totalBilled,
                        total_paid:             totalPaid,
                        total_balance:          totalBalance,
                        last_purchase:          lastPurchase,
                        last_paid_date:         lastPaidDate,
                    });
                }
            }

            res.status(200).json({
                success: true,
                data: summaryData,
                total: summaryData.length,
            });
        } catch (err) {
            console.error('getAllVendorsSummary error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // GET vendor detail — per-site breakdown
    // ─────────────────────────────────────────────
    getVendorDetail: async (req, res) => {
        try {
            const { vendorId } = req.params;

            const vendor = await Vendor.findByPk(vendorId, {
                attributes: ['id', 'name', 'phone', 'email', 'full_address'],
            });
            if (!vendor) {
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }

            // Get all unique sites for this vendor from both invoice types
            const materialSiteIds = await MaterialInvoice.findAll({
                where: { vendor_id: vendorId, status: 1 },
                attributes: ['site_id'],
                group: ['site_id'],
                raw: true,
            });

            const labourSiteIds = await LabourInvoice.findAll({
                where: { vendor_id: vendorId, status: 1, approval_status: 'approved' },
                attributes: ['site_id'],
                group: ['site_id'],
                raw: true,
            });

            const allSiteIds = [...new Set([
                ...materialSiteIds.map(r => r.site_id),
                ...labourSiteIds.map(r => r.site_id),
            ])];

            const sites = await Site.findAll({
                where: { id: { [Op.in]: allSiteIds } },
                attributes: ['id', 'name', 'full_address'],
            });

            const siteBreakdown = [];

            for (const site of sites) {
                const matInvoices = await MaterialInvoice.findAll({
                    where: { vendor_id: vendorId, site_id: site.id, status: 1 },
                    attributes: ['debit_entry', 'credit_entry'],
                });

                const labInvoices = await LabourInvoice.findAll({
                    where: { vendor_id: vendorId, site_id: site.id, status: 1, approval_status: 'approved' },
                    attributes: ['debit_entry', 'credit_entry'],
                });

                let matBilled = 0, matPaid = 0;
                matInvoices.forEach(inv => {
                    matBilled += parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0);
                    matPaid   += parseFloat(inv.credit_entry || 0);
                });

                let labBilled = 0, labPaid = 0;
                labInvoices.forEach(inv => {
                    labBilled += parseFloat(inv.debit_entry || 0) + parseFloat(inv.credit_entry || 0);
                    labPaid   += parseFloat(inv.credit_entry || 0);
                });

                siteBreakdown.push({
                    site_id:            site.id,
                    site_name:          site.name,
                    site_address:       site.full_address,
                    material_billed:    parseFloat(matBilled.toFixed(2)),
                    material_paid:      parseFloat(matPaid.toFixed(2)),
                    material_balance:   parseFloat((matBilled - matPaid).toFixed(2)),
                    material_count:     matInvoices.length,
                    labour_billed:      parseFloat(labBilled.toFixed(2)),
                    labour_paid:        parseFloat(labPaid.toFixed(2)),
                    labour_balance:     parseFloat((labBilled - labPaid).toFixed(2)),
                    labour_count:       labInvoices.length,
                    total_billed:       parseFloat((matBilled + labBilled).toFixed(2)),
                    total_paid:         parseFloat((matPaid + labPaid).toFixed(2)),
                    total_balance:      parseFloat(((matBilled + labBilled) - (matPaid + labPaid)).toFixed(2)),
                });
            }

            res.status(200).json({
                success: true,
                data: {
                    vendor,
                    sites: siteBreakdown,
                },
            });
        } catch (err) {
            console.error('getVendorDetail error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // POST /api/vendor-summary/:vendorId/payment
    // Records a vendor payment.
    //
    // New (preferred) flow — free-form vendor payment:
    //   Body: { payment_amount }
    //   The amount is applied against the vendor's outstanding invoices
    //   automatically (oldest invoice first, across material + labour),
    //   so the caller never has to pick an individual invoice.
    //
    // Legacy flow — kept for backward compatibility:
    //   Body: { invoice_id, invoice_type, payment_amount }
    //   Applies the payment to one specific invoice only.
    // ─────────────────────────────────────────────
    recordVendorPayment: async (req, res) => {
        const t = await Vendor.sequelize.transaction();
        try {
            const { vendorId } = req.params;
            const { invoice_id, invoice_type, payment_amount } = req.body;

            if (!payment_amount) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'payment_amount is required' });
            }

            const amount = parseFloat(payment_amount);
            if (isNaN(amount) || amount <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'payment_amount must be a positive number' });
            }

            const vendor = await Vendor.findOne({ where: { id: vendorId }, transaction: t });
            if (!vendor) {
                await t.rollback();
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }

            const updatedBy = req.user?.userId ?? req.user?.id;

            // ── Legacy flow: payment applied to one specific invoice ──
            if (invoice_id) {
                const Model = invoice_type === 'labour' ? LabourInvoice : MaterialInvoice;

                const invoice = await Model.findOne({
                    where: { id: invoice_id, vendor_id: vendorId },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                if (!invoice) {
                    await t.rollback();
                    return res.status(404).json({ success: false, message: 'Invoice not found for this vendor' });
                }

                const currentDebit  = parseFloat(invoice.debit_entry  || 0);
                const currentCredit = parseFloat(invoice.credit_entry || 0);

                if (amount > currentDebit + 0.01) {
                    await t.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Payment amount (₹${amount.toFixed(2)}) exceeds outstanding balance (₹${currentDebit.toFixed(2)})`
                    });
                }

                const newDebit  = parseFloat((currentDebit  - amount).toFixed(2));
                const newCredit = parseFloat((currentCredit + amount).toFixed(2));

                await invoice.update(
                    { debit_entry: newDebit, credit_entry: newCredit, updated_by: updatedBy },
                    { transaction: t }
                );

                await t.commit();
                return res.status(200).json({
                    success: true,
                    message: `Payment of ₹${amount.toFixed(2)} recorded successfully`,
                    data: { invoice_id, new_debit: newDebit, new_credit: newCredit }
                });
            }

            // ── New flow: free-form vendor payment, auto-applied across outstanding invoices ──
            const matInvoices = await MaterialInvoice.findAll({
                where: { vendor_id: vendorId, status: 1, debit_entry: { [Op.gt]: 0 } },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            const labInvoices = await LabourInvoice.findAll({
                where: { vendor_id: vendorId, status: 1, approval_status: 'approved', debit_entry: { [Op.gt]: 0 } },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            // Oldest invoice first (FIFO), mixing material + labour together
            const outstandingInvoices = [...matInvoices, ...labInvoices].sort((a, b) => {
                const da = new Date(a.date).getTime();
                const db = new Date(b.date).getTime();
                if (da !== db) return da - db;
                return a.id - b.id;
            });

            const totalOutstanding = outstandingInvoices.reduce(
                (sum, inv) => sum + parseFloat(inv.debit_entry || 0), 0
            );

            if (totalOutstanding <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'This vendor has no outstanding balance to pay' });
            }

            if (amount > totalOutstanding + 0.01) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Payment amount (₹${amount.toFixed(2)}) exceeds vendor's total outstanding balance (₹${totalOutstanding.toFixed(2)})`
                });
            }

            let remaining = amount;
            const invoicesUpdated = [];

            for (const invoice of outstandingInvoices) {
                if (remaining <= 0.004) break; // fully applied (allow for rounding)

                const currentDebit  = parseFloat(invoice.debit_entry  || 0);
                const currentCredit = parseFloat(invoice.credit_entry || 0);
                const applyAmount   = Math.min(remaining, currentDebit);

                const newDebit  = parseFloat((currentDebit  - applyAmount).toFixed(2));
                const newCredit = parseFloat((currentCredit + applyAmount).toFixed(2));

                await invoice.update(
                    { debit_entry: newDebit, credit_entry: newCredit, updated_by: updatedBy },
                    { transaction: t }
                );

                invoicesUpdated.push({ invoice_id: invoice.id, applied: parseFloat(applyAmount.toFixed(2)) });
                remaining = parseFloat((remaining - applyAmount).toFixed(2));
            }

            await t.commit();
            res.status(200).json({
                success: true,
                message: `Payment of ₹${amount.toFixed(2)} recorded successfully`,
                data: { vendor_id: vendorId, amount_paid: amount, invoices_updated: invoicesUpdated }
            });
        } catch (err) {
            await t.rollback();
            console.error('recordVendorPayment error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // ─────────────────────────────────────────────
    // POST /api/vendor-summary/:vendorId/split-payment
    // Records an Advance Payment and/or Additional Payment.
    //
    // Unlike recordVendorPayment (which pays down existing outstanding
    // invoices), this creates brand-new, fully-paid material invoices —
    // one per site — for a payment the admin is splitting across active
    // sites. This is used for money paid ahead of a regular invoice
    // (Advance Payment) or money paid beyond what's currently billed
    // (Additional Payment). The two modes are not mutually exclusive;
    // whichever are selected are recorded together in the invoice notes.
    //
    //   Body: {
    //     payment_types:   ['advance' | 'additional', ...]  (at least one)
    //     payment_amount:  number
    //     payment_date:    'YYYY-MM-DD'
    //     payment_method:  string (optional, e.g. 'Bank Transfer')
    //     reference_notes: string (optional)
    //     allocations:     [{ site_id, amount }, ...]  — must sum to
    //                      payment_amount and only reference active sites
    //   }
    // ─────────────────────────────────────────────
    recordSplitPayment: async (req, res) => {
        const t = await Vendor.sequelize.transaction();
        try {
            const { vendorId } = req.params;
            const {
                payment_types = [],
                invoice_types = [],
                payment_amount,
                payment_date,
                payment_method,
                reference_notes,
                allocations = [],
            } = req.body;

            const VALID_TYPES = ['advance', 'additional'];
            const types = Array.isArray(payment_types) ? payment_types : [];
            if (types.length === 0 || types.some(pt => !VALID_TYPES.includes(pt))) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Select at least one payment mode (Advance Payment or Additional Payment)' });
            }

            // Which invoice ledger(s) this payment should be recorded against —
            // Material and/or Labour. Required so Vendor Summary's per-category
            // totals (Material Billed/Paid, Labour Billed/Paid) stay accurate;
            // previously every split payment was silently recorded as a Material
            // invoice regardless of what it actually paid for.
            const VALID_INVOICE_TYPES = ['material', 'labour'];
            const invoiceTypes = Array.isArray(invoice_types) ? invoice_types : [];
            if (invoiceTypes.length === 0 || invoiceTypes.some(it => !VALID_INVOICE_TYPES.includes(it))) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Select at least one invoice type (Material or Labour)' });
            }

            const amount = parseFloat(payment_amount);
            if (!payment_amount || isNaN(amount) || amount <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'payment_amount must be a positive number' });
            }

            if (!payment_date) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'payment_date is required' });
            }

            const vendor = await Vendor.findOne({ where: { id: vendorId }, transaction: t });
            if (!vendor) {
                await t.rollback();
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }

            // Clean + validate the site allocations
            const cleanAllocations = (Array.isArray(allocations) ? allocations : [])
                .map(a => ({ site_id: a.site_id, amount: parseFloat(a.amount) }))
                .filter(a => a.site_id && !isNaN(a.amount) && a.amount > 0);

            if (cleanAllocations.length === 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Allocate the payment amount to at least one active site' });
            }

            const totalAllocated = parseFloat(cleanAllocations.reduce((sum, a) => sum + a.amount, 0).toFixed(2));
            if (Math.abs(totalAllocated - amount) > 0.01) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Total allocated (₹${totalAllocated.toFixed(2)}) must equal the payment amount (₹${amount.toFixed(2)})`
                });
            }

            const siteIds = [...new Set(cleanAllocations.map(a => String(a.site_id)))];
            const sites = await Site.findAll({
                where: { id: { [Op.in]: siteIds }, is_active: 1 },
                transaction: t,
            });
            if (sites.length !== siteIds.length) {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'One or more selected sites are not active' });
            }
            const siteMap = new Map(sites.map(s => [String(s.id), s]));

            const updatedBy = req.user?.userId ?? req.user?.id;

            const modeLabels = types.map(pt => (pt === 'advance' ? 'Advance Payment' : 'Additional Payment'));
            const invoiceTypeLabels = invoiceTypes.map(it => (it === 'material' ? 'Material' : 'Labour'));
            const noteParts = [`Payment Mode: ${modeLabels.join(', ')}`, `Payment Date: ${payment_date}`, `Invoice Type: ${invoiceTypeLabels.join(', ')}`];
            if (payment_method) noteParts.push(`Mode: ${payment_method}`);
            if (reference_notes) noteParts.push(`Reference: ${reference_notes}`);
            const notesText = noteParts.join(' | ');

            // For every selected invoice type, create a fully-paid invoice for each
            // allocated site amount — matches how the amount is entered (per-site,
            // not split further per type).
            const createdInvoices = [];
            for (const invoiceType of invoiceTypes) {
                for (const alloc of cleanAllocations) {
                    const site = siteMap.get(String(alloc.site_id));
                    const allocAmount = parseFloat(alloc.amount.toFixed(2));

                    if (invoiceType === 'material') {
                        const invoiceNumber = await generateSplitPaymentInvoiceNumber(t);
                        const invoice = await MaterialInvoice.create({
                            site_id: alloc.site_id,
                            vendor_id: vendorId,
                            date: new Date(payment_date),
                            invoice_number: invoiceNumber,
                            additional_charges: 0,
                            manual_total_amount: allocAmount,
                            debit_entry: 0,
                            credit_entry: allocAmount,
                            notes: notesText,
                            status: 1,
                            created_by: updatedBy,
                            updated_by: updatedBy,
                        }, { transaction: t });

                        createdInvoices.push({
                            invoice_id: invoice.id,
                            invoice_number: invoiceNumber,
                            invoice_type: 'material',
                            site_id: alloc.site_id,
                            site_name: site.name,
                            amount: allocAmount,
                        });
                    } else {
                        const invoiceNumber = await generateSplitPaymentLabourInvoiceNumber(t);
                        const invoice = await LabourInvoice.create({
                            site_id: alloc.site_id,
                            vendor_id: vendorId,
                            date: new Date(payment_date),
                            invoice_number: invoiceNumber,
                            manual_total_amount: allocAmount,
                            debit_entry: 0,
                            credit_entry: allocAmount,
                            notes: notesText,
                            status: 1,
                            approval_status: 'approved',
                            rejection_reason: null,
                            created_by: updatedBy,
                            updated_by: updatedBy,
                        }, { transaction: t });

                        createdInvoices.push({
                            invoice_id: invoice.id,
                            invoice_number: invoiceNumber,
                            invoice_type: 'labour',
                            site_id: alloc.site_id,
                            site_name: site.name,
                            amount: allocAmount,
                        });
                    }
                }
            }

            await t.commit();
            res.status(201).json({
                success: true,
                message: `${modeLabels.join(' & ')} of ₹${amount.toFixed(2)} recorded as ${invoiceTypeLabels.join(' & ')} across ${cleanAllocations.length} site${cleanAllocations.length > 1 ? 's' : ''}`,
                data: { vendor_id: vendorId, amount_paid: amount, invoices: createdInvoices }
            });
        } catch (err) {
            await t.rollback();
            console.error('recordSplitPayment error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },

    // GET /api/vendor-summary/:vendorId/pending-invoices
    getPendingInvoicesByVendor: async (req, res) => {
        try {
            const { vendorId } = req.params;

            const matInvoices = await MaterialInvoice.findAll({
                where: { vendor_id: vendorId, status: 1, debit_entry: { [Op.gt]: 0 } },
                include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
                attributes: ['id', 'invoice_number', 'date', 'debit_entry', 'credit_entry', 'site_id'],
                order: [['date', 'DESC']],
            });

            const labInvoices = await LabourInvoice.findAll({
                where: { vendor_id: vendorId, status: 1, approval_status: 'approved', debit_entry: { [Op.gt]: 0 } },
                include: [{ model: Site, as: 'site', attributes: ['id', 'name'] }],
                attributes: ['id', 'invoice_number', 'date', 'debit_entry', 'credit_entry', 'site_id'],
                order: [['date', 'DESC']],
            });

            const combined = [
                ...matInvoices.map(inv => ({ ...inv.toJSON(), type: 'material', typelabel: 'Material' })),
                ...labInvoices.map(inv => ({ ...inv.toJSON(), type: 'labour',   typelabel: 'Labour'   })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date));

            res.status(200).json({ success: true, data: combined });
        } catch (err) {
            console.error('getPendingInvoicesByVendor error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong.' });
        }
    },

    // ─────────────────────────────────────────────
    // GET vendor + site invoices — list all invoices
    // ─────────────────────────────────────────────
    getVendorSiteInvoices: async (req, res) => {
        try {
            const { vendorId, siteId } = req.params;

            const vendor = await Vendor.findByPk(vendorId, { attributes: ['id', 'name'] });
            if (!vendor) {
                return res.status(404).json({ success: false, message: 'Vendor not found' });
            }

            const site = await Site.findByPk(siteId, { attributes: ['id', 'name'] });
            if (!site) {
                return res.status(404).json({ success: false, message: 'Site not found' });
            }

            // Material invoices for this vendor+site
            const materialInvoices = await MaterialInvoice.findAll({
                where: { vendor_id: vendorId, site_id: siteId, status: 1 },
                order: [['date', 'DESC']],
                include: [
                    {
                        model: MaterialInvoiceItem,
                        as: 'items',
                        include: [{
                            model: Material,
                            as: 'material',
                            attributes: ['id', 'name'],
                            include: [{ model: Unit, as: 'unit', attributes: ['name'] }],
                        }],
                    },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                ],
            });

            // Labour invoices for this vendor+site
            const labourInvoices = await LabourInvoice.findAll({
                where: { vendor_id: vendorId, site_id: siteId, status: 1, approval_status: 'approved' },
                order: [['date', 'DESC']],
                include: [
                    {
                        model: LabourInvoiceItem,
                        as: 'items',
                        include: [{
                            model: Labour,
                            as: 'labour',
                            attributes: ['id', 'name'],
                        }],
                    },
                    { model: User, as: 'creator', attributes: ['id', 'name'] },
                ],
            });

            res.status(200).json({
                success: true,
                data: {
                    vendor,
                    site,
                    material_invoices: materialInvoices,
                    labour_invoices:   labourInvoices,
                },
            });
        } catch (err) {
            console.error('getVendorSiteInvoices error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },
};

module.exports = vendorSummaryController;
