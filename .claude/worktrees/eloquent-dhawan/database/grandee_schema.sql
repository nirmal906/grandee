-- ============================================================
-- Grandee Constructions - Complete Database Schema
-- Generated for MySQL / phpMyAdmin import
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET NAMES utf8mb4;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(255) NOT NULL,
    `gender` ENUM('Male', 'Female', 'Others') NOT NULL,
    `profile` VARCHAR(255) DEFAULT NULL,
    `password` VARCHAR(255) DEFAULT NULL,
    `site_ids` VARCHAR(255) DEFAULT NULL,
    `remember_token` VARCHAR(255) DEFAULT NULL,
    `status` INT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. roles
-- ============================================================
CREATE TABLE IF NOT EXISTS `roles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_roles_created_by` (`created_by`),
    KEY `fk_roles_updated_by` (`updated_by`),
    CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_roles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `role_id` INT NOT NULL,
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_role` (`user_id`, `role_id`),
    KEY `fk_ur_user` (`user_id`),
    KEY `fk_ur_role` (`role_id`),
    KEY `fk_ur_created_by` (`created_by`),
    KEY `fk_ur_updated_by` (`updated_by`),
    CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_ur_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_ur_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` INT NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `can_add` TINYINT(1) NOT NULL DEFAULT 0,
    `can_edit` TINYINT(1) NOT NULL DEFAULT 0,
    `can_delete` TINYINT(1) NOT NULL DEFAULT 0,
    `can_view` TINYINT(1) NOT NULL DEFAULT 0,
    `status` INT NOT NULL DEFAULT 1,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_perm_role` (`role_id`),
    KEY `fk_perm_created_by` (`created_by`),
    KEY `fk_perm_updated_by` (`updated_by`),
    CONSTRAINT `fk_perm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_perm_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_perm_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. refresh_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(255) NOT NULL,
    `user_id` BIGINT NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_rt_user` (`user_id`),
    KEY `fk_rt_created_by` (`created_by`),
    KEY `fk_rt_updated_by` (`updated_by`),
    CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_rt_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_rt_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. sites
-- ============================================================
CREATE TABLE IF NOT EXISTS `sites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `client_name` VARCHAR(200) DEFAULT NULL COMMENT 'Client name - optional',
    `client_mobile` VARCHAR(200) NOT NULL COMMENT 'Client mobile number',
    `pincode` VARCHAR(10) DEFAULT NULL COMMENT 'PIN code',
    `post_office_name` VARCHAR(200) DEFAULT NULL COMMENT 'Post office branch name',
    `district` VARCHAR(100) DEFAULT NULL COMMENT 'District',
    `state` VARCHAR(100) DEFAULT NULL COMMENT 'State',
    `region` VARCHAR(100) DEFAULT NULL COMMENT 'Region',
    `country` VARCHAR(100) DEFAULT 'India' COMMENT 'Country',
    `full_address` TEXT DEFAULT NULL COMMENT 'Full address',
    `start_date` DATE DEFAULT NULL,
    `checkout_photo` VARCHAR(255) DEFAULT NULL COMMENT 'Checkout/completion photo filename',
    `total_budget` DECIMAL(15,2) DEFAULT NULL,
    `status` ENUM('planning', 'active', 'completed') NOT NULL DEFAULT 'planning',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete: 1=active, 0=deleted',
    `notes` TEXT DEFAULT NULL,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_sites_name` (`name`),
    KEY `fk_sites_created_by` (`created_by`),
    KEY `fk_sites_updated_by` (`updated_by`),
    CONSTRAINT `fk_sites_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_sites_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. site_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS `site_payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL COMMENT 'Reference to sites table',
    `payment_date` DATE NOT NULL COMMENT 'Date when payment was received',
    `amount` DECIMAL(15,2) NOT NULL COMMENT 'Amount paid by client',
    `payment_mode` ENUM('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other') NOT NULL DEFAULT 'cash' COMMENT 'Mode of payment',
    `transaction_reference` VARCHAR(100) DEFAULT NULL COMMENT 'Cheque number, transaction ID, etc.',
    `notes` TEXT DEFAULT NULL COMMENT 'Additional notes',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=cancelled, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sp_site_id` (`site_id`),
    KEY `idx_sp_payment_date` (`payment_date`),
    KEY `idx_sp_status` (`status`),
    KEY `idx_sp_created_by` (`created_by`),
    KEY `idx_sp_updated_by` (`updated_by`),
    KEY `idx_sp_site_payment_date` (`site_id`, `payment_date`),
    KEY `idx_sp_created_at` (`created_at`),
    CONSTRAINT `fk_sp_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_sp_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_sp_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. vendors
-- ============================================================
CREATE TABLE IF NOT EXISTS `vendors` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `pincode` VARCHAR(10) DEFAULT NULL COMMENT 'PIN code',
    `post_office_name` VARCHAR(200) DEFAULT NULL COMMENT 'Post office branch name',
    `district` VARCHAR(100) NOT NULL COMMENT 'District',
    `state` VARCHAR(100) NOT NULL COMMENT 'State',
    `region` VARCHAR(100) DEFAULT NULL COMMENT 'Region',
    `country` VARCHAR(100) DEFAULT 'India' COMMENT 'Country',
    `full_address` TEXT DEFAULT NULL COMMENT 'Full address',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete: 1=active, 0=deleted',
    `notes` TEXT DEFAULT NULL,
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_vendors_name` (`name`),
    UNIQUE KEY `uq_vendors_phone` (`phone`),
    KEY `fk_vendors_created_by` (`created_by`),
    KEY `fk_vendors_updated_by` (`updated_by`),
    CONSTRAINT `fk_vendors_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_vendors_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. units
-- ============================================================
CREATE TABLE IF NOT EXISTS `units` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_units_name` (`name`),
    KEY `fk_units_created_by` (`created_by`),
    KEY `fk_units_updated_by` (`updated_by`),
    CONSTRAINT `fk_units_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_units_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. materials
-- ============================================================
CREATE TABLE IF NOT EXISTS `materials` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `unit_id` BIGINT NOT NULL,
    `standard_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_materials_unit` (`unit_id`),
    KEY `fk_materials_created_by` (`created_by`),
    KEY `fk_materials_updated_by` (`updated_by`),
    CONSTRAINT `fk_materials_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_materials_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_materials_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. labours
