const { sequelize, Sequelize } = require('../config/db');
const User                  = require('./userModel');
const Role                  = require('./roleModel');
const UserRole              = require('./userRoleModel');
const RefreshToken          = require('./refreshTokenModel');
const Permission            = require('./permissionModel');
const Site                  = require('./siteModel');
const SitePayment           = require('./sitePaymentModel');
const Unit                  = require('./unitModel');
const Material              = require('./materialModel');
const Labour                = require('./labourModel');
const Vendor                = require('./vendorModel');
const MaterialInvoice       = require('./materialInvoiceModel');
const MaterialInvoiceItem   = require('./materialInvoiceItemModel');
const MaterialInvoiceHistory = require('./materialInvoiceHistoryModel');
const LabourInvoice         = require('./labourInvoiceModel');
const LabourInvoiceItem     = require('./labourInvoiceItemModel');

// USER-ROLE MANY-TO-MANY ASSOCIATIONS 
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'roles'
});

Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'users'
});

// DIRECT USERROLE ASSOCIATIONS 
User.hasMany(UserRole, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    as: 'userRoles'
});

UserRole.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

Role.hasMany(UserRole, {
    foreignKey: 'role_id',
    sourceKey: 'id',
    as: 'userRoles'
});

UserRole.belongsTo(Role, {
    foreignKey: 'role_id',
    targetKey: 'id',
    as: 'role'
});

// REFRESH TOKEN ASSOCIATIONS
User.hasMany(RefreshToken, {
    foreignKey: 'user_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
    as: 'refreshTokens'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'user_id',
    targetKey: 'id',
    as: 'user'
});

// PERMISSION ASSOCIATIONS
Permission.belongsTo(Role, {
    foreignKey: 'role_id',
    as: 'role'
});

Role.hasMany(Permission, {
    foreignKey: 'role_id',
    as: 'permissions'
});

// PERMISSION AUDIT FIELDS
Permission.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Permission, {
    foreignKey: 'created_by',
    as: 'createdPermissions'
});

Permission.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Permission, {
    foreignKey: 'updated_by',
    as: 'updatedPermissions'
});

// ROLE AUDIT FIELDS
Role.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Role, {
    foreignKey: 'created_by',
    as: 'createdRoles'
});

Role.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Role, {
    foreignKey: 'updated_by',
    as: 'updatedRoles'
});

// USERROLE AUDIT FIELDS
UserRole.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(UserRole, {
    foreignKey: 'created_by',
    as: 'createdUserRoles'
});

UserRole.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(UserRole, {
    foreignKey: 'updated_by',
    as: 'updatedUserRoles'
});

// REFRESH TOKEN AUDIT FIELDS
RefreshToken.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(RefreshToken, {
    foreignKey: 'created_by',
    as: 'createdRefreshTokens'
});

RefreshToken.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(RefreshToken, {
    foreignKey: 'updated_by',
    as: 'updatedRefreshTokens'
});

// SITE ASSOCIATIONS
Site.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Site, {
    foreignKey: 'created_by',
    as: 'createdSites'
});

Site.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Site, {
    foreignKey: 'updated_by',
    as: 'updatedSites'
});

// SITE PAYMENT - SITE ASSOCIATIONS
SitePayment.belongsTo(Site, {
    foreignKey: 'site_id',
    as: 'site'
});

Site.hasMany(SitePayment, {
    foreignKey: 'site_id',
    as: 'payments'
});

// SITE PAYMENT AUDIT FIELDS
SitePayment.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(SitePayment, {
    foreignKey: 'created_by',
    as: 'createdSitePayments'
});

SitePayment.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(SitePayment, {
    foreignKey: 'updated_by',
    as: 'updatedSitePayments'
});

// UNIT ASSOCIATIONS
Unit.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Unit, {
    foreignKey: 'created_by',
    as: 'createdUnits'
});

Unit.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Unit, {
    foreignKey: 'updated_by',
    as: 'updatedUnits'
});

// MATERIAL-UNIT ASSOCIATIONS
Material.belongsTo(Unit, {
    foreignKey: 'unit_id',
    as: 'unit'
});

Unit.hasMany(Material, {
    foreignKey: 'unit_id',
    as: 'materials'
});

// MATERIAL AUDIT FIELDS
Material.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Material, {
    foreignKey: 'created_by',
    as: 'createdMaterials'
});

