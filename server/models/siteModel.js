const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Site          = sequelize.define(
    'Site',
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
                msg: 'Site name must be unique'
            },
            validate: {
                notEmpty: {
                    msg: 'Site name cannot be empty'
                }
            }
        },
        client_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Client name - optional field'
        },
        client_mobile: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Client mobile number - required field'
        },
        assign_engineer: {
            type: DataTypes.STRING(150),
            allowNull: true,
            comment: 'Name of the engineer assigned to oversee this site'
        },
        pincode: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: 'PIN code - required field'
        },
        post_office_name: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Post office branch name'
        },
        district: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'District - required field'
        },
        state: {
            type: DataTypes.STRING(100),
            allowNull: true,
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
            allowNull: true,
            comment: 'Full address - required field'
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        checkout_photo: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null,
            comment: 'Filename of checkout/completion photo'
        },
        total_budget: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
            validate: {
                min: {
                    args: [0],
                    msg: 'Total budget must be a positive number'
                }
            }
        },
        status: {
            type: DataTypes.ENUM('planning', 'active', 'completed'),
            allowNull: false,
            defaultValue: 'planning'
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
        tableName: 'sites',
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
module.exports = Site;