const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LabourInvoice = sequelize.define(
    'LabourInvoice',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        site_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'sites', key: 'id' },
            comment: 'Site for which labour invoice is created'
        },
        vendor_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'vendors', key: 'id' },
            comment: 'Labour vendor'
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Invoice date'
        },
        invoice_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Vendor invoice number (user-entered)'
        },
        debit_entry: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Debit amount (unpaid/pending) - null until admin approves'
        },
        credit_entry: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Credit amount (paid) - null until admin approves'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes'
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0=inactive, 1=active'
        },
        approval_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending',
            comment: 'pending=waiting admin approval, approved=approved, rejected=rejected by admin'
        },
        rejection_reason: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: null,
            comment: 'Optional reason provided by admin when rejecting'
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'users', key: 'id' }
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'users', key: 'id' }
        }
    },
    {
        tableName: 'labour_invoices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_li_site_id', fields: ['site_id'] },
            { name: 'idx_li_vendor_id', fields: ['vendor_id'] },
            { name: 'idx_li_date', fields: ['date'] },
            { name: 'idx_li_status', fields: ['status'] },
            { name: 'idx_li_approval_status', fields: ['approval_status'] },
            { name: 'idx_li_site_vendor_date', fields: ['site_id', 'vendor_id', 'date'] },
            { name: 'uq_li_vendor_invoice', fields: ['vendor_id', 'invoice_number'], unique: true }
        ]
    }
);

module.exports = LabourInvoice;
