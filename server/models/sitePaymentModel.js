const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const SitePayment   = sequelize.define(
    'SitePayment',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        site_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            comment: 'Reference to sites table',
            references: {
                model: 'sites',
                key: 'id'
            },
            onUpdate: 'CASCADE'
        },
        payment_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Date when payment was received',
            validate: {
                notEmpty: {
                    msg: 'Payment date is required'
                },
                isDate: {
                    msg: 'Payment date must be a valid date'
                }
            }
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Amount paid by client',
            validate: {
                notEmpty: {
                    msg: 'Payment amount is required'
                },
                min: {
                    args: [0.01],
                    msg: 'Payment amount must be greater than 0'
                }
            }
        },
        payment_mode: {
            type: DataTypes.ENUM('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'),
            allowNull: false,
            defaultValue: 'cash',
            comment: 'Mode of payment',
            validate: {
                notEmpty: {
                    msg: 'Payment mode is required'
                },
                isIn: {
                    args: [['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other']],
                    msg: 'Invalid payment mode'
                }
            }
        },
        transaction_reference: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Cheque number, transaction ID, etc.'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Additional notes about the payment'
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0=cancelled, 1=active',
            validate: {
                isIn: {
                    args: [[0, 1]],
                    msg: 'Status must be 0 (cancelled) or 1 (active)'
                }
            }
        },
        created_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        },
        updated_by: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'updated_at'
        }
    },
    {
        tableName: 'site_payments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: false,
        indexes: [
            {
                name: 'idx_site_id',
                fields: ['site_id']
            },
            {
                name: 'idx_payment_date',
                fields: ['payment_date']
            },
            {
                name: 'idx_status',
                fields: ['status']
            },
            {
                name: 'idx_created_by',
                fields: ['created_by']
            },
            {
                name: 'idx_updated_by',
                fields: ['updated_by']
            },
            {
                name: 'idx_site_payment_date',
                fields: ['site_id', 'payment_date']
            },
            {
                name: 'idx_created_at',
                fields: ['created_at']
            }
        ],
        defaultScope: {
            where: {
                status: 1
            }
        },
        scopes: {
            withCancelled: {
                where: {}
            },
            cancelled: {
                where: {
                    status: 0
                }
            }
        }
    }
);
module.exports = SitePayment;