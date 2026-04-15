-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 22, 2026 at 05:58 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grandee`
--

-- --------------------------------------------------------

--
-- Table structure for table `labours`
--

CREATE TABLE `labours` (
  `id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `standard_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `labours`
--

INSERT INTO `labours` (`id`, `name`, `standard_rate`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Welder', 1000.00, 1, NULL, NULL, '2025-12-27 11:36:28', '2026-01-07 17:19:55');

-- --------------------------------------------------------

--
-- Table structure for table `labour_entrys`
--

CREATE TABLE `labour_entrys` (
  `id` bigint(20) NOT NULL,
  `site_id` bigint(20) NOT NULL,
  `labour_id` bigint(20) NOT NULL,
  `date` date NOT NULL,
  `no_of_workers` int(11) NOT NULL COMMENT 'Number of workers for this entry',
  `rate_per_worker` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rate per worker (auto-filled from labour.standard_rate)',
  `debit_entry` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Debit amount - unpaid/pending amount (Total - Credit)',
  `credit_entry` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Credit amount - paid amount (Total - Debit)',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total_amount` decimal(12,2) GENERATED ALWAYS AS (`no_of_workers` * `rate_per_worker`) VIRTUAL COMMENT 'Auto-calculated: no_of_workers × rate_per_worker'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `labour_entrys`
--

