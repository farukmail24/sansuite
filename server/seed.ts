import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "sansuite",
  port: parseInt(process.env.DB_PORT || "3306"),
});

const db = drizzle(pool, { schema, mode: "default" });

async function seed() {
  console.log("Starting comprehensive SanSuite seed for all 19 modules...");

  // 1. Practice
  const existingPractice = await db.select().from(schema.practices).where(eq(schema.practices.subdomain, "demo")).limit(1);
  let practiceId: number;
  if (existingPractice.length > 0) {
    practiceId = existingPractice[0].id;
    console.log(`[OK] Practice already exists (ID: ${practiceId})`);
  } else {
    const [result] = await db.insert(schema.practices).values({
      name: "Apex Chartered Accountants & Tax Advisors",
      subdomain: "demo",
      plan: "pro",
      isActive: true,
    });
    practiceId = result.insertId;
    console.log(`[OK] Practice created (ID: ${practiceId})`);
  }

  // 2. Admin User
  const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, "admin@SanSuite.com")).limit(1);
  let adminUserId: number;
  if (existingUser.length > 0) {
    adminUserId = existingUser[0].id;
    console.log(`[OK] Admin user exists (email: admin@SanSuite.com)`);
  } else {
    const passwordHash = await bcrypt.hash("Admin@1234", 10);
    const [u] = await db.insert(schema.users).values({
      practiceId,
      email: "admin@SanSuite.com",
      passwordHash,
      firstName: "James",
      lastName: "Sterling",
      role: "admin",
      isActive: true,
    });
    adminUserId = u.insertId;
    console.log(`[OK] Admin user created (email: admin@SanSuite.com, password: Admin@1234)`);
  }

  // 3. Firm Details
  const existingFirm = await db.select().from(schema.firmDetails).where(eq(schema.firmDetails.practiceId, practiceId)).limit(1);
  if (existingFirm.length === 0) {
    await db.insert(schema.firmDetails).values({
      practiceId,
      firmName: "Apex Chartered Accountants",
      firmType: "Limited",
      email: "info@apexaccountants.co.uk",
      phone: "020 7946 0192",
      address: "100 Bishopsgate, Suite 1400",
      city: "London",
      postCode: "EC2N 4AG",
      country: "United Kingdom",
      yearEnd: "31/03",
      vatScheme: "Accrual Based",
      vatSubmitType: "Quarterly",
    });
    console.log(`[OK] Firm details created`);
  }

  // 4. Clients across all legal entity types
  const clientsData = [
    { clientCode: "CL001", clientName: "Acme Technology Solutions Ltd", clientType: "Limited", companyNumber: "09876543", utrNumber: "1234567890", vatNumber: "GB987654321", email: "director@acmetech.co.uk", phone: "020 7946 0111", address: "14 Silicon Way, London, EC1V 2NX", amlStatus: "Verified", amlRiskScore: "Low Risk" },
    { clientCode: "CL002", clientName: "Dr. Elizabeth Vance", clientType: "SoleTrader", utrNumber: "9876543210", email: "elizabeth@vanceconsulting.com", phone: "07700 900222", address: "8 Harley Street, London, W1G 9PD", amlStatus: "Verified", amlRiskScore: "Low Risk" },
    { clientCode: "CL003", clientName: "Sterling & Partners LLP", clientType: "Partnership", companyNumber: "OC123456", utrNumber: "5544332211", vatNumber: "GB112233445", email: "finance@sterlingllp.co.uk", phone: "0161 234 5678", address: "50 King Street, Manchester, M2 4WQ", amlStatus: "Verified", amlRiskScore: "Low Risk" },
    { clientCode: "CL004", clientName: "Highland Wildlife Conservation Trust", clientType: "Charity", companyNumber: "04321876", email: "trustees@highlandwildlife.org.uk", phone: "01463 234567", address: "Castle Wynd, Inverness, IV2 3EA", amlStatus: "Verified", amlRiskScore: "Low Risk" },
  ];

  const clientMap: Record<string, number> = {};
  for (const client of clientsData) {
    const existing = await db.select().from(schema.clients).where(eq(schema.clients.clientCode, client.clientCode)).limit(1);
    if (existing.length === 0) {
      const [c] = await db.insert(schema.clients).values({ ...client, practiceId, isActive: true });
      clientMap[client.clientCode] = c.insertId;
      console.log(`[OK] Client created: ${client.clientName}`);
    } else {
      clientMap[client.clientCode] = existing[0].id;
    }
  }

  const acmeId = clientMap["CL001"];

  // 5. Chart of Accounts for Acme Tech
  if (acmeId) {
    const existingCoa = await db.select().from(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.clientId, acmeId));
    if (existingCoa.length === 0) {
      const standardCodes = [
        { nominalCode: "1000", name: "Computer & IT Equipment", category: "Fixed Asset" },
        { nominalCode: "1200", name: "Barclays Current Account", category: "Current Asset" },
        { nominalCode: "1300", name: "Trade Debtors (Accounts Receivable)", category: "Current Asset" },
        { nominalCode: "2100", name: "Trade Creditors (Accounts Payable)", category: "Current Liability" },
        { nominalCode: "2200", name: "VAT Liability Control Account", category: "Current Liability" },
        { nominalCode: "2300", name: "Corporation Tax Provision", category: "Current Liability" },
        { nominalCode: "3000", name: "Ordinary Share Capital (£1.00 shares)", category: "Equity" },
        { nominalCode: "3200", name: "Retained Earnings P&L Reserve", category: "Equity" },
        { nominalCode: "4000", name: "Software Development & Consulting Revenue", category: "Income" },
        { nominalCode: "5000", name: "Direct Cloud Hosting (AWS / GCP)", category: "Cost of Sales" },
        { nominalCode: "6000", name: "Staff Salaries & Wages", category: "Expense" },
        { nominalCode: "6200", name: "Office Rent & Utilities", category: "Expense" },
        { nominalCode: "7000", name: "Accountancy & Professional Fees", category: "Expense" },
      ];
      for (const coa of standardCodes) {
        await db.insert(schema.chartOfAccounts).values({ clientId: acmeId, ...coa, isSystem: true });
      }
      console.log(`[OK] Chart of Accounts initialized for Acme Tech`);
    }

    // 6. Accounting Period
    const existingPeriod = await db.select().from(schema.accountingPeriods).where(eq(schema.accountingPeriods.clientId, acmeId));
    if (existingPeriod.length === 0) {
      await db.insert(schema.accountingPeriods).values({
        clientId: acmeId,
        startDate: "2025-04-01" as any,
        endDate: "2026-03-31" as any,
        periodName: "FY 2025/2026",
        framework: "FRS102_1A",
        status: "Draft",
        periodOrder: 1,
      } as any);
      console.log(`[OK] Accounting Period FY 2025/2026 created`);
    }

    // 7. Bank Account
    const existingBank = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.clientId, acmeId));
    if (existingBank.length === 0) {
      await db.insert(schema.bankAccounts).values({
        clientId: acmeId,
        bankName: "Barclays UK Commercial",
        accountNumber: "88776655",
        sortCode: "20-04-15",
        currency: "GBP",
        openingBalance: "45000.00",
        currentBalance: "82500.00",
        status: "Active",
      } as any);
      console.log(`[OK] Barclays Bank Account created`);
    }

    // 8. PAYE Scheme & Employees
    const existingScheme = await db.select().from(schema.payeSchemes).where(eq(schema.payeSchemes.clientId, acmeId));
    let schemeId: number;
    if (existingScheme.length === 0) {
      const [s] = await db.insert(schema.payeSchemes).values({
        clientId: acmeId,
        employerName: "Acme Technology Solutions Ltd",
        payeReference: "120/AC98765",
        payFrequency: "Monthly",
        taxYear: "2025/2026",
      } as any);
      schemeId = s.insertId;
      console.log(`[OK] PAYE Scheme created`);

      // Employees
      await db.insert(schema.employees).values([
        { payeSchemeId: schemeId, firstName: "David", lastName: "Miller", email: "david@acmetech.co.uk", niNumber: "QQ123456A", taxCode: "1257L", status: "Active" } as any,
        { payeSchemeId: schemeId, firstName: "Sophie", lastName: "Clarke", email: "sophie@acmetech.co.uk", niNumber: "JW654321B", taxCode: "1257L", status: "Active" } as any,
      ]);
      console.log(`[OK] Employees created`);
    }

    // 9. Statutory Deadlines
    const existingDeadlines = await db.select().from(schema.pmDeadlines).where(eq(schema.pmDeadlines.clientId, acmeId));
    if (existingDeadlines.length === 0) {
      await db.insert(schema.pmDeadlines).values([
        { practiceId, clientId: acmeId, serviceType: "Accounts Production", deadlineName: "Accounts Filing", statutoryDeadlineDate: "2026-12-31" as any, status: "Upcoming", periodLabel: "FY 2025/2026" } as any,
        { practiceId, clientId: acmeId, serviceType: "Corporation Tax (CT600)", deadlineName: "CT600 Filing", statutoryDeadlineDate: "2027-03-31" as any, status: "Upcoming", periodLabel: "FY 2025/2026" } as any,
        { practiceId, clientId: acmeId, serviceType: "MTD VAT Return", deadlineName: "VAT Return", statutoryDeadlineDate: "2026-05-07" as any, status: "Upcoming", periodLabel: "Q1 2026" } as any,
        { practiceId, clientId: acmeId, serviceType: "Confirmation Statement (CS01)", deadlineName: "CS01 Confirmation Statement", statutoryDeadlineDate: "2026-09-14" as any, status: "Upcoming", periodLabel: "2026 Annual" } as any,
      ]);
      console.log(`[OK] Statutory deadlines generated`);
    }
  }

  console.log("\nComplete SanSuite 19-module dataset seeded successfully!");
  console.log("==================================================");
  console.log("  URL:      http://localhost:5000");
  console.log("  Email:    admin@SanSuite.com");
  console.log("  Password: Admin@1234");
  console.log("==================================================");

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