-- ============================================================
CREATE TABLE IF NOT EXISTS `labours` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `standard_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `fk_labours_created_by` (`created_by`),
    KEY `fk_labours_updated_by` (`updated_by`),
    CONSTRAINT `fk_labours_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_labours_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. material_entrys (legacy flat entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_entrys` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL COMMENT 'Site for which material entry is being made',
    `material_id` BIGINT NOT NULL,
    `vendor_id` BIGINT DEFAULT NULL,
    `invoice_photo` VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded invoice photo filename',
    `date` DATE NOT NULL COMMENT 'Date of material entry',
    `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Quantity of material purchased',
    `rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rate per unit',
    `additional_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Additional charges (transport, etc.)',
    `debit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Debit amount (unpaid/pending)',
    `credit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Credit amount (paid)',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_me_material_id` (`material_id`),
    KEY `idx_me_site_id` (`site_id`),
    KEY `idx_me_vendor_id` (`vendor_id`),
    KEY `idx_me_date` (`date`),
    KEY `idx_me_status` (`status`),
    KEY `idx_me_site_material_date` (`site_id`, `material_id`, `date`),
    CONSTRAINT `fk_me_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_me_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_me_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_me_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_me_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. material_entry_history (legacy audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_entry_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `material_entry_id` BIGINT NOT NULL COMMENT 'Reference to material_entrys table',
    `site_id` BIGINT NOT NULL COMMENT 'Site for which material entry was made',
    `material_id` BIGINT NOT NULL,
    `vendor_id` BIGINT DEFAULT NULL,
    `date` DATE NOT NULL COMMENT 'Date of material entry',
    `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `additional_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `debit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `credit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` TINYINT NOT NULL DEFAULT 1,
    `invoice_photo` VARCHAR(255) DEFAULT NULL COMMENT 'Invoice/bill photo filename',
    `action_type` ENUM('created', 'updated', 'deleted') NOT NULL COMMENT 'Type of action performed',
    `changed_fields` TEXT DEFAULT NULL COMMENT 'JSON string of changed fields',
    `performed_by` BIGINT DEFAULT NULL COMMENT 'User who performed the action',
    `performed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action was performed',
    PRIMARY KEY (`id`),
    KEY `idx_meh_material_entry_id` (`material_entry_id`),
    KEY `idx_meh_site_id` (`site_id`),
    KEY `idx_meh_material_id` (`material_id`),
    KEY `idx_meh_vendor_id` (`vendor_id`),
    KEY `idx_meh_performed_by` (`performed_by`),
    KEY `idx_meh_performed_at` (`performed_at`),
    KEY `idx_meh_action_type` (`action_type`),
    CONSTRAINT `fk_meh_entry` FOREIGN KEY (`material_entry_id`) REFERENCES `material_entrys` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_meh_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_meh_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_meh_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_meh_performer` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. labour_entrys (legacy flat entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS `labour_entrys` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL COMMENT 'Site for which labour entry is being made',
    `labour_id` BIGINT NOT NULL COMMENT 'Labour type reference',
    `vendor_id` BIGINT DEFAULT NULL COMMENT 'Vendor reference (optional)',
    `date` DATE NOT NULL COMMENT 'Date of labour entry',
    `no_of_workers` INT NOT NULL COMMENT 'Number of workers for this entry',
    `rate_per_worker` DECIMAL(10,2) DEFAULT NULL COMMENT 'Rate per worker - null until admin approves',
    `debit_entry` DECIMAL(10,2) DEFAULT NULL COMMENT 'Debit amount - null until admin approves',
    `credit_entry` DECIMAL(10,2) DEFAULT NULL COMMENT 'Credit amount - null until admin approves',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT 'Admin approval status',
    `rejection_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Reason provided by admin when rejecting',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_le_labour_id` (`labour_id`),
    KEY `idx_le_site_id` (`site_id`),
    KEY `idx_le_date` (`date`),
    KEY `idx_le_status` (`status`),
    KEY `idx_le_approval_status` (`approval_status`),
    KEY `idx_le_site_labour_date` (`site_id`, `labour_id`, `date`),
    KEY `fk_le_vendor` (`vendor_id`),
    CONSTRAINT `fk_le_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_le_labour` FOREIGN KEY (`labour_id`) REFERENCES `labours` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_le_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_le_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_le_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. material_invoices (NEW - invoice header)
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL COMMENT 'Site for which material invoice is created',
    `vendor_id` BIGINT NOT NULL COMMENT 'Vendor who supplied the materials',
    `date` DATE NOT NULL COMMENT 'Invoice date',
    `invoice_number` VARCHAR(100) DEFAULT NULL COMMENT 'Vendor invoice number (user-entered)',
    `additional_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Shared additional charges (transport, etc.)',
    `debit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Debit amount (unpaid/pending)',
    `credit_entry` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Credit amount (paid)',
    `invoice_photo` VARCHAR(255) DEFAULT NULL COMMENT 'Uploaded invoice photo filename',
    `notes` TEXT DEFAULT NULL COMMENT 'Additional notes',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_mi_site_id` (`site_id`),
    KEY `idx_mi_vendor_id` (`vendor_id`),
    KEY `idx_mi_date` (`date`),
    KEY `idx_mi_status` (`status`),
    KEY `idx_mi_site_vendor_date` (`site_id`, `vendor_id`, `date`),
    UNIQUE KEY `uq_mi_vendor_invoice` (`vendor_id`, `invoice_number`),
    CONSTRAINT `fk_mi_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_mi_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_mi_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_mi_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. material_invoice_items (NEW - line items)
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_invoice_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL COMMENT 'Parent material invoice',
    `material_id` BIGINT NOT NULL COMMENT 'Material purchased',
    `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Quantity of material',
    `rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rate per unit',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_mii_invoice_id` (`invoice_id`),
    KEY `idx_mii_material_id` (`material_id`),
    CONSTRAINT `fk_mii_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `material_invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_mii_material` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. material_invoice_history (NEW - JSON snapshot audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS `material_invoice_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL COMMENT 'Reference to material_invoices table',
    `action_type` ENUM('created', 'updated', 'deleted', 'item_added', 'item_updated', 'item_removed') NOT NULL COMMENT 'Type of action performed',
    `snapshot` TEXT NOT NULL COMMENT 'JSON snapshot of invoice + items at time of action',
    `changed_fields` TEXT DEFAULT NULL COMMENT 'JSON string of changed fields',
    `performed_by` BIGINT DEFAULT NULL COMMENT 'User who performed the action',
    `performed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action was performed',
    PRIMARY KEY (`id`),
    KEY `idx_mih_invoice_id` (`invoice_id`),
    KEY `idx_mih_performed_by` (`performed_by`),
    KEY `idx_mih_performed_at` (`performed_at`),
    KEY `idx_mih_action_type` (`action_type`),
    CONSTRAINT `fk_mih_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `material_invoices` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_mih_performer` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. labour_invoices (NEW - invoice header with approval)
-- ============================================================
CREATE TABLE IF NOT EXISTS `labour_invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL COMMENT 'Site for which labour invoice is created',
    `vendor_id` BIGINT NOT NULL COMMENT 'Labour vendor',
    `date` DATE NOT NULL COMMENT 'Invoice date',
    `invoice_number` VARCHAR(100) DEFAULT NULL COMMENT 'Vendor invoice number (user-entered)',
    `debit_entry` DECIMAL(10,2) DEFAULT NULL COMMENT 'Debit amount - null until admin approves',
    `credit_entry` DECIMAL(10,2) DEFAULT NULL COMMENT 'Credit amount - null until admin approves',
    `notes` TEXT DEFAULT NULL COMMENT 'Additional notes',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
    `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT 'Admin approval status',
    `rejection_reason` VARCHAR(500) DEFAULT NULL COMMENT 'Reason provided by admin when rejecting',
    `created_by` BIGINT DEFAULT NULL,
    `updated_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_li_site_id` (`site_id`),
    KEY `idx_li_vendor_id` (`vendor_id`),
    KEY `idx_li_date` (`date`),
    KEY `idx_li_status` (`status`),
    KEY `idx_li_approval_status` (`approval_status`),
    KEY `idx_li_site_vendor_date` (`site_id`, `vendor_id`, `date`),
    UNIQUE KEY `uq_li_vendor_invoice` (`vendor_id`, `invoice_number`),
    CONSTRAINT `fk_li_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_li_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_li_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_li_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. labour_invoice_items (NEW - line items)
-- ============================================================
CREATE TABLE IF NOT EXISTS `labour_invoice_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL COMMENT 'Parent labour invoice',
    `labour_id` BIGINT NOT NULL COMMENT 'Labour type',
    `no_of_workers` INT NOT NULL COMMENT 'Number of workers',
    `rate_per_worker` DECIMAL(10,2) DEFAULT NULL COMMENT 'Rate per worker - null until admin sets on approval',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lii_invoice_id` (`invoice_id`),
    KEY `idx_lii_labour_id` (`labour_id`),
    CONSTRAINT `fk_lii_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `labour_invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_lii_labour` FOREIGN KEY (`labour_id`) REFERENCES `labours` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED DATA: Default admin user + role + permissions
-- ============================================================

-- Default admin role
INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Default admin user (password: admin123 - bcrypt hash)
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `gender`, `password`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Admin', 'admin@grandee.com', '9999999999', 'Male', '$2b$10$rQZ8K1.1Nk8V0kZ0Q5Q5QOYQfZ7F2Z8YQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Assign admin role to admin user
INSERT INTO `user_roles` (`user_id`, `role_id`, `is_primary`, `created_at`, `updated_at`) VALUES
(1, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `is_primary` = VALUES(`is_primary`);

-- Default permissions for admin role (all modules, full access)
INSERT INTO `permissions` (`role_id`, `module`, `can_add`, `can_edit`, `can_delete`, `can_view`, `status`, `created_at`, `updated_at`) VALUES
(1, 'dashboard',          1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'site',               1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'vendor',             1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'material',           1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'materialentry',      1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'labour',             1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'labourentry',        1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'approvelabourentry', 1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'role',               1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'permission',         1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'team',               1, 1, 1, 1, 1, NOW(), NOW()),
(1, 'unit',               1, 1, 1, 1, 1, NOW(), NOW());

-- Default units
INSERT INTO `units` (`name`, `status`, `created_at`, `updated_at`) VALUES
('Kg', 1, NOW(), NOW()),
('Ton', 1, NOW(), NOW()),
('Piece', 1, NOW(), NOW()),
('Bag', 1, NOW(), NOW()),
('Cubic Meter', 1, NOW(), NOW()),
('Square Foot', 1, NOW(), NOW()),
('Running Foot', 1, NOW(), NOW()),
('Litre', 1, NOW(), NOW()),
('Bundle', 1, NOW(), NOW()),
('Load', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