INSERT INTO `labour_entrys` (`id`, `site_id`, `labour_id`, `date`, `no_of_workers`, `rate_per_worker`, `debit_entry`, `credit_entry`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2026-01-08', 12, 1000.00, 11800.00, 200.00, 1, NULL, NULL, '2025-12-27 12:13:14', '2026-01-08 18:07:06');

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `unit_id` bigint(20) NOT NULL,
  `standard_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `materials`
--

INSERT INTO `materials` (`id`, `name`, `unit_id`, `standard_rate`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Cement', 1, 1000.00, 1, NULL, NULL, '2025-12-26 20:00:53', '2025-12-26 20:00:53'),
(2, 'Rode', 1, 2000.00, 1, NULL, NULL, '2026-01-22 15:56:36', '2026-01-22 15:56:59'),
(3, 'Steel', 1, 500.00, 1, NULL, NULL, '2026-01-22 15:56:53', '2026-01-22 15:56:53');

-- --------------------------------------------------------

--
-- Table structure for table `material_entrys`
--

CREATE TABLE `material_entrys` (
  `id` bigint(20) NOT NULL,
  `site_id` bigint(20) NOT NULL COMMENT 'Site for which material entry is being made',
  `material_id` bigint(20) NOT NULL,
  `vendor_id` bigint(20) DEFAULT NULL,
  `date` date NOT NULL COMMENT 'Date of material entry',
  `quantity` decimal(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Quantity of material purchased',
  `rate` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Rate per unit',
  `additional_charges` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Additional charges (transport, etc.)',
  `debit_entry` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Debit amount (unpaid/pending amount)',
  `credit_entry` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Credit amount (paid amount)',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `material_entrys`
--

INSERT INTO `material_entrys` (`id`, `site_id`, `material_id`, `vendor_id`, `date`, `quantity`, `rate`, `additional_charges`, `debit_entry`, `credit_entry`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, '2026-01-10', 12.000, 1000.00, 0.00, 5000.00, 7000.00, 1, NULL, NULL, '2026-01-11 14:33:16', '2026-01-22 21:19:08'),
(2, 1, 1, 2, '2026-01-22', 10.000, 1000.00, 0.00, 7000.00, 3000.00, 1, NULL, NULL, '2026-01-22 21:28:32', '2026-01-22 21:28:32'),
(3, 1, 2, 2, '2026-01-22', 5.000, 2000.00, 0.00, 10000.00, 0.00, 1, NULL, NULL, '2026-01-22 21:29:44', '2026-01-22 21:29:44'),
(4, 2, 3, 2, '2026-01-22', 7.000, 500.00, 0.00, 1500.00, 2000.00, 1, NULL, NULL, '2026-01-22 21:30:11', '2026-01-22 21:30:11');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) NOT NULL,
  `role_id` bigint(20) NOT NULL,
  `module` varchar(100) NOT NULL,
  `can_add` tinyint(1) NOT NULL DEFAULT 0,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `can_view` tinyint(1) NOT NULL DEFAULT 0,
  `status` int(11) NOT NULL DEFAULT 1,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `role_id`, `module`, `can_add`, `can_edit`, `can_delete`, `can_view`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'role', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-25 14:49:34', '2025-12-25 14:49:34'),
(2, 1, 'permission', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-25 14:49:34', '2025-12-25 14:49:34'),
(3, 1, 'site', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-25 14:49:34', '2025-12-25 14:49:34'),
(4, 1, 'team', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 00:31:50', '2025-12-27 00:31:50'),
(5, 1, 'unit', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 01:02:37', '2025-12-27 01:02:37'),
(6, 1, 'material', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 01:24:46', '2025-12-27 01:24:46'),
(7, 1, 'labour', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 08:31:21', '2025-12-27 08:31:21'),
(8, 1, 'vendor', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 11:17:53', '2025-12-27 11:17:53'),
(9, 1, 'labourentry', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-27 16:48:44', '2025-12-27 16:48:44'),
(10, 1, 'materialentry', 1, 1, 1, 1, 1, NULL, NULL, '2025-12-28 17:36:38', '2025-12-28 17:36:38'),
(11, 6, 'site', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(12, 6, 'permission', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(13, 6, 'role', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(14, 6, 'team', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(15, 6, 'material', 1, 1, 1, 1, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:45:54'),
(16, 6, 'unit', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(17, 6, 'materialentry', 1, 1, 1, 1, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:45:54'),
(18, 6, 'labour', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(19, 6, 'labourentry', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(20, 6, 'vendor', 0, 0, 0, 0, 1, NULL, NULL, '2026-01-07 22:44:27', '2026-01-07 22:44:27'),
(21, 1, 'dashboard', 1, 1, 1, 1, 1, NULL, NULL, '2026-01-08 23:06:17', '2026-01-08 23:07:37');

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refresh_tokens`
--

INSERT INTO `refresh_tokens` (`id`, `token`, `user_id`, `expires_at`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'c3a305c0ea3ec668b9003ac92c744ec00f7a604f3bdbe44e570ae648d5aeb019fdcf10bd017ec602ddc3cf35f664c11e015259680e61bb22a978d6d55d950520', 1, '2026-01-29 21:13:55', NULL, NULL, '2026-01-22 21:13:55', '2026-01-22 21:13:55'),
(2, '968500dde553947f23fd365c928da76832f853b64986a65b4cd61908a7c2660111a478ed2476956d5fac2fefb6529c50d9bb309a3b533599922ca45b8c7f654a', 1, '2026-01-29 21:29:04', NULL, NULL, '2026-01-22 21:29:04', '2026-01-22 21:29:04'),
(3, '16932115342ffec5ac67bca246b7aaf2cfc3ad0c5b6a93897936b359ed406e96832178f6fdde484527f6e98521f962efbb8a45b10a599c32d7e08a30783645da', 1, '2026-01-29 21:45:27', NULL, NULL, '2026-01-22 21:45:27', '2026-01-22 21:45:27');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Superadmin', NULL, NULL, '2025-12-25 10:19:01', '2025-12-25 10:19:01'),
(2, 'Admin', NULL, NULL, '2025-12-27 10:00:22', '2025-12-27 10:00:22'),
(4, 'Plumber', NULL, NULL, '2025-12-27 15:18:19', '2025-12-27 15:18:19'),
(5, 'Support', NULL, NULL, '2025-12-27 15:18:29', '2025-12-27 15:18:29'),
(6, 'material', NULL, NULL, '2026-01-07 22:44:14', '2026-01-07 22:44:14');

-- --------------------------------------------------------

--
-- Table structure for table `sites`
--

CREATE TABLE `sites` (
  `id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `client_name` varchar(100) DEFAULT NULL COMMENT 'Client name - optional field',
  `client_mobile` varchar(15) NOT NULL COMMENT 'Client mobile number - required field',
  `location_type` enum('pincode','others') NOT NULL DEFAULT 'pincode' COMMENT 'Type of location entry: pincode search, postoffice search, or custom address',
  `pincode` varchar(10) DEFAULT NULL COMMENT 'PIN code from API or custom entry',
  `post_office_name` varchar(200) DEFAULT NULL COMMENT 'Post office branch name from API',
  `district` varchar(100) DEFAULT NULL COMMENT 'District from API',
  `state` varchar(100) DEFAULT NULL COMMENT 'State from API or custom entry',
  `region` varchar(100) DEFAULT NULL COMMENT 'Region from API',
  `country` varchar(100) DEFAULT 'India' COMMENT 'Country from API or custom entry',
  `full_address` text DEFAULT NULL COMMENT 'Full custom address when location_type is "custom"',
  `start_date` date DEFAULT NULL,
  `total_budget` decimal(15,2) DEFAULT NULL,
  `status` enum('planning','active','completed') NOT NULL DEFAULT 'planning',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete flag: true = active, false = inactive/deleted',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sites`
--

INSERT INTO `sites` (`id`, `name`, `client_name`, `client_mobile`, `location_type`, `pincode`, `post_office_name`, `district`, `state`, `region`, `country`, `full_address`, `start_date`, `total_budget`, `status`, `is_active`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Testing', NULL, '', 'others', '600011', 'Perambur', 'Chennai', 'Tamil Nadu', 'Chennai Region', 'India', 'zfdxdf', '2025-12-26', 50000.00, 'planning', 1, NULL, NULL, NULL, '2025-12-26 22:19:14', '2026-01-22 21:40:57'),
(2, 'TestingSite', NULL, '', 'pincode', '600011', NULL, 'Chennai', 'Tamil Nadu', 'Chennai Region', 'India', 'Testing Site', '2025-12-27', 10000.00, 'completed', 1, NULL, NULL, NULL, '2025-12-27 11:30:32', '2026-01-22 21:37:29');

-- --------------------------------------------------------

--
-- Table structure for table `site_payments`
--

CREATE TABLE `site_payments` (
  `id` bigint(20) NOT NULL,
  `site_id` bigint(20) NOT NULL COMMENT 'Reference to sites table',
  `payment_date` date NOT NULL COMMENT 'Date when payment was received',
  `amount` decimal(15,2) NOT NULL COMMENT 'Amount paid by client',
  `payment_mode` enum('cash','cheque','bank_transfer','upi','card','other') NOT NULL DEFAULT 'cash' COMMENT 'Mode of payment',
  `transaction_reference` varchar(100) DEFAULT NULL COMMENT 'Cheque number, transaction ID, etc.',
  `notes` text DEFAULT NULL COMMENT 'Additional notes about the payment',
  `status` tinyint(4) NOT NULL DEFAULT 1 COMMENT '0=cancelled, 1=active',
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `site_payments`
--

INSERT INTO `site_payments` (`id`, `site_id`, `payment_date`, `amount`, `payment_mode`, `transaction_reference`, `notes`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 2, '2026-01-11', 5000.00, 'cash', NULL, NULL, 1, NULL, NULL, '2026-01-11 11:17:53', '2026-01-11 11:17:53'),
(2, 2, '2026-01-11', 1000.00, 'cash', NULL, NULL, 1, NULL, NULL, '2026-01-11 11:59:57', '2026-01-11 11:59:57'),
(3, 1, '2026-01-11', 1000.00, 'cash', NULL, NULL, 1, NULL, NULL, '2026-01-11 17:09:56', '2026-01-11 17:09:56');

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `id` bigint(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0=inactive, 1=active',
  `created_by` bigint(10) DEFAULT NULL,
  `updated_by` bigint(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`id`, `name`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Kg', 1, NULL, NULL, '2025-12-26 19:33:50', '2025-12-26 19:33:50');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(255) NOT NULL,
  `gender` enum('Male','Female','Others') NOT NULL,
  `profile` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `remember_token` varchar(255) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `gender`, `profile`, `password`, `remember_token`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Nirmal Balaji T U', 'nirmalbalaji224@gmail.com', '6381455279', 'Male', NULL, '$2b$10$MUZW5F8vJbydnJj41t0esehDhv8V89d9wpID39ptHKFUk0W4cAiSy', NULL, 1, '2025-12-25 10:17:56', '2025-12-25 10:17:56'),
(2, 'jorden', 'jorden@gmail.com', '7397061442', 'Male', NULL, '$2b$10$Byk7zq5B8cI6iAubYGfVeeqHPqlrpjkmlGDKW7oRxITgHb3JRKjuK', NULL, 1, '2026-01-07 22:45:06', '2026-01-07 22:45:06');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `role_id` bigint(20) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role_id`, `is_primary`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(2, 1, 1, 1, NULL, NULL, '2025-12-25 10:19:11', '2025-12-25 10:19:11'),
(3, 2, 6, 1, NULL, NULL, '2026-01-07 22:45:06', '2026-01-07 22:45:06');

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

CREATE TABLE `vendors` (
  `id` bigint(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL,
  `location_type` enum('pincode','others') NOT NULL DEFAULT 'pincode' COMMENT 'Type of location entry: pincode search, others',
  `pincode` varchar(10) DEFAULT NULL COMMENT 'PIN code from API or custom entry',
  `post_office_name` varchar(200) DEFAULT NULL COMMENT 'Post office branch name from API',
  `district` varchar(100) DEFAULT NULL COMMENT 'District from API',
  `state` varchar(100) DEFAULT NULL COMMENT 'State from API or custom entry',
  `region` varchar(100) DEFAULT NULL COMMENT 'Region from API',
  `country` varchar(100) DEFAULT 'India' COMMENT 'Country from API or custom entry',
  `full_address` text DEFAULT NULL COMMENT 'Full custom address when location_type is "custom"',
  `location_display` varchar(500) DEFAULT NULL COMMENT 'Computed display string for location',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete flag: true = active, false = inactive/deleted',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `updated_by` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vendors`
--

INSERT INTO `vendors` (`id`, `name`, `phone`, `email`, `location_type`, `pincode`, `post_office_name`, `district`, `state`, `region`, `country`, `full_address`, `location_display`, `is_active`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'TESTING', '6381455279', 'vendor@example.io', 'pincode', '600011', 'Perambur', 'Chennai', 'Tamil Nadu', 'Chennai Region', 'India', 'Testing', NULL, 1, NULL, NULL, NULL, '2025-12-27 12:10:09', '2025-12-27 12:10:09'),
(2, 'Jorden', '6381455278', 'jorden@gmail.com', 'pincode', '600011', 'Perambur North', 'Chennai', 'Tamil Nadu', 'Chennai Region', 'India', 'Chennai', NULL, 1, NULL, NULL, NULL, '2026-01-22 21:27:51', '2026-01-22 21:27:51');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `labours`
--
ALTER TABLE `labours`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `fk_labours_created_by` (`created_by`),
  ADD KEY `fk_labours_updated_by` (`updated_by`);

--
-- Indexes for table `labour_entrys`
--
ALTER TABLE `labour_entrys`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_labour_id` (`labour_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`),
  ADD KEY `idx_labour_date` (`labour_id`,`date`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_site_id` (`site_id`),
  ADD KEY `idx_site_labour_date` (`site_id`,`labour_id`,`date`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `fk_materials_unit_id` (`unit_id`),
  ADD KEY `fk_materials_created_by` (`created_by`),
  ADD KEY `fk_materials_updated_by` (`updated_by`);

--
-- Indexes for table `material_entrys`
--
ALTER TABLE `material_entrys`
  ADD PRIMARY KEY (`id`),
  ADD KEY `material_id` (`material_id`),
  ADD KEY `vendor_id` (`vendor_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_site_id` (`site_id`),
  ADD KEY `idx_material_id` (`material_id`),
  ADD KEY `idx_vendor_id` (`vendor_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_site_material_date` (`site_id`,`material_id`,`date`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_permissions_created_by` (`created_by`),
  ADD KEY `idx_permissions_updated_by` (`updated_by`),
  ADD KEY `permissions_ibfk_1` (`role_id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD UNIQUE KEY `token_2` (`token`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_refresh_tokens_created_by` (`created_by`),
  ADD KEY `idx_refresh_tokens_updated_by` (`updated_by`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `name_2` (`name`),
  ADD KEY `idx_roles_created_by` (`created_by`),
  ADD KEY `idx_roles_updated_by` (`updated_by`);

--
-- Indexes for table `sites`
--
ALTER TABLE `sites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sites_name_unique` (`name`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_sites_status` (`status`),
  ADD KEY `idx_sites_is_active` (`is_active`),
  ADD KEY `idx_sites_start_date` (`start_date`),
  ADD KEY `idx_sites_updated_by` (`updated_by`),
  ADD KEY `idx_sites_location_type` (`location_type`),
  ADD KEY `idx_sites_pincode` (`pincode`),
  ADD KEY `idx_sites_district` (`district`);

--
-- Indexes for table `site_payments`
--
ALTER TABLE `site_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_site_id` (`site_id`),
  ADD KEY `idx_payment_date` (`payment_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`),
  ADD KEY `idx_site_payment_date` (`site_id`,`payment_date`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `fk_units_created_by` (`created_by`),
  ADD KEY `fk_units_updated_by` (`updated_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_roles_role_id_user_id_unique` (`user_id`,`role_id`),
  ADD UNIQUE KEY `user_roles_user_id_role_id` (`user_id`,`role_id`),
  ADD KEY `idx_user_roles_created_by` (`created_by`),
  ADD KEY `idx_user_roles_updated_by` (`updated_by`),
  ADD KEY `user_roles_ibfk_4` (`role_id`);

--
-- Indexes for table `vendors`
--
ALTER TABLE `vendors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vendors_name_unique` (`name`),
  ADD UNIQUE KEY `vendors_phone_unique` (`phone`),
  ADD UNIQUE KEY `vendors_email_unique` (`email`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_vendors_is_active` (`is_active`),
  ADD KEY `idx_vendors_location_type` (`location_type`),
  ADD KEY `idx_vendors_pincode` (`pincode`),
  ADD KEY `idx_vendors_district` (`district`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `labours`
--
ALTER TABLE `labours`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `labour_entrys`
--
ALTER TABLE `labour_entrys`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `material_entrys`
--
ALTER TABLE `material_entrys`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `sites`
--
ALTER TABLE `sites`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `site_payments`
--
ALTER TABLE `site_payments`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `id` bigint(10) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `vendors`
--
ALTER TABLE `vendors`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `labours`
--
ALTER TABLE `labours`
  ADD CONSTRAINT `fk_labours_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_labours_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `labour_entrys`
--
ALTER TABLE `labour_entrys`
  ADD CONSTRAINT `fk_labour_entry_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_labour_entry_labour` FOREIGN KEY (`labour_id`) REFERENCES `labours` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_labour_entry_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_labour_entry_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `materials`
--
ALTER TABLE `materials`
  ADD CONSTRAINT `fk_materials_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_materials_unit_id` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`),
  ADD CONSTRAINT `fk_materials_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `material_entrys`
--
ALTER TABLE `material_entrys`
  ADD CONSTRAINT `fk_material_entry_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `material_entrys_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT `material_entrys_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `material_entrys_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `material_entrys_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `permissions`
--
ALTER TABLE `permissions`
  ADD CONSTRAINT `fk_permissions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_permissions_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_refresh_tokens_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_refresh_tokens_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `sites`
--
ALTER TABLE `sites`
  ADD CONSTRAINT `fk_sites_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sites_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `site_payments`
--
ALTER TABLE `site_payments`
  ADD CONSTRAINT `fk_site_payment_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_site_payment_site` FOREIGN KEY (`site_id`) REFERENCES `sites` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_site_payment_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `fk_units_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_units_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_roles_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_4` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `vendors`
--
ALTER TABLE `vendors`
  ADD CONSTRAINT `vendors_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `vendors_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
