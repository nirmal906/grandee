const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LabourEntry = sequelize.define(
    'LabourEntry',
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
            comment: 'Site for which labour entry is being made'
        },
        labour_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: { model: 'labours', key: 'id' },
            comment: 'Labour type reference'
        },
        vendor_id: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: { model: 'vendors', key: 'id' },
            comment: 'Vendor reference (optional)'
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date of labour entry'
        },
        no_of_workers: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Number of workers for this entry'
        },
        rate_per_worker: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Rate per worker - null until admin approves for non-admin entries'
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
        },
        total_amount: {
            type: DataTypes.VIRTUAL(DataTypes.DECIMAL(12, 2), ['no_of_workers', 'rate_per_worker']),
            get() {
                const workers = parseFloat(this.no_of_workers) || 0;
                const rate    = parseFloat(this.rate_per_worker) || 0;
                return parseFloat((workers * rate).toFixed(2));
            }
        }
    },
    {
        tableName: 'labour_entrys',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { name: 'idx_labour_id',        fields: ['labour_id'] },
            { name: 'idx_site_id',          fields: ['site_id'] },
            { name: 'idx_date',             fields: ['date'] },
            { name: 'idx_status',           fields: ['status'] },
            { name: 'idx_approval_status',  fields: ['approval_status'] },
            { name: 'idx_site_labour_date', fields: ['site_id', 'labour_id', 'date'] }
        ]
    }
);

module.exports = LabourEntry;