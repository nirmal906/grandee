const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Vendor        = sequelize.define(
    'Vendor',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: {
                msg: 'Vendor name must be unique'
            },
            validate: {
                notEmpty: {
                    msg: 'Vendor name cannot be empty'
                }
            }
        },
        phone: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: {
                msg: 'Phone number must be unique'
            },
            validate: {
                notEmpty: {
                    msg: 'Phone number cannot be empty'
                }
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: {
                msg: 'Email must be unique'
            },
            validate: {
                notEmpty: {
                    msg: 'Email cannot be empty'
                },
                isEmail: {
                    msg: 'Must be a valid email address'
                }
            }
        },
        pincode: {
            type: DataTypes.STRING(10),
            allowNull: false,
            comment: 'PIN code - required field'
        },
        post_office_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Post office branch name'
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'District - required field'
        },
        state: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'State - required field'
        },
        region: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Region'
        },
        country: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: 'India',
            comment: 'Country'
        },
        full_address: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'Full address - required field'
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Soft delete flag: true = active, false = inactive/deleted'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
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
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'vendors',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: false,
        defaultScope: {
            where: {
                is_active: true
            }
        },
        scopes: {
            withInactive: {
                where: {}
            },
            inactive: {
                where: {
                    is_active: false
                }
            }
        }
    }
);
module.exports = Vendor;