const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialInvoiceHistory = sequelize.define(
    'MaterialInvoiceHistory',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        invoice_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'material_invoices', key: 'id' },
            comment: 'Reference to material_invoices table'
        },
        action_type: {
            type: DataTypes.ENUM('created', 'updated', 'deleted', 'item_added', 'item_updated', 'item_removed'),
            allowNull: false,
            comment: 'Type of action performed'
        },
        snapshot: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'JSON snapshot of invoice + items at time of action'
        },
        changed_fields: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON string of changed fields'
        },
        performed_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            comment: 'User who performed the action'
        },
        performed_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            comment: 'When the action was performed'
        }
    },
    {
        tableName: 'material_invoice_history',
        timestamps: false,
        indexes: [
            { name: 'idx_mih_invoice_id', fields: ['invoice_id'] },
            { name: 'idx_mih_performed_by', fields: ['performed_by'] },
            { name: 'idx_mih_performed_at', fields: ['performed_at'] },
            { name: 'idx_mih_action_type', fields: ['action_type'] }
        ]
    }
);

module.exports = MaterialInvoiceHistory;
