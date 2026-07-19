const { Vendor, Site, MaterialInvoice, MaterialInvoiceItem, LabourInvoice, LabourInvoiceItem, Material, Labour, User } = require('../models');
const { Op, sequelize } = require('../models');
const { Unit } = require('../models');

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
