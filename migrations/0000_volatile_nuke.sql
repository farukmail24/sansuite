CREATE TABLE `accounting_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`is_locked` boolean DEFAULT false,
	`due_date` date,
	CONSTRAINT `accounting_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`user_id` int,
	`action_type` varchar(100),
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `annual_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`period_id` int,
	`ref_no` varchar(30),
	`report_type` varchar(50),
	`description` text,
	`submission_status` varchar(30) DEFAULT 'Draft',
	`submission_ref` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `annual_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`account_type` varchar(50),
	`currency` varchar(10) DEFAULT 'GBP',
	`account_code` varchar(20),
	`sort_code` varchar(10),
	`account_number` varchar(20),
	`current_balance` decimal(15,2) DEFAULT '0.00',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`bank_account_id` int NOT NULL,
	`transaction_date` date NOT NULL,
	`description` text,
	`debit` decimal(15,2) DEFAULT '0.00',
	`credit` decimal(15,2) DEFAULT '0.00',
	`balance` decimal(15,2) DEFAULT '0.00',
	`is_reconciled` boolean DEFAULT false,
	`matched_to_type` varchar(30),
	`matched_to_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`nominal_code` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(50),
	`is_system` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `chart_of_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`client_code` varchar(20),
	`client_name` varchar(255) NOT NULL,
	`client_type` varchar(50) NOT NULL,
	`registration_number` varchar(50),
	`utr_number` varchar(20),
	`ni_number` varchar(20),
	`vat_number` varchar(30),
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`postcode` varchar(20),
	`country` varchar(100) DEFAULT 'United Kingdom',
	`trading_status` varchar(30) DEFAULT 'Trading',
	`audit_status` varchar(30) DEFAULT 'Unaudited',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`client_id` int,
	`contact_type` varchar(30) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`vat_number` varchar(30),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ct600_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`period_id` int,
	`ref_no` varchar(30),
	`description` text,
	`form_type` varchar(10) DEFAULT 'Short',
	`net_profit_loss` decimal(15,2) DEFAULT '0.00',
	`adjusted_profit` decimal(15,2) DEFAULT '0.00',
	`tax_rate` decimal(5,2) DEFAULT '19.00',
	`tax_liability` decimal(15,2) DEFAULT '0.00',
	`marginal_relief` decimal(15,2) DEFAULT '0.00',
	`net_tax_due` decimal(15,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'Draft',
	`xml_payload` longtext,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ct600_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`client_id` int,
	`service_type` varchar(30),
	`due_date` date NOT NULL,
	`status` varchar(20) DEFAULT 'Pending',
	`notified_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `deadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paye_scheme_id` int NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`ni_number` varchar(20),
	`tax_code` varchar(20) DEFAULT '1257L',
	`gender` varchar(10),
	`birth_date` date,
	`hire_date` date,
	`leaving_date` date,
	`pay_frequency` varchar(20) DEFAULT 'Monthly',
	`salary_type` varchar(20) DEFAULT 'AnnualSalary',
	`gross_rate` decimal(15,2) DEFAULT '0.00',
	`status` varchar(20) DEFAULT 'Active',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firm_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`firm_type` varchar(50),
	`firm_name` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`post_code` varchar(20),
	`website` varchar(255),
	`business_start_date` date,
	`book_start_date` date,
	`year_end` varchar(10),
	`vat_scheme` varchar(50),
	`vat_reg_number` varchar(50),
	`vat_reg_date` date,
	`vat_submit_type` varchar(50),
	`registration_no` varchar(50),
	`utr_number` varchar(20),
	`office_ref_no` varchar(50),
	`country` varchar(100) DEFAULT 'United Kingdom',
	`hmrc_gateway_id` varchar(255),
	`hmrc_gateway_password_encrypted` varchar(500),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `firm_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`description` text,
	`quantity` decimal(10,2) DEFAULT '1.00',
	`unit_price` decimal(15,2) DEFAULT '0.00',
	`vat_rate` decimal(5,2) DEFAULT '20.00',
	`vat_amount` decimal(15,2) DEFAULT '0.00',
	`net_amount` decimal(15,2) DEFAULT '0.00',
	`nominal_code` varchar(20),
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`client_id` int,
	`job_name` varchar(255) NOT NULL,
	`description` text,
	`budget` decimal(15,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'Active',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`journal_number` varchar(50),
	`journal_date` date NOT NULL,
	`reference` varchar(255),
	`description` text,
	`total_amount` decimal(15,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`journal_id` int NOT NULL,
	`nominal_code` varchar(20),
	`description` text,
	`debit` decimal(15,2) DEFAULT '0.00',
	`credit` decimal(15,2) DEFAULT '0.00',
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pay_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paye_scheme_id` int NOT NULL,
	`tax_year` varchar(10),
	`pay_period` int,
	`start_date` date,
	`end_date` date,
	`payment_date` date,
	`status` varchar(30) DEFAULT 'Draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pay_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paye_schemes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`employer_name` varchar(255),
	`hmrc_office_number` varchar(10),
	`paye_reference` varchar(50),
	`accounts_office_reference` varchar(20),
	`econ` varchar(20),
	`default_pay_frequency` varchar(20) DEFAULT 'Monthly',
	`payment_mode` varchar(20) DEFAULT 'BACS',
	`bank_name` varchar(100),
	`bank_sort_code` varchar(10),
	`bank_account_number` varchar(20),
	`sync_bookkeeping` boolean DEFAULT false,
	`small_employers_relief` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `paye_schemes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pay_run_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`gross_pay` decimal(15,2) DEFAULT '0.00',
	`income_tax` decimal(15,2) DEFAULT '0.00',
	`employee_ni` decimal(15,2) DEFAULT '0.00',
	`employer_ni` decimal(15,2) DEFAULT '0.00',
	`pension_employee` decimal(15,2) DEFAULT '0.00',
	`pension_employer` decimal(15,2) DEFAULT '0.00',
	`net_pay` decimal(15,2) DEFAULT '0.00',
	`student_loan` decimal(15,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payslips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`tier_name` varchar(50),
	`max_clients` int DEFAULT 10,
	`start_date` date,
	`expiry_date` date,
	`payment_status` varchar(30) DEFAULT 'Active',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `practice_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subdomain` varchar(100) NOT NULL,
	`plan` varchar(50) DEFAULT 'trial',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `practices_id` PRIMARY KEY(`id`),
	CONSTRAINT `practices_subdomain_unique` UNIQUE(`subdomain`)
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`description` text,
	`quantity` decimal(10,2) DEFAULT '1.00',
	`unit_price` decimal(15,2) DEFAULT '0.00',
	`vat_rate` decimal(5,2) DEFAULT '20.00',
	`vat_amount` decimal(15,2) DEFAULT '0.00',
	`net_amount` decimal(15,2) DEFAULT '0.00',
	`nominal_code` varchar(20),
	CONSTRAINT `purchase_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`supplier_id` int,
	`bill_number` varchar(50),
	`purchase_type` varchar(30) DEFAULT 'Invoice',
	`bill_date` date NOT NULL,
	`due_date` date,
	`sub_total` decimal(15,2) DEFAULT '0.00',
	`vat_total` decimal(15,2) DEFAULT '0.00',
	`grand_total` decimal(15,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'Unpaid',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rti_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pay_run_id` int NOT NULL,
	`submission_type` varchar(10) NOT NULL,
	`correlation_id` varchar(255),
	`submitted_at` timestamp,
	`status` varchar(20) DEFAULT 'Pending',
	CONSTRAINT `rti_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sa100_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sa_client_id` int NOT NULL,
	`tax_year` varchar(10),
	`net_income` decimal(15,2) DEFAULT '0.00',
	`allowances` decimal(15,2) DEFAULT '0.00',
	`taxable_income` decimal(15,2) DEFAULT '0.00',
	`tax_due` decimal(15,2) DEFAULT '0.00',
	`status` varchar(20) DEFAULT 'Draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sa100_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`customer_id` int,
	`invoice_number` varchar(50) NOT NULL,
	`invoice_type` varchar(30) DEFAULT 'Invoice',
	`invoice_date` date NOT NULL,
	`due_date` date,
	`sub_total` decimal(15,2) DEFAULT '0.00',
	`vat_total` decimal(15,2) DEFAULT '0.00',
	`grand_total` decimal(15,2) DEFAULT '0.00',
	`paid_amount` decimal(15,2) DEFAULT '0.00',
	`status` varchar(30) DEFAULT 'Draft',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `self_assessment_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int,
	`practice_id` int NOT NULL,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`utr_number` varchar(20),
	`ni_number` varchar(20),
	`client_type` varchar(30) DEFAULT 'Individual',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `self_assessment_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`task_type` varchar(50) DEFAULT 'Ad-hoc',
	`priority` varchar(20) DEFAULT 'Normal',
	`status` varchar(30) DEFAULT 'Todo',
	`assigned_to` int,
	`client_id` int,
	`due_date` date,
	`email_notification` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int NOT NULL,
	`user_id` int NOT NULL,
	`job_id` int,
	`client_id` int,
	`date` date NOT NULL,
	`hours` decimal(5,2) NOT NULL,
	`billable` boolean DEFAULT true,
	`rate_per_hour` decimal(10,2) DEFAULT '0.00',
	`description` text,
	`status` varchar(20) DEFAULT 'Draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `timesheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trial_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`ref_no` varchar(30),
	`description` varchar(255),
	`from_date` date,
	`to_date` date,
	`mode_of_import` varchar(30) DEFAULT 'Manual',
	`status` varchar(20) DEFAULT 'Draft',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `trial_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`practice_id` int,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`phone` varchar(50),
	`role` varchar(50) NOT NULL DEFAULT 'staff',
	`is_active` boolean DEFAULT true,
	`last_login` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vat_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`description` varchar(255),
	`from_date` date NOT NULL,
	`to_date` date NOT NULL,
	`vat_due_on_sales` decimal(15,2) DEFAULT '0.00',
	`vat_reclaimed_on_purchases` decimal(15,2) DEFAULT '0.00',
	`net_vat_due` decimal(15,2) DEFAULT '0.00',
	`vat_status` varchar(30) DEFAULT 'Draft',
	`payment_status` varchar(30) DEFAULT 'Unpaid',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `vat_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounting_periods` ADD CONSTRAINT `accounting_periods_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_reports` ADD CONSTRAINT `annual_reports_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annual_reports` ADD CONSTRAINT `annual_reports_period_id_accounting_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_transactions` ADD CONSTRAINT `bank_transactions_bank_account_id_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chart_of_accounts` ADD CONSTRAINT `chart_of_accounts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ct600_returns` ADD CONSTRAINT `ct600_returns_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ct600_returns` ADD CONSTRAINT `ct600_returns_period_id_accounting_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deadlines` ADD CONSTRAINT `deadlines_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deadlines` ADD CONSTRAINT `deadlines_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_paye_scheme_id_paye_schemes_id_fk` FOREIGN KEY (`paye_scheme_id`) REFERENCES `paye_schemes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firm_details` ADD CONSTRAINT `firm_details_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_sales_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD CONSTRAINT `journal_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_journal_id_journal_entries_id_fk` FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pay_runs` ADD CONSTRAINT `pay_runs_paye_scheme_id_paye_schemes_id_fk` FOREIGN KEY (`paye_scheme_id`) REFERENCES `paye_schemes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paye_schemes` ADD CONSTRAINT `paye_schemes_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_pay_run_id_pay_runs_id_fk` FOREIGN KEY (`pay_run_id`) REFERENCES `pay_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practice_subscriptions` ADD CONSTRAINT `practice_subscriptions_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_items` ADD CONSTRAINT `purchase_items_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplier_id_contacts_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rti_submissions` ADD CONSTRAINT `rti_submissions_pay_run_id_pay_runs_id_fk` FOREIGN KEY (`pay_run_id`) REFERENCES `pay_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sa100_returns` ADD CONSTRAINT `sa100_returns_sa_client_id_self_assessment_clients_id_fk` FOREIGN KEY (`sa_client_id`) REFERENCES `self_assessment_clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_invoices` ADD CONSTRAINT `sales_invoices_customer_id_contacts_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `contacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `self_assessment_clients` ADD CONSTRAINT `self_assessment_clients_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `self_assessment_clients` ADD CONSTRAINT `self_assessment_clients_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_job_id_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trial_balances` ADD CONSTRAINT `trial_balances_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_practice_id_practices_id_fk` FOREIGN KEY (`practice_id`) REFERENCES `practices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vat_periods` ADD CONSTRAINT `vat_periods_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;