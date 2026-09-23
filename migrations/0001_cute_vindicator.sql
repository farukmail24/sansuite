CREATE TABLE `cs_officers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(50) DEFAULT 'Director',
	`appointment_date` date,
	`resignation_date` date,
	`date_of_birth` date,
	`address` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cs_officers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cs_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`company_reg_no` varchar(20),
	`company_type` varchar(50) DEFAULT 'Ltd',
	`incorporation_date` date,
	`sic_code` varchar(10),
	`next_confirmation_due` date,
	`next_accounts_due` date,
	`registered_address` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cs_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cs_shareholders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`shareholder_type` varchar(30) DEFAULT 'Individual',
	`email` varchar(255),
	`share_class` varchar(50) DEFAULT 'Ordinary',
	`shares_held` decimal(15,2) DEFAULT '0.00',
	`nominal_value` decimal(10,4) DEFAULT '1.0000',
	`percentage_ownership` decimal(6,2) DEFAULT '0.00',
	`appointment_date` date,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cs_shareholders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mtd_it_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mtd_client_id` int,
	`tax_year` varchar(10),
	`adjustment_type` varchar(100),
	`amount` decimal(15,2),
	`submitted_at` timestamp,
	CONSTRAINT `mtd_it_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mtd_it_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int,
	`utr_number` varchar(20),
	`nino` varchar(20),
	`mtd_status` varchar(50) DEFAULT 'Unregistered',
	`agent_authorised` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `mtd_it_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mtd_it_quarter_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mtd_quarter_id` int,
	`gross_income` decimal(15,2),
	`allowable_expenses` decimal(15,2),
	`net_profit` decimal(15,2),
	`submitted_at` timestamp,
	`hmrc_submission_id` varchar(255),
	`status` varchar(50) DEFAULT 'Draft',
	`error_log` text,
	CONSTRAINT `mtd_it_quarter_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mtd_it_quarters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mtd_client_id` int,
	`tax_year` varchar(10),
	`quarter_number` int,
	`start_date` date,
	`end_date` date,
	`due_date` date,
	`status` varchar(50) DEFAULT 'Open',
	CONSTRAINT `mtd_it_quarters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_client_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int,
	`invite_email` varchar(255),
	`token` varchar(255),
	`status` varchar(50) DEFAULT 'Pending',
	`invited_at` timestamp DEFAULT (now()),
	`accepted_at` timestamp,
	CONSTRAINT `portal_client_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_client_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `portal_licenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`license_type` varchar(50),
	`total_allocated` int,
	`used_count` int DEFAULT 0,
	CONSTRAINT `portal_licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int,
	`email` varchar(255),
	`password_hash` varchar(255),
	`first_name` varchar(100),
	`last_name` varchar(100),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `portal_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `portal_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `sa800_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sa_client_id` int NOT NULL,
	`tax_year` varchar(20) NOT NULL,
	`trading_profit` decimal(15,2) DEFAULT '0.00',
	`property_income` decimal(15,2) DEFAULT '0.00',
	`untaxed_interest` decimal(15,2) DEFAULT '0.00',
	`partnership_net_profit` decimal(15,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'Draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sa800_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esign_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int,
	`action` varchar(100),
	`timestamp` timestamp DEFAULT (now()),
	`details` text,
	CONSTRAINT `esign_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esign_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255),
	`file_path` varchar(255),
	`file_size` int,
	`source_module` varchar(100),
	`status` varchar(50) DEFAULT 'Draft',
	`created_by_user_id` int,
	`created_at` timestamp DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `esign_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esign_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int,
	`signer_id` int,
	`field_type` varchar(50),
	`page_number` int,
	`coord_x` decimal(5,2),
	`coord_y` decimal(5,2),
	`width` decimal(5,2),
	`height` decimal(5,2),
	CONSTRAINT `esign_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `esign_signers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`document_id` int,
	`signer_email` varchar(255),
	`signer_name` varchar(100),
	`status` varchar(50) DEFAULT 'Awaiting',
	`signed_at` timestamp,
	`ip_address` varchar(45),
	`user_agent` varchar(255),
	`verification_token` varchar(255),
	CONSTRAINT `esign_signers_id` PRIMARY KEY(`id`),
	CONSTRAINT `esign_signers_verification_token_unique` UNIQUE(`verification_token`)
);
--> statement-breakpoint
ALTER TABLE `chart_of_accounts` MODIFY COLUMN `category` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `start_date` date;--> statement-breakpoint
ALTER TABLE `jobs` ADD `target_end_date` date;--> statement-breakpoint
ALTER TABLE `jobs` ADD `estimated_hours` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `jobs` ADD `assigned_to` int;--> statement-breakpoint
ALTER TABLE `cs_officers` ADD CONSTRAINT `cs_officers_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cs_records` ADD CONSTRAINT `cs_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cs_shareholders` ADD CONSTRAINT `cs_shareholders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mtd_it_adjustments` ADD CONSTRAINT `mtd_it_adjustments_mtd_client_id_mtd_it_clients_id_fk` FOREIGN KEY (`mtd_client_id`) REFERENCES `mtd_it_clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mtd_it_clients` ADD CONSTRAINT `mtd_it_clients_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mtd_it_quarter_submissions` ADD CONSTRAINT `mtd_it_quarter_submissions_mtd_quarter_id_mtd_it_quarters_id_fk` FOREIGN KEY (`mtd_quarter_id`) REFERENCES `mtd_it_quarters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mtd_it_quarters` ADD CONSTRAINT `mtd_it_quarters_mtd_client_id_mtd_it_clients_id_fk` FOREIGN KEY (`mtd_client_id`) REFERENCES `mtd_it_clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `portal_client_invitations` ADD CONSTRAINT `portal_client_invitations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `portal_users` ADD CONSTRAINT `portal_users_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sa800_returns` ADD CONSTRAINT `sa800_returns_sa_client_id_self_assessment_clients_id_fk` FOREIGN KEY (`sa_client_id`) REFERENCES `self_assessment_clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `esign_audit_logs` ADD CONSTRAINT `esign_audit_logs_document_id_esign_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `esign_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `esign_documents` ADD CONSTRAINT `esign_documents_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `esign_fields` ADD CONSTRAINT `esign_fields_document_id_esign_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `esign_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `esign_fields` ADD CONSTRAINT `esign_fields_signer_id_esign_signers_id_fk` FOREIGN KEY (`signer_id`) REFERENCES `esign_signers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `esign_signers` ADD CONSTRAINT `esign_signers_document_id_esign_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `esign_documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;