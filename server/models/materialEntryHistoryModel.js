const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialEntryHistory = sequelize.define(
    'MaterialEntryHistory',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        material_entry_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'material_entrys',
                key: 'id'
            },
            comment: 'Reference to material_entrys table'
        },
        site_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'sites',
                key: 'id'
            },
            comment: 'Site for which material entry was made'
        },
        material_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'materials',
                key: 'id'
            }
        },
        vendor_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'vendors',
                key: 'id'
            }
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date of material entry'
        },
        quantity: {
            type: DataTypes.DECIMAL(12, 3),
            allowNull: false,
            defaultValue: 0.000,
            comment: 'Quantity of material'
        },
        rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Rate per unit'
        },
        additional_charges: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Additional charges'
        },
        debit_entry: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Debit amount'
        },
        credit_entry: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00,
            comment: 'Credit amount'
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0=inactive, 1=active'
        },
        invoice_photo: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Invoice/bill photo filename'
        },
        action_type: {
            type: DataTypes.ENUM('created', 'updated', 'deleted'),
            allowNull: false,
            comment: 'Type of action performed'
        },
        changed_fields: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'JSON string of changed fields'
        },
        performed_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
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
        tableName: 'material_entry_history',
        timestamps: false,
        indexes: [
            { name: 'idx_material_entry_id', fields: ['material_entry_id'] },
            { name: 'idx_site_id', fields: ['site_id'] },
            { name: 'idx_material_id', fields: ['material_id'] },
            { name: 'idx_vendor_id', fields: ['vendor_id'] },
            { name: 'idx_performed_by', fields: ['performed_by'] },
            { name: 'idx_performed_at', fields: ['performed_at'] },
            { name: 'idx_action_type', fields: ['action_type'] }
        ]
    }
);

module.exports = MaterialEntryHistory;