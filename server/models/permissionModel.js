const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Permission    = sequelize.define(
    'Permission',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'roles',
                key: 'id'
            }
        },
        module: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        can_add: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        can_edit: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        can_delete: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        can_view: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
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
        tableName: 'permissions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);
module.exports = Permission;