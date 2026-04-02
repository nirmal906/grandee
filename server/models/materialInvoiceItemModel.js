const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaterialInvoiceItem = sequelize.define(
    'MaterialInvoiceItem',
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
            comment: 'Parent material invoice'
        },
        material_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'materials', key: 'id' },
            comment: 'Material purchased'
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
        line_total: {
            type: DataTypes.VIRTUAL(DataTypes.DECIMAL(12, 2), ['quantity', 'rate']),
            get() {
                const qty = parseFloat(this.quantity) || 0;
                const r = parseFloat(this.rate) || 0;
                return parseFloat((qty * r).toFixed(2));
            }
        }
    },
    {
        tableName: 'material_invoice_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_mii_invoice_id', fields: ['invoice_id'] },
            { name: 'idx_mii_material_id', fields: ['material_id'] }
        ]
    }
);

module.exports = MaterialInvoiceItem;
