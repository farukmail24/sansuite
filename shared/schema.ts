import { mysqlTable, index, varchar, int, timestamp, boolean, decimal, text, date, longtext, json } from "drizzle-orm/mysql-core";
import { z } from "zod";

// =============================================
// CORE MULTI-TENANCY
// =============================================

export const practices = mysqlTable("practices", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).default("trial"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").references(() => practices.id),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }).notNull().default("staff"), // admin, accountant, staff, auditor
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  permissionsJson: text("permissions_json"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  signatureData: text("signature_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const firmDetails = mysqlTable("firm_details", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  firmType: varchar("firm_type", { length: 50 }), // Limited, Partnership, SoleProprietorship
  firmName: varchar("firm_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postCode: varchar("post_code", { length: 20 }),
  website: varchar("website", { length: 255 }),
  businessStartDate: date("business_start_date"),
  bookStartDate: date("book_start_date"),
  yearEnd: varchar("year_end", { length: 10 }),
  vatScheme: varchar("vat_scheme", { length: 50 }), // Accrual Based, Cash Based
  vatRegNumber: varchar("vat_reg_number", { length: 50 }),
  vatRegDate: date("vat_reg_date"),
  vatSubmitType: varchar("vat_submit_type", { length: 50 }), // Quarterly, Monthly
  registrationNo: varchar("registration_no", { length: 50 }),
  utrNumber: varchar("utr_number", { length: 20 }),
  officeRefNo: varchar("office_ref_no", { length: 50 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  hmrcGatewayId: varchar("hmrc_gateway_id", { length: 255 }),
  hmrcGatewayPasswordEncrypted: varchar("hmrc_gateway_password_encrypted", { length: 500 }),
  hmrcAgentCode: varchar("hmrc_agent_code", { length: 50 }),
  hmrcAccessToken: varchar("hmrc_access_token", { length: 2000 }),
  hmrcRefreshToken: varchar("hmrc_refresh_token", { length: 2000 }),
  hmrcTokenExpiry: timestamp("hmrc_token_expiry"),
  saAgentId: varchar("sa_agent_id", { length: 50 }),
  ctAgentId: varchar("ct_agent_id", { length: 50 }),
  notificationSettings: text("notification_settings"),
  smsBalance: int("sms_balance").default(50),
  logoUrl: longtext("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const firmNotes = mysqlTable("firm_notes", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  text: text("text").notNull(),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceBackups = mysqlTable("practice_backups", {
  id: int("id").primaryKey().autoincrement(),
  backupCode: varchar("backup_code", { length: 50 }).notNull(),
  practiceId: int("practice_id").notNull(),
  requestedBy: varchar("requested_by", { length: 100 }).notNull(),
  fileFormat: varchar("file_format", { length: 50 }).default("JSON / DB Dump"),
  status: varchar("status", { length: 30 }).default("Ready"),
  fileSize: varchar("file_size", { length: 30 }).default("1.2 MB"),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceReferrals = mysqlTable("practice_referrals", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull(),
  colleagueName: varchar("colleague_name", { length: 150 }).notNull(),
  colleagueEmail: varchar("colleague_email", { length: 255 }).notNull(),
  message: text("message"),
  status: varchar("status", { length: 50 }).default("Invited"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceMediaFiles = mysqlTable("practice_media_files", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  url: longtext("url"),
  category: varchar("category", { length: 50 }).default("General"),
  storageDriver: varchar("storage_driver", { length: 50 }).default("local"),
  storageLocation: text("storage_location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceSubscriptions = mysqlTable("practice_subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  tierName: varchar("tier_name", { length: 50 }), // Trial, Small, Medium, Large
  maxClients: int("max_clients").default(10),
  startDate: date("start_date"),
  expiryDate: date("expiry_date"),
  paymentStatus: varchar("payment_status", { length: 30 }).default("Active"), // Active, Delinquent, Cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// CLIENT REGISTRY
// =============================================

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientCode: varchar("client_code", { length: 20 }), // e.g. CL1, CL2
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientType: varchar("client_type", { length: 50 }).notNull(), // Limited, SoleTrader, Partnership, Trust, Individual, Charity
  registrationNumber: varchar("registration_number", { length: 50 }),
  utrNumber: varchar("utr_number", { length: 20 }),
  niNumber: varchar("ni_number", { length: 20 }),
  vatNumber: varchar("vat_number", { length: 30 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  tradingStatus: varchar("trading_status", { length: 30 }).default("Trading"), // Trading, Dormant, Ceased
  auditStatus: varchar("audit_status", { length: 30 }).default("Unaudited"), // Unaudited, Audited
  nextCsDue: varchar("next_cs_due", { length: 50 }),
  nextAccountsDue: varchar("next_accounts_due", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),

  // Business Details (Details Tab)
  businessStartDate: varchar("business_start_date", { length: 20 }),
  bookStartDate: varchar("book_start_date", { length: 20 }),
  yearEnd: varchar("year_end", { length: 20 }),
  vatScheme: varchar("vat_scheme", { length: 100 }),
  sicCode: varchar("sic_code", { length: 150 }),
  chAuthCode: varchar("ch_auth_code", { length: 50 }),
  chDataJson: text("ch_data_json"), // Store full raw CH response

  // Social Links (Details Tab)
  socialFacebook: varchar("social_facebook", { length: 255 }),
  socialTwitter: varchar("social_twitter", { length: 255 }),
  socialLinkedin: varchar("social_linkedin", { length: 255 }),
  socialGplus: varchar("social_gplus", { length: 255 }),

  // PAYE Details (Details Tab)
  payeEmployerName: varchar("paye_employer_name", { length: 255 }),
  payeReference: varchar("paye_reference", { length: 50 }),
  payeAccountsOfficeRef: varchar("paye_accounts_office_ref", { length: 50 }),
  payeHmrcOfficeNumber: varchar("paye_hmrc_office_number", { length: 20 }),
  extraDetailsJson: text("extra_details_json"),

  // Bookkeeping Company Info & Settings Fields
  logoUrl: text("logo_url"),
  companyType: varchar("company_type", { length: 50 }),
  city: varchar("city", { length: 100 }),
  county: varchar("county", { length: 100 }),
  website: varchar("website", { length: 255 }),
  currency: varchar("currency", { length: 30 }).default("Pound Sterling"),
  vatRegistrationDate: varchar("vat_registration_date", { length: 20 }),
  vatSubmitType: varchar("vat_submit_type", { length: 50 }).default("Quarterly"),
  manualBankReconciliation: boolean("manual_bank_reconciliation").default(false),
  useDocTemplate: boolean("use_doc_template").default(true),
  defaultPagePeriod: varchar("default_page_period", { length: 50 }).default("All"),
});


export const contacts = mysqlTable("contacts", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  contactType: varchar("contact_type", { length: 30 }).notNull(), // Customer, Supplier, Director, Shareholder
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  postcode: varchar("postcode", { length: 30 }),
  county: varchar("county", { length: 100 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0.00"),
  openingBalanceDate: date("opening_balance_date"),
  isActive: boolean("is_active").default(true),
  recurringEmail: boolean("recurring_email").default(true),
  notes: text("notes"),
  sortCode: varchar("sort_code", { length: 20 }),
  accountNumber: varchar("account_number", { length: 30 }),
  iban: varchar("iban", { length: 50 }),
  designation: varchar("designation", { length: 100 }),
  shareType: varchar("share_type", { length: 50 }).default("Equity"),
  numberOfShares: decimal("number_of_shares", { precision: 12, scale: 2 }).default("0.00"),
  shareValue: decimal("share_value", { precision: 10, scale: 2 }).default("1.00"),
  vatNumber: varchar("vat_number", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountingPeriods = mysqlTable("accounting_periods", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isLocked: boolean("is_locked").default(false),
  status: varchar("status", { length: 30 }).default("Open"), // Open, Closed, Locked
  periodType: varchar("period_type", { length: 30 }).default("Current"), // Current, Prior
  dueDate: date("due_date"),
});

// =============================================
// BOOKKEEPING
// =============================================

export const chartOfAccounts = mysqlTable("chart_of_accounts", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  nominalCode: varchar("nominal_code", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 150 }).notNull(),
  groupName: varchar("group_name", { length: 100 }).default("Turnover"),
  status: varchar("status", { length: 30 }).default("Normal"), // Normal, Archive
  vatCode: varchar("vat_code", { length: 50 }).default("Standard (20%)"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookkeepingOpeningBalances = mysqlTable("bookkeeping_opening_balances", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  balanceDate: varchar("balance_date", { length: 30 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  nominalCode: varchar("nominal_code", { length: 50 }),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookkeepingCurrencies = mysqlTable("bookkeeping_currencies", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id"),
  currencyName: varchar("currency_name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  rate: decimal("rate", { precision: 12, scale: 4 }).notNull(),
  isDefault: boolean("is_default").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookkeepingSequences = mysqlTable("bookkeeping_sequences", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  transactionType: varchar("transaction_type", { length: 100 }).notNull(),
  prefix: varchar("prefix", { length: 20 }).default(""),
  startNumber: int("start_number").default(1),
  postfix: varchar("postfix", { length: 20 }).default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }), // Current, Savings, Credit Card, Loan
  currency: varchar("currency", { length: 10 }).default("GBP"),
  accountCode: varchar("account_code", { length: 20 }),
  sortCode: varchar("sort_code", { length: 10 }),
  accountNumber: varchar("account_number", { length: 20 }),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesInvoices = mysqlTable("sales_invoices", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  customerId: int("customer_id").references(() => contacts.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceType: varchar("invoice_type", { length: 30 }).default("Invoice"), // Invoice, Credit Note
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  subTotal: decimal("sub_total", { precision: 15, scale: 2 }).default("0.00"),
  vatTotal: decimal("vat_total", { precision: 15, scale: 2 }).default("0.00"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).default("0.00"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Unpaid, Paid, PartiallyPaid, Void
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoiceItems = mysqlTable("invoice_items", {
  id: int("id").primaryKey().autoincrement(),
  invoiceId: int("invoice_id").notNull().references(() => salesInvoices.id),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).default("0.00"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  nominalCode: varchar("nominal_code", { length: 20 }),
});

export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  supplierId: int("supplier_id").references(() => contacts.id),
  billNumber: varchar("bill_number", { length: 50 }),
  purchaseType: varchar("purchase_type", { length: 30 }).default("Invoice"), // Invoice, Credit Note
  billDate: date("bill_date").notNull(),
  dueDate: date("due_date"),
  subTotal: decimal("sub_total", { precision: 15, scale: 2 }).default("0.00"),
  vatTotal: decimal("vat_total", { precision: 15, scale: 2 }).default("0.00"),
  grandTotal: decimal("grand_total", { precision: 15, scale: 2 }).default("0.00"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Unpaid"), // Unpaid, Paid, PartiallyPaid
  isCis: boolean("is_cis").default(false),
  cisSubcontractorId: int("cis_subcontractor_id").references(() => cisSubcontractors.id),
  laborTotal: decimal("labor_total", { precision: 15, scale: 2 }).default("0.00"),
  materialsTotal: decimal("materials_total", { precision: 15, scale: 2 }).default("0.00"),
  cisDeductionAmount: decimal("cis_deduction_amount", { precision: 15, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseItems = mysqlTable("purchase_items", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id").notNull().references(() => purchases.id),
  description: text("description"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).default("0.00"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  nominalCode: varchar("nominal_code", { length: 20 }),
  itemType: varchar("item_type", { length: 30 }).default("Standard"), // Standard, Labor, Materials
});

export const bankTransactions = mysqlTable("bank_transactions", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  bankAccountId: int("bank_account_id").notNull().references(() => bankAccounts.id),
  transactionDate: date("transaction_date").notNull(),
  description: text("description"),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  payeeName: varchar("payee_name", { length: 255 }),
  nominalCode: varchar("nominal_code", { length: 50 }),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  isReconciled: boolean("is_reconciled").default(false),
  matchedToType: varchar("matched_to_type", { length: 30 }), // Invoice, Purchase, Journal
  matchedToId: int("matched_to_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankRules = mysqlTable("bank_rules", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).default("Money Out"), // Money Out, Money In
  priority: int("priority").default(1),
  fieldToMatch: varchar("field_to_match", { length: 50 }).default("description"), // description, reference, amount
  matchCondition: varchar("match_condition", { length: 50 }).default("contains"), // contains, equals, starts_with
  matchValue: varchar("match_value", { length: 255 }).notNull(),
  contactId: int("contact_id").references(() => contacts.id),
  nominalCode: varchar("nominal_code", { length: 50 }),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  journalNumber: varchar("journal_number", { length: 50 }),
  journalDate: date("journal_date").notNull(),
  reference: varchar("reference", { length: 255 }),
  description: text("description"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalLines = mysqlTable("journal_lines", {
  id: int("id").primaryKey().autoincrement(),
  journalId: int("journal_id").notNull().references(() => journalEntries.id),
  nominalCode: varchar("nominal_code", { length: 20 }),
  description: text("description"),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
});

export const vatPeriods = mysqlTable("vat_periods", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  description: varchar("description", { length: 255 }),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  vatDueOnSales: decimal("vat_due_on_sales", { precision: 15, scale: 2 }).default("0.00"),
  vatReclaimedOnPurchases: decimal("vat_reclaimed_on_purchases", { precision: 15, scale: 2 }).default("0.00"),
  netVatDue: decimal("net_vat_due", { precision: 15, scale: 2 }).default("0.00"),
  vatStatus: varchar("vat_status", { length: 30 }).default("Draft"), // Draft, Calculated, Filed
  paymentStatus: varchar("payment_status", { length: 30 }).default("Unpaid"),
  box1VatDueSales: decimal("box1_vat_due_sales", { precision: 15, scale: 2 }).default("0.00"),
  box2VatDueAcquisitions: decimal("box2_vat_due_acquisitions", { precision: 15, scale: 2 }).default("0.00"),
  box3TotalVatDue: decimal("box3_total_vat_due", { precision: 15, scale: 2 }).default("0.00"),
  box4VatReclaimed: decimal("box4_vat_reclaimed", { precision: 15, scale: 2 }).default("0.00"),
  box5NetVat: decimal("box5_net_vat", { precision: 15, scale: 2 }).default("0.00"),
  box6TotalSalesExVat: decimal("box6_total_sales_ex_vat", { precision: 15, scale: 2 }).default("0.00"),
  box7TotalPurchasesExVat: decimal("box7_total_purchases_ex_vat", { precision: 15, scale: 2 }).default("0.00"),
  box8TotalEuSupplies: decimal("box8_total_eu_supplies", { precision: 15, scale: 2 }).default("0.00"),
  box9TotalEuAcquisitions: decimal("box9_total_eu_acquisitions", { precision: 15, scale: 2 }).default("0.00"),
  lateClaimsIncluded: boolean("late_claims_included").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditNotes = mysqlTable("credit_notes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  contactId: int("contact_id").references(() => contacts.id),
  type: varchar("type", { length: 20 }).notNull().default("Sales"), // Sales, Purchase
  creditNoteNumber: varchar("credit_note_number", { length: 50 }).notNull(),
  creditNoteDate: date("credit_note_date").notNull(),
  subTotal: decimal("sub_total", { precision: 15, scale: 2 }).default("0.00"),
  vatTotal: decimal("vat_total", { precision: 15, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  allocatedAmount: decimal("allocated_amount", { precision: 15, scale: 2 }).default("0.00"),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Issued"), // Draft, Issued, Allocated, Part-Allocated, Void
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditNoteItems = mysqlTable("credit_note_items", {
  id: int("id").primaryKey().autoincrement(),
  creditNoteId: int("credit_note_id").notNull().references(() => creditNotes.id),
  description: text("description"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("1.00"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0.00"),
  nominalCode: varchar("nominal_code", { length: 20 }).default("4000"),
});

export const creditNoteAllocations = mysqlTable("credit_note_allocations", {
  id: int("id").primaryKey().autoincrement(),
  creditNoteId: int("credit_note_id").notNull().references(() => creditNotes.id),
  invoiceId: int("invoice_id").references(() => salesInvoices.id),
  purchaseId: int("purchase_id").references(() => purchases.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  allocatedDate: date("allocated_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quotations = mysqlTable("quotations", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  customerId: int("customer_id").references(() => contacts.id),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
  quoteDate: date("quote_date"),
  expiryDate: date("expiry_date"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  itemsJson: text("items_json"),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Sent, Accepted, Declined, Expired
  createdAt: timestamp("created_at").defaultNow(),
});

export const items = mysqlTable("items", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  itemCode: varchar("item_code", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).default("Product"), // Product, Service
  salesPrice: decimal("sales_price", { precision: 15, scale: 2 }).default("0.00"),
  salesVatRate: decimal("sales_vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  salesNominalCode: varchar("sales_nominal_code", { length: 20 }),
  purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 }).default("0.00"),
  purchaseVatRate: decimal("purchase_vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  purchaseNominalCode: varchar("purchase_nominal_code", { length: 20 }),
  openingBalanceQuantity: decimal("opening_balance_quantity", { precision: 12, scale: 2 }).default("0.00"),
  openingBalancePrice: decimal("opening_balance_price", { precision: 15, scale: 2 }).default("0.00"),
  openingBalanceAmount: decimal("opening_balance_amount", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fixedAssets = mysqlTable("fixed_assets", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  assetCode: varchar("asset_code", { length: 50 }),
  assetName: varchar("asset_name", { length: 255 }).notNull(),
  assetType: varchar("asset_type", { length: 100 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  originalCost: decimal("original_cost", { precision: 15, scale: 2 }).default("0.00"),
  depreciationMethod: varchar("depreciation_method", { length: 50 }).default("Straight Line"),
  depreciationRate: decimal("depreciation_rate", { precision: 5, scale: 2 }).default("20.00"),
  accumulatedDepreciation: decimal("accumulated_depreciation", { precision: 15, scale: 2 }).default("0.00"),
  netBookValue: decimal("net_book_value", { precision: 15, scale: 2 }).default("0.00"),
  lastDepreciationDate: date("last_depreciation_date"),
  disposalDate: date("disposal_date"),
  disposalProceeds: decimal("disposal_proceeds", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Active"), // Active, Disposed, Written Off
  createdAt: timestamp("created_at").defaultNow(),
});

export const recurringProfiles = mysqlTable("recurring_profiles", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  profileType: varchar("profile_type", { length: 20 }).notNull(), // invoice or purchase
  profileName: varchar("profile_name", { length: 255 }).notNull(),
  partyName: varchar("party_name", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  frequency: varchar("frequency", { length: 50 }).default("Monthly"),
  startDate: date("start_date"),
  nextRun: date("next_run"),
  status: varchar("status", { length: 20 }).default("Active"), // Active or Paused
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  transactionRef: varchar("transaction_ref", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Card"),
  amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  fee: decimal("fee", { precision: 15, scale: 2 }).default("0.00"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceContacts = mysqlTable("practice_contacts", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  name: varchar("name", { length: 255 }).notNull(),
  contactType: varchar("contact_type", { length: 100 }).default("Primary Contact"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cisSettings = mysqlTable("cis_settings", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  isContractor: boolean("is_contractor").default(false),
  isSubcontractor: boolean("is_subcontractor").default(false),
  employerReference: varchar("employer_reference", { length: 50 }),
  accountsOfficeReference: varchar("accounts_office_reference", { length: 50 }),
  utrNumber: varchar("utr_number", { length: 20 }),
  deductionRate: decimal("deduction_rate", { precision: 5, scale: 2 }).default("20.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cisSubcontractors = mysqlTable("cis_subcontractors", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  utrNumber: varchar("utr_number", { length: 20 }),
  niNumber: varchar("ni_number", { length: 20 }),
  verifyStatus: varchar("verify_status", { length: 50 }).default("Unverified"),
  deductionRate: decimal("deduction_rate", { precision: 5, scale: 2 }).default("20.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cisReturns = mysqlTable("cis_returns", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  period: varchar("period", { length: 20 }), // e.g. 2026-04
  totalPayments: decimal("total_payments", { precision: 15, scale: 2 }).default("0.00"),
  totalMaterials: decimal("total_materials", { precision: 15, scale: 2 }).default("0.00"),
  totalLabor: decimal("total_labor", { precision: 15, scale: 2 }).default("0.00"),
  totalDeducted: decimal("total_deducted", { precision: 15, scale: 2 }).default("0.00"),
  subcontractorCount: int("subcontractor_count").default(0),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Filed
  filedAt: timestamp("filed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cisReturnLines = mysqlTable("cis_return_lines", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull().references(() => cisReturns.id),
  subcontractorId: int("subcontractor_id").references(() => cisSubcontractors.id),
  subcontractorName: varchar("subcontractor_name", { length: 255 }).notNull(),
  utrNumber: varchar("utr_number", { length: 50 }),
  verificationNumber: varchar("verification_number", { length: 50 }),
  grossAmount: decimal("gross_amount", { precision: 15, scale: 2 }).default("0.00"),
  materialsAmount: decimal("materials_amount", { precision: 15, scale: 2 }).default("0.00"),
  laborAmount: decimal("labor_amount", { precision: 15, scale: 2 }).default("0.00"),
  deductionRate: decimal("deduction_rate", { precision: 5, scale: 2 }).default("20.00"),
  deductionAmount: decimal("deduction_amount", { precision: 15, scale: 2 }).default("0.00"),
  netAmountPaid: decimal("net_amount_paid", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dividends = mysqlTable("dividends", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  shareholderId: int("shareholder_id").references(() => contacts.id),
  voucherNumber: varchar("voucher_number", { length: 50 }),
  shareType: varchar("share_type", { length: 50 }).default("Equity"), // Equity, Non-Equity
  shareClass: varchar("share_class", { length: 50 }).default("Ordinary"),
  numberOfShares: decimal("number_of_shares", { precision: 12, scale: 2 }).default("0.00"),
  ratePerShare: decimal("rate_per_share", { precision: 15, scale: 4 }).default("0.0000"),
  dividendPayable: decimal("dividend_payable", { precision: 15, scale: 2 }).default("0.00"),
  taxCredit: decimal("tax_credit", { precision: 15, scale: 2 }).default("0.00"),
  grossDividend: decimal("gross_dividend", { precision: 15, scale: 2 }).default("0.00"),
  excludeTaxCredit: boolean("exclude_tax_credit").default(false),
  declarationDate: date("declaration_date"),
  paymentDate: date("payment_date"),
  postedJournalId: int("posted_journal_id"),
  date: date("date").notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  declaredBy: varchar("declared_by", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingMinutes = mysqlTable("meeting_minutes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  date: date("date").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientNotes = mysqlTable("client_notes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  note: text("note"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }),
  resource: varchar("resource", { length: 100 }),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// PAYROLL
// =============================================

export const payeSchemes = mysqlTable("paye_schemes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  employerName: varchar("employer_name", { length: 255 }),
  hmrcOfficeNumber: varchar("hmrc_office_number", { length: 10 }),
  payeReference: varchar("paye_reference", { length: 50 }),
  accountsOfficeReference: varchar("accounts_office_reference", { length: 20 }),
  econ: varchar("econ", { length: 20 }),
  defaultPayFrequency: varchar("default_pay_frequency", { length: 20 }).default("Monthly"),
  paymentMode: varchar("payment_mode", { length: 20 }).default("BACS"),
  bankName: varchar("bank_name", { length: 100 }),
  bankSortCode: varchar("bank_sort_code", { length: 10 }),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  syncBookkeeping: boolean("sync_bookkeeping").default(false),
  smallEmployersRelief: boolean("small_employers_relief").default(false),
  taxYear: varchar("tax_year", { length: 20 }).default("2025-26"),
  employmentAllowance: boolean("employment_allowance").default(false),
  stagingDate: varchar("staging_date", { length: 20 }),
  reEnrolmentDate: varchar("re_enrolment_date", { length: 20 }),
  docPasswordEnabled: boolean("doc_password_enabled").default(false),
  masterPassword: varchar("master_password", { length: 255 }),
  payslipTemplate: varchar("payslip_template", { length: 50 }).default("classic"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employees = mysqlTable("employees", {
  id: int("id").primaryKey().autoincrement(),
  payeSchemeId: int("paye_scheme_id").notNull().references(() => payeSchemes.id),
  departmentId: int("department_id"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  niNumber: varchar("ni_number", { length: 20 }),
  taxCode: varchar("tax_code", { length: 20 }).default("1257L"),
  taxBasis: varchar("tax_basis", { length: 20 }).default("Cumulative"), // Cumulative, Week1/Month1
  isDirector: boolean("is_director").default(false),
  directorNiMethod: varchar("director_ni_method", { length: 20 }).default("Annual"), // Annual, Cumulative/Monthly
  niCategory: varchar("ni_category", { length: 5 }).default("A"), // A, B, C, H, J, M, Z
  gender: varchar("gender", { length: 10 }),
  birthDate: date("birth_date"),
  hireDate: date("hire_date"),
  leavingDate: date("leaving_date"),
  payFrequency: varchar("pay_frequency", { length: 20 }).default("Monthly"),
  salaryType: varchar("salary_type", { length: 20 }).default("AnnualSalary"), // Hourly, AnnualSalary
  grossRate: decimal("gross_rate", { precision: 15, scale: 2 }).default("0.00"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0.00"),
  hoursWorked: decimal("hours_worked", { precision: 10, scale: 2 }).default("0.00"),
  ytdGrossPay: decimal("ytd_gross_pay", { precision: 15, scale: 2 }).default("0.00"),
  ytdTaxPaid: decimal("ytd_tax_paid", { precision: 15, scale: 2 }).default("0.00"),
  ytdEmployeeNi: decimal("ytd_employee_ni", { precision: 15, scale: 2 }).default("0.00"),
  ytdEmployerNi: decimal("ytd_employer_ni", { precision: 15, scale: 2 }).default("0.00"),
  docPassword: varchar("doc_password", { length: 255 }),
  status: varchar("status", { length: 20 }).default("Active"), // Active, Leaver
  createdAt: timestamp("created_at").defaultNow(),
});

export const payRuns = mysqlTable("pay_runs", {
  id: int("id").primaryKey().autoincrement(),
  payeSchemeId: int("paye_scheme_id").notNull().references(() => payeSchemes.id),
  taxYear: varchar("tax_year", { length: 10 }),
  payPeriod: int("pay_period"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  paymentDate: date("payment_date"),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Calculated, Approved, Filed
  createdAt: timestamp("created_at").defaultNow(),
});

export const payslips = mysqlTable("payslips", {
  id: int("id").primaryKey().autoincrement(),
  payRunId: int("pay_run_id").notNull().references(() => payRuns.id),
  employeeId: int("employee_id").notNull().references(() => employees.id),
  grossPay: decimal("gross_pay", { precision: 15, scale: 2 }).default("0.00"),
  incomeTax: decimal("income_tax", { precision: 15, scale: 2 }).default("0.00"),
  employeeNi: decimal("employee_ni", { precision: 15, scale: 2 }).default("0.00"),
  employerNi: decimal("employer_ni", { precision: 15, scale: 2 }).default("0.00"),
  pensionEmployee: decimal("pension_employee", { precision: 15, scale: 2 }).default("0.00"),
  pensionEmployer: decimal("pension_employer", { precision: 15, scale: 2 }).default("0.00"),
  netPay: decimal("net_pay", { precision: 15, scale: 2 }).default("0.00"),
  studentLoan: decimal("student_loan", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rtiSubmissions = mysqlTable("rti_submissions", {
  id: int("id").primaryKey().autoincrement(),
  payRunId: int("pay_run_id").references(() => payRuns.id),
  schemeId: int("scheme_id"),
  submissionType: varchar("submission_type", { length: 20 }).notNull(), // FPS, EPS, EYU, ZeroFPS
  taxYear: varchar("tax_year", { length: 20 }).default("2025-26"),
  periodName: varchar("period_name", { length: 50 }),
  correlationId: varchar("correlation_id", { length: 255 }),
  isZeroFps: boolean("is_zero_fps").default(false),
  employmentAllowanceClaimed: decimal("employment_allowance_claimed", { precision: 12, scale: 2 }).default("0.00"),
  cisDeductionsSuffered: decimal("cis_deductions_suffered", { precision: 12, scale: 2 }).default("0.00"),
  statutoryPayRecovered: decimal("statutory_pay_recovered", { precision: 12, scale: 2 }).default("0.00"),
  periodOfInactivity: boolean("period_of_inactivity").default(false),
  submittedAt: timestamp("submitted_at"),
  status: varchar("status", { length: 20 }).default("Pending"), // Pending, Accepted, Rejected
});

// -------------------------------------------------------------
// Payroll Sub-modules (Capium Full Specification Parity)
// -------------------------------------------------------------

export const payrollDepartments = mysqlTable("payroll_departments", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollAdditionsDeductions = mysqlTable("payroll_additions_deductions", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("addition"), // addition, deduction
  category: varchar("category", { length: 50 }).notNull().default("Bonus"),
  description: varchar("description", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  payFrequency: varchar("pay_frequency", { length: 20 }).default("Monthly"),
  effectiveDate: varchar("effective_date", { length: 20 }),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollAttachments = mysqlTable("payroll_attachments", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  orderType: varchar("order_type", { length: 100 }).notNull().default("AEO Maintenance"),
  referenceNumber: varchar("reference_number", { length: 100 }),
  issuingCourt: varchar("issuing_court", { length: 255 }),
  totalAmountOwed: decimal("total_amount_owed", { precision: 12, scale: 2 }).default("0.00"),
  deductionAmount: decimal("deduction_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  protectedEarningsRate: decimal("protected_earnings_rate", { precision: 12, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollMileageClaims = mysqlTable("payroll_mileage_claims", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  claimDate: varchar("claim_date", { length: 20 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull().default("Car"),
  engineSize: varchar("engine_size", { length: 50 }),
  businessMiles: decimal("business_miles", { precision: 10, scale: 2 }).notNull().default("0.00"),
  ratePerMile: decimal("rate_per_mile", { precision: 5, scale: 2 }).notNull().default("0.45"),
  passengerMiles: decimal("passenger_miles", { precision: 10, scale: 2 }).default("0.00"),
  passengerRate: decimal("passenger_rate", { precision: 5, scale: 2 }).default("0.05"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 20 }).default("Approved"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollExpenseClaims = mysqlTable("payroll_expense_claims", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  claimDate: varchar("claim_date", { length: 20 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("Travel"),
  description: varchar("description", { length: 255 }),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  status: varchar("status", { length: 20 }).default("Approved"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollStatutoryLeaves = mysqlTable("payroll_statutory_leaves", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  leaveType: varchar("leave_type", { length: 50 }).notNull().default("SSP"), // SSP, SMP, SPP, SAP, ShPP
  startDate: varchar("start_date", { length: 20 }).notNull(),
  endDate: varchar("end_date", { length: 20 }).notNull(),
  qualifyingDays: int("qualifying_days").default(0),
  weeklyRate: decimal("weekly_rate", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("Approved"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollTimekeeping = mysqlTable("payroll_timekeeping", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  workDate: varchar("work_date", { length: 20 }).notNull(),
  regularHours: decimal("regular_hours", { precision: 6, scale: 2 }).notNull().default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0.00"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull().default("0.00"),
  overtimeRate: decimal("overtime_rate", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes: varchar("notes", { length: 255 }),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollPensionSchemes = mysqlTable("payroll_pension_schemes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  provider: varchar("provider", { length: 100 }).notNull().default("Nest"),
  schemeName: varchar("scheme_name", { length: 255 }).notNull(),
  employerRef: varchar("employer_ref", { length: 100 }),
  employerRate: decimal("employer_rate", { precision: 5, scale: 2 }).notNull().default("3.00"),
  employeeRate: decimal("employee_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),
  earningsBasis: varchar("earnings_basis", { length: 50 }).default("Qualifying Earnings"),
  stagingDate: varchar("staging_date", { length: 20 }),
  reEnrolmentDate: varchar("re_enrolment_date", { length: 20 }),
  papdisEnabled: boolean("papdis_enabled").default(true),
  status: varchar("status", { length: 20 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollPensionAssessments = mysqlTable("payroll_pension_assessments", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  payRunId: int("pay_run_id"),
  assessmentDate: varchar("assessment_date", { length: 20 }).notNull(),
  workerCategory: varchar("worker_category", { length: 50 }).notNull().default("Eligible Jobholder"),
  actionTaken: varchar("action_taken", { length: 50 }).default("Enrolled"),
  optOutDate: varchar("opt_out_date", { length: 20 }),
  postponementDate: varchar("postponement_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollPensionLetters = mysqlTable("payroll_pension_letters", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  letterType: varchar("letter_type", { length: 100 }).notNull().default("Auto Enrolment Notice"),
  generatedDate: varchar("generated_date", { length: 20 }).notNull(),
  sentDate: varchar("sent_date", { length: 20 }),
  sentStatus: varchar("sent_status", { length: 20 }).default("Sent"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollP11dReturns = mysqlTable("payroll_p11d_returns", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  taxYear: varchar("tax_year", { length: 20 }).notNull().default("2024-25"),
  carBenefit: decimal("car_benefit", { precision: 12, scale: 2 }).default("0.00"),
  carFuelBenefit: decimal("car_fuel_benefit", { precision: 12, scale: 2 }).default("0.00"),
  medicalBenefit: decimal("medical_benefit", { precision: 12, scale: 2 }).default("0.00"),
  loansBenefit: decimal("loans_benefit", { precision: 12, scale: 2 }).default("0.00"),
  servicesBenefit: decimal("services_benefit", { precision: 12, scale: 2 }).default("0.00"),
  otherBenefits: decimal("other_benefits", { precision: 12, scale: 2 }).default("0.00"),
  totalCashEquivalent: decimal("total_cash_equivalent", { precision: 12, scale: 2 }).notNull().default("0.00"),
  class1aNicDue: decimal("class1a_nic_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
  status: varchar("status", { length: 30 }).default("Draft"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollP46Cars = mysqlTable("payroll_p46_cars", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull(),
  employeeId: int("employee_id").notNull(),
  makeModel: varchar("make_model", { length: 255 }).notNull(),
  registration: varchar("registration", { length: 50 }),
  engineCapacity: int("engine_capacity"),
  fuelType: varchar("fuel_type", { length: 50 }).default("Petrol"),
  co2Emissions: int("co2_emissions"),
  listPrice: decimal("list_price", { precision: 12, scale: 2 }).default("0.00"),
  providedDate: varchar("provided_date", { length: 20 }).notNull(),
  withdrawnDate: varchar("withdrawn_date", { length: 20 }),
  status: varchar("status", { length: 20 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollBulkSchedules = mysqlTable("payroll_bulk_schedules", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull(),
  clientId: int("client_id").notNull(),
  frequency: varchar("frequency", { length: 20 }).default("Monthly"),
  runDay: int("run_day").default(25),
  submissionDay: int("submission_day").default(28),
  payDay: int("pay_day").default(28),
  autoApprove: boolean("auto_approve").default(true),
  autoSubmitFps: boolean("auto_submit_fps").default(true),
  autoEmailPayslips: boolean("auto_email_payslips").default(true),
  notifyClient: boolean("notify_client").default(true),
  status: varchar("status", { length: 20 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// ACCOUNTS PRODUCTION
// =============================================

export const trialBalances = mysqlTable("trial_balances", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  periodId: int("period_id").references(() => accountingPeriods.id),
  refNo: varchar("ref_no", { length: 30 }),
  description: varchar("description", { length: 255 }),
  fromDate: date("from_date"),
  toDate: date("to_date"),
  modeOfImport: varchar("mode_of_import", { length: 30 }).default("Manual"), // Manual, CSV, Bookkeeping
  status: varchar("status", { length: 20 }).default("Draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trialBalanceLines = mysqlTable("trial_balance_lines", {
  id: int("id").primaryKey().autoincrement(),
  trialBalanceId: int("trial_balance_id").notNull().references(() => trialBalances.id),
  nominalCode: varchar("nominal_code", { length: 20 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
});

export const annualReports = mysqlTable("annual_reports", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  periodId: int("period_id").references(() => accountingPeriods.id),
  refNo: varchar("ref_no", { length: 30 }),
  reportType: varchar("report_type", { length: 50 }),
  description: text("description"),
  submissionStatus: varchar("submission_status", { length: 30 }).default("Draft"),
  submissionRef: varchar("submission_ref", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const managementReports = mysqlTable("management_reports", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  fromDate: date("from_date"),
  toDate: date("to_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// CORPORATION TAX (CT600)
// =============================================

export const ct600Returns = mysqlTable("ct600_returns", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").references(() => accountingPeriods.id),
  utrNumber: varchar("utr_number", { length: 20 }), // Unique Taxpayer Reference (10 digits)
  accountingPeriodStart: date("accounting_period_start").notNull(),
  accountingPeriodEnd: date("accounting_period_end").notNull(),
  taxYear: varchar("tax_year", { length: 20 }).default("2025/2026"),
  turnover: decimal("turnover", { precision: 15, scale: 2 }).default("0.00"),
  netAccountingProfit: decimal("net_accounting_profit", { precision: 15, scale: 2 }).default("0.00"),
  disallowableExpenses: decimal("disallowable_expenses", { precision: 15, scale: 2 }).default("0.00"),
  depreciationAddBack: decimal("depreciation_add_back", { precision: 15, scale: 2 }).default("0.00"),
  capitalAllowancesClaimed: decimal("capital_allowances_claimed", { precision: 15, scale: 2 }).default("0.00"),
  tradingLossesBroughtForward: decimal("trading_losses_brought_forward", { precision: 15, scale: 2 }).default("0.00"),
  tradingLossesRelievedCurrentYear: decimal("trading_losses_relieved_current_year", { precision: 15, scale: 2 }).default("0.00"),
  taxableTradingProfit: decimal("taxable_trading_profit", { precision: 15, scale: 2 }).default("0.00"),
  nonTradingIncome: decimal("non_trading_income", { precision: 15, scale: 2 }).default("0.00"),
  qualifyingDonations: decimal("qualifying_donations", { precision: 15, scale: 2 }).default("0.00"),
  profitsChargeableToCt: decimal("profits_chargeable_to_ct", { precision: 15, scale: 2 }).default("0.00"),
  ctRatePercentage: decimal("ct_rate_percentage", { precision: 5, scale: 2 }).default("19.00"), // 19% small profits <=50k, 25% main rate >=250k, Marginal Relief
  marginalReliefAmount: decimal("marginal_relief_amount", { precision: 15, scale: 2 }).default("0.00"),
  corporationTaxPayable: decimal("corporation_tax_payable", { precision: 15, scale: 2 }).default("0.00"),
  taxDeductedAtSource: decimal("tax_deducted_at_source", { precision: 15, scale: 2 }).default("0.00"),
  netTaxDue: decimal("net_tax_due", { precision: 15, scale: 2 }).default("0.00"),
  paymentDueDate: date("payment_due_date"), // AP End + 9 months 1 day
  filingDueDate: date("filing_due_date"), // AP End + 12 months
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Validated, SentToCapisign, ReadyToSubmit, Submitted, Accepted, Rejected
  irMark: varchar("ir_mark", { length: 100 }),
  hmrcCorrelationId: varchar("hmrc_correlation_id", { length: 100 }),
  submissionReceiptXml: longtext("submission_receipt_xml"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ctSubmissions = mysqlTable("ct_submissions", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull().references(() => ct600Returns.id),
  correlationId: varchar("correlation_id", { length: 100 }),
  submittedAt: timestamp("submitted_at").defaultNow(),
  hmrcStatus: varchar("hmrc_status", { length: 20 }).default("Pending"), // Pending, Accepted, Rejected
  responseMessage: text("response_message"),
});

// =============================================
// SELF ASSESSMENT
// =============================================

export const selfAssessmentClients = mysqlTable("self_assessment_clients", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  utrNumber: varchar("utr_number", { length: 20 }),
  niNumber: varchar("ni_number", { length: 20 }),
  clientType: varchar("client_type", { length: 30 }).default("Individual"), // Individual, Partnership, Trust
  createdAt: timestamp("created_at").defaultNow(),
});

export const sa100Returns = mysqlTable("sa100_returns", {
  id: int("id").primaryKey().autoincrement(),
  saClientId: int("sa_client_id").references(() => selfAssessmentClients.id),
  practiceId: int("practice_id").references(() => practices.id),
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  taxYear: varchar("tax_year", { length: 20 }).default("2025/2026"),
  utrNumber: varchar("utr_number", { length: 20 }),
  niNumber: varchar("ni_number", { length: 20 }),
  // Core Incomes
  employmentIncome: decimal("employment_income", { precision: 15, scale: 2 }).default("0.00"),
  employmentTaxDeducted: decimal("employment_tax_deducted", { precision: 15, scale: 2 }).default("0.00"),
  selfEmploymentProfit: decimal("self_employment_profit", { precision: 15, scale: 2 }).default("0.00"),
  propertyIncome: decimal("property_income", { precision: 15, scale: 2 }).default("0.00"),
  savingsInterest: decimal("savings_interest", { precision: 15, scale: 2 }).default("0.00"),
  dividendIncome: decimal("dividend_income", { precision: 15, scale: 2 }).default("0.00"),
  pensionIncome: decimal("pension_income", { precision: 15, scale: 2 }).default("0.00"),
  foreignIncome: decimal("foreign_income", { precision: 15, scale: 2 }).default("0.00"),
  capitalGainsNet: decimal("capital_gains_net", { precision: 15, scale: 2 }).default("0.00"),
  otherIncome: decimal("other_income", { precision: 15, scale: 2 }).default("0.00"),
  netIncome: decimal("net_income", { precision: 15, scale: 2 }).default("0.00"),
  // Allowances & Reliefs
  personalAllowance: decimal("personal_allowance", { precision: 15, scale: 2 }).default("12570.00"),
  allowances: decimal("allowances", { precision: 15, scale: 2 }).default("12570.00"),
  pensionContributions: decimal("pension_contributions", { precision: 15, scale: 2 }).default("0.00"),
  giftAidDonations: decimal("gift_aid_donations", { precision: 15, scale: 2 }).default("0.00"),
  financeCostsRelief: decimal("finance_costs_relief", { precision: 15, scale: 2 }).default("0.00"),
  capitalAllowancesClaimed: decimal("capital_allowances_claimed", { precision: 15, scale: 2 }).default("0.00"),
  tradingLossesBroughtForward: decimal("trading_losses_brought_forward", { precision: 15, scale: 2 }).default("0.00"),
  tradingLossesRelieved: decimal("trading_losses_relieved", { precision: 15, scale: 2 }).default("0.00"),
  // Computed Tax & Liabilities
  taxableIncome: decimal("taxable_income", { precision: 15, scale: 2 }).default("0.00"),
  incomeTaxDue: decimal("income_tax_due", { precision: 15, scale: 2 }).default("0.00"),
  class2NicDue: decimal("class2_nic_due", { precision: 15, scale: 2 }).default("0.00"),
  class4NicDue: decimal("class4_nic_due", { precision: 15, scale: 2 }).default("0.00"),
  studentLoanDue: decimal("student_loan_due", { precision: 15, scale: 2 }).default("0.00"),
  capitalGainsTaxDue: decimal("capital_gains_tax_due", { precision: 15, scale: 2 }).default("0.00"),
  totalTaxLiability: decimal("total_tax_liability", { precision: 15, scale: 2 }).default("0.00"),
  taxPaidAtSource: decimal("tax_paid_at_source", { precision: 15, scale: 2 }).default("0.00"),
  taxDue: decimal("tax_due", { precision: 15, scale: 2 }).default("0.00"),
  netTaxDue: decimal("net_tax_due", { precision: 15, scale: 2 }).default("0.00"),
  // Payments on Account (PoA)
  poaDue: boolean("poa_due").default(false),
  poaFirstPayment: decimal("poa_first_payment", { precision: 15, scale: 2 }).default("0.00"),
  poaSecondPayment: decimal("poa_second_payment", { precision: 15, scale: 2 }).default("0.00"),
  poaReducedReason: varchar("poa_reduced_reason", { length: 255 }),
  // Deadlines
  paymentDueDate: date("payment_due_date"), // 31 January
  secondPoaDueDate: date("second_poa_due_date"), // 31 July
  filingDueDate: date("filing_due_date"), // 31 January
  // Status & Submission
  status: varchar("status", { length: 30 }).default("Draft"),
  irMark: varchar("ir_mark", { length: 100 }),
  hmrcCorrelationId: varchar("hmrc_correlation_id", { length: 100 }),
  submissionReceiptXml: longtext("submission_receipt_xml"),
  submittedAt: timestamp("submitted_at"),
  xmlPayload: longtext("xml_payload"),
  schedulesData: longtext("schedules_data"), // detailed schedule items JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sa800Returns = mysqlTable("sa800_returns", {
  id: int("id").primaryKey().autoincrement(),
  saClientId: int("sa_client_id").notNull().references(() => selfAssessmentClients.id),
  taxYear: varchar("tax_year", { length: 10 }),
  grossReceipts: decimal("gross_receipts", { precision: 15, scale: 2 }).default("0.00"),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 20 }).default("Draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saSubmissions = mysqlTable("sa_submissions", {
  id: int("id").primaryKey().autoincrement(),
  returnType: varchar("return_type", { length: 10 }), // SA100, SA800, SA900
  returnId: int("return_id"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("Pending"), // Success, Failed, Pending
  errorMessage: text("error_message"),
});

// =============================================
// PRACTICE MANAGEMENT
// =============================================

export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  taskType: varchar("task_type", { length: 50 }).default("Ad-hoc"), // ClientBillable, Internal, Ad-hoc
  priority: varchar("priority", { length: 20 }).default("Normal"), // Low, Normal, High
  status: varchar("status", { length: 30 }).default("Todo"), // Todo, InProgress, Review, Completed
  assignedTo: int("assigned_to").references(() => users.id),
  clientId: int("client_id").references(() => clients.id),
  dueDate: date("due_date"),
  emailNotification: boolean("email_notification").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deadlines = mysqlTable("deadlines", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  serviceType: varchar("service_type", { length: 30 }), // Accounts, VAT, PAYE, CT600, SA100
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).default("Pending"), // Pending, Done, Overdue
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").references(() => users.id),
  actionType: varchar("action_type", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// TIME & FEES
// =============================================

export const jobs = mysqlTable("jobs", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  jobName: varchar("job_name", { length: 255 }).notNull(),
  description: text("description"),
  feeType: varchar("fee_type", { length: 50 }).default("Hourly"), // Hourly, Fixed, Recurring
  taskType: varchar("task_type", { length: 100 }).default("Accounting & Compliance"),
  budget: decimal("budget", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Active"), // Active, In Progress, Completed, On Hold
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }).default("0.00"),
  assignedTo: int("assigned_to").references(() => users.id),
  roi: decimal("roi", { precision: 10, scale: 2 }).default("0.00"),
  subtasksJson: json("subtasks_json"), // array of { id, name, estimatedHours, billableRate, costRate, status }
  recurringSchedule: varchar("recurring_schedule", { length: 50 }), // Daily, Weekly, Monthly, Yearly, Custom
  commentsJson: json("comments_json"), // array of { id, userId, userName, comment, createdAt }
  filesJson: json("files_json"), // array of { id, fileName, fileUrl, uploadedAt, uploadedBy }
  activityLogJson: json("activity_log_json"), // array of { id, action, details, timestamp, user }
  createdAt: timestamp("created_at").defaultNow(),
});

export const timesheets = mysqlTable("timesheets", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").notNull().references(() => users.id),
  jobId: int("job_id").references(() => jobs.id),
  clientId: int("client_id").references(() => clients.id),
  date: date("date").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  billable: boolean("billable").default(true),
  ratePerHour: decimal("rate_per_hour", { precision: 10, scale: 2 }).default("85.00"),
  costRate: decimal("cost_rate", { precision: 10, scale: 2 }).default("40.00"),
  taskName: varchar("task_name", { length: 150 }),
  subtaskName: varchar("subtask_name", { length: 150 }),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("Unsubmitted"), // Unsubmitted, PFA, Approved, Rejected, Billed
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feesInvoices = mysqlTable("fees_invoices", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  date: date("date").notNull(),
  dueDate: date("due_date"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0.00"),
  dueAmount: decimal("due_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Issued, Paid, Partial, Void
  paymentMethod: varchar("payment_method", { length: 50 }), // Bank Transfer, Card, Cash, Cheque
  paymentDate: date("payment_date"),
  paymentNotes: text("payment_notes"),
  reference: varchar("reference", { length: 100 }),
  lineItemsJson: json("line_items_json"),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: varchar("recurring_interval", { length: 50 }), // Monthly, Quarterly, Yearly
  remindersJson: json("reminders_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeFeesEstimates = mysqlTable("time_fees_estimates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  estimateNumber: varchar("estimate_number", { length: 50 }).notNull(),
  reference: varchar("reference", { length: 100 }),
  poNumber: varchar("po_number", { length: 50 }),
  estimateDate: date("estimate_date").notNull(),
  expiryDate: date("expiry_date"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).default("0.00"),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0.00"),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Sent, Accepted, Rejected, Converted
  lineItemsJson: json("line_items_json"),
  notes: text("notes"),
  convertedInvoiceId: int("converted_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").notNull().references(() => users.id),
  clientId: int("client_id").references(() => clients.id),
  jobId: int("job_id").references(() => jobs.id),
  expenseDate: date("expense_date").notNull(),
  category: varchar("category", { length: 100 }), // Travel, Mileage, Meals, Software, Filing Fees, Client Disbursements
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  billable: boolean("billable").default(true),
  status: varchar("status", { length: 30 }).default("Unsubmitted"), // Unsubmitted, PFA, Approved, Rejected, Reimbursed
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  receiptPath: varchar("receipt_path", { length: 255 }),
  notes: text("notes"),
  isReimbursed: boolean("is_reimbursed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeFeesSettings = mysqlTable("time_fees_settings", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  startWeekOn: varchar("start_week_on", { length: 20 }).default("Monday"),
  defaultCapacityHours: decimal("default_capacity_hours", { precision: 5, scale: 2 }).default("37.50"),
  defaultHourlyRate: decimal("default_hourly_rate", { precision: 10, scale: 2 }).default("75.00"),
  mileageRate: decimal("mileage_rate", { precision: 5, scale: 2 }).default("0.45"),
  minChargeableTime: int("min_chargeable_time").default(15), // minutes
  timesheetDueDay: varchar("timesheet_due_day", { length: 20 }).default("Friday"),
  timeFormat: varchar("time_format", { length: 20 }).default("decimal"),
  timeMode: varchar("time_mode", { length: 30 }).default("duration"), // duration, start_end
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).default("INV-"),
  estimatePrefix: varchar("estimate_prefix", { length: 20 }).default("EST-"),
  defaultVatRate: decimal("default_vat_rate", { precision: 5, scale: 2 }).default("20.00"),
  defaultPaymentTermsDays: int("default_payment_terms_days").default(30),
  autoGenerateInvoices: boolean("auto_generate_invoices").default(false),
  paymentMethod: varchar("payment_method", { length: 50 }).default("BACS"),
  bankDetails: text("bank_details"),
  invoiceFooter: text("invoice_footer"),
  estimateFooter: text("estimate_footer"),
  emailTemplatesJson: json("email_templates_json"),
  activitiesJson: json("activities_json"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeesInvoiceSchema = createInsertSchema(feesInvoices);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertTimeFeesEstimateSchema = createInsertSchema(timeFeesEstimates);

// =============================================
// MTD IT
// =============================================

export const mtdItClients = mysqlTable("mtd_it_clients", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").references(() => clients.id),
  practiceId: int("practice_id").references(() => practices.id),
  utrNumber: varchar("utr_number", { length: 20 }),
  nino: varchar("nino", { length: 20 }),
  mtdStatus: varchar("mtd_status", { length: 50 }).default("Unregistered"),
  agentAuthorised: boolean("agent_authorised").default(false),
  asaStatus: varchar("asa_status", { length: 30 }).default("Authorised"),
  calendarType: varchar("calendar_type", { length: 20 }).default("standard"),
  reportingMethod: varchar("reporting_method", { length: 20 }).default("three_line"),
  linkedIndividualId: int("linked_individual_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItSources = mysqlTable("mtd_it_sources", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").references(() => mtdItClients.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  sourceType: varchar("source_type", { length: 50 }).notNull().default("self-employment"), // 'self-employment', 'uk-property', 'foreign-property'
  businessId: varchar("business_id", { length: 50 }),
  tradingName: varchar("trading_name", { length: 255 }),
  accountingType: varchar("accounting_type", { length: 30 }).default("Cash basis"), // 'Cash basis', 'Accruals basis'
  commencementDate: date("commencement_date"),
  cessationDate: date("cessation_date"),
  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  addressLine3: varchar("address_line_3", { length: 255 }),
  addressLine4: varchar("address_line_4", { length: 255 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  postalCode: varchar("postal_code", { length: 20 }),
  workflowType: varchar("workflow_type", { length: 50 }).default("workflow_1_bridging"), // 'workflow_1_bridging', 'workflow_2_365', 'workflow_3_365_bookkeeping', 'workflow_4_bookkeeping'
  calendarType: varchar("calendar_type", { length: 20 }).default("standard"),
  reportingMethod: varchar("reporting_method", { length: 20 }).default("three_line"),
  sharedOwnershipPct: decimal("shared_ownership_pct", { precision: 5, scale: 2 }).default("100.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItQuarters = mysqlTable("mtd_it_quarters", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").references(() => mtdItClients.id),
  sourceId: int("source_id").references(() => mtdItSources.id),
  taxYear: varchar("tax_year", { length: 10 }),
  quarterNumber: int("quarter_number"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 50 }).default("Open"),
  isLocked: boolean("is_locked").default(false),
});

export const mtdItDigitalRecords = mysqlTable("mtd_it_digital_records", {
  id: int("id").primaryKey().autoincrement(),
  sourceId: int("source_id").notNull().references(() => mtdItSources.id),
  quarterId: int("quarter_id").references(() => mtdItQuarters.id),
  recordDate: date("record_date").notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull().default("0.00"),
  sourceType: varchar("source_type", { length: 50 }).notNull().default("self-employment"),
  category: varchar("category", { length: 100 }).notNull(),
  recordType: varchar("record_type", { length: 20 }).notNull().default("Income"), // 'Income', 'Expense'
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }),
  isDisallowable: boolean("is_disallowable").default(false),
  createdVia: varchar("created_via", { length: 50 }).default("Manual"), // 'Manual', 'Spreadsheet', 'Bookkeeping', '365'
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItQuarterSubmissions = mysqlTable("mtd_it_quarter_submissions", {
  id: int("id").primaryKey().autoincrement(),
  mtdQuarterId: int("mtd_quarter_id").references(() => mtdItQuarters.id),
  sourceId: int("source_id").references(() => mtdItSources.id),
  taxYear: varchar("tax_year", { length: 10 }),
  quarterNumber: int("quarter_number"),
  grossIncome: decimal("gross_income", { precision: 15, scale: 2 }),
  allowableExpenses: decimal("allowable_expenses", { precision: 15, scale: 2 }),
  disallowableExpenses: decimal("disallowable_expenses", { precision: 15, scale: 2 }).default("0.00"),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }),
  submissionMethod: varchar("submission_method", { length: 30 }).default("three_line"),
  breakdownJson: text("breakdown_json"),
  clientApprovalStatus: varchar("client_approval_status", { length: 50 }).default("Not Sent"),
  clientApprovedAt: timestamp("client_approved_at"),
  submittedAt: timestamp("submitted_at"),
  hmrcSubmissionId: varchar("hmrc_submission_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Draft"),
  errorLog: text("error_log"),
});

export const mtdItAdjustmentsAllowances = mysqlTable("mtd_it_adjustments_allowances", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").notNull().references(() => mtdItClients.id),
  sourceId: int("source_id").notNull().references(() => mtdItSources.id),
  taxYear: varchar("tax_year", { length: 10 }).notNull(),
  // Sole Trader & Property Adjustments
  includedNonTaxableProfits: decimal("included_non_taxable_profits", { precision: 15, scale: 2 }).default("0.00"),
  basisAdjustment: decimal("basis_adjustment", { precision: 15, scale: 2 }).default("0.00"),
  outstandingBusinessIncome: decimal("outstanding_business_income", { precision: 15, scale: 2 }).default("0.00"),
  overlapReliefUsed: decimal("overlap_relief_used", { precision: 15, scale: 2 }).default("0.00"),
  balancingChargeBpra: decimal("balancing_charge_bpra", { precision: 15, scale: 2 }).default("0.00"),
  accountingAdjustment: decimal("accounting_adjustment", { precision: 15, scale: 2 }).default("0.00"),
  balancingChargeOther: decimal("balancing_charge_other", { precision: 15, scale: 2 }).default("0.00"),
  goodsServicesOwnUse: decimal("goods_services_own_use", { precision: 15, scale: 2 }).default("0.00"),
  privateUseAdjustment: decimal("private_use_adjustment", { precision: 15, scale: 2 }).default("0.00"),
  // Allowances & Capital Allowances
  annualInvestmentAllowance: decimal("annual_investment_allowance", { precision: 15, scale: 2 }).default("0.00"),
  enhancedCapitalAllowance: decimal("enhanced_capital_allowance", { precision: 15, scale: 2 }).default("0.00"),
  bpra: decimal("bpra", { precision: 15, scale: 2 }).default("0.00"),
  allowanceOnSales: decimal("allowance_on_sales", { precision: 15, scale: 2 }).default("0.00"),
  capitalAllowanceMainPool: decimal("capital_allowance_main_pool", { precision: 15, scale: 2 }).default("0.00"),
  capitalAllowanceSingleAsset: decimal("capital_allowance_single_asset", { precision: 15, scale: 2 }).default("0.00"),
  capitalAllowanceSpecialRate: decimal("capital_allowance_special_rate", { precision: 15, scale: 2 }).default("0.00"),
  tradingAllowance: decimal("trading_allowance", { precision: 15, scale: 2 }).default("0.00"),
  propertyAllowance: decimal("property_allowance", { precision: 15, scale: 2 }).default("0.00"),
  zeroEmissionVehicleAllowance: decimal("zero_emission_vehicle_allowance", { precision: 15, scale: 2 }).default("0.00"),
  replacingDomesticItemsAllowance: decimal("replacing_domestic_items_allowance", { precision: 15, scale: 2 }).default("0.00"),
  // Non-financials
  detailsChangedRecently: boolean("details_changed_recently").default(false),
  class4NicExempt: boolean("class4_nic_exempt").default(false),
  assetsCalculatorJson: text("assets_calculator_json"),
  status: varchar("status", { length: 50 }).default("Draft"),
  submittedAt: timestamp("submitted_at"),
  hmrcSubmissionId: varchar("hmrc_submission_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItDividends = mysqlTable("mtd_it_dividends", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").notNull().references(() => mtdItClients.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  taxYear: varchar("tax_year", { length: 10 }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  sharesHeld: decimal("shares_held", { precision: 15, scale: 4 }).default("0.0000"),
  dividendRate: decimal("dividend_rate", { precision: 15, scale: 4 }).default("0.0000"),
  totalDividend: decimal("total_dividend", { precision: 15, scale: 2 }).notNull().default("0.00"),
  taxCredit: decimal("tax_credit", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("GBP"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).default("1.0000"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItFinalDeclarations = mysqlTable("mtd_it_final_declarations", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").notNull().references(() => mtdItClients.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  taxYear: varchar("tax_year", { length: 10 }).notNull(),
  totalTurnover: decimal("total_turnover", { precision: 15, scale: 2 }).default("0.00"),
  totalAllowableExpenses: decimal("total_allowable_expenses", { precision: 15, scale: 2 }).default("0.00"),
  totalAdjustments: decimal("total_adjustments", { precision: 15, scale: 2 }).default("0.00"),
  totalAllowances: decimal("total_allowances", { precision: 15, scale: 2 }).default("0.00"),
  totalDividends: decimal("total_dividends", { precision: 15, scale: 2 }).default("0.00"),
  otherIncome: decimal("other_income", { precision: 15, scale: 2 }).default("0.00"),
  taxableProfit: decimal("taxable_profit", { precision: 15, scale: 2 }).default("0.00"),
  taxDue: decimal("tax_due", { precision: 15, scale: 2 }).default("0.00"),
  calculationJson: text("calculation_json"),
  status: varchar("status", { length: 50 }).default("Draft"),
  submittedAt: timestamp("submitted_at"),
  hmrcSubmissionId: varchar("hmrc_submission_id", { length: 255 }),
  clientApprovalStatus: varchar("client_approval_status", { length: 50 }).default("Not Sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mtdItAdjustments = mysqlTable("mtd_it_adjustments", {
  id: int("id").primaryKey().autoincrement(),
  mtdClientId: int("mtd_client_id").references(() => mtdItClients.id),
  taxYear: varchar("tax_year", { length: 10 }),
  adjustmentType: varchar("adjustment_type", { length: 100 }),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  submittedAt: timestamp("submitted_at"),
});

// =============================================
// 365 PORTAL
// =============================================

export const portalLicenses = mysqlTable("portal_licenses", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  licenseType: varchar("license_type", { length: 50 }), // Portal365, MtdIt
  totalAllocated: int("total_allocated"),
  usedCount: int("used_count").default(0),
});

export const portalClientInvitations = mysqlTable("portal_client_invitations", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  inviteEmail: varchar("invite_email", { length: 255 }),
  token: varchar("token", { length: 255 }).unique(),
  portalType: varchar("portal_type", { length: 50 }).default("365"), // 365, sme
  permissionsJson: text("permissions_json"),
  status: varchar("status", { length: 50 }).default("Pending"), // Pending, Accepted, Expired
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const portalUsers = mysqlTable("portal_users", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  portalType: varchar("portal_type", { length: 50 }).default("365"), // 365, sme
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  permissionsJson: text("permissions_json"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// SANSIGN
// =============================================

export const esignDocuments = mysqlTable("esign_documents", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id"),
  clientId: int("client_id"),
  title: varchar("title", { length: 255 }),
  filePath: varchar("file_path", { length: 255 }),
  attachmentsJson: json("attachments_json"), // Array<{ fileName: string, filePath: string, fileSize?: number }>
  emailSubject: varchar("email_subject", { length: 255 }),
  emailTemplateId: int("email_template_id"),
  signedFilePath: varchar("signed_file_path", { length: 255 }),
  fileSize: int("file_size"),
  sourceModule: varchar("source_module", { length: 100 }), // Bookkeeping, CorporationTax, AccountsProduction, SelfAssessment, DirectUpload
  message: text("message"),
  status: varchar("status", { length: 50 }).default("Draft"), // Draft, AwaitingApproval, Signed, Declined, Cancelled
  createdByUserId: int("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiryDate: timestamp("expiry_date"),
  isPasswordProtected: boolean("is_password_protected").default(false),
  accessCode: varchar("access_code", { length: 100 }),
});

export const esignSigners = mysqlTable("esign_signers", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id").references(() => esignDocuments.id),
  signerEmail: varchar("signer_email", { length: 255 }),
  signerName: varchar("signer_name", { length: 100 }),
  signerRole: varchar("signer_role", { length: 50 }).default("Signer"), // Signer, Reviewer, InPerson
  status: varchar("status", { length: 50 }).default("Awaiting"), // Awaiting, Signed, Declined
  signedAt: timestamp("signed_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  signatureData: text("signature_data"),
  verificationToken: varchar("verification_token", { length: 255 }).unique(),
});

export const esignFields = mysqlTable("esign_fields", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id").references(() => esignDocuments.id),
  signerId: int("signer_id").references(() => esignSigners.id),
  fileIndex: int("file_index").default(0), // Multi-document support: 0-indexed file reference
  fieldType: varchar("field_type", { length: 50 }), // Signature, Initial, Date, Textbox, Checkbox, My Signature
  pageNumber: int("page_number"),
  coordX: decimal("coord_x", { precision: 5, scale: 2 }),
  coordY: decimal("coord_y", { precision: 5, scale: 2 }),
  width: decimal("width", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
});

export const esignAuditLogs = mysqlTable("esign_audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("document_id").references(() => esignDocuments.id),
  action: varchar("action", { length: 100 }), // Created, Sent, Opened, Signed, Resent, Declined, Cancelled
  timestamp: timestamp("timestamp").defaultNow(),
  details: text("details"),
});

export const esignSettings = mysqlTable("esign_settings", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().unique(),
  emailRemindersEnabled: boolean("email_reminders_enabled").default(true),
  reminderDays: int("reminder_days").default(3),
  masterPasswordEnabled: boolean("master_password_enabled").default(false),
  masterPassword: varchar("master_password", { length: 255 }),
  customMessage: text("custom_message"),
  notifyOnSign: boolean("notify_on_sign").default(true),
  notifyOnDecline: boolean("notify_on_decline").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const esignTemplates = mysqlTable("esign_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("General"),
  description: text("description"),
  subject: varchar("subject", { length: 255 }),
  emailBody: text("email_body"),
  fieldsJson: json("fields_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// COMPANY SECRETARIAL
// =============================================

export const csRecords = mysqlTable("cs_records", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  companyRegNo: varchar("company_reg_no", { length: 20 }),
  companyType: varchar("company_type", { length: 50 }).default("Ltd"), // Ltd, LLP, PLC, Limited by Guarantee
  incorporationDate: date("incorporation_date"),
  sicCode: varchar("sic_code", { length: 100 }),
  nextConfirmationDue: date("next_confirmation_due"),
  nextAccountsDue: date("next_accounts_due"),
  registeredAddress: text("registered_address"),
  registeredEmail: varchar("registered_email", { length: 255 }), // Mandatory statutory requirement under ECCTA 2024
  previousName: varchar("previous_name", { length: 255 }),
  dateOfNameChange: date("date_of_name_change"),
  nameChangeMethod: varchar("name_change_method", { length: 50 }).default("NA"), // NA, NM01 (Resolution), NM04 (Articles)
  authCode: varchar("auth_code", { length: 20 }), // Companies House 6-digit WebFiling code
  filingPreference: varchar("filing_preference", { length: 50 }).default("we_file"), // we_file, client_cs01, client_all
  sailAddress: text("sail_address"), // Single Alternative Inspection Location
  registersLocation: varchar("registers_location", { length: 50 }).default("registered_office"), // registered_office, sail
  hmrcUtr: varchar("hmrc_utr", { length: 20 }),
  taxOffice: varchar("tax_office", { length: 100 }),
  accountingReferenceDate: varchar("accounting_reference_date", { length: 20 }), // e.g. "31-12"
  lastAccountsDate: date("last_accounts_date"),
  confirmationReviewDate: date("confirmation_review_date"),
  agmDate: date("agm_date"),
  firstBoardMeetingDate: date("first_board_meeting_date"),
  corporateOfficerRegName: varchar("corporate_officer_reg_name", { length: 255 }),
  corporateOfficerLegalForm: varchar("corporate_officer_legal_form", { length: 100 }),
  corporateOfficerGoverningLaw: varchar("corporate_officer_governing_law", { length: 100 }),
  isOffshore: boolean("is_offshore").default(false),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csShareholders = mysqlTable("cs_shareholders", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  shareholderType: varchar("shareholder_type", { length: 30 }).default("Individual"), // Individual, Corporate
  email: varchar("email", { length: 255 }),
  shareClass: varchar("share_class", { length: 50 }).default("Ordinary"),
  sharesHeld: decimal("shares_held", { precision: 15, scale: 2 }).default("0.00"),
  nominalValue: decimal("nominal_value", { precision: 10, scale: 4 }).default("1.0000"),
  percentageOwnership: decimal("percentage_ownership", { precision: 6, scale: 2 }).default("0.00"),
  appointmentDate: date("appointment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csOfficers = mysqlTable("cs_officers", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("Director"), // Director, Secretary, LLP_Member
  appointmentDate: date("appointment_date"),
  resignationDate: date("resignation_date"),
  dateOfBirth: date("date_of_birth"),
  nationality: varchar("nationality", { length: 100 }),
  occupation: varchar("occupation", { length: 100 }),
  countryOfResidence: varchar("country_of_residence", { length: 100 }),
  serviceAddress: text("service_address"),
  residentialAddress: text("residential_address"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csPscs = mysqlTable("cs_pscs", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  kind: varchar("kind", { length: 100 }).default("individual-person-with-significant-control"), // individual-person-with-significant-control, corporate-entity-person-with-significant-control, legal-person-with-significant-control
  natureOfControl: text("nature_of_control"), // JSON array or text of control mechanisms
  notifiedOn: date("notified_on"),
  ceasedOn: date("ceased_on"),
  dateOfBirth: date("date_of_birth"),
  nationality: varchar("nationality", { length: 100 }),
  countryOfResidence: varchar("country_of_residence", { length: 100 }),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csFilings = mysqlTable("cs_filings", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  formType: varchar("form_type", { length: 50 }).notNull(), // CS01, IN01, AP01, TM01, CH01, AD01, PSC01
  status: varchar("status", { length: 50 }).default("Draft"), // Draft, Submitted, Accepted, Rejected
  submissionDate: timestamp("submission_date").defaultNow(),
  transactionId: varchar("transaction_id", { length: 100 }),
  submissionNumber: varchar("submission_number", { length: 100 }),
  notes: text("notes"),
  payloadJson: json("payload_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csSettings = mysqlTable("cs_settings", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  presenterId: varchar("presenter_id", { length: 100 }),
  presenterAuthCode: varchar("presenter_auth_code", { length: 100 }),
  defaultRegisteredOffice: text("default_registered_office"),
  defaultCountry: varchar("default_country", { length: 100 }).default("United Kingdom"),
  isLiveMode: boolean("is_live_mode").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================
// ZOD SCHEMAS (for validation)
// =============================================

import { createInsertSchema } from "drizzle-zod";

export const insertPracticeSchema = createInsertSchema(practices);
export const insertUserSchema = createInsertSchema(users).omit({ passwordHash: true });
export const insertClientSchema = createInsertSchema(clients);
export const insertContactSchema = createInsertSchema(contacts);
export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices);
export const insertPurchaseSchema = createInsertSchema(purchases);
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems);
export const insertBankAccountSchema = createInsertSchema(bankAccounts);
export const insertBankTransactionSchema = createInsertSchema(bankTransactions);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertJobSchema = createInsertSchema(jobs);
export const insertTimesheetSchema = createInsertSchema(timesheets);
export const insertMtdItClientSchema = createInsertSchema(mtdItClients);
export const insertMtdItSourceSchema = createInsertSchema(mtdItSources);
export const insertMtdItQuarterSchema = createInsertSchema(mtdItQuarters);
export const insertMtdItDigitalRecordSchema = createInsertSchema(mtdItDigitalRecords);
export const insertMtdItQuarterSubmissionSchema = createInsertSchema(mtdItQuarterSubmissions);
export const insertMtdItAdjustmentSchema = createInsertSchema(mtdItAdjustments);
export const insertMtdItAdjustmentAllowanceSchema = createInsertSchema(mtdItAdjustmentsAllowances);
export const insertMtdItDividendSchema = createInsertSchema(mtdItDividends);
export const insertMtdItFinalDeclarationSchema = createInsertSchema(mtdItFinalDeclarations);

export type MtdItClient = typeof mtdItClients.$inferSelect;
export type InsertMtdItClient = typeof mtdItClients.$inferInsert;
export type MtdItSource = typeof mtdItSources.$inferSelect;
export type InsertMtdItSource = typeof mtdItSources.$inferInsert;
export type MtdItQuarter = typeof mtdItQuarters.$inferSelect;
export type InsertMtdItQuarter = typeof mtdItQuarters.$inferInsert;
export type MtdItDigitalRecord = typeof mtdItDigitalRecords.$inferSelect;
export type InsertMtdItDigitalRecord = typeof mtdItDigitalRecords.$inferInsert;
export type MtdItQuarterSubmission = typeof mtdItQuarterSubmissions.$inferSelect;
export type InsertMtdItQuarterSubmission = typeof mtdItQuarterSubmissions.$inferInsert;
export type MtdItAdjustmentAllowance = typeof mtdItAdjustmentsAllowances.$inferSelect;
export type InsertMtdItAdjustmentAllowance = typeof mtdItAdjustmentsAllowances.$inferInsert;
export type MtdItDividend = typeof mtdItDividends.$inferSelect;
export type InsertMtdItDividend = typeof mtdItDividends.$inferInsert;
export type MtdItFinalDeclaration = typeof mtdItFinalDeclarations.$inferSelect;
export type InsertMtdItFinalDeclaration = typeof mtdItFinalDeclarations.$inferInsert;
export const insertPortalLicenseSchema = createInsertSchema(portalLicenses);
export const insertPortalClientInvitationSchema = createInsertSchema(portalClientInvitations);
export const insertPortalUserSchema = createInsertSchema(portalUsers);
export const inserteSignDocumentSchema = createInsertSchema(esignDocuments);
export const inserteSignSignerSchema = createInsertSchema(esignSigners);
export const inserteSignFieldSchema = createInsertSchema(esignFields);
export const inserteSignAuditLogSchema = createInsertSchema(esignAuditLogs);
export const inserteSignSettingsSchema = createInsertSchema(esignSettings);
export const inserteSignTemplateSchema = createInsertSchema(esignTemplates);
export const insertCsRecordSchema = createInsertSchema(csRecords);
export const insertCsShareholderSchema = createInsertSchema(csShareholders);
export const insertCsOfficerSchema = createInsertSchema(csOfficers);
export const insertCsPscSchema = createInsertSchema(csPscs);
export const insertCsFilingSchema = createInsertSchema(csFilings);
export const insertCsSettingSchema = createInsertSchema(csSettings);
export const insertItemSchema = createInsertSchema(items);
export const insertCisSettingsSchema = createInsertSchema(cisSettings);
export const insertCisSubcontractorSchema = createInsertSchema(cisSubcontractors);
export const insertCisReturnSchema = createInsertSchema(cisReturns);
export const insertCreditNoteSchema = createInsertSchema(creditNotes);
export const insertCreditNoteItemSchema = createInsertSchema(creditNoteItems);
export const insertCreditNoteAllocationSchema = createInsertSchema(creditNoteAllocations);
export const insertBankRuleSchema = createInsertSchema(bankRules);
export const insertCisReturnLineSchema = createInsertSchema(cisReturnLines);

export type CreditNote = typeof creditNotes.$inferSelect;
export type InsertCreditNote = typeof creditNotes.$inferInsert;
export type CreditNoteItem = typeof creditNoteItems.$inferSelect;
export type InsertCreditNoteItem = typeof creditNoteItems.$inferInsert;
export type CreditNoteAllocation = typeof creditNoteAllocations.$inferSelect;
export type InsertCreditNoteAllocation = typeof creditNoteAllocations.$inferInsert;
export type BankRule = typeof bankRules.$inferSelect;
export type InsertBankRule = typeof bankRules.$inferInsert;
export type CisReturnLine = typeof cisReturnLines.$inferSelect;
export type InsertCisReturnLine = typeof cisReturnLines.$inferInsert;
export type VatPeriod = typeof vatPeriods.$inferSelect;
export type InsertVatPeriod = typeof vatPeriods.$inferInsert;
export type FixedAsset = typeof fixedAssets.$inferSelect;
export type InsertFixedAsset = typeof fixedAssets.$inferInsert;
export type Dividend = typeof dividends.$inferSelect;
export type InsertDividend = typeof dividends.$inferInsert;


// Payroll Schemas
export const insertPayeSchemeSchema = createInsertSchema(payeSchemes);
export const insertPayRunSchema = createInsertSchema(payRuns);
export const insertPayslipSchema = createInsertSchema(payslips);
export const insertRtiSubmissionSchema = createInsertSchema(rtiSubmissions);
export const insertPayrollDepartmentSchema = createInsertSchema(payrollDepartments);
export const insertPayrollAdditionsDeductionsSchema = createInsertSchema(payrollAdditionsDeductions);
export const insertPayrollAttachmentsSchema = createInsertSchema(payrollAttachments);
export const insertPayrollMileageClaimsSchema = createInsertSchema(payrollMileageClaims);
export const insertPayrollExpenseClaimsSchema = createInsertSchema(payrollExpenseClaims);
export const insertPayrollStatutoryLeavesSchema = createInsertSchema(payrollStatutoryLeaves);
export const insertPayrollTimekeepingSchema = createInsertSchema(payrollTimekeeping);
export const insertPayrollPensionSchemesSchema = createInsertSchema(payrollPensionSchemes);
export const insertPayrollPensionAssessmentsSchema = createInsertSchema(payrollPensionAssessments);
export const insertPayrollPensionLettersSchema = createInsertSchema(payrollPensionLetters);
export const insertPayrollP11dReturnsSchema = createInsertSchema(payrollP11dReturns);
export const insertPayrollP46CarsSchema = createInsertSchema(payrollP46Cars);
export const insertPayrollBulkSchedulesSchema = createInsertSchema(payrollBulkSchedules);

// Taxation Schemas
export const insertCt600ReturnSchema = createInsertSchema(ct600Returns);
export const insertCtSubmissionSchema = createInsertSchema(ctSubmissions);
export const insertSelfAssessmentClientSchema = createInsertSchema(selfAssessmentClients);
export const insertSa100ReturnSchema = createInsertSchema(sa100Returns);
export const insertSa800ReturnSchema = createInsertSchema(sa800Returns);
export const insertSaSubmissionSchema = createInsertSchema(saSubmissions);

// Accounts Production Schemas
export const insertAccountingPeriodSchema = createInsertSchema(accountingPeriods);
export const insertTrialBalanceSchema = createInsertSchema(trialBalances);
export const insertTrialBalanceLineSchema = createInsertSchema(trialBalanceLines);
export const insertAnnualReportSchema = createInsertSchema(annualReports);
export const insertManagementReportSchema = createInsertSchema(managementReports);

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export type AccountingPeriod = typeof accountingPeriods.$inferSelect;
export type InsertAccountingPeriod = typeof accountingPeriods.$inferInsert;
export type AnnualReport = typeof annualReports.$inferSelect;
export type InsertAnnualReport = typeof annualReports.$inferInsert;
export type ManagementReport = typeof managementReports.$inferSelect;
export type InsertManagementReport = typeof managementReports.$inferInsert;
export type TrialBalance = typeof trialBalances.$inferSelect;
export type InsertTrialBalance = typeof trialBalances.$inferInsert;
export type TrialBalanceLine = typeof trialBalanceLines.$inferSelect;
export type InsertTrialBalanceLine = typeof trialBalanceLines.$inferInsert;
export type CsRecord = typeof csRecords.$inferSelect;
export type InsertCsRecord = typeof csRecords.$inferInsert;
export type CsShareholder = typeof csShareholders.$inferSelect;
export type InsertCsShareholder = typeof csShareholders.$inferInsert;
export type CsOfficer = typeof csOfficers.$inferSelect;
export type InsertCsOfficer = typeof csOfficers.$inferInsert;
export type CsPsc = typeof csPscs.$inferSelect;
export type InsertCsPsc = typeof csPscs.$inferInsert;
export type CsFiling = typeof csFilings.$inferSelect;
export type InsertCsFiling = typeof csFilings.$inferInsert;
export type CsSetting = typeof csSettings.$inferSelect;
export type InsertCsSetting = typeof csSettings.$inferInsert;

// =============================================
// CHARITY ACCOUNTS
// =============================================

export const charities = mysqlTable("charities", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  logoPath: varchar("logo_path", { length: 255 }),
  regulator: varchar("regulator", { length: 100 }).default("Charity Commission for England and Wales"),
  charityRegNumber: varchar("charity_reg_number", { length: 50 }),
  companyRegNumber: varchar("company_reg_number", { length: 50 }),
  commencementDate: date("commencement_date"),
  principalPurpose: text("principal_purpose"),
  charityType: varchar("charity_type", { length: 100 }).default("Charitable Incorporated Organisation (CIO)"), // Charitable Company, CIO, Charitable Un-incorporated Association
  reportingType: varchar("reporting_type", { length: 50 }).default("Independent Examination"), // Audited, Independent Examination, Exempt
  isAudited: boolean("is_audited").default(false),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  addressLine3: varchar("address_line3", { length: 255 }),
  townCity: varchar("town_city", { length: 100 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  postcode: varchar("postcode", { length: 20 }),
  accountingMethod: varchar("accounting_method", { length: 50 }).default("Accrual"), // Accrual (SORP FRS 102), Cash (Receipts & Payments)
  currency: varchar("currency", { length: 50 }).default("GBP"),
  isVatRegistered: boolean("is_vat_registered").default(false),
  isRoundingEnabled: boolean("is_rounding_enabled").default(false),
  isFundWiseBalanceSheet: boolean("is_fund_wise_balance_sheet").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charityAccountingPeriods = mysqlTable("charity_accounting_periods", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isLocked: boolean("is_locked").default(false),
  isActive: boolean("is_active").default(true),
  accountingStandard: varchar("accounting_standard", { length: 50 }).default("SORP_FRS102"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityContacts = mysqlTable("charity_contacts", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  contactType: varchar("contact_type", { length: 50 }).default("Trustee"), // Trustee, Patron, Banker, Solicitor, Donor, Examiner
  contactPerson: varchar("contact_person", { length: 150 }),
  role: varchar("role", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  mobile: varchar("mobile", { length: 50 }),
  email: varchar("email", { length: 150 }),
  website: varchar("website", { length: 255 }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityFunds = mysqlTable("charity_funds", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  fundName: varchar("fund_name", { length: 255 }).notNull(),
  fundCode: varchar("fund_code", { length: 50 }),
  fundType: varchar("fund_type", { length: 50 }).notNull().default("Unrestricted"), // Unrestricted, Restricted, Endowment, Designated
  description: text("description"),
  openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0.00"),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityFundTransfers = mysqlTable("charity_fund_transfers", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  fromFundId: int("from_fund_id").notNull().references(() => charityFunds.id),
  toFundId: int("to_fund_id").notNull().references(() => charityFunds.id),
  transferDate: date("transfer_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason"),
  reference: varchar("reference", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityActivities = mysqlTable("charity_activities", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  activityCode: varchar("activity_code", { length: 50 }),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charitySponsorEvents = mysqlTable("charity_sponsor_events", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  eventName: varchar("event_name", { length: 255 }).notNull(),
  eventDate: date("event_date"),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityDonations = mysqlTable("charity_donations", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  donorName: varchar("donor_name", { length: 255 }).notNull(),
  fundId: int("fund_id").references(() => charityFunds.id),
  donationDate: date("donation_date").notNull(),
  depositAccountId: varchar("deposit_account_id", { length: 100 }).default("Bank Current Account"),
  incomeNominalCode: varchar("income_nominal_code", { length: 50 }).default("4000"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Bank Transfer"), // Bank Transfer, Cash, Cheque, Card, Online
  isGiftAidEligible: boolean("is_gift_aid_eligible").default(false),
  giftAidClaimed: boolean("gift_aid_claimed").default(false),
  sponsoredEventId: int("sponsored_event_id").references(() => charitySponsorEvents.id),
  activityId: int("activity_id").references(() => charityActivities.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityRecurringDonations = mysqlTable("charity_recurring_donations", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  donorName: varchar("donor_name", { length: 255 }).notNull(),
  fundId: int("fund_id").references(() => charityFunds.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).default("Monthly"), // Weekly, Monthly, Quarterly, Yearly
  startDate: date("start_date").notNull(),
  nextDueDate: date("next_due_date"),
  depositAccountId: varchar("deposit_account_id", { length: 100 }).default("Bank Current Account"),
  incomeNominalCode: varchar("income_nominal_code", { length: 50 }).default("4000"),
  status: varchar("status", { length: 50 }).default("Active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityDonationsInKind = mysqlTable("charity_donations_in_kind", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  donorName: varchar("donor_name", { length: 255 }).notNull(),
  donationDate: date("donation_date").notNull(),
  donationType: varchar("donation_type", { length: 100 }).default("Goods"), // Goods, Services, Facilities
  fundId: int("fund_id").references(() => charityFunds.id),
  debitNominalCode: varchar("debit_nominal_code", { length: 50 }),
  creditNominalCode: varchar("credit_nominal_code", { length: 50 }),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityGiftAidSettings = mysqlTable("charity_gift_aid_settings", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  authorisedFirstName: varchar("authorised_first_name", { length: 100 }),
  authorisedLastName: varchar("authorised_last_name", { length: 100 }),
  charityIdNumber: varchar("charity_id_number", { length: 100 }),
  charityCommissionRef: varchar("charity_commission_ref", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  postcode: varchar("postcode", { length: 20 }),
  regulator: varchar("regulator", { length: 100 }).default("Charity Commission for England and Wales"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charityGiftAidClaims = mysqlTable("charity_gift_aid_claims", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  claimReference: varchar("claim_reference", { length: 100 }).notNull(),
  claimStartDate: date("claim_start_date").notNull(),
  claimEndDate: date("claim_end_date").notNull(),
  totalDonations: decimal("total_donations", { precision: 12, scale: 2 }).notNull(),
  giftAidAmount: decimal("gift_aid_amount", { precision: 12, scale: 2 }).notNull(), // 25% of total
  status: varchar("status", { length: 50 }).default("Draft"), // Draft, Validated, Submitted, Accepted
  submissionDate: timestamp("submission_date"),
  hmrcResponse: text("hmrc_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charitySorpMappings = mysqlTable("charity_sorp_mappings", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").references(() => practices.id),
  charityId: int("charity_id").references(() => charities.id, { onDelete: "cascade" }),
  nominalCode: varchar("nominal_code", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  sorpCategory: varchar("sorp_category", { length: 150 }).notNull(), // Donations and legacies, Charitable activities, Raising funds, Other trading activities, Investments
  fundType: varchar("fund_type", { length: 50 }).default("Unrestricted"), // Unrestricted, Restricted, Endowment
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityTrialBalanceLines = mysqlTable("charity_trial_balance_lines", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => charityAccountingPeriods.id, { onDelete: "cascade" }),
  nominalCode: varchar("nominal_code", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  sorpCategory: varchar("sorp_category", { length: 150 }),
  unrestrictedDebit: decimal("unrestricted_debit", { precision: 12, scale: 2 }).default("0.00"),
  unrestrictedCredit: decimal("unrestricted_credit", { precision: 12, scale: 2 }).default("0.00"),
  restrictedDebit: decimal("restricted_debit", { precision: 12, scale: 2 }).default("0.00"),
  restrictedCredit: decimal("restricted_credit", { precision: 12, scale: 2 }).default("0.00"),
  endowmentDebit: decimal("endowment_debit", { precision: 12, scale: 2 }).default("0.00"),
  endowmentCredit: decimal("endowment_credit", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityTrusteesReports = mysqlTable("charity_trustees_reports", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => charityAccountingPeriods.id, { onDelete: "cascade" }),
  objectivesActivities: text("objectives_activities"),
  achievementsPerformance: text("achievements_performance"),
  financialReview: text("financial_review"),
  structureGovernance: text("structure_governance"),
  referenceAdmin: text("reference_admin"),
  exemptionsApplied: text("exemptions_applied"),
  status: varchar("status", { length: 50 }).default("Draft"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charityIndependentExaminerReports = mysqlTable("charity_independent_examiner_reports", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => charityAccountingPeriods.id, { onDelete: "cascade" }),
  examinerName: varchar("examiner_name", { length: 255 }),
  examinerQualification: varchar("examiner_qualification", { length: 100 }), // FCA, ACA, FCCA, ACCA, CPFA, ACMA
  accountingBody: varchar("accounting_body", { length: 255 }), // ICAEW, ACCA, CIMA, CIPFA
  examinerAddress: text("examiner_address"),
  reportDate: date("report_date"),
  basisOfReport: text("basis_of_report"),
  examinerStatement: text("examiner_statement"),
  concernsOrMatters: text("concerns_or_matters"),
  isGrossIncomeOver250k: boolean("is_gross_income_over_250k").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charityReportSettings = mysqlTable("charity_report_settings", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => charityAccountingPeriods.id, { onDelete: "cascade" }),
  trusteesJson: text("trustees_json"), // array of trustee names/roles
  patronsJson: text("patrons_json"),
  bankersJson: text("bankers_json"),
  solicitorsJson: text("solicitors_json"),
  investmentAdvisorsJson: text("investment_advisors_json"),
  balanceSheetDisclosures: text("balance_sheet_disclosures"),
  trusteesReportDisclosures: text("trustees_report_disclosures"),
  additionalNotesJson: text("additional_notes_json"),
  accountingPoliciesJson: text("accounting_policies_json"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const charityBankAccounts = mysqlTable("charity_bank_accounts", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountCode: varchar("account_code", { length: 50 }),
  accountType: varchar("account_type", { length: 50 }).default("Current Account"),
  accountNumber: varchar("account_number", { length: 50 }),
  sortCode: varchar("sort_code", { length: 20 }),
  fundId: int("fund_id").references(() => charityFunds.id),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityInvoices = mysqlTable("charity_invoices", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  fundId: int("fund_id").references(() => charityFunds.id),
  activityId: int("activity_id").references(() => charityActivities.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("Paid"), // Draft, Sent, Paid, Overdue
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityBills = mysqlTable("charity_bills", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  billNumber: varchar("bill_number", { length: 50 }).notNull(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  billDate: date("bill_date").notNull(),
  dueDate: date("due_date"),
  fundId: int("fund_id").references(() => charityFunds.id),
  activityId: int("activity_id").references(() => charityActivities.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("Paid"), // Unpaid, Paid, Partially Paid
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const charityAdditionalDisclosures = mysqlTable("charity_additional_disclosures", {
  id: int("id").primaryKey().autoincrement(),
  charityId: int("charity_id").notNull().references(() => charities.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => charityAccountingPeriods.id, { onDelete: "cascade" }),
  disclosureType: varchar("disclosure_type", { length: 50 }).notNull(), // Note, AccountingPolicy
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  sequence: int("sequence").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCharitySchema = createInsertSchema(charities);
export const insertCharityAccountingPeriodSchema = createInsertSchema(charityAccountingPeriods);
export const insertCharityContactSchema = createInsertSchema(charityContacts);
export const insertCharityFundSchema = createInsertSchema(charityFunds);
export const insertCharityFundTransferSchema = createInsertSchema(charityFundTransfers);
export const insertCharityDonationSchema = createInsertSchema(charityDonations);
export const insertCharityRecurringDonationSchema = createInsertSchema(charityRecurringDonations);
export const insertCharityDonationInKindSchema = createInsertSchema(charityDonationsInKind);
export const insertCharityGiftAidClaimSchema = createInsertSchema(charityGiftAidClaims);
export const insertCharityActivitySchema = createInsertSchema(charityActivities);
export const insertCharitySponsorEventSchema = createInsertSchema(charitySponsorEvents);
export const insertCharitySorpMappingSchema = createInsertSchema(charitySorpMappings);
export const insertCharityTrialBalanceLineSchema = createInsertSchema(charityTrialBalanceLines);
export const insertCharityTrusteesReportSchema = createInsertSchema(charityTrusteesReports);
export const insertCharityIndependentExaminerReportSchema = createInsertSchema(charityIndependentExaminerReports);
export const insertCharityReportSettingsSchema = createInsertSchema(charityReportSettings);
export const insertCharityBankAccountSchema = createInsertSchema(charityBankAccounts);
export const insertCharityInvoiceSchema = createInsertSchema(charityInvoices);
export const insertCharityBillSchema = createInsertSchema(charityBills);
export const insertCharityAdditionalDisclosureSchema = createInsertSchema(charityAdditionalDisclosures);

export type Charity = typeof charities.$inferSelect;
export type InsertCharity = typeof charities.$inferInsert;
export type CharityFund = typeof charityFunds.$inferSelect;
export type InsertCharityFund = typeof charityFunds.$inferInsert;
export type CharityDonation = typeof charityDonations.$inferSelect;
export type InsertCharityDonation = typeof charityDonations.$inferInsert;

// =============================================
// COMPANIES HOUSE INTEGRATION
// =============================================

export const chApiSettings = mysqlTable("ch_api_settings", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  authCode: varchar("auth_code", { length: 100 }),
  presenterId: varchar("presenter_id", { length: 100 }),
  presenterAuthCode: varchar("presenter_auth_code", { length: 255 }),
  isConnected: boolean("is_connected").default(false),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const insertChApiSettingsSchema = createInsertSchema(chApiSettings).omit({ id: true, updatedAt: true });

export const chDirectors = mysqlTable("ch_directors", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  appointedOn: date("appointed_on"),
  resignedOn: date("resigned_on"),
  status: varchar("status", { length: 50 }).default("Active"),
  officerId: varchar("officer_id", { length: 100 }),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

export const insertChDirectorsSchema = createInsertSchema(chDirectors).omit({ id: true, lastSyncedAt: true });



// =============================================
// SYSTEM ADMINS (Completely separate from tenant users)
// =============================================

export const systemAdmins = mysqlTable("system_admins", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("support"), // super_admin, support, billing
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSystemAdminSchema = createInsertSchema(systemAdmins).omit({ id: true, createdAt: true, lastLogin: true });

// System Global Settings (e.g. Maintenance Mode)
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  updatedBy: int("updated_by").references(() => systemAdmins.id),
});

// System Audit Logs (Admin Panel actions)
export const systemAuditLogs = mysqlTable("system_audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  adminId: int("admin_id").notNull().references(() => systemAdmins.id),
  action: varchar("action", { length: 100 }).notNull(), // e.g. 'SUSPEND_FIRM', 'CREATE_FIRM'
  targetId: int("target_id"), // ID of the firm/user affected
  targetType: varchar("target_type", { length: 50 }), // 'firm', 'user', 'admin'
  details: text("details"), // JSON payload
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global System Announcements (Broadcasts to tenants)
export const systemAnnouncements = mysqlTable("system_announcements", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).default("info"), // info, warning, success, error
  isActive: boolean("is_active").default(true),
  createdBy: int("created_by").notNull().references(() => systemAdmins.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // null means no expiration
});

// Dynamic Subscription Plans & Pricing
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., Basic, Pro, Enterprise
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).default("0.00"),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }).default("0.00"),
  maxClients: int("max_clients").default(0), // 0 means unlimited
  maxUsers: int("max_users").default(0), // 0 means unlimited
  maxStorageGb: decimal("max_storage_gb", { precision: 10, scale: 2 }).default("5.00"),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true), // if false, can only be assigned by system admin (grandfathered)
  stripeProductId: varchar("stripe_product_id", { length: 100 }), // for integration later
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// SUPPORT TICKETING SYSTEM
// =============================================

export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").notNull().references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("open"), // open, in_progress, resolved, closed
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  category: varchar("category", { length: 50 }).notNull(), // billing, technical, feature_request, other
  assignedDepartment: varchar("assigned_department", { length: 50 }), // billing, support, sales, technical
  assignedTo: int("assigned_to").references(() => systemAdmins.id), // support staff handling this
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ticketMessages = mysqlTable("ticket_messages", {
  id: int("id").primaryKey().autoincrement(),
  ticketId: int("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'tenant' or 'system_admin'
  senderId: int("sender_id").notNull(), // either users.id or systemAdmins.id depending on senderType
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // internal notes for system admins only
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// REVENUE & BILLING (FinOps)
// =============================================

export const systemPayments = mysqlTable("system_payments", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("GBP"),
  paymentMethod: varchar("payment_method", { length: 50 }), // card, bank_transfer, stripe
  status: varchar("status", { length: 20 }).default("completed"), // pending, completed, failed, refunded
  description: varchar("description", { length: 255 }), // e.g. "Monthly Subscription - Pro", "Custom Setup Fee"
  invoiceId: varchar("invoice_id", { length: 100 }), // external or generated invoice reference
  processedBy: int("processed_by").references(() => systemAdmins.id), // if manual
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// EMAIL COMMUNICATIONS
// =============================================

export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").primaryKey().autoincrement(),
  triggerName: varchar("trigger_name", { length: 100 }).notNull().unique(), // e.g. WELCOME_EMAIL, INVOICE_RECEIPT
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyHtml: longtext("body_html").notNull(),
  bodyText: text("body_text"),
  variables: varchar("variables", { length: 255 }), // e.g. "{{firstName}}, {{firmName}}"
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  updatedBy: int("updated_by").references(() => systemAdmins.id),
});

// =============================================
// INVOICE & QUOTATION TEMPLATES
// =============================================

export const invoiceTemplates = mysqlTable("invoice_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").default(1),
  clientId: int("client_id"),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("Invoice"), // "Invoice" | "Quotation"
  layoutStyle: varchar("layout_style", { length: 50 }).default("modern"), // "modern" | "sleek" | "bold" | "compact" | "custom_letterhead"
  primaryColor: varchar("primary_color", { length: 20 }).default("#7c3aed"),
  secondaryColor: varchar("secondary_color", { length: 20 }).default("#1e293b"),
  fontFamily: varchar("font_family", { length: 50 }).default("Inter"),
  logoUrl: text("logo_url"),
  logoPosition: varchar("logo_position", { length: 20 }).default("left"),
  logoWidthPx: int("logo_width_px").default(160),
  letterheadHeaderUrl: text("letterhead_header_url"), // Custom Letterhead Banner Image URL
  showItemCode: boolean("show_item_code").default(true),
  showDiscountCol: boolean("show_discount_col").default(true),
  showVatBreakdown: boolean("show_vat_breakdown").default(true),
  showBankDetails: boolean("show_bank_details").default(true),
  showPaymentQrCode: boolean("show_payment_qr_code").default(true),
  bankName: varchar("bank_name", { length: 255 }),
  sortCode: varchar("sort_code", { length: 50 }),
  accountNumber: varchar("account_number", { length: 50 }),
  iban: varchar("iban", { length: 100 }),
  paymentTermsNote: text("payment_terms_note"),
  footerDeclaration: text("footer_declaration"),
  termsAndConditions: text("terms_and_conditions"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates);

// =============================================
// ENHANCED PRACTICE MANAGEMENT (CAPISUITE SPEC)
// =============================================

// 1. Master Services Catalog
export const pmServices = mysqlTable("pm_services", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  serviceCode: varchar("service_code", { length: 50 }).notNull(),
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  serviceCategory: varchar("service_category", { length: 100 }).default("Compliance"), // Compliance, Advisory, Payroll, Bookkeeping, Tax
  description: text("description"),
  isStatutory: boolean("is_statutory").default(false),
  defaultBillingFrequency: varchar("default_billing_frequency", { length: 50 }).default("Monthly"), // Monthly, Quarterly, Annually, One-Off
  defaultFee: decimal("default_fee", { precision: 15, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("GBP"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Workflow Steps per Service
export const pmServiceSteps = mysqlTable("pm_service_steps", {
  id: int("id").primaryKey().autoincrement(),
  serviceId: int("service_id").notNull().references(() => pmServices.id, { onDelete: "cascade" }),
  stepName: varchar("step_name", { length: 255 }).notNull(),
  stepOrder: int("step_order").notNull().default(1),
  description: text("description"),
  daysBeforeDeadline: int("days_before_deadline").default(0), // Trigger offset in days
  assignedRole: varchar("assigned_role", { length: 50 }).default("Staff"), // Manager, Staff, Bookkeeper
  isMandatory: boolean("is_mandatory").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Client Assigned Services
export const pmClientServices = mysqlTable("pm_client_services", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: int("service_id").notNull().references(() => pmServices.id),
  assignedManagerId: int("assigned_manager_id").references(() => users.id),
  assignedStaffId: int("assigned_staff_id").references(() => users.id),
  agreedFee: decimal("agreed_fee", { precision: 15, scale: 2 }).default("0.00"),
  billingFrequency: varchar("billing_frequency", { length: 50 }).default("Monthly"), // Monthly, Quarterly, Annually, One-Off
  billingType: varchar("billing_type", { length: 50 }).default("Fixed"), // Fixed, Retainer, Hourly, WIP
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { length: 30 }).default("Active"), // Active, Paused, Terminated
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Accounting & Compliance Periods
export const pmClientPeriods = mysqlTable("pm_client_periods", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodType: varchar("period_type", { length: 50 }).notNull(), // Accounts, CorporationTax, VAT, ConfirmationStatement, Payroll
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  statutoryDeadline: date("statutory_deadline").notNull(),
  internalTargetDeadline: date("internal_target_deadline"),
  status: varchar("status", { length: 30 }).default("Open"), // Open, InProgress, Submitted, Closed
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Extended Statutory & Custom Deadlines
export const pmDeadlines = mysqlTable("pm_deadlines", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: int("service_id").references(() => pmServices.id),
  periodId: int("period_id").references(() => pmClientPeriods.id),
  deadlineName: varchar("deadline_name", { length: 255 }).notNull(),
  serviceType: varchar("service_type", { length: 50 }).notNull(), // Accounts, CT600, VAT, CS01, SA100, PAYE, Bespoke
  statutoryDeadlineDate: date("statutory_deadline_date").notNull(),
  internalDeadlineDate: date("internal_deadline_date"),
  status: varchar("status", { length: 30 }).default("Upcoming"), // Upcoming, Due, Overdue, Submitted, Completed, Waived
  assignedUserId: int("assigned_user_id").references(() => users.id),
  submissionRef: varchar("submission_ref", { length: 150 }),
  submittedAt: timestamp("submitted_at"),
  submittedBy: int("submitted_by").references(() => users.id),
  isStatutory: boolean("is_statutory").default(true),
  reminderDays: varchar("reminder_days", { length: 100 }).default("30,14,7,1"),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Client Timeline & Rich Activity Stream
export const pmClientTimeline = mysqlTable("pm_client_timeline", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  userId: int("user_id").references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // Note, Email, Call, Meeting, Document, StatusChange, Submission
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  isPinned: boolean("is_pinned").default(false),
  metadataJson: text("metadata_json"), // JSON string for extra data
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Global Custom Fields Definition & Values
export const pmCustomFieldDefinitions = mysqlTable("pm_custom_field_definitions", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  fieldLabel: varchar("field_label", { length: 150 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull().default("text"), // text, number, date, select, boolean
  targetEntity: varchar("target_entity", { length: 50 }).notNull().default("client"), // client, service, task
  optionsJson: text("options_json"), // Options for select type
  isRequired: boolean("is_required").default(false),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pmCustomFieldValues = mysqlTable("pm_custom_field_values", {
  id: int("id").primaryKey().autoincrement(),
  definitionId: int("definition_id").notNull().references(() => pmCustomFieldDefinitions.id, { onDelete: "cascade" }),
  entityId: int("entity_id").notNull(), // Client ID etc.
  valueText: text("value_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8. Email & SMS Templates
export const pmEmailTemplates = mysqlTable("pm_email_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  templateCode: varchar("template_code", { length: 100 }),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull(), // DeadlineReminder, DocumentRequest, TaskReminder, BulkAnnouncement, Welcome
  subjectLine: varchar("subject_line", { length: 255 }).notNull(),
  bodyHtml: longtext("body_html").notNull(),
  bodyText: text("body_text"),
  availableMergeTags: text("available_merge_tags"), // JSON array string
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 9. Unified Inbox & Email Conversations
export const pmConversations = mysqlTable("pm_conversations", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  senderEmail: varchar("sender_email", { length: 255 }).notNull(),
  recipientEmails: text("recipient_emails").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyHtml: longtext("body_html"),
  bodyText: text("body_text"),
  direction: varchar("direction", { length: 20 }).notNull().default("Inbound"), // Inbound, Outbound
  threadId: varchar("thread_id", { length: 255 }),
  hasAttachments: boolean("has_attachments").default(false),
  attachmentsJson: text("attachments_json"),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 10. Document Requests & Chaser
export const pmDocumentRequests = mysqlTable("pm_document_requests", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: int("service_id").references(() => pmServices.id),
  requestTitle: varchar("request_title", { length: 255 }).notNull(),
  description: text("description"),
  requiredItemsJson: text("required_items_json").notNull(), // JSON list of items to upload
  publicToken: varchar("public_token", { length: 255 }).unique().notNull(),
  dueDate: date("due_date"),
  status: varchar("status", { length: 30 }).default("Pending"), // Pending, PartiallyUploaded, Completed, Expired
  requestedBy: int("requested_by").references(() => users.id),
  lastChasedAt: timestamp("last_chased_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11. Proposals & Letters of Engagement (LoE) Templates & Documents
export const pmLoeTemplates = mysqlTable("pm_loe_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull().default("LetterOfEngagement"), // Proposal, LetterOfEngagement, Form64_8
  headerHtml: text("header_html"),
  bodyHtml: longtext("body_html").notNull(),
  footerHtml: text("footer_html"),
  logoUrl: text("logo_url"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pmLoeDocuments = mysqlTable("pm_loe_documents", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").references(() => clients.id),
  prospectName: varchar("prospect_name", { length: 255 }),
  prospectEmail: varchar("prospect_email", { length: 255 }),
  templateId: int("template_id").references(() => pmLoeTemplates.id),
  documentTitle: varchar("document_title", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).default("Draft"), // Draft, Sent, Viewed, Signed, Rejected, Expired
  totalFeeQuoted: decimal("total_fee_quoted", { precision: 15, scale: 2 }).default("0.00"),
  servicesIncludedJson: text("services_included_json"),
  publicSignToken: varchar("public_sign_token", { length: 255 }).unique().notNull(),
  pdfUrl: text("pdf_url"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  signeeName: varchar("signee_name", { length: 150 }),
  signeeIp: varchar("signee_ip", { length: 50 }),
  signeeUserAgent: varchar("signee_user_agent", { length: 255 }),
  signatureDataUrl: longtext("signature_data_url"),
  auditCertificateJson: text("audit_certificate_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 12. AML & Risk Assessment Checks
export const pmAmlChecks = mysqlTable("pm_aml_checks", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  riskLevel: varchar("risk_level", { length: 20 }).default("Low"), // Low, Medium, High
  idVerificationStatus: varchar("id_verification_status", { length: 50 }).default("Verified"), // Verified, Pending, Failed
  addressVerificationStatus: varchar("address_verification_status", { length: 50 }).default("Verified"),
  pepSanctionsChecked: boolean("pep_sanctions_checked").default(true),
  idDocumentType: varchar("id_document_type", { length: 100 }).default("Passport"),
  idDocumentNumber: varchar("id_document_number", { length: 100 }),
  idExpiryDate: date("id_expiry_date"),
  riskNotes: text("risk_notes"),
  verifiedBy: int("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at").defaultNow(),
  nextReviewDate: date("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 13. Client Onboarding Checklist Criteria
export const pmOnboardingChecks = mysqlTable("pm_onboarding_checks", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  criteria: varchar("criteria", { length: 255 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 10 }).default("Yes"), // Yes, No
  todo: varchar("todo", { length: 30 }).default("Completed"), // Completed, Pending
  isCompleted: boolean("is_completed").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 14. AML Statutory Questionnaire Answers
export const pmAmlChecklistAnswers = mysqlTable("pm_aml_checklist_answers", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  isChecked: boolean("is_checked").default(true),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 15. KYC Compliance Documents Vault
export const pmKycDocuments = mysqlTable("pm_kyc_documents", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  documentType: varchar("document_type", { length: 100 }).default("ID Proof"), // ID Proof, Proof of Address, Company Cert, LOE
  fileUrl: text("file_url"),
  fileSize: varchar("file_size", { length: 50 }).default("1.2 MB"),
  uploadedBy: varchar("uploaded_by", { length: 100 }).default("Arif Ullah"),
  folder: varchar("folder", { length: 100 }).default("Client-Shared-Docs"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 15B. Multi-Tenant Practice AML & KYC Gateway Settings
export const practiceAmlSettings = mysqlTable("practice_aml_settings", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  defaultProvider: varchar("default_provider", { length: 50 }).default("dilisense"), // dilisense, xama, veriphy, opensanctions
  dilisenseApiKey: varchar("dilisense_api_key", { length: 500 }),
  dilisenseApiUrl: varchar("dilisense_api_url", { length: 255 }).default("https://api.dilisense.com/v1"),
  xamaApiKey: varchar("xama_api_key", { length: 500 }),
  xamaAccountId: varchar("xama_account_id", { length: 255 }),
  xamaApiUrl: varchar("xama_api_url", { length: 255 }).default("https://api.xamatech.com/v1"),
  veriphyApiKey: varchar("veriphy_api_key", { length: 500 }),
  veriphyAccountId: varchar("veriphy_account_id", { length: 255 }),
  veriphyApiUrl: varchar("veriphy_api_url", { length: 255 }).default("https://api.veriphy.co.uk/v1"),
  openSanctionsApiKey: varchar("open_sanctions_api_key", { length: 500 }),
  openSanctionsApiUrl: varchar("open_sanctions_api_url", { length: 255 }).default("https://api.opensanctions.org"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 15C. AML Staff Training & MLR Compliance Certifications
export const pmAmlStaffTraining = mysqlTable("pm_aml_staff_training", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").references(() => users.id),
  staffName: varchar("staff_name", { length: 150 }).notNull(),
  staffRole: varchar("staff_role", { length: 100 }).default("Assigned Accountant / MLRO"),
  courseTitle: varchar("course_title", { length: 255 }).default("UK Anti-Money Laundering & Terrorist Financing (MLR 2017 & CCAB Guidance)"),
  trainingProvider: varchar("training_provider", { length: 150 }).default("Veriphy Compliance"),
  certificateRef: varchar("certificate_ref", { length: 100 }),
  certificateUrl: text("certificate_url"),
  completedAt: date("completed_at"),
  expiresAt: date("expires_at"),
  status: varchar("status", { length: 50 }).default("Certified Compliant"),
  scorePercentage: int("score_percentage").default(100),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 16. HMRC 64-8 / Digital Agent Authorizations
export const pmAgentAuthorizations = mysqlTable("pm_agent_authorizations", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceType: varchar("service_type", { length: 100 }).notNull(), // Corporation Tax, PAYE, VAT, Self Assessment
  status: varchar("status", { length: 50 }).default("Pending"), // Pending, Authorized, Rejected, Expired
  codeStatus: varchar("code_status", { length: 100 }).default("Auth Code Sent"), // Auth Code Sent, Code Verified, Not Generated
  submissionDate: date("submission_date"),
  agentReference: varchar("agent_reference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 17. Calendar Integrations (Google & Office 365)
export const pmCalendarIntegrations = mysqlTable("pm_calendar_integrations", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  userId: int("user_id").references(() => users.id),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google' | 'office365'
  accountEmail: varchar("account_email", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  calendarName: varchar("calendar_name", { length: 255 }).default("Primary Calendar"),
  syncHmrcDeadlines: boolean("sync_hmrc_deadlines").default(true),
  syncMeetings: boolean("sync_meetings").default(true),
  syncStaffTasks: boolean("sync_staff_tasks").default(true),
  syncFrequency: varchar("sync_frequency", { length: 50 }).default("Real-time"),
  isConnected: boolean("is_connected").default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod Validation Schemas for PM
export const insertPmServiceSchema = createInsertSchema(pmServices);
export const insertPmServiceStepSchema = createInsertSchema(pmServiceSteps);
export const insertPmClientServiceSchema = createInsertSchema(pmClientServices);
export const insertPmClientPeriodSchema = createInsertSchema(pmClientPeriods);
export const insertPmDeadlineSchema = createInsertSchema(pmDeadlines);
export const insertPmClientTimelineSchema = createInsertSchema(pmClientTimeline);
export const insertPmCustomFieldDefSchema = createInsertSchema(pmCustomFieldDefinitions);
export const insertPmCustomFieldValueSchema = createInsertSchema(pmCustomFieldValues);
export const insertPmEmailTemplateSchema = createInsertSchema(pmEmailTemplates);
export const insertPmConversationSchema = createInsertSchema(pmConversations);
export const insertPmDocumentRequestSchema = createInsertSchema(pmDocumentRequests);
export const insertPmLoeTemplateSchema = createInsertSchema(pmLoeTemplates);
export const insertPmLoeDocumentSchema = createInsertSchema(pmLoeDocuments);
export const insertPmAmlCheckSchema = createInsertSchema(pmAmlChecks);
export const insertPmOnboardingCheckSchema = createInsertSchema(pmOnboardingChecks);
export const insertPmAmlChecklistAnswerSchema = createInsertSchema(pmAmlChecklistAnswers);
export const insertPmKycDocumentSchema = createInsertSchema(pmKycDocuments);
export const insertPracticeAmlSettingsSchema = createInsertSchema(practiceAmlSettings);
export const insertPmAgentAuthorizationSchema = createInsertSchema(pmAgentAuthorizations);
export const insertPmAmlStaffTrainingSchema = createInsertSchema(pmAmlStaffTraining);

export type PmAmlStaffTraining = typeof pmAmlStaffTraining.$inferSelect;

// ====================================================
// ADVANCED ACCOUNTS PRODUCTION MODULE (FRS 102/105/DCA)
// ====================================================

// 1. Accounting Policies per Client & Period
export const apAccountingPolicies = mysqlTable("ap_accounting_policies", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => accountingPeriods.id, { onDelete: "cascade" }),
  accountingStandard: varchar("accounting_standard", { length: 50 }).default("FRS102_1A"), // FRS102_1A, FRS105, Dormant
  basisOfPreparation: text("basis_of_preparation"),
  turnoverPolicy: text("turnover_policy"),
  tangibleAssetsPolicy: text("tangible_assets_policy"),
  depreciationRatesJson: text("depreciation_rates_json"), // JSON: { plantAndMachinery: "20% Reducing balance", fixturesAndFittings: "15% Straight line", motorVehicles: "25% Reducing balance" }
  leasingPolicy: text("leasing_policy"),
  taxationPolicy: text("taxation_policy"),
  pensionPolicy: text("pension_policy"),
  foreignCurrenciesPolicy: text("foreign_currencies_policy"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Structured Statutory Disclosure Notes
export const apStatutoryNotes = mysqlTable("ap_statutory_notes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => accountingPeriods.id, { onDelete: "cascade" }),
  averageEmployees: int("average_employees").default(1),
  directorsAdvancesJson: text("directors_advances_json"), // Director loan details under s413
  tangibleAssetsScheduleJson: text("tangible_assets_schedule_json"), // Cost, Additions, Depreciation schedule
  debtorsBreakdownJson: text("debtors_breakdown_json"), // Trade debtors, prepayments, etc.
  creditorsDueWithinOneYearJson: text("creditors_due_within_one_year_json"), // Bank loans, trade creditors, tax, DLA
  creditorsDueAfterOneYearJson: text("creditors_due_after_one_year_json"), // Long term bank loans, hire purchase
  shareCapitalDetailsJson: text("share_capital_details_json"), // Allotted, called up and fully paid shares
  contingentLiabilitiesText: text("contingent_liabilities_text"),
  postBalanceSheetEventsText: text("post_balance_sheet_events_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Officers & Signatories linked to Annual Accounts
export const apCompanyOfficers = mysqlTable("ap_company_officers", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").references(() => accountingPeriods.id),
  officerName: varchar("officer_name", { length: 255 }).notNull(),
  officerRole: varchar("officer_role", { length: 50 }).notNull().default("Director"), // Director, Secretary, Accountant
  isSignatoryOnAccounts: boolean("is_signatory_on_accounts").default(true),
  appointedDate: date("appointed_date"),
  resignedDate: date("resigned_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. iXBRL Submissions & Companies House Gateway Log
export const apIxbrlSubmissions = mysqlTable("ap_ixbrl_submissions", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  periodId: int("period_id").notNull().references(() => accountingPeriods.id),
  submissionType: varchar("submission_type", { length: 50 }).default("CompaniesHouse"), // CompaniesHouse, HMRC_CT600
  accountsType: varchar("accounts_type", { length: 50 }).default("FRS102_1A_Small"), // FRS105_Micro, FRS102_1A_Small, FRS102_1A_Abridged, Dormant_DCA
  ixbrlDocumentHtml: longtext("ixbrl_document_html"),
  envelopeXml: longtext("envelope_xml"),
  chTransactionId: varchar("ch_transaction_id", { length: 100 }),
  status: varchar("status", { length: 30 }).default("Generated"), // Generated, Submitted, Accepted, Rejected, Error
  statusCode: varchar("status_code", { length: 50 }),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at"),
  responseXml: longtext("response_xml"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Financial Statement Report Styling Options
export const apReportOptions = mysqlTable("ap_report_options", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").notNull().references(() => accountingPeriods.id, { onDelete: "cascade" }),
  reportTitle: varchar("report_title", { length: 255 }).default("Annual Report and Financial Statements"),
  coverStyle: varchar("cover_style", { length: 50 }).default("ModernPurple"), // ModernPurple, ClassicNavy, Minimalist
  includeCoverPage: boolean("include_cover_page").default(true),
  includeTableOfContents: boolean("include_table_of_contents").default(true),
  includeCompanyInformation: boolean("include_company_information").default(true),
  includeAccountantsReport: boolean("include_accountants_report").default(true),
  includeDirectorsReport: boolean("include_directors_report").default(true),
  includeDetailedProfitAndLoss: boolean("include_detailed_profit_and_loss").default(false), // For management use only
  watermarkText: varchar("watermark_text", { length: 50 }).default(""), // DRAFT, FINAL, CONFIDENTIAL
  pageNumbering: boolean("page_numbering").default(true),
  companyContacts: json("company_contacts"), // { bankers, solicitors, accountants }
  customHeadings: json("custom_headings"), // { profitAndLossTitle, balanceSheetTitle, notesTitle, columnHeaderStyle }
  revisedAccounts: json("revised_accounts"), // { isRevised, revisionType, originalFilingDate, reason, statutoryDeclaration }
  dataSecurity: json("data_security"), // { pdfPasswordEnabled, masterPassword }
  autoRoundingEnabled: boolean("auto_rounding_enabled").default(false),
  roundingAccountPl: varchar("rounding_account_pl", { length: 50 }).default("7999"),
  roundingAccountBs: varchar("rounding_account_bs", { length: 50 }).default("3200"),
  entityType: varchar("entity_type", { length: 50 }).default("LimitedByShares"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 6. Third-Party Trial Balance Automated Mappings & Memory
export const apTbMappings = mysqlTable("ap_tb_mappings", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  sourceSystem: varchar("source_system", { length: 50 }).notNull(), // Xero, QuickBooks, FreeAgent, Sage, CustomCSV
  sourceCode: varchar("source_code", { length: 100 }).notNull(),
  sourceName: varchar("source_name", { length: 255 }),
  targetNominalCode: varchar("target_nominal_code", { length: 50 }).notNull(),
  targetAccountName: varchar("target_account_name", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 7. Community Interest Companies (CIC) 34 Statutory Schedule
export const apCicNotes = mysqlTable("ap_cic_notes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").references(() => accountingPeriods.id, { onDelete: "cascade" }),
  activitiesAndImpact: text("activities_and_impact"),
  stakeholderConsultation: text("stakeholder_consultation"),
  directorsRemuneration: text("directors_remuneration"),
  transferOfAssets: text("transfer_of_assets"),
  interestPaid: text("interest_paid"),
  firstSignatoryId: int("first_signatory_id"),
  secondSignatoryId: int("second_signatory_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const apCicReports = mysqlTable("ap_cic_reports", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  periodId: int("period_id").references(() => accountingPeriods.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("Draft"),
  fileUrl: varchar("file_url", { length: 255 }),
  generatedAt: timestamp("generated_at").defaultNow(),
});

// Zod Validation Schemas for AP
export const insertApAccountingPolicySchema = createInsertSchema(apAccountingPolicies);
export const insertApStatutoryNoteSchema = createInsertSchema(apStatutoryNotes);
export const insertApCompanyOfficerSchema = createInsertSchema(apCompanyOfficers);
export const insertApIxbrlSubmissionSchema = createInsertSchema(apIxbrlSubmissions);
export const insertApReportOptionSchema = createInsertSchema(apReportOptions);
export const insertApTbMappingSchema = createInsertSchema(apTbMappings);
export const insertApCicNoteSchema = createInsertSchema(apCicNotes);
export const insertApCicReportSchema = createInsertSchema(apCicReports);

export type ApAccountingPolicy = typeof apAccountingPolicies.$inferSelect;
export type ApStatutoryNote = typeof apStatutoryNotes.$inferSelect;
export type ApCompanyOfficer = typeof apCompanyOfficers.$inferSelect;
export type ApIxbrlSubmission = typeof apIxbrlSubmissions.$inferSelect;
export type ApReportOption = typeof apReportOptions.$inferSelect;
export type ApTbMapping = typeof apTbMappings.$inferSelect;
export type InsertApTbMapping = typeof apTbMappings.$inferInsert;
export type ApCicNote = typeof apCicNotes.$inferSelect;
export type InsertApCicNote = typeof apCicNotes.$inferInsert;
export type ApCicReport = typeof apCicReports.$inferSelect;
export type InsertApCicReport = typeof apCicReports.$inferInsert;

// ====================================================
// MODULE 2: CORPORATION TAX (CT600) MODULE
// ====================================================

export const ct600CapitalAllowances = mysqlTable("ct600_capital_allowances", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull().references(() => ct600Returns.id, { onDelete: "cascade" }),
  annualInvestmentAllowanceClaimed: decimal("aia_claimed", { precision: 15, scale: 2 }).default("0.00"), // Max £1,000,000
  firstYearAllowanceClaimed: decimal("fya_claimed", { precision: 15, scale: 2 }).default("0.00"),
  mainPoolWdvBf: decimal("main_pool_wdv_bf", { precision: 15, scale: 2 }).default("0.00"),
  mainPoolAdditions: decimal("main_pool_additions", { precision: 15, scale: 2 }).default("0.00"),
  mainPoolDisposals: decimal("main_pool_disposals", { precision: 15, scale: 2 }).default("0.00"),
  mainPoolWdaRate: decimal("main_pool_wda_rate", { precision: 5, scale: 2 }).default("18.00"),
  mainPoolWdaClaimed: decimal("main_pool_wda_claimed", { precision: 15, scale: 2 }).default("0.00"),
  specialRatePoolAdditions: decimal("special_rate_additions", { precision: 15, scale: 2 }).default("0.00"),
  specialRateWdaClaimed: decimal("special_rate_wda_claimed", { precision: 15, scale: 2 }).default("0.00"),
  structuresAndBuildingsAllowance: decimal("sba_claimed", { precision: 15, scale: 2 }).default("0.00"),
  totalCapitalAllowancesClaimed: decimal("total_capital_allowances_claimed", { precision: 15, scale: 2 }).default("0.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ct600LossSchedules = mysqlTable("ct600_loss_schedules", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull().references(() => ct600Returns.id, { onDelete: "cascade" }),
  lossBroughtForward: decimal("loss_brought_forward", { precision: 15, scale: 2 }).default("0.00"),
  lossCurrentYear: decimal("loss_current_year", { precision: 15, scale: 2 }).default("0.00"),
  lossSetOffAgainstCurrentProfits: decimal("loss_set_off_current", { precision: 15, scale: 2 }).default("0.00"),
  lossCarriedBackPriorYear: decimal("loss_carried_back", { precision: 15, scale: 2 }).default("0.00"),
  lossCarriedForward: decimal("loss_carried_forward", { precision: 15, scale: 2 }).default("0.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ct600SupplementaryForms = mysqlTable("ct600_supplementary_forms", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull().references(() => ct600Returns.id, { onDelete: "cascade" }),
  formType: varchar("form_type", { length: 20 }).notNull(), // CT600A (Loans to Participators s455), CT600C (Group Relief), CT600E (Charities), CT600L (R&D Tax Credits)
  formDataJson: text("form_data_json"),
  isIncludedInSubmission: boolean("is_included_in_submission").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Validation Schemas for CT600
export const insertCt600CapitalAllowanceSchema = createInsertSchema(ct600CapitalAllowances);
export const insertCt600LossScheduleSchema = createInsertSchema(ct600LossSchedules);
export const insertCt600SupplementaryFormSchema = createInsertSchema(ct600SupplementaryForms);

export type Ct600Return = typeof ct600Returns.$inferSelect;
export type Ct600CapitalAllowance = typeof ct600CapitalAllowances.$inferSelect;
export type Ct600LossSchedule = typeof ct600LossSchedules.$inferSelect;
export type Ct600SupplementaryForm = typeof ct600SupplementaryForms.$inferSelect;

// =============================================
// PRACTICE SETTINGS & INVOICE TEMPLATES
// =============================================

export const practiceServices = mysqlTable("practice_services", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("Accounting"),
  frequency: varchar("frequency", { length: 50 }).default("Yearly"),
  billable: boolean("billable").default(true),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("35.00"),
  estimatedHours: decimal("estimated_hours", { precision: 6, scale: 2 }).default("4.00"),
  serviceManager: varchar("service_manager", { length: 100 }).default("Suleman Shah"),
  serviceType: varchar("service_type", { length: 50 }).default("Default"), // Default, Custom
  isActive: boolean("is_active").default(true),
  addToCalendar: boolean("add_to_calendar").default(true),
  clientTypesJson: text("client_types_json"), // JSON array
  stepsJson: text("steps_json"), // JSON array of step checklists
  remindTeam: boolean("remind_team").default(true),
  assignAll: boolean("assign_all").default(true),
  customWorkflow: boolean("custom_workflow").default(false),
  remindersJson: text("reminders_json"), // JSON array of reminder cards
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientServiceAssignments = mysqlTable("client_service_assignments", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: int("service_id").notNull().references(() => practiceServices.id, { onDelete: "cascade" }),
  customFee: decimal("custom_fee", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceCustomFields = mysqlTable("practice_custom_fields", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  label: varchar("label", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // Client Information, Business Information, PAYE Details, Client Key Contact
  type: varchar("type", { length: 50 }).default("Text"), // Text, Number, Date, Dropdown
  options: text("options"),
  required: boolean("required").default(false),
  sequence: int("sequence").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceEmailTemplates = mysqlTable("practice_email_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  triggerDays: int("trigger_days").default(14),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceDocumentTemplates = mysqlTable("practice_document_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // Letter of Engagement, Proposal, Authorisation Mandate
  version: varchar("version", { length: 50 }).default("2026.1"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceInvoiceTemplates = mysqlTable("practice_invoice_templates", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  templateName: varchar("template_name", { length: 255 }).notNull(), // e.g. Classic Corporate, Modern Minimalist
  templateType: varchar("template_type", { length: 50 }).default("PDF"), // PDF, Doc
  primaryColor: varchar("primary_color", { length: 30 }).default("#6c5ce7"),
  logoUrl: text("logo_url"),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  paymentTerms: text("payment_terms"),
  bankName: varchar("bank_name", { length: 255 }),
  accountName: varchar("account_name", { length: 255 }),
  sortCode: varchar("sort_code", { length: 20 }),
  accountNumber: varchar("account_number", { length: 50 }),
  iban: varchar("iban", { length: 50 }),
  bicSwift: varchar("bic_swift", { length: 50 }),
  paymentInstructions: text("payment_instructions"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceOnboardingCriteria = mysqlTable("practice_onboarding_criteria", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // Limited, SoleTrader, Partnership, Individual, Trust
  title: varchar("title", { length: 255 }).notNull(),
  isRequired: boolean("is_required").default(true),
  sequence: int("sequence").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const practiceRiskCriteria = mysqlTable("practice_risk_criteria", {
  id: int("id").primaryKey().autoincrement(),
  practiceId: int("practice_id").notNull().references(() => practices.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // Limited, SoleTrader, Partnership, Individual, Trust
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("Client Risk"),
  riskWeight: varchar("risk_weight", { length: 20 }).default("Medium"), // High, Medium, Low
  riskLevel: varchar("risk_level", { length: 30 }).default("Normal"), // Low, Normal, Enhanced
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================
// SECURITY: IP BANS & ABUSE TRACKING
// =============================================

export const ipBans = mysqlTable("ip_bans", {
  id: int("id").primaryKey().autoincrement(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull().default("Rate limit abuse"),
  banType: varchar("ban_type", { length: 20 }).notNull().default("temporary"), // temporary | permanent
  bannedUntil: timestamp("banned_until"),      // null means permanent
  violationCount: int("violation_count").notNull().default(1),
  bannedBy: varchar("banned_by", { length: 50 }).default("system"), // system | admin email
  unbannedAt: timestamp("unbanned_at"),
  unbannedBy: varchar("unbanned_by", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});