Material.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Material, {
    foreignKey: 'updated_by',
    as: 'updatedMaterials'
});

// LABOUR AUDIT FIELDS
Labour.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Labour, {
    foreignKey: 'created_by',
    as: 'createdLabours'
});

Labour.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Labour, {
    foreignKey: 'updated_by',
    as: 'updatedLabours'
});

// VENDOR AUDIT FIELDS
Vendor.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

User.hasMany(Vendor, {
    foreignKey: 'created_by',
    as: 'createdVendors'
});

Vendor.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Vendor, {
    foreignKey: 'updated_by',
    as: 'updatedVendors'
});

// MATERIAL INVOICE - SITE ASSOCIATIONS
MaterialInvoice.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Site.hasMany(MaterialInvoice, { foreignKey: 'site_id', as: 'materialInvoices' });

// MATERIAL INVOICE - VENDOR ASSOCIATIONS
MaterialInvoice.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });
Vendor.hasMany(MaterialInvoice, { foreignKey: 'vendor_id', as: 'materialInvoices' });

// MATERIAL INVOICE AUDIT FIELDS
MaterialInvoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(MaterialInvoice, { foreignKey: 'created_by', as: 'createdMaterialInvoices' });
MaterialInvoice.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
User.hasMany(MaterialInvoice, { foreignKey: 'updated_by', as: 'updatedMaterialInvoices' });

// MATERIAL INVOICE - ITEMS ASSOCIATIONS
MaterialInvoice.hasMany(MaterialInvoiceItem, { foreignKey: 'invoice_id', as: 'items', onDelete: 'CASCADE' });
MaterialInvoiceItem.belongsTo(MaterialInvoice, { foreignKey: 'invoice_id', as: 'invoice' });

// MATERIAL INVOICE ITEM - MATERIAL ASSOCIATIONS
MaterialInvoiceItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Material.hasMany(MaterialInvoiceItem, { foreignKey: 'material_id', as: 'materialInvoiceItems' });

// MATERIAL INVOICE HISTORY ASSOCIATIONS
MaterialInvoiceHistory.belongsTo(MaterialInvoice, { foreignKey: 'invoice_id', as: 'invoice' });
MaterialInvoice.hasMany(MaterialInvoiceHistory, { foreignKey: 'invoice_id', as: 'history' });
MaterialInvoiceHistory.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });
User.hasMany(MaterialInvoiceHistory, { foreignKey: 'performed_by', as: 'performedMaterialInvoiceHistory' });

// LABOUR INVOICE - SITE ASSOCIATIONS
LabourInvoice.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Site.hasMany(LabourInvoice, { foreignKey: 'site_id', as: 'labourInvoices' });

// LABOUR INVOICE - VENDOR ASSOCIATIONS
LabourInvoice.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });
Vendor.hasMany(LabourInvoice, { foreignKey: 'vendor_id', as: 'labourInvoices' });

// LABOUR INVOICE AUDIT FIELDS
LabourInvoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(LabourInvoice, { foreignKey: 'created_by', as: 'createdLabourInvoices' });
LabourInvoice.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
User.hasMany(LabourInvoice, { foreignKey: 'updated_by', as: 'updatedLabourInvoices' });

// LABOUR INVOICE - ITEMS ASSOCIATIONS
LabourInvoice.hasMany(LabourInvoiceItem, { foreignKey: 'invoice_id', as: 'items', onDelete: 'CASCADE' });
LabourInvoiceItem.belongsTo(LabourInvoice, { foreignKey: 'invoice_id', as: 'invoice' });

// LABOUR INVOICE ITEM - LABOUR ASSOCIATIONS
LabourInvoiceItem.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
Labour.hasMany(LabourInvoiceItem, { foreignKey: 'labour_id', as: 'labourInvoiceItems' });

// EXPORT MODELS
module.exports = {
    sequelize,
    Sequelize,
    Op: Sequelize.Op,
    User,
    Role,
    UserRole,
    RefreshToken,
    Permission,
    Site,
    SitePayment,
    Unit,
    Material,
    Labour,
    Vendor,
    MaterialInvoice,
    MaterialInvoiceItem,
    MaterialInvoiceHistory,
    LabourInvoice,
    LabourInvoiceItem
};