const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Material      = sequelize.define(
    'Material',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        unit_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'units',
                key: 'id'
            }
        },
        standard_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
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
        }
    },
    {
        tableName: 'materials',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = Material;