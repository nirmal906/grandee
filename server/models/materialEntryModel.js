const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialEntry = sequelize.define(
    'MaterialEntry',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        site_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'sites',
                key: 'id'
            },
            comment: 'Site for which material entry is being made'
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
            comment: 'Quantity of material purchased'
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
            comment: 'Additional charges (transport, etc.)'
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
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0=inactive, 1=active'
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        total_amount: {
            type: DataTypes.VIRTUAL(DataTypes.DECIMAL(12, 2), ['quantity', 'rate', 'additional_charges']),
            get() {
                const qty = parseFloat(this.quantity) || 0;
                const r = parseFloat(this.rate) || 0;
                const charges = parseFloat(this.additional_charges) || 0;
                return parseFloat(((qty * r) + charges).toFixed(2));
            }
        }
    },
    {
        tableName: 'material_entrys',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_material_id', fields: ['material_id'] },
            { name: 'idx_site_id', fields: ['site_id'] },
            { name: 'idx_vendor_id', fields: ['vendor_id'] },
            { name: 'idx_date', fields: ['date'] },
            { name: 'idx_status', fields: ['status'] },
            { name: 'idx_site_material_date', fields: ['site_id', 'material_id', 'date'] }
        ]
    }
);

module.exports = MaterialEntry;