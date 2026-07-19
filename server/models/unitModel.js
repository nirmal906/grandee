const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Unit          = sequelize.define(
    'Unit',
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
        tableName: 'units',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);
module.exports = Unit;