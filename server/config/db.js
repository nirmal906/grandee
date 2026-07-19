const { Sequelize } = require('sequelize');
require('dotenv').config();
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
        timezone: '+05:30',
        dialectOptions: {
            dateStrings: true,
            typeCast: true,
        } 
    }
);

// Force session timezone to IST
sequelize.beforeConnect(async (config) => {
    config.timezone = '+05:30';
});

module.exports = { sequelize, Sequelize };