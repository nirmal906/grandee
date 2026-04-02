const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialInvoice = sequelize.define(
    'MaterialInvoice',
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
            comment: 'Site for which material invoice is created'
        },
        vendor_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'vendors', key: 'id' },
            comment: 'Vendor who supplied the materials'
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
        additional_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Shared additional charges (transport, etc.)'
        },
        debit_entry: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Debit amount (unpaid/pending amount)'
        },
        credit_entry: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Credit amount (paid amount)'
        },
        invoice_photo: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Filename of the uploaded invoice photo'
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
        tableName: 'material_invoices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_mi_site_id', fields: ['site_id'] },
            { name: 'idx_mi_vendor_id', fields: ['vendor_id'] },
            { name: 'idx_mi_date', fields: ['date'] },
            { name: 'idx_mi_status', fields: ['status'] },
            { name: 'idx_mi_site_vendor_date', fields: ['site_id', 'vendor_id', 'date'] },
            { name: 'uq_mi_vendor_invoice', fields: ['vendor_id', 'invoice_number'], unique: true }
        ]
    }
);

module.exports = MaterialInvoice;
