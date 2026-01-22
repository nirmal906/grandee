const { sequelize, Sequelize, User, Role, UserRole, Site, MaterialEntry, LabourEntry, Material, Labour, Vendor, SitePayment } = require('../models');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const bcrypt           = require('bcryptjs');
const { v4: uuidv4 }   = require('uuid');
const authController   = require('./authController');
const BASE_URL         = process.env.BASE_URL || 'http://localhost:5000';
const actionController = {

    // Get Dashboard Statistics
    getDashboardStats: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;
            
            // Build date filter
            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = {
                    [Op.between]: [from_date, to_date]
                };
            }

            // Build site filter for entries
            const siteFilter = site_id ? { site_id: parseInt(site_id) } : {};

            // 1. Get Active Sites Count
            const activeSites = await Site.count({
                where: {
                    status: 'active',
                    is_active: 1
                }
            });

            // 2. Get Total Budget (sum of all active sites or specific site)
            const totalBudgetResult = await Site.findOne({
                attributes: [
                    [fn('COALESCE', fn('SUM', col('total_budget')), 0), 'total']
                ],
                where: {
                    status: 'active',
                    is_active: 1,
                    ...(site_id ? { id: parseInt(site_id) } : {})
                },
                raw: true
            });

            const totalBudget = parseFloat(totalBudgetResult?.total || 0);

            // 3. Calculate Material Expenses (credit_entry = paid amount as expense)
            const materialExpenseResult = await MaterialEntry.findOne({
                attributes: [
                    [fn('COALESCE', 
                        fn('SUM', col('credit_entry')), 
                        0
                    ), 'total']
                ],
                where: {
                    status: 1,
                    ...dateFilter,
                    ...siteFilter
                },
                raw: true
            });

            const materialExpense = parseFloat(materialExpenseResult?.total || 0);

            // 4. Calculate Labour Expenses (credit_entry = paid amount as expense)
            const labourExpenseResult = await LabourEntry.findOne({
                attributes: [
                    [fn('COALESCE', 
                        fn('SUM', col('credit_entry')), 
                        0
                    ), 'total']
                ],
                where: {
                    status: 1,
                    ...dateFilter,
                    ...siteFilter
                },
                raw: true
            });

            const labourExpense = parseFloat(labourExpenseResult?.total || 0);

            // 5. Total Expenses
            const totalExpense = materialExpense + labourExpense;

            // 6. Calculate Client Payments (NEW)
            const paymentDateFilter = {};
            if (from_date && to_date) {
                paymentDateFilter.payment_date = {
                    [Op.between]: [from_date, to_date]
                };
            }

            const clientPaymentsResult = await SitePayment.findOne({
                attributes: [
                    [fn('COALESCE', fn('SUM', col('amount')), 0), 'total']
                ],
                where: {
                    status: 1, // Active payments only
                    ...paymentDateFilter,
                    ...siteFilter
                },
                raw: true
            });

            const clientPaid = parseFloat(clientPaymentsResult?.total || 0);

            // 7. Get Previous Period Data for Comparison (if dates provided)
            let previousPeriodData = {
                materialExpense: 0,
                labourExpense: 0,
                totalExpense: 0,
                clientPaid: 0
            };

            if (from_date && to_date) {
                const fromDateObj = new Date(from_date);
                const toDateObj = new Date(to_date);
                const daysDiff = Math.ceil((toDateObj - fromDateObj) / (1000 * 60 * 60 * 24)) + 1;

                const previousFromDate = new Date(fromDateObj);
                previousFromDate.setDate(previousFromDate.getDate() - daysDiff);
                
                const previousToDate = new Date(fromDateObj);
                previousToDate.setDate(previousToDate.getDate() - 1);

                const previousDateFilter = {
                    date: {
                        [Op.between]: [
                            previousFromDate.toISOString().split('T')[0],
                            previousToDate.toISOString().split('T')[0]
                        ]
                    }
                };

                const previousPaymentDateFilter = {
                    payment_date: {
                        [Op.between]: [
                            previousFromDate.toISOString().split('T')[0],
                            previousToDate.toISOString().split('T')[0]
                        ]
                    }
                };

                // Previous Material Expenses (credit_entry = paid amount)
                const prevMaterialResult = await MaterialEntry.findOne({
                    attributes: [
                        [fn('COALESCE', 
                            fn('SUM', col('credit_entry')), 
                            0
                        ), 'total']
                    ],
                    where: {
                        status: 1,
                        ...previousDateFilter,
                        ...siteFilter
                    },
                    raw: true
                });

                // Previous Labour Expenses (credit_entry = paid amount)
                const prevLabourResult = await LabourEntry.findOne({
                    attributes: [
                        [fn('COALESCE', 
                            fn('SUM', col('credit_entry')), 
                            0
                        ), 'total']
                    ],
                    where: {
                        status: 1,
                        ...previousDateFilter,
                        ...siteFilter
                    },
                    raw: true
                });

                // Previous Client Payments
                const prevPaymentsResult = await SitePayment.findOne({
                    attributes: [
                        [fn('COALESCE', fn('SUM', col('amount')), 0), 'total']
                    ],
                    where: {
                        status: 1,
                        ...previousPaymentDateFilter,
                        ...siteFilter
                    },
                    raw: true
                });

                previousPeriodData.materialExpense = parseFloat(prevMaterialResult?.total || 0);
                previousPeriodData.labourExpense = parseFloat(prevLabourResult?.total || 0);
                previousPeriodData.totalExpense = previousPeriodData.materialExpense + previousPeriodData.labourExpense;
                previousPeriodData.clientPaid = parseFloat(prevPaymentsResult?.total || 0);
            }

            // Calculate percentage changes
            const calculateChange = (current, previous) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            const materialChange = calculateChange(materialExpense, previousPeriodData.materialExpense);
            const labourChange = calculateChange(labourExpense, previousPeriodData.labourExpense);
            const totalExpenseChange = calculateChange(totalExpense, previousPeriodData.totalExpense);
            const clientPaidChange = calculateChange(clientPaid, previousPeriodData.clientPaid);

            // Calculate percentages from total budget
            const materialPercentage = totalBudget > 0 ? ((materialExpense / totalBudget) * 100) : 0;
            const labourPercentage = totalBudget > 0 ? ((labourExpense / totalBudget) * 100) : 0;
            const totalExpensePercentage = totalBudget > 0 ? ((totalExpense / totalBudget) * 100) : 0;
            const clientPaidPercentage = totalBudget > 0 ? ((clientPaid / totalBudget) * 100) : 0;
            const remainingPercentage = totalBudget > 0 ? (((totalBudget - totalExpense) / totalBudget) * 100) : 0;
            const outstandingPercentage = totalBudget > 0 ? (((totalBudget - clientPaid) / totalBudget) * 100) : 0;

            // Cash Flow Analysis
            const cashFlow = clientPaid - totalExpense; // Positive = surplus, Negative = deficit
            const cashFlowPercentage = totalBudget > 0 ? ((cashFlow / totalBudget) * 100) : 0;

            // Build the dashboard data response
            const dashboardData = {
                activeSites: {
                    count: activeSites,
                    change: 0,
                    changeType: 'neutral'
                },
                totalBudget: {
                    amount: totalBudget,
                    change: 0,
                    changeType: 'neutral',
                    percentage: 100
                },
                materialExpense: {
                    amount: materialExpense,
                    change: materialChange,
                    changeType: materialChange > 0 ? 'negative' : materialChange < 0 ? 'positive' : 'neutral',
                    percentage: Math.round(materialPercentage * 100) / 100
                },
                labourExpense: {
                    amount: labourExpense,
                    change: labourChange,
                    changeType: labourChange > 0 ? 'negative' : labourChange < 0 ? 'positive' : 'neutral',
                    percentage: Math.round(labourPercentage * 100) / 100
                },
                totalExpense: {
                    amount: totalExpense,
                    change: totalExpenseChange,
                    changeType: totalExpenseChange > 0 ? 'negative' : totalExpenseChange < 0 ? 'positive' : 'neutral',
                    percentage: Math.round(totalExpensePercentage * 100) / 100
                },
                clientPayments: {
                    amount: clientPaid,
                    change: clientPaidChange,
                    changeType: clientPaidChange > 0 ? 'positive' : clientPaidChange < 0 ? 'negative' : 'neutral',
                    percentage: Math.round(clientPaidPercentage * 100) / 100,
                    outstanding: totalBudget - clientPaid,
                    outstandingPercentage: Math.round(outstandingPercentage * 100) / 100
                },
                budgetUtilization: {
                    percentage: Math.round(totalExpensePercentage * 100) / 100,
                    remaining: totalBudget - totalExpense,
                    remainingPercentage: Math.round(remainingPercentage * 100) / 100
                },
                cashFlow: {
                    amount: cashFlow,
                    percentage: Math.round(cashFlowPercentage * 100) / 100,
                    status: cashFlow >= 0 ? 'surplus' : 'deficit',
                    changeType: cashFlow >= 0 ? 'positive' : 'negative'
                }
            };

            res.status(200).json({
                success: true,
                message: 'Dashboard data fetched successfully',
                data: dashboardData
            });

        } catch (err) {
            console.error('Dashboard stats error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard statistics',
                error: err.message
            });
        }
    },

    // Get Transactions of material and labour
    getTransactions: async (req, res) => {
        try{
            const { from_date, to_date, site_id, type } = req.query;
            // Build date filter
            const dateFilter = {};
            if(from_date && to_date){
                dateFilter.date = {
                    [Op.between]: [from_date, to_date]
                };
            }
            // Build site filter
            const siteFilter   = site_id ? { site_id: parseInt(site_id) } : {};
            const transactions = [];
            
            // Fetch Material Entries if type is 'material' or 'all'
            if(!type || type === 'material'){
                const materialEntries = await MaterialEntry.findAll({
                    where: {
                        status: 1,
                        ...dateFilter,
                        ...siteFilter
                    },
                    include: [
                        {
                            model: Site,
                            attributes: ['name'],
                            as: 'site'
                        },
                        {
                            model: Material,
                            attributes: ['name'],
                            as: 'material'
                        },
                        {
                            model: Vendor,
                            attributes: ['name'],
                            as: 'vendor',
                            required: false
                        }
                    ],
                    order: [['date', 'DESC']],
                    raw: true,
                    nest: true
                });
                
                // Transform material entries
                materialEntries.forEach(entry => {
                    // Calculate base amount: quantity × rate + additional charges
                    const baseAmount = (parseFloat(entry.quantity || 0) * parseFloat(entry.rate || 0)) + parseFloat(entry.additional_charges || 0);
                    
                    // The actual expense is the credit_entry (amount paid)
                    const paidAmount = parseFloat(entry.credit_entry || 0);
                    const pendingAmount = parseFloat(entry.debit_entry || 0);
                    
                    transactions.push({
                        id: `M-${entry.id}`,
                        date: entry.date,
                        transaction_type: 'Material',
                        entry_type: null, // No longer using debit/credit type field
                        site_name: entry.site?.name || 'N/A',
                        item_name: entry.material?.name || 'N/A',
                        quantity: parseFloat(entry.quantity || 0),
                        rate: parseFloat(entry.rate || 0),
                        amount: paidAmount, // Paid amount (credit_entry)
                        vendor_name: entry.vendor?.name || null,
                        additional_charges: parseFloat(entry.additional_charges || 0),
                        original_id: entry.id,
                        created_at: entry.created_at,
                        debit_entry: pendingAmount, // Pending/unpaid amount
                        total_amount: baseAmount // Total amount (qty × rate + charges)
                    });
                });
            }
            
            // Fetch Labour Entries if type is 'labour' or 'all'
            if (!type || type === 'labour') {
                const labourEntries = await LabourEntry.findAll({
                    where: {
                        status: 1,
                        ...dateFilter,
                        ...siteFilter
                    },
                    include: [
                        {
                            model: Site,
                            attributes: ['name'],
                            as: 'site'
                        },
                        {
                            model: Labour,
                            attributes: ['name'],
                            as: 'labour'
                        }
                    ],
                    order: [['date', 'DESC']],
                    raw: true,
                    nest: true
                });
                
                // Transform labour entries
                labourEntries.forEach(entry => {
                    const totalAmount = parseFloat(entry.no_of_workers || 0) * parseFloat(entry.rate_per_worker || 0);
                    // Use credit_entry as the actual expense amount (paid amount)
                    const paidAmount = parseFloat(entry.credit_entry || 0);
                    const pendingAmount = parseFloat(entry.debit_entry || 0);
                    
                    transactions.push({
                        id: `L-${entry.id}`,
                        date: entry.date,
                        transaction_type: 'Labour',
                        entry_type: null, // Labour doesn't have debit/credit type
                        site_name: entry.site?.name || 'N/A',
                        item_name: entry.labour?.name || 'N/A',
                        quantity: parseFloat(entry.no_of_workers || 0),
                        rate: parseFloat(entry.rate_per_worker || 0),
                        amount: paidAmount, // Paid amount (credit_entry)
                        vendor_name: null,
                        additional_charges: 0,
                        original_id: entry.id,
                        created_at: entry.created_at,
                        debit_entry: pendingAmount, // Pending/unpaid amount
                        total_amount: totalAmount // Total amount (workers × rate)
                    });
                });
            }
            
            // Sort all transactions by date (descending)
            transactions.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
            res.status(200).json({
                success: true,
                message: 'Transactions fetched successfully',
                data: transactions,
                count: transactions.length
            });
        }catch(err){
            console.error('Transaction fetch error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions',
                error: err.message
            });
        }
    },

    // Get Material Pending Expenses
    getMaterialPending: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;
            
            // Build date filter
            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = {
                    [Op.between]: [from_date, to_date]
                };
            }
            
            // Build site filter
            const siteFilter = site_id ? { site_id: parseInt(site_id) } : {};
            
            // Fetch material entries with pending amounts (debit_entry > 0)
            const materialPending = await MaterialEntry.findAll({
                where: {
                    status: 1,
                    debit_entry: {
                        [Op.gt]: 0  // Only entries with pending amounts
                    },
                    ...dateFilter,
                    ...siteFilter
                },
                include: [
                    {
                        model: Site,
                        attributes: ['name'],
                        as: 'site'
                    },
                    {
                        model: Material,
                        attributes: ['name'],
                        as: 'material'
                    },
                    {
                        model: Vendor,
                        attributes: ['name'],
                        as: 'vendor',
                        required: false
                    }
                ],
                order: [['date', 'DESC']],
                raw: true,
                nest: true
            });
            
            // Transform data
            const pendingData = materialPending.map(entry => {
                const totalAmount = (parseFloat(entry.quantity || 0) * parseFloat(entry.rate || 0)) + parseFloat(entry.additional_charges || 0);
                const paidAmount = parseFloat(entry.credit_entry || 0);
                const pendingAmount = parseFloat(entry.debit_entry || 0);
                
                return {
                    id: entry.id,
                    date: entry.date,
                    site_name: entry.site?.name || 'N/A',
                    material_name: entry.material?.name || 'N/A',
                    vendor_name: entry.vendor?.name || 'N/A',
                    quantity: parseFloat(entry.quantity || 0),
                    rate: parseFloat(entry.rate || 0),
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    pending_amount: pendingAmount,
                    additional_charges: parseFloat(entry.additional_charges || 0),
                    created_at: entry.created_at
                };
            });
            
            // Calculate total pending
            const totalPending = pendingData.reduce((sum, item) => sum + item.pending_amount, 0);
            
            res.status(200).json({
                success: true,
                message: 'Material pending expenses fetched successfully',
                data: pendingData,
                total_pending: totalPending,
                count: pendingData.length
            });
        } catch (err) {
            console.error('Material pending fetch error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch material pending expenses',
                error: err.message
            });
        }
    },

    // Get Labour Pending Expenses
    getLabourPending: async (req, res) => {
        try {
            const { from_date, to_date, site_id } = req.query;
            
            // Build date filter
            const dateFilter = {};
            if (from_date && to_date) {
                dateFilter.date = {
                    [Op.between]: [from_date, to_date]
                };
            }
            
            // Build site filter
            const siteFilter = site_id ? { site_id: parseInt(site_id) } : {};
            
            // Fetch labour entries with pending amounts (debit_entry > 0)
            const labourPending = await LabourEntry.findAll({
                where: {
                    status: 1,
                    debit_entry: {
                        [Op.gt]: 0  // Only entries with pending amounts
                    },
                    ...dateFilter,
                    ...siteFilter
                },
                include: [
                    {
                        model: Site,
                        attributes: ['name'],
                        as: 'site'
                    },
                    {
                        model: Labour,
                        attributes: ['name'],
                        as: 'labour'
                    }
                ],
                order: [['date', 'DESC']],
                raw: true,
                nest: true
            });
            
            // Transform data
            const pendingData = labourPending.map(entry => {
                const totalAmount = parseFloat(entry.no_of_workers || 0) * parseFloat(entry.rate_per_worker || 0);
                const paidAmount = parseFloat(entry.credit_entry || 0);
                const pendingAmount = parseFloat(entry.debit_entry || 0);
                
                return {
                    id: entry.id,
                    date: entry.date,
                    site_name: entry.site?.name || 'N/A',
                    labour_name: entry.labour?.name || 'N/A',
                    no_of_workers: parseFloat(entry.no_of_workers || 0),
                    rate_per_worker: parseFloat(entry.rate_per_worker || 0),
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    pending_amount: pendingAmount,
                    created_at: entry.created_at
                };
            });
            
            // Calculate total pending
            const totalPending = pendingData.reduce((sum, item) => sum + item.pending_amount, 0);
            
            res.status(200).json({
                success: true,
                message: 'Labour pending expenses fetched successfully',
                data: pendingData,
                total_pending: totalPending,
                count: pendingData.length
            });
        } catch (err) {
            console.error('Labour pending fetch error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch labour pending expenses',
                error: err.message
            });
        }
    },

    // Get Active Sites List for Dropdown
    getActiveSites: async (req, res) => {
        try{
            const sites = await Site.findAll({
                attributes: ['id', 'name', 'total_budget', 'start_date'],
                where: {
                    is_active: 1
                },
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success: true,
                message: 'Sites fetched successfully',
                data: sites
            });
        }catch(err){
            console.error('Get sites error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sites',
                error: err.message
            });
        }
    },

    // Login
    loginUser: async (req, res) => {
        let transaction;
        try{
            transaction = await sequelize.transaction();
            const { email, mobile, password, rememberMe } = req.body;
            const user = await User.findOne({
                where: {
                    [email ? 'email' : 'mobile']: email || mobile,
                },
                include: [
                    {
                        model      : UserRole,
                        as         : 'userRoles',  
                        attributes : ['role_id'],
                        include    : [
                            {
                                model      : Role,
                                as         : 'role',  
                                attributes : ['name']
                            }
                        ]
                    }
                ]
            });
            if(!user){
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email/mobile or password',
                });
            }
            // Verify password (assuming passwords are hashed)
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if(!isPasswordValid){
                await transaction.rollback();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email/mobile or password',
                });
            }
            // Check user status
            if(user.status !== 1){
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Account is inactive',
                });
            }
            const updateData = { updated_at: new Date() };
            // Handle rememberMe
            let rememberToken = null;
            if(rememberMe){
                rememberToken = uuidv4();
                updateData.remember_token = rememberToken;
            }else{
                updateData.remember_token = null;
            }
            await user.update(updateData, { transaction });
            const payload = {
                userId  : user.id,
                email   : user.email,
                mobile  : user.mobile,
                role    : user.userRoles[0].role.name.toLowerCase(),  
            };
            const accessToken   = authController.generateAccessToken(payload);
            const refreshToken  = authController.generateRefreshToken();
            await authController.storeRefreshToken(user.id, refreshToken, transaction);
            await transaction.commit();
            res.json({
                success            : true,
                message            : 'Login successful',
                accessToken,       
                refreshToken,
                user               : {
                    id             : user.id,
                    name           : user.name,
                    email          : user.email,
                    mobile         : user.mobile,
                    profile        : user.profile ? `${BASE_URL}/uploads/profile/${user.profile}` : null,
                    role_id        : user.userRoles[0].role_id, 
                    role_name      : user.userRoles[0].role.name, 
                    remember_token : rememberToken,
                }
            });
        }catch(err){
            if(transaction) await transaction.rollback();
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message
            });
        }
    },

    // Logout
    logoutUser: async (req, res) => {
        try{
            const { user_id } = req.body;
            res.status(200).json({
                success: true,
                message: 'Logged out successfully',
            });
        }catch(err){
            console.error('Logout error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }        
    },
};

module.exports = actionController;