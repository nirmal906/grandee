const { SitePayment, Site, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const sitePaymentController = {
    
    // Get payment summary for a site (total paid, balance)
    getPaymentSummary: async (req, res) => {
        try {
            const { site_id } = req.params;

            const site = await Site.findOne({
                where: { id: site_id, is_active: true }
            });

            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            const totalPaid = await SitePayment.sum('amount', {
                where: { 
                    site_id: site_id,
                    status: 1 
                }
            }) || 0;

            const totalBudget = parseFloat(site.total_budget) || 0;
            const balance = totalBudget - totalPaid;

            res.status(200).json({
                success: true,
                data: {
                    site_id: site.id,
                    site_name: site.name,
                    total_budget: totalBudget,
                    total_paid: parseFloat(totalPaid),
                    balance: balance,
                    payment_percentage: totalBudget > 0 ? ((totalPaid / totalBudget) * 100).toFixed(2) : 0
                }
            });
        } catch (err) {
            console.error('getPaymentSummary error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment summary'
            });
        }
    },

    // Get all payments for a site with pagination
    getSitePayments: async (req, res) => {
        try {
            const { site_id } = req.params;
            const {
                page = 1,
                limit = 10,
                sort = 'payment_date',
                order = 'desc'
            } = req.query;

            const pageNum = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);

            const site = await Site.findOne({
                where: { id: site_id, is_active: true }
            });

            if (!site) {
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            const validSortFields = ['payment_date', 'amount', 'payment_mode', 'created_at'];
            const sortField = validSortFields.includes(sort) ? sort : 'payment_date';
            const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const { rows, count } = await SitePayment.findAndCountAll({
                where: {
                    site_id: site_id,
                    status: 1
                },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'total_budget']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum
            });

            // Calculate running balance
            const allPayments = await SitePayment.findAll({
                where: { site_id: site_id, status: 1 },
                order: [['payment_date', 'ASC'], ['created_at', 'ASC']],
                raw: true
            });

            let runningTotal = 0;
            const paymentMap = {};
            
            allPayments.forEach(p => {
                runningTotal += parseFloat(p.amount);
                paymentMap[p.id] = {
                    cumulative_paid: runningTotal,
                    balance_after: parseFloat(site.total_budget) - runningTotal
                };
            });

            const paymentsWithBalance = rows.map(payment => {
                const p = payment.toJSON();
                return {
                    ...p,
                    ...paymentMap[p.id]
                };
            });

            res.status(200).json({
                success: true,
                data: paymentsWithBalance,
                meta: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum)
                }
            });
        } catch (err) {
            console.error('getSitePayments error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payments'
            });
        }
    },

    // Create a new payment
    createPayment: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { site_id } = req.params;
            const {
                payment_date,
                amount,
                payment_mode,
                transaction_reference,
                notes
            } = req.body;

            const errors = {};

            // Validate site exists
            const site = await Site.findOne({
                where: { id: site_id, is_active: true },
                transaction
            });

            if (!site) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Site not found'
                });
            }

            // Validate required fields
            if (!payment_date || !payment_date.trim()) {
                errors.payment_date = 'Payment date is required';
            }

            if (!amount || amount === '') {
                errors.amount = 'Payment amount is required';
            } else {
                const amountNum = parseFloat(amount);
                if (isNaN(amountNum) || amountNum <= 0) {
                    errors.amount = 'Payment amount must be greater than 0';
                }
            }

            if (!payment_mode || !payment_mode.trim()) {
                errors.payment_mode = 'Payment mode is required';
            } else if (!['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'].includes(payment_mode)) {
                errors.payment_mode = 'Invalid payment mode';
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            // Check if payment exceeds remaining balance
            const totalPaid = await SitePayment.sum('amount', {
                where: { site_id: site_id, status: 1 },
                transaction
            }) || 0;

            const totalBudget = parseFloat(site.total_budget);
            const newAmount = parseFloat(amount);
            const balance = totalBudget - totalPaid;

            if (newAmount > balance) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Payment amount (₹${newAmount.toLocaleString()}) exceeds remaining balance (₹${balance.toLocaleString()})`,
                    errors: {
                        amount: `Cannot exceed balance of ₹${balance.toLocaleString()}`
                    }
                });
            }

            const paymentData = {
                site_id: site_id,
                payment_date: payment_date,
                amount: newAmount,
                payment_mode: payment_mode,
                transaction_reference: transaction_reference?.trim() || null,
                notes: notes?.trim() || null,
                status: 1,
                created_by: req.user?.id || req.user?.userId,
                updated_by: req.user?.id || req.user?.userId
            };

            const payment = await SitePayment.create(paymentData, { transaction });
            await transaction.commit();

            const createdPayment = await SitePayment.findOne({
                where: { id: payment.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'total_budget'] }
                ]
            });

            return res.status(201).json({
                success: true,
                message: 'Payment recorded successfully',
                data: createdPayment
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createPayment error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to record payment'
            });
        }
    },

    // Update a payment
    updatePayment: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { site_id, payment_id } = req.params;
            const {
                payment_date,
                amount,
                payment_mode,
                transaction_reference,
                notes
            } = req.body;

            const payment = await SitePayment.findOne({
                where: { 
                    id: payment_id, 
                    site_id: site_id,
                    status: 1 
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!payment) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            const site = await Site.findOne({
                where: { id: site_id, is_active: true },
                transaction
            });

            const errors = {};

            if (payment_date !== undefined && (!payment_date || !payment_date.trim())) {
                errors.payment_date = 'Payment date is required';
            }

            if (amount !== undefined) {
                if (!amount || amount === '') {
                    errors.amount = 'Payment amount is required';
                } else {
                    const amountNum = parseFloat(amount);
                    if (isNaN(amountNum) || amountNum <= 0) {
                        errors.amount = 'Payment amount must be greater than 0';
                    } else {
                        // Check if new amount would exceed budget
                        const otherPayments = await SitePayment.sum('amount', {
                            where: { 
                                site_id: site_id,
                                status: 1,
                                id: { [Op.ne]: payment_id }
                            },
                            transaction
                        }) || 0;

                        const totalBudget = parseFloat(site.total_budget);
                        const balance = totalBudget - otherPayments;

                        if (amountNum > balance) {
                            errors.amount = `Cannot exceed balance of ₹${balance.toLocaleString()}`;
                        }
                    }
                }
            }

            if (payment_mode !== undefined) {
                if (!payment_mode || !payment_mode.trim()) {
                    errors.payment_mode = 'Payment mode is required';
                } else if (!['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'].includes(payment_mode)) {
                    errors.payment_mode = 'Invalid payment mode';
                }
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const updateData = {
                updated_by: req.user?.id || req.user?.userId
            };

            if (payment_date !== undefined) updateData.payment_date = payment_date;
            if (amount !== undefined) updateData.amount = parseFloat(amount);
            if (payment_mode !== undefined) updateData.payment_mode = payment_mode;
            if (transaction_reference !== undefined) updateData.transaction_reference = transaction_reference?.trim() || null;
            if (notes !== undefined) updateData.notes = notes?.trim() || null;

            await payment.update(updateData, { transaction });
            await transaction.commit();

            const updatedPayment = await SitePayment.findOne({
                where: { id: payment.id },
                include: [
                    { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                    { model: User, as: 'updater', attributes: ['id', 'name', 'email'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'total_budget'] }
                ]
            });

            return res.status(200).json({
                success: true,
                message: 'Payment updated successfully',
                data: updatedPayment
            });
        } catch (err) {
            await transaction.rollback();
            console.error('updatePayment error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update payment'
            });
        }
    },

    // Delete (cancel) a payment
    deletePayment: async (req, res) => {
        try {
            const { site_id, payment_id } = req.params;

            const payment = await SitePayment.findOne({
                where: { 
                    id: payment_id,
                    site_id: site_id,
                    status: 1 
                }
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found'
                });
            }

            await payment.update({
                status: 0,
                updated_by: req.user?.id || req.user?.userId
            });

            return res.status(200).json({
                success: true,
                message: 'Payment cancelled successfully'
            });
        } catch (err) {
            console.error('deletePayment error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel payment'
            });
        }
    }
};

module.exports = sitePaymentController;