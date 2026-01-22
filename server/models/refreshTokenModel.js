const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const RefreshToken  = sequelize.define(
    'RefreshToken',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        user_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
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
        tableName: 'refresh_tokens',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);
module.exports = RefreshToken;