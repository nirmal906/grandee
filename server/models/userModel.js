const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User          = sequelize.define(
    'User', {
        id: {
            type: DataTypes.BIGINT, 
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        mobile: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gender: {
            type: DataTypes.ENUM('Male', 'Female', 'Others'),
            allowNull: false
        },
        profile: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true
        },
        remember_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1, 
            validate: {
                isIn: [[0, 1]], 
            },
        }
    },
    {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
module.exports = User;