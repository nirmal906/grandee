const { sequelize, Sequelize, User, Role, UserRole, Site, MaterialEntry, LabourEntry, Material, Labour, Vendor, SitePayment } = require('../models');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const bcrypt           = require('bcryptjs');
const { v4: uuidv4 }   = require('uuid');
const authController   = require('./authController');
const BASE_URL         = process.env.BASE_URL || 'http://localhost:5000';
const ALLOWED_STATUSES = ['active', 'completed'];

const actionController = {

    getSiteSummary: async (req, res) => {
        try {
            const { site_id, page = 1, limit = 10 } = req.query;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id || null);
            if (allowedIds.length === 0) {
                return res.status(200).json({
                    success:    true,
                    message:    'Site summary fetched successfully',
                    data:       [],
                    pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), total_pages: 0 },
                });
            }

            const pageNum  = parseInt(page);
            const limitNum = parseInt(limit);
            const offset   = (pageNum - 1) * limitNum;

            const { count: totalCount, rows: sites } = await Site.findAndCountAll({
                where: {
                    is_active: 1,
                    status:    { [Op.in]: ALLOWED_STATUSES },
                    id:        { [Op.in]: allowedIds },
                },
                attributes: ['id', 'name', 'start_date', 'updated_at', 'total_budget', 'status', 'client_name'],
                order:      [['name', 'ASC']],
                limit:      limitNum,
                offset,
                raw:        true,
            });

            const summaryData = await Promise.all(sites.map(async (site) => {
                const [matResult, labResult, payResult] = await Promise.all([
                    sequelize.query(`
                        SELECT
                            COALESCE(SUM(credit_entry), 0)                                                AS paid,
                            COALESCE(SUM((quantity * rate) + additional_charges), 0)                      AS total,
                            COALESCE(SUM((quantity * rate) + additional_charges) - SUM(credit_entry), 0)  AS pending
                        FROM material_entrys
                        WHERE site_id = :site_id AND status = 1
                    `, { replacements: { site_id: site.id }, type: QueryTypes.SELECT }),

                    // ── Only approved labour entries count toward financials ──
                    sequelize.query(`
                        SELECT
                            COALESCE(SUM(credit_entry), 0)                                                AS paid,
                            COALESCE(SUM(no_of_workers * rate_per_worker), 0)                             AS total,
                            COALESCE(SUM(no_of_workers * rate_per_worker) - SUM(credit_entry), 0)         AS pending
                        FROM labour_entrys
                        WHERE site_id = :site_id
                          AND status = 1
                          AND approval_status = 'approved'
                    `, { replacements: { site_id: site.id }, type: QueryTypes.SELECT }),

                    SitePayment.findOne({
                        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                        where:      { site_id: site.id, status: 1 },
                        raw:        true,
                    }),
                ]);

                const materialPaid    = parseFloat(matResult[0]?.paid    || 0);
                const materialPending = Math.max(0, parseFloat(matResult[0]?.pending || 0));
                const labourPaid      = parseFloat(labResult[0]?.paid    || 0);
                const labourPending   = Math.max(0, parseFloat(labResult[0]?.pending || 0));
                const clientPaid      = parseFloat(payResult?.total      || 0);
                const totalBudget     = parseFloat(site.total_budget     || 0);
                const totalExpense    = materialPaid + labourPaid;
                const totalPending    = materialPending + labourPending;
                const totalInvoiced   = totalExpense + totalPending;
                const budgetUsedPct   = totalBudget > 0
                    ? Math.min(Math.round((totalInvoiced / totalBudget) * 100), 100)
                    : 0;

                return {
                    id:               site.id,
                    name:             site.name,
                    client_name:      site.client_name,
                    start_date:       site.start_date,
                    end_date:         site.status === 'completed' ? site.updated_at : null,
                    status:           site.status,
                    total_budget:     totalBudget,
                    total_expense:    totalExpense,
                    material_expense: materialPaid,
                    labour_expense:   labourPaid,
                    total_invoiced:   totalInvoiced,
                    total_pending:    totalPending,
                    material_pending: materialPending,
                    labour_pending:   labourPending,
                    client_paid:      clientPaid,
                    balance:          totalBudget - totalInvoiced,
                    budget_used_pct:  budgetUsedPct,
                };
            }));

            res.status(200).json({
                success:    true,
                message:    'Site summary fetched successfully',
                data:       summaryData,
                pagination: {
                    total:       totalCount,
                    page:        pageNum,
                    limit:       limitNum,
                    total_pages: Math.ceil(totalCount / limitNum),
                },
            });
        } catch (err) {
            console.error('Site summary error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch site summary', error: err.message });
        }
    },

    getSitePayoutPending: async (req, res) => {
        try {
            const { site_id } = req.params;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id);
            if (allowedIds.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied to this site.' });
            }

            const [materialRows, labourRows] = await Promise.all([
                sequelize.query(`
                    SELECT
                        me.id,
                        me.date,
                        me.quantity,
                        me.rate,
                        me.additional_charges,
                        me.credit_entry,
                        (me.quantity * me.rate + me.additional_charges)                         AS total_amount,
                        (me.quantity * me.rate + me.additional_charges - me.credit_entry)        AS pending_amount,
                        m.name AS material_name,
                        v.name AS vendor_name
                    FROM material_entrys me
                    LEFT JOIN materials m ON m.id = me.material_id
                    LEFT JOIN vendors   v ON v.id = me.vendor_id
                    WHERE me.site_id = :site_id
                      AND me.status  = 1
                      AND (me.quantity * me.rate + me.additional_charges - me.credit_entry) > 0
                    ORDER BY me.date DESC
                `, { replacements: { site_id: parseInt(site_id) }, type: QueryTypes.SELECT }),

                // ── Only approved labour entries in payout pending ──
                sequelize.query(`
                    SELECT
                        le.id,
                        le.date,
                        le.no_of_workers                                                         AS quantity,
                        le.rate_per_worker                                                       AS rate,
                        le.credit_entry,
                        (le.no_of_workers * le.rate_per_worker)                                  AS total_amount,
                        (le.no_of_workers * le.rate_per_worker - le.credit_entry)                AS pending_amount,
                        l.name AS labour_name
                    FROM labour_entrys le
                    LEFT JOIN labours l ON l.id = le.labour_id
                    WHERE le.site_id = :site_id
                      AND le.status  = 1
                      AND le.approval_status = 'approved'
                      AND (le.no_of_workers * le.rate_per_worker - le.credit_entry) > 0
                    ORDER BY le.date DESC
                `, { replacements: { site_id: parseInt(site_id) }, type: QueryTypes.SELECT }),
            ]);

            const materials = materialRows.map(e => ({
                id:                 e.id,
                type:               'material',
                date:               e.date,
                name:               e.material_name || 'N/A',
                vendor:             e.vendor_name   || '-',
                quantity:           parseFloat(e.quantity           || 0),
                rate:               parseFloat(e.rate               || 0),
                additional_charges: parseFloat(e.additional_charges || 0),
                total_amount:       parseFloat(e.total_amount       || 0),
                paid_amount:        parseFloat(e.credit_entry       || 0),
                pending_amount:     parseFloat(e.pending_amount     || 0),
            }));

            const labours = labourRows.map(e => ({
                id:                 e.id,
                type:               'labour',
                date:               e.date,
                name:               e.labour_name || 'N/A',
                vendor:             '-',
                quantity:           parseFloat(e.quantity       || 0),
                rate:               parseFloat(e.rate           || 0),
                additional_charges: 0,
                total_amount:       parseFloat(e.total_amount   || 0),
                paid_amount:        parseFloat(e.credit_entry   || 0),
                pending_amount:     parseFloat(e.pending_amount || 0),
            }));

            const totalMaterialPending = materials.reduce((s, i) => s + i.pending_amount, 0);
            const totalLabourPending   = labours.reduce((s, i)   => s + i.pending_amount, 0);

            res.status(200).json({
                success: true,
                data: { materials, labours },
                total_pending: {
                    material: totalMaterialPending,
                    labour:   totalLabourPending,
                    total:    totalMaterialPending + totalLabourPending,
                },
            });
        } catch (err) {
            console.error('Payout pending error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch payout data', error: err.message });
        }
    },

    markMaterialEntryPaid: async (req, res) => {
        try {
            const { entry_id } = req.params;
            const entry = await MaterialEntry.findByPk(entry_id);
            if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

            const allowedIds = await resolveAllowedSiteIds(req.user, entry.site_id);
            if (allowedIds.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied to this site.' });
            }

            const totalAmount = (parseFloat(entry.quantity) * parseFloat(entry.rate))
                + parseFloat(entry.additional_charges || 0);
            await entry.update({ credit_entry: totalAmount, debit_entry: 0, updated_at: new Date() });
            res.status(200).json({ success: true, message: 'Material entry marked as paid' });
        } catch (err) {
            console.error('Mark material paid error:', err);
            res.status(500).json({ success: false, message: 'Failed to update entry', error: err.message });
        }
    },

    markLabourEntryPaid: async (req, res) => {
        try {
            const { entry_id } = req.params;
            // ── Only approved entries can be marked paid ──
            const entry = await LabourEntry.findOne({
                where: { id: entry_id, approval_status: 'approved' },
            });
            if (!entry) return res.status(404).json({ success: false, message: 'Entry not found or not yet approved' });

            const allowedIds = await resolveAllowedSiteIds(req.user, entry.site_id);
            if (allowedIds.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied to this site.' });
            }

            const totalAmount = parseFloat(entry.no_of_workers) * parseFloat(entry.rate_per_worker);
            await entry.update({ credit_entry: totalAmount, debit_entry: 0, updated_at: new Date() });
            res.status(200).json({ success: true, message: 'Labour entry marked as paid' });
        } catch (err) {
            console.error('Mark labour paid error:', err);
            res.status(500).json({ success: false, message: 'Failed to update entry', error: err.message });
        }
    },

    getDashboardStats: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id || null);
            if (allowedIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Dashboard data fetched successfully',
                    data: {
                        activeSites:       { count: 0,  change: 0, changeType: 'neutral' },
                        totalBudget:       { amount: 0, change: 0, changeType: 'neutral', percentage: 100 },
                        materialExpense:   { amount: 0, change: 0, changeType: 'neutral', percentage: 0 },
                        labourExpense:     { amount: 0, change: 0, changeType: 'neutral', percentage: 0 },
                        totalExpense:      { amount: 0, change: 0, changeType: 'neutral', percentage: 0 },
                        clientPayments:    { amount: 0, change: 0, changeType: 'neutral', percentage: 0, outstanding: 0, outstandingPercentage: 0 },
                        budgetUtilization: { percentage: 0, remaining: 0, remainingPercentage: 0 },
                        cashFlow:          { amount: 0, percentage: 0, status: 'surplus', changeType: 'neutral' },
                    },
                });
            }

            const dateFilter        = {};
            const paymentDateFilter = {};
            if (from_date && to_date) {
                dateFilter.date                = { [Op.between]: [from_date, to_date] };
                paymentDateFilter.payment_date = { [Op.between]: [from_date, to_date] };
            }

            const siteFilter = { site_id: { [Op.in]: allowedIds } };

            const activeSites = await Site.count({
                where: { status: 'active', is_active: 1, id: { [Op.in]: allowedIds } },
            });

            const totalBudgetResult = await Site.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('total_budget')), 0), 'total']],
                where:      { is_active: 1, status: { [Op.in]: ALLOWED_STATUSES }, id: { [Op.in]: allowedIds } },
                raw:        true,
            });
            const totalBudget = parseFloat(totalBudgetResult?.total || 0);

            const materialExpenseResult = await MaterialEntry.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('credit_entry')), 0), 'total']],
                where:      { status: 1, ...dateFilter, ...siteFilter },
                raw:        true,
            });
            const materialExpense = parseFloat(materialExpenseResult?.total || 0);

            // ── Only approved labour entries count toward expense stats ──
            const labourExpenseResult = await LabourEntry.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('credit_entry')), 0), 'total']],
                where:      { status: 1, approval_status: 'approved', ...dateFilter, ...siteFilter },
                raw:        true,
            });
            const labourExpense = parseFloat(labourExpenseResult?.total || 0);
            const totalExpense  = materialExpense + labourExpense;

            const clientPaymentsResult = await SitePayment.findOne({
                attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                where:      { status: 1, ...paymentDateFilter, ...siteFilter },
                raw:        true,
            });
            const clientPaid = parseFloat(clientPaymentsResult?.total || 0);

            // Previous period comparison
            let previousPeriodData = { materialExpense: 0, labourExpense: 0, totalExpense: 0, clientPaid: 0 };
            if (from_date && to_date) {
                const fromDateObj      = new Date(from_date);
                const toDateObj        = new Date(to_date);
                const daysDiff         = Math.ceil((toDateObj - fromDateObj) / (1000 * 60 * 60 * 24)) + 1;
                const previousFromDate = new Date(fromDateObj);
                previousFromDate.setDate(previousFromDate.getDate() - daysDiff);
                const previousToDate = new Date(fromDateObj);
                previousToDate.setDate(previousToDate.getDate() - 1);

                const prevDateFilter = {
                    date: {
                        [Op.between]: [
                            previousFromDate.toISOString().split('T')[0],
                            previousToDate.toISOString().split('T')[0],
                        ],
                    },
                };
                const prevPaymentDateFilter = {
                    payment_date: {
                        [Op.between]: [
                            previousFromDate.toISOString().split('T')[0],
                            previousToDate.toISOString().split('T')[0],
                        ],
                    },
                };

                const [prevMat, prevLab, prevPay] = await Promise.all([
                    MaterialEntry.findOne({
                        attributes: [[fn('COALESCE', fn('SUM', col('credit_entry')), 0), 'total']],
                        where: { status: 1, ...prevDateFilter, ...siteFilter },
                        raw:   true,
                    }),
                    // ── approved only for previous period too ──
                    LabourEntry.findOne({
                        attributes: [[fn('COALESCE', fn('SUM', col('credit_entry')), 0), 'total']],
                        where: { status: 1, approval_status: 'approved', ...prevDateFilter, ...siteFilter },
                        raw:   true,
                    }),
                    SitePayment.findOne({
                        attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                        where: { status: 1, ...prevPaymentDateFilter, ...siteFilter },
                        raw:   true,
                    }),
                ]);
                previousPeriodData.materialExpense = parseFloat(prevMat?.total || 0);
                previousPeriodData.labourExpense   = parseFloat(prevLab?.total || 0);
                previousPeriodData.totalExpense    = previousPeriodData.materialExpense + previousPeriodData.labourExpense;
                previousPeriodData.clientPaid      = parseFloat(prevPay?.total || 0);
            }

            const calculateChange = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            const materialChange     = calculateChange(materialExpense, previousPeriodData.materialExpense);
            const labourChange       = calculateChange(labourExpense,   previousPeriodData.labourExpense);
            const totalExpenseChange = calculateChange(totalExpense,    previousPeriodData.totalExpense);
            const clientPaidChange   = calculateChange(clientPaid,      previousPeriodData.clientPaid);

            const materialPercentage     = totalBudget > 0 ? (materialExpense / totalBudget) * 100 : 0;
            const labourPercentage       = totalBudget > 0 ? (labourExpense   / totalBudget) * 100 : 0;
            const totalExpensePercentage = totalBudget > 0 ? (totalExpense    / totalBudget) * 100 : 0;
            const clientPaidPercentage   = totalBudget > 0 ? (clientPaid      / totalBudget) * 100 : 0;
            const remainingPercentage    = totalBudget > 0 ? ((totalBudget - totalExpense) / totalBudget) * 100 : 0;
            const outstandingPercentage  = totalBudget > 0 ? ((totalBudget - clientPaid)   / totalBudget) * 100 : 0;
            const cashFlow               = clientPaid - totalExpense;
            const cashFlowPercentage     = totalBudget > 0 ? (cashFlow / totalBudget) * 100 : 0;

            res.status(200).json({
                success: true,
                message: 'Dashboard data fetched successfully',
                data: {
                    activeSites:     { count: activeSites, change: 0, changeType: 'neutral' },
                    totalBudget:     { amount: totalBudget, change: 0, changeType: 'neutral', percentage: 100 },
                    materialExpense: {
                        amount: materialExpense, change: materialChange,
                        changeType: materialChange > 0 ? 'negative' : materialChange < 0 ? 'positive' : 'neutral',
                        percentage: Math.round(materialPercentage * 100) / 100,
                    },
                    labourExpense: {
                        amount: labourExpense, change: labourChange,
                        changeType: labourChange > 0 ? 'negative' : labourChange < 0 ? 'positive' : 'neutral',
                        percentage: Math.round(labourPercentage * 100) / 100,
                    },
                    totalExpense: {
                        amount: totalExpense, change: totalExpenseChange,
                        changeType: totalExpenseChange > 0 ? 'negative' : totalExpenseChange < 0 ? 'positive' : 'neutral',
                        percentage: Math.round(totalExpensePercentage * 100) / 100,
                    },
                    clientPayments: {
                        amount: clientPaid, change: clientPaidChange,
                        changeType: clientPaidChange > 0 ? 'positive' : clientPaidChange < 0 ? 'negative' : 'neutral',
                        percentage: Math.round(clientPaidPercentage * 100) / 100,
                        outstanding: totalBudget - clientPaid,
                        outstandingPercentage: Math.round(outstandingPercentage * 100) / 100,
                    },
                    budgetUtilization: {
                        percentage:          Math.round(totalExpensePercentage * 100) / 100,
                        remaining:           totalBudget - totalExpense,
                        remainingPercentage: Math.round(remainingPercentage * 100) / 100,
                    },
                    cashFlow: {
                        amount:     cashFlow,
                        percentage: Math.round(cashFlowPercentage * 100) / 100,
                        status:     cashFlow >= 0 ? 'surplus' : 'deficit',
                        changeType: cashFlow >= 0 ? 'positive' : 'negative',
                    },
                },
            });
        } catch (err) {
            console.error('Dashboard stats error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics', error: err.message });
        }
    },

    getTransactions: async (req, res) => {
        try {
            const { from_date, to_date, site_id, type } = req.query;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id || null);
            if (allowedIds.length === 0) {
                return res.status(200).json({ success: true, message: 'Transactions fetched successfully', data: [], count: 0 });
            }

            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = { [Op.between]: [from_date, to_date] };
            }
            const siteFilter   = { site_id: { [Op.in]: allowedIds } };
            const transactions = [];

            if (!type || type === 'material') {
                const materialEntries = await MaterialEntry.findAll({
                    where:   { status: 1, ...dateFilter, ...siteFilter },
                    include: [
                        { model: Site,     attributes: ['name'], as: 'site'                    },
                        { model: Material, attributes: ['name'], as: 'material'                },
                        { model: Vendor,   attributes: ['name'], as: 'vendor', required: false },
                    ],
                    order: [['date', 'DESC']],
                    raw:   true,
                    nest:  true,
                });
                materialEntries.forEach(entry => {
                    const baseAmount    = (parseFloat(entry.quantity || 0) * parseFloat(entry.rate || 0)) + parseFloat(entry.additional_charges || 0);
                    const paidAmount    = parseFloat(entry.credit_entry || 0);
                    const pendingAmount = parseFloat(entry.debit_entry  || 0);
                    transactions.push({
                        id:                 `M-${entry.id}`,
                        date:               entry.date,
                        transaction_type:   'Material',
                        entry_type:         null,
                        site_name:          entry.site?.name     || 'N/A',
                        item_name:          entry.material?.name || 'N/A',
                        quantity:           parseFloat(entry.quantity           || 0),
                        rate:               parseFloat(entry.rate               || 0),
                        amount:             paidAmount,
                        vendor_name:        entry.vendor?.name   || null,
                        additional_charges: parseFloat(entry.additional_charges || 0),
                        original_id:        entry.id,
                        created_at:         entry.created_at,
                        debit_entry:        pendingAmount,
                        total_amount:       baseAmount,
                    });
                });
            }

            if (!type || type === 'labour') {
                // ── Only approved labour entries appear in transactions ──
                const labourEntries = await LabourEntry.findAll({
                    where:   { status: 1, approval_status: 'approved', ...dateFilter, ...siteFilter },
                    include: [
                        { model: Site,   attributes: ['name'], as: 'site'   },
                        { model: Labour, attributes: ['name'], as: 'labour' },
                    ],
                    order: [['date', 'DESC']],
                    raw:   true,
                    nest:  true,
                });
                labourEntries.forEach(entry => {
                    const totalAmount   = parseFloat(entry.no_of_workers || 0) * parseFloat(entry.rate_per_worker || 0);
                    const paidAmount    = parseFloat(entry.credit_entry || 0);
                    const pendingAmount = parseFloat(entry.debit_entry  || 0);
                    transactions.push({
                        id:                 `L-${entry.id}`,
                        date:               entry.date,
                        transaction_type:   'Labour',
                        entry_type:         null,
                        site_name:          entry.site?.name   || 'N/A',
                        item_name:          entry.labour?.name || 'N/A',
                        quantity:           parseFloat(entry.no_of_workers   || 0),
                        rate:               parseFloat(entry.rate_per_worker || 0),
                        amount:             paidAmount,
                        vendor_name:        null,
                        additional_charges: 0,
                        original_id:        entry.id,
                        created_at:         entry.created_at,
                        debit_entry:        pendingAmount,
                        total_amount:       totalAmount,
                    });
                });
            }

            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            res.status(200).json({
                success: true,
                message: 'Transactions fetched successfully',
                data:    transactions,
                count:   transactions.length,
            });
        } catch (err) {
            console.error('Transaction fetch error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: err.message });
        }
    },

    getMaterialPending: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id || null);
            if (allowedIds.length === 0) {
                return res.status(200).json({ success: true, message: 'Material pending expenses fetched successfully', data: [], total_pending: 0, count: 0 });
            }

            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = { [Op.between]: [from_date, to_date] };
            }
            const siteFilter = { site_id: { [Op.in]: allowedIds } };

            const materialPending = await MaterialEntry.findAll({
                where: { status: 1, debit_entry: { [Op.gt]: 0 }, ...dateFilter, ...siteFilter },
                include: [
                    { model: Site,     attributes: ['name'], as: 'site'                    },
                    { model: Material, attributes: ['name'], as: 'material'                },
                    { model: Vendor,   attributes: ['name'], as: 'vendor', required: false },
                ],
                order: [['date', 'DESC']],
                raw:   true,
                nest:  true,
            });

            const pendingData = materialPending.map(entry => {
                const totalAmount   = (parseFloat(entry.quantity || 0) * parseFloat(entry.rate || 0)) + parseFloat(entry.additional_charges || 0);
                const paidAmount    = parseFloat(entry.credit_entry || 0);
                const pendingAmount = parseFloat(entry.debit_entry  || 0);
                return {
                    id:                 entry.id,
                    date:               entry.date,
                    site_name:          entry.site?.name     || 'N/A',
                    material_name:      entry.material?.name || 'N/A',
                    vendor_name:        entry.vendor?.name   || 'N/A',
                    quantity:           parseFloat(entry.quantity           || 0),
                    rate:               parseFloat(entry.rate               || 0),
                    total_amount:       totalAmount,
                    paid_amount:        paidAmount,
                    pending_amount:     pendingAmount,
                    additional_charges: parseFloat(entry.additional_charges || 0),
                    created_at:         entry.created_at,
                };
            });

            const totalPending = pendingData.reduce((sum, item) => sum + item.pending_amount, 0);
            res.status(200).json({
                success:       true,
                message:       'Material pending expenses fetched successfully',
                data:          pendingData,
                total_pending: totalPending,
                count:         pendingData.length,
            });
        } catch (err) {
            console.error('Material pending fetch error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch material pending expenses', error: err.message });
        }
    },

    getLabourPending: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;

            const allowedIds = await resolveAllowedSiteIds(req.user, site_id || null);
            if (allowedIds.length === 0) {
                return res.status(200).json({ success: true, message: 'Labour pending expenses fetched successfully', data: [], total_pending: 0, count: 0 });
            }

            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = { [Op.between]: [from_date, to_date] };
            }
            const siteFilter = { site_id: { [Op.in]: allowedIds } };

            // ── Only approved labour entries with outstanding debit ──
            const labourPending = await LabourEntry.findAll({
                where: {
                    status:          1,
                    approval_status: 'approved',
                    debit_entry:     { [Op.gt]: 0 },
                    ...dateFilter,
                    ...siteFilter,
                },
                include: [
                    { model: Site,   attributes: ['name'], as: 'site'   },
                    { model: Labour, attributes: ['name'], as: 'labour' },
                ],
                order: [['date', 'DESC']],
                raw:   true,
                nest:  true,
            });

            const pendingData = labourPending.map(entry => {
                const totalAmount   = parseFloat(entry.no_of_workers || 0) * parseFloat(entry.rate_per_worker || 0);
                const paidAmount    = parseFloat(entry.credit_entry || 0);
                const pendingAmount = parseFloat(entry.debit_entry  || 0);
                return {
                    id:              entry.id,
                    date:            entry.date,
                    site_name:       entry.site?.name   || 'N/A',
                    labour_name:     entry.labour?.name || 'N/A',
                    no_of_workers:   parseFloat(entry.no_of_workers   || 0),
                    rate_per_worker: parseFloat(entry.rate_per_worker || 0),
                    total_amount:    totalAmount,
                    paid_amount:     paidAmount,
                    pending_amount:  pendingAmount,
                    created_at:      entry.created_at,
                };
            });

            const totalPending = pendingData.reduce((sum, item) => sum + item.pending_amount, 0);
            res.status(200).json({
                success:       true,
                message:       'Labour pending expenses fetched successfully',
                data:          pendingData,
                total_pending: totalPending,
                count:         pendingData.length,
            });
        } catch (err) {
            console.error('Labour pending fetch error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch labour pending expenses', error: err.message });
        }
    },

    getActiveSites: async (req, res) => {
        try {
            const allowedIds = await resolveAllowedSiteIds(req.user, null);
            if (allowedIds.length === 0) {
                return res.status(200).json({ success: true, message: 'Sites fetched successfully', data: [] });
            }

            const sites = await Site.findAll({
                attributes: ['id', 'name', 'total_budget', 'start_date'],
                where: {
                    is_active: 1,
                    status:    { [Op.in]: ALLOWED_STATUSES },
                    id:        { [Op.in]: allowedIds },
                },
                order: [['name', 'ASC']],
            });

            const formattedSites = sites.map(site => ({
                id:           site.id,
                name:         site.name,
                total_budget: site.total_budget,
                start_date:   site.start_date ? new Date(site.start_date).toISOString().split('T')[0] : null,
            }));

            res.status(200).json({ success: true, message: 'Sites fetched successfully', data: formattedSites });
        } catch (err) {
            console.error('Get sites error:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch sites', error: err.message });
        }
    },

    loginUser: async (req, res) => {
        let transaction;
        try {
            transaction = await sequelize.transaction();
            const { email, mobile, password, rememberMe } = req.body;
            const user = await User.findOne({
                where: { [email ? 'email' : 'mobile']: email || mobile },
                include: [{
                    model:      UserRole,
                    as:         'userRoles',
                    attributes: ['role_id'],
                    include:    [{ model: Role, as: 'role', attributes: ['name'] }],
                }],
            });
            if (!user) {
                await transaction.rollback();
                return res.status(401).json({ success: false, message: 'Invalid email/mobile or password' });
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                await transaction.rollback();
                return res.status(401).json({ success: false, message: 'Invalid email/mobile or password' });
            }
            if (user.status !== 1) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Account is inactive' });
            }
            const updateData  = { updated_at: new Date() };
            let rememberToken = null;
            if (rememberMe) {
                rememberToken = uuidv4();
                updateData.remember_token = rememberToken;
            } else {
                updateData.remember_token = null;
            }
            await user.update(updateData, { transaction });
            const payload = {
                userId: user.id,
                email:  user.email,
                mobile: user.mobile,
                role:   user.userRoles[0].role.name.toLowerCase(),
            };
            const accessToken  = authController.generateAccessToken(payload);
            const refreshToken = authController.generateRefreshToken();
            await authController.storeRefreshToken(user.id, refreshToken, transaction);
            await transaction.commit();
            res.json({
                success:      true,
                message:      'Login successful',
                accessToken,
                refreshToken,
                user: {
                    id:             user.id,
                    name:           user.name,
                    email:          user.email,
                    mobile:         user.mobile,
                    profile:        user.profile ? `${BASE_URL}/uploads/profile/${user.profile}` : null,
                    role_id:        user.userRoles[0].role_id,
                    role_name:      user.userRoles[0].role.name,
                    site_ids:       user.site_ids,
                    remember_token: rememberToken,
                },
            });
        } catch (err) {
            if (transaction) await transaction.rollback();
            res.status(500).json({ success: false, message: 'Server error', error: err.message });
        }
    },

    logoutUser: async (req, res) => {
        try {
            res.status(200).json({ success: true, message: 'Logged out successfully' });
        } catch (err) {
            console.error('Logout error:', err);
            res.status(500).json({ success: false, message: 'Something went wrong. Please try again later!' });
        }
    },
};

async function resolveAllowedSiteIds(reqUser, querySiteId = null) {
    const isSuperAdmin = reqUser?.role === 'superadmin';

    const activeRows = await Site.findAll({
        attributes: ['id'],
        where:      { is_active: 1, status: { [Op.in]: ALLOWED_STATUSES } },
        raw:        true,
    });
    const allActiveIds = activeRows.map(s => s.id);

    let basePool;
    if (isSuperAdmin) {
        basePool = allActiveIds;
    } else {
        const userSiteIds = reqUser?.site_ids || [];
        if (userSiteIds.length === 0) return [];
        basePool = userSiteIds.filter(id => allActiveIds.includes(id));
    }

    if (querySiteId) {
        const requested = parseInt(querySiteId, 10);
        if (!basePool.includes(requested)) return [];
        return [requested];
    }
    return basePool;
}

module.exports = { ...actionController, resolveAllowedSiteIds };