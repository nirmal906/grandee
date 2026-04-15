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
                    attributes: ['debit_entry', 'credit_entry'],
                });

                // Labour invoices — only active + approved
                const labourInvoices = await LabourInvoice.findAll({
                    where: { vendor_id: vendor.id, status: 1, approval_status: 'approved' },
                    attributes: ['debit_entry', 'credit_entry'],
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
