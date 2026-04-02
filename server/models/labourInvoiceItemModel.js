const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LabourInvoiceItem = sequelize.define(
    'LabourInvoiceItem',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        invoice_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'labour_invoices', key: 'id' },
            comment: 'Parent labour invoice'
        },
        labour_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'labours', key: 'id' },
            comment: 'Labour type'
        },
        no_of_workers: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Number of workers'
        },
        rate_per_worker: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Rate per worker - null until admin sets on approval'
        },
        line_total: {
            type: DataTypes.VIRTUAL(DataTypes.DECIMAL(12, 2), ['no_of_workers', 'rate_per_worker']),
            get() {
                const workers = parseFloat(this.no_of_workers) || 0;
                const rate = parseFloat(this.rate_per_worker) || 0;
                return parseFloat((workers * rate).toFixed(2));
            }
        }
    },
    {
        tableName: 'labour_invoice_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_lii_invoice_id', fields: ['invoice_id'] },
            { name: 'idx_lii_labour_id', fields: ['labour_id'] }
        ]
    }
);

module.exports = LabourInvoiceItem;
