import { Router } from "express";
import { db } from "../db";
import {
  charities, charityAccountingPeriods, charityContacts,
  charityFunds, charityFundTransfers, charityDonations,
  charityRecurringDonations, charityDonationsInKind,
  charityGiftAidSettings, charityGiftAidClaims,
  charityActivities, charitySponsorEvents, charitySorpMappings,
  charityTrialBalanceLines, charityTrusteesReports,
  charityIndependentExaminerReports, charityReportSettings,
  charityBankAccounts, charityInvoices, charityBills, charityAdditionalDisclosures,
  clients
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";

const router = Router();
router.use(authMiddleware);

// =============================================
// PRACTICE LEVEL ENDPOINTS
// =============================================

// List all charities for current practice
router.get("/list", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const charityList = await db.select()
      .from(charities)
      .where(eq(charities.practiceId, practiceId))
      .orderBy(desc(charities.id));

    // Fetch active period and latest status for each charity
    const enhanced = await Promise.all(charityList.map(async (c) => {
      const periods = await db.select()
        .from(charityAccountingPeriods)
        .where(eq(charityAccountingPeriods.charityId, c.id))
        .orderBy(desc(charityAccountingPeriods.id));
      
      const activePeriod = periods.find(p => p.isActive) || periods[0] || null;

      // Count funds
      const fundCount = await db.select({ count: sql<number>`count(*)` })
        .from(charityFunds)
        .where(and(eq(charityFunds.charityId, c.id), eq(charityFunds.isActive, true)));

      return {
        ...c,
        activePeriod,
        fundCount: fundCount[0]?.count || 0,
      };
    }));

    // Calculate Summary Stats
    const totalCharities = enhanced.length;
    const accrualsCount = enhanced.filter(c => c.accountingMethod === "Accrual").length;
    const cashBasisCount = enhanced.filter(c => c.accountingMethod === "Cash").length;
    const auditedCount = enhanced.filter(c => c.isAudited || c.reportingType === "Audited").length;

    res.json({
      charities: enhanced,
      stats: {
        totalCharities,
        accrualsCount,
        cashBasisCount,
        auditedCount,
      }
    });
  } catch (error) {
    console.error("Failed to fetch charities:", error);
    res.status(500).json({ message: "Failed to fetch charities" });
  }
});

// Backward compatibility with /my-charities
router.get("/my-charities", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const result = await db.select()
      .from(charities)
      .where(eq(charities.practiceId, practiceId));
    res.json(result);
  } catch (error) {
    console.error("Failed to fetch charities:", error);
    res.status(500).json({ message: "Failed to fetch charities" });
  }
});

// Create / Onboard a new Charity
router.post("/create", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const {
      name, regulator, charityRegNumber, companyRegNumber, commencementDate,
      principalPurpose, charityType, reportingType, isAudited, addressLine1,
      addressLine2, addressLine3, townCity, country, postcode,
      accountingMethod, currency, isVatRegistered, isRoundingEnabled,
      periodStartDate, periodEndDate, contactPerson, contactEmail, contactPhone
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Charity Name is required" });
    }

    // 1. Create client record in `clients` if not already present
    let clientId: number | null = null;
    try {
      const [newClient] = await db.insert(clients).values({
        practiceId,
        clientCode: `CH-${Date.now().toString().slice(-4)}`,
        clientName: name.trim(),
        clientType: "Charity",
        registrationNumber: companyRegNumber || charityRegNumber || null,
        email: contactEmail || null,
        phone: contactPhone || null,
        address: [addressLine1, townCity, postcode].filter(Boolean).join(", "),
      });
      clientId = newClient.insertId;
    } catch (e) {
      console.warn("Could not create linked client record:", e);
    }

    // 2. Insert Charity record
    const [charityResult] = await db.insert(charities).values({
      practiceId,
      clientId,
      name: name.trim(),
      regulator: regulator || "Charity Commission for England and Wales",
      charityRegNumber: charityRegNumber || null,
      companyRegNumber: companyRegNumber || null,
      commencementDate: commencementDate || null,
      principalPurpose: principalPurpose || null,
      charityType: charityType || "Charitable Incorporated Organisation (CIO)",
      reportingType: reportingType || "Independent Examination",
      isAudited: isAudited || false,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      addressLine3: addressLine3 || null,
      townCity: townCity || null,
      country: country || "United Kingdom",
      postcode: postcode || null,
      accountingMethod: accountingMethod || "Accrual",
      currency: currency || "GBP",
      isVatRegistered: isVatRegistered || false,
      isRoundingEnabled: isRoundingEnabled || false,
    });

    const charityId = charityResult.insertId;

    // 3. Create initial Accounting Period
    const currentYear = new Date().getFullYear();
    const startDate = periodStartDate || `${currentYear}-04-01`;
    const endDate = periodEndDate || `${currentYear + 1}-03-31`;

    await db.insert(charityAccountingPeriods).values({
      charityId,
      startDate,
      endDate,
      isActive: true,
      accountingStandard: accountingMethod === "Cash" ? "Receipts_and_Payments" : "SORP_FRS102",
    });

    // 4. Create primary Trustee Contact if provided
    if (contactPerson) {
      await db.insert(charityContacts).values({
        charityId,
        contactType: "Trustee",
        contactPerson,
        role: "Chair of Trustees",
        email: contactEmail || null,
        phone: contactPhone || null,
      });
    }

    // 5. Auto-provision Standard Initial Funds
    await db.insert(charityFunds).values([
      {
        charityId,
        fundName: "General Unrestricted Fund",
        fundCode: "UNR-GEN",
        fundType: "Unrestricted",
        description: "Free reserves available for general charitable objectives.",
        openingBalance: "0.00",
        currentBalance: "0.00",
      },
      {
        charityId,
        fundName: "Restricted Projects Fund",
        fundCode: "RES-PRJ",
        fundType: "Restricted",
        description: "Restricted funds earmarked for specific donor projects.",
        openingBalance: "0.00",
        currentBalance: "0.00",
      },
      {
        charityId,
        fundName: "Capital Equipment Designated Fund",
        fundCode: "DES-CAP",
        fundType: "Designated",
        description: "Trustee-designated reserves for equipment replacement.",
        openingBalance: "0.00",
        currentBalance: "0.00",
      }
    ]);

    // 6. Initialize Default Gift Aid Settings
    await db.insert(charityGiftAidSettings).values({
      charityId,
      authorisedFirstName: contactPerson?.split(" ")[0] || "",
      authorisedLastName: contactPerson?.split(" ").slice(1).join(" ") || "",
      charityCommissionRef: charityRegNumber || "",
      regulator: regulator || "Charity Commission for England and Wales",
      phone: contactPhone || "",
      postcode: postcode || "",
    });

    res.json({
      id: charityId,
      message: "Charity onboarded successfully",
    });
  } catch (error) {
    console.error("Failed to onboard charity:", error);
    res.status(500).json({ message: "Failed to onboard charity" });
  }
});

// SORP Mappings
router.get("/sorp-mappings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const mappings = await db.select()
      .from(charitySorpMappings)
      .where(eq(charitySorpMappings.practiceId, practiceId));

    if (mappings.length > 0) {
      return res.json(mappings);
    }

    // Return standard statutory template if none stored
    const standardSORPMappings = [
      { nominalCode: "4000", accountName: "Donations & Legacies", sorpCategory: "Donations and legacies", fundType: "Unrestricted" },
      { nominalCode: "4010", accountName: "Corporate Donations", sorpCategory: "Donations and legacies", fundType: "Unrestricted" },
      { nominalCode: "4020", accountName: "Restricted Grants Received", sorpCategory: "Charitable activities", fundType: "Restricted" },
      { nominalCode: "4030", accountName: "Gift Aid Tax Relief", sorpCategory: "Donations and legacies", fundType: "Unrestricted" },
      { nominalCode: "4040", accountName: "Donations in Kind", sorpCategory: "Donations and legacies", fundType: "Unrestricted" },
      { nominalCode: "4050", accountName: "Fundraising & Events Income", sorpCategory: "Other trading activities", fundType: "Unrestricted" },
      { nominalCode: "4100", accountName: "Charitable Service Fees", sorpCategory: "Charitable activities", fundType: "Unrestricted" },
      { nominalCode: "4200", accountName: "Bank Interest & Dividend Income", sorpCategory: "Investments", fundType: "Unrestricted" },
      { nominalCode: "7000", accountName: "Direct Project Delivery Costs", sorpCategory: "Charitable activities", fundType: "Restricted" },
      { nominalCode: "7100", accountName: "Staff Costs & Volunteer Support", sorpCategory: "Charitable activities", fundType: "Unrestricted" },
      { nominalCode: "7200", accountName: "Fundraising & Campaign Costs", sorpCategory: "Raising funds", fundType: "Unrestricted" },
      { nominalCode: "7500", accountName: "Independent Examiner & Governance", sorpCategory: "Charitable activities", fundType: "Unrestricted" },
    ];

    res.json(standardSORPMappings);
  } catch (error) {
    console.error("Failed to fetch SORP mappings:", error);
    res.status(500).json({ message: "Failed to fetch SORP mappings" });
  }
});

router.post("/sorp-mappings", async (req: any, res) => {
  try {
    const practiceId = req.user.practiceId;
    const { nominalCode, accountName, sorpCategory, fundType } = req.body;

    if (!nominalCode || !accountName || !sorpCategory) {
      return res.status(400).json({ message: "Nominal Code, Name, and SORP Category are required" });
    }

    await db.insert(charitySorpMappings).values({
      practiceId,
      nominalCode,
      accountName,
      sorpCategory,
      fundType: fundType || "Unrestricted",
    });

    res.json({ message: "SORP Mapping created successfully" });
  } catch (error) {
    console.error("Failed to save SORP mapping:", error);
    res.status(500).json({ message: "Failed to save SORP mapping" });
  }
});

// =============================================
// CLIENT SPECIFIC WORKSPACE ENDPOINTS
// =============================================

// Get single charity details
router.get("/:charityId/details", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    if (!charityId) return res.status(400).json({ message: "Invalid Charity ID" });

    const [charity] = await db.select()
      .from(charities)
      .where(eq(charities.id, charityId));

    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    const periods = await db.select()
      .from(charityAccountingPeriods)
      .where(eq(charityAccountingPeriods.charityId, charityId))
      .orderBy(desc(charityAccountingPeriods.startDate));

    const contacts = await db.select()
      .from(charityContacts)
      .where(eq(charityContacts.charityId, charityId));

    res.json({
      charity,
      periods,
      contacts,
    });
  } catch (error) {
    console.error("Failed to fetch charity details:", error);
    res.status(500).json({ message: "Failed to fetch charity details" });
  }
});

// Update single charity details
router.put("/:charityId/details", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      name, regulator, charityRegNumber, companyRegNumber, commencementDate,
      principalPurpose, charityType, reportingType, isAudited, addressLine1,
      addressLine2, addressLine3, townCity, country, postcode,
      accountingMethod, currency, isVatRegistered, isRoundingEnabled, isFundWiseBalanceSheet
    } = req.body;

    await db.update(charities)
      .set({
        name,
        regulator,
        charityRegNumber,
        companyRegNumber,
        commencementDate: commencementDate || null,
        principalPurpose,
        charityType,
        reportingType,
        isAudited: isAudited ?? false,
        addressLine1,
        addressLine2,
        addressLine3,
        townCity,
        country: country || "United Kingdom",
        postcode,
        accountingMethod: accountingMethod || "Accrual",
        currency: currency || "GBP",
        isVatRegistered: isVatRegistered ?? false,
        isRoundingEnabled: isRoundingEnabled ?? false,
        isFundWiseBalanceSheet: isFundWiseBalanceSheet ?? false,
        updatedAt: new Date(),
      })
      .where(eq(charities.id, charityId));

    res.json({ message: "Charity profile updated successfully" });
  } catch (error) {
    console.error("Failed to update charity:", error);
    res.status(500).json({ message: "Failed to update charity" });
  }
});

// ---------------------------------------------
// FUNDS & TRANSFERS
// ---------------------------------------------

router.get("/:charityId/funds", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const fundsList = await db.select()
      .from(charityFunds)
      .where(and(eq(charityFunds.charityId, charityId), eq(charityFunds.isActive, true)))
      .orderBy(charityFunds.id);

    // Compute live balances per fund from donations & transfers
    const computedFunds = await Promise.all(fundsList.map(async (fund) => {
      // Incoming donations for this fund
      const [donationsSum] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      })
      .from(charityDonations)
      .where(and(eq(charityDonations.charityId, charityId), eq(charityDonations.fundId, fund.id)));

      // Incoming transfers
      const [transfersIn] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      })
      .from(charityFundTransfers)
      .where(and(eq(charityFundTransfers.charityId, charityId), eq(charityFundTransfers.toFundId, fund.id)));

      // Outgoing transfers
      const [transfersOut] = await db.select({
        total: sql<string>`COALESCE(SUM(amount), 0)`
      })
      .from(charityFundTransfers)
      .where(and(eq(charityFundTransfers.charityId, charityId), eq(charityFundTransfers.fromFundId, fund.id)));

      const opening = parseFloat(fund.openingBalance || "0");
      const income = parseFloat(donationsSum?.total || "0");
      const inTransfer = parseFloat(transfersIn?.total || "0");
      const outTransfer = parseFloat(transfersOut?.total || "0");
      const netTransfers = inTransfer - outTransfer;
      const currentBalance = opening + income + netTransfers;

      return {
        ...fund,
        openingBalanceNum: opening,
        totalIncome: income,
        totalExpense: 0, // from expenditure if tagged
        netTransfers,
        currentBalance: currentBalance.toFixed(2),
      };
    }));

    // Aggregate summary
    const totalBForward = computedFunds.reduce((acc, f) => acc + f.openingBalanceNum, 0);
    const totalIncome = computedFunds.reduce((acc, f) => acc + f.totalIncome, 0);
    const totalExpense = computedFunds.reduce((acc, f) => acc + f.totalExpense, 0);
    const totalBalance = computedFunds.reduce((acc, f) => acc + parseFloat(f.currentBalance), 0);

    res.json({
      funds: computedFunds,
      summary: {
        totalBForward: totalBForward.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        totalBalance: totalBalance.toFixed(2),
      }
    });
  } catch (error) {
    console.error("Failed to fetch funds:", error);
    res.status(500).json({ message: "Failed to fetch funds" });
  }
});

router.post("/:charityId/funds", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { fundName, fundCode, fundType, description, openingBalance } = req.body;

    if (!fundName || !fundName.trim()) {
      return res.status(400).json({ message: "Fund Name is required" });
    }

    const [result] = await db.insert(charityFunds).values({
      charityId,
      fundName: fundName.trim(),
      fundCode: fundCode || null,
      fundType: fundType || "Unrestricted",
      description: description || null,
      openingBalance: openingBalance ? parseFloat(openingBalance).toFixed(2) : "0.00",
      currentBalance: openingBalance ? parseFloat(openingBalance).toFixed(2) : "0.00",
    });

    res.json({ id: result.insertId, message: "Fund created successfully" });
  } catch (error) {
    console.error("Failed to create fund:", error);
    res.status(500).json({ message: "Failed to create fund" });
  }
});

router.get("/:charityId/fund-transfers", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const transfers = await db.select({
      id: charityFundTransfers.id,
      charityId: charityFundTransfers.charityId,
      fromFundId: charityFundTransfers.fromFundId,
      toFundId: charityFundTransfers.toFundId,
      transferDate: charityFundTransfers.transferDate,
      amount: charityFundTransfers.amount,
      reason: charityFundTransfers.reason,
      reference: charityFundTransfers.reference,
      createdAt: charityFundTransfers.createdAt,
    })
    .from(charityFundTransfers)
    .where(eq(charityFundTransfers.charityId, charityId))
    .orderBy(desc(charityFundTransfers.transferDate));

    // Get fund names map
    const fundsList = await db.select().from(charityFunds).where(eq(charityFunds.charityId, charityId));
    const fundMap = new Map(fundsList.map(f => [f.id, f.fundName]));

    const enriched = transfers.map(t => ({
      ...t,
      fromFundName: fundMap.get(t.fromFundId) || "Unknown Fund",
      toFundName: fundMap.get(t.toFundId) || "Unknown Fund",
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Failed to fetch fund transfers:", error);
    res.status(500).json({ message: "Failed to fetch fund transfers" });
  }
});

router.post("/:charityId/fund-transfers", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { fromFundId, toFundId, transferDate, amount, reason, reference } = req.body;

    if (!fromFundId || !toFundId || !transferDate || !amount) {
      return res.status(400).json({ message: "From Fund, To Fund, Date, and Amount are required" });
    }

    if (fromFundId === toFundId) {
      return res.status(400).json({ message: "Source and Destination funds cannot be identical" });
    }

    const [result] = await db.insert(charityFundTransfers).values({
      charityId,
      fromFundId: parseInt(fromFundId),
      toFundId: parseInt(toFundId),
      transferDate,
      amount: parseFloat(amount).toFixed(2),
      reason: reason || null,
      reference: reference || null,
    });

    res.json({ id: result.insertId, message: "Fund transfer recorded successfully" });
  } catch (error) {
    console.error("Failed to record fund transfer:", error);
    res.status(500).json({ message: "Failed to record fund transfer" });
  }
});

// ---------------------------------------------
// DONATIONS & GIFT AID
// ---------------------------------------------

router.get("/:charityId/donations", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const donationsList = await db.select()
      .from(charityDonations)
      .where(eq(charityDonations.charityId, charityId))
      .orderBy(desc(charityDonations.donationDate));

    // Get funds map
    const fundsList = await db.select().from(charityFunds).where(eq(charityFunds.charityId, charityId));
    const fundMap = new Map(fundsList.map(f => [f.id, f.fundName]));

    const enriched = donationsList.map(d => ({
      ...d,
      fundName: d.fundId ? fundMap.get(d.fundId) || "General Fund" : "General Fund",
      giftAidAmount: d.isGiftAidEligible ? (parseFloat(d.amount) * 0.25).toFixed(2) : "0.00",
    }));

    const totalAmount = donationsList.reduce((acc, d) => acc + parseFloat(d.amount), 0);
    const eligibleCount = donationsList.filter(d => d.isGiftAidEligible).length;
    const eligibleAmount = donationsList.filter(d => d.isGiftAidEligible).reduce((acc, d) => acc + parseFloat(d.amount), 0);

    res.json({
      donations: enriched,
      summary: {
        totalDonations: totalAmount.toFixed(2),
        totalCount: donationsList.length,
        eligibleCount,
        potentialGiftAid: (eligibleAmount * 0.25).toFixed(2),
      }
    });
  } catch (error) {
    console.error("Failed to fetch donations:", error);
    res.status(500).json({ message: "Failed to fetch donations" });
  }
});

router.post("/:charityId/donations", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      donorName, fundId, donationDate, amount, depositAccountId,
      incomeNominalCode, paymentMethod, isGiftAidEligible,
      sponsoredEventId, activityId, notes
    } = req.body;

    if (!donorName || !donationDate || !amount) {
      return res.status(400).json({ message: "Donor Name, Date, and Amount are required" });
    }

    const [result] = await db.insert(charityDonations).values({
      charityId,
      donorName: donorName.trim(),
      fundId: fundId ? parseInt(fundId) : null,
      donationDate,
      amount: parseFloat(amount).toFixed(2),
      depositAccountId: depositAccountId || "Bank Current Account",
      incomeNominalCode: incomeNominalCode || "4000",
      paymentMethod: paymentMethod || "Bank Transfer",
      isGiftAidEligible: isGiftAidEligible ?? false,
      giftAidClaimed: false,
      sponsoredEventId: sponsoredEventId ? parseInt(sponsoredEventId) : null,
      activityId: activityId ? parseInt(activityId) : null,
      notes: notes || null,
    });

    res.json({ id: result.insertId, message: "Donation recorded successfully" });
  } catch (error) {
    console.error("Failed to record donation:", error);
    res.status(500).json({ message: "Failed to record donation" });
  }
});

// Recurring Donations
router.get("/:charityId/recurring-donations", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const list = await db.select()
      .from(charityRecurringDonations)
      .where(eq(charityRecurringDonations.charityId, charityId))
      .orderBy(desc(charityRecurringDonations.id));
    res.json(list);
  } catch (error) {
    console.error("Failed to fetch recurring donations:", error);
    res.status(500).json({ message: "Failed to fetch recurring donations" });
  }
});

router.post("/:charityId/recurring-donations", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { donorName, fundId, amount, frequency, startDate, nextDueDate, notes } = req.body;

    if (!donorName || !amount || !startDate) {
      return res.status(400).json({ message: "Donor Name, Amount, and Start Date are required" });
    }

    const [result] = await db.insert(charityRecurringDonations).values({
      charityId,
      donorName: donorName.trim(),
      fundId: fundId ? parseInt(fundId) : null,
      amount: parseFloat(amount).toFixed(2),
      frequency: frequency || "Monthly",
      startDate,
      nextDueDate: nextDueDate || startDate,
      status: "Active",
      notes: notes || null,
    });

    res.json({ id: result.insertId, message: "Recurring donation scheduled successfully" });
  } catch (error) {
    console.error("Failed to schedule recurring donation:", error);
    res.status(500).json({ message: "Failed to schedule recurring donation" });
  }
});

// Donations in Kind
router.get("/:charityId/donations-in-kind", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const list = await db.select()
      .from(charityDonationsInKind)
      .where(eq(charityDonationsInKind.charityId, charityId))
      .orderBy(desc(charityDonationsInKind.donationDate));
    res.json(list);
  } catch (error) {
    console.error("Failed to fetch donations in kind:", error);
    res.status(500).json({ message: "Failed to fetch donations in kind" });
  }
});

router.post("/:charityId/donations-in-kind", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { donorName, donationDate, donationType, fundId, debitNominalCode, creditNominalCode, estimatedValue, notes } = req.body;

    if (!donorName || !donationDate || !estimatedValue) {
      return res.status(400).json({ message: "Donor Name, Date, and Estimated Value are required" });
    }

    const [result] = await db.insert(charityDonationsInKind).values({
      charityId,
      donorName: donorName.trim(),
      donationDate,
      donationType: donationType || "Goods",
      fundId: fundId ? parseInt(fundId) : null,
      debitNominalCode: debitNominalCode || "7000",
      creditNominalCode: creditNominalCode || "4040",
      estimatedValue: parseFloat(estimatedValue).toFixed(2),
      notes: notes || null,
    });

    res.json({ id: result.insertId, message: "Donation in kind recorded successfully" });
  } catch (error) {
    console.error("Failed to record donation in kind:", error);
    res.status(500).json({ message: "Failed to record donation in kind" });
  }
});

// Gift Aid Claims Management
router.get("/:charityId/gift-aid-claims", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const claims = await db.select()
      .from(charityGiftAidClaims)
      .where(eq(charityGiftAidClaims.charityId, charityId))
      .orderBy(desc(charityGiftAidClaims.claimStartDate));

    const [settings] = await db.select()
      .from(charityGiftAidSettings)
      .where(eq(charityGiftAidSettings.charityId, charityId));

    // Calculate unclaimed eligible donations
    const unclaimedDonations = await db.select()
      .from(charityDonations)
      .where(and(
        eq(charityDonations.charityId, charityId),
        eq(charityDonations.isGiftAidEligible, true),
        eq(charityDonations.giftAidClaimed, false)
      ));

    const unclaimedTotal = unclaimedDonations.reduce((acc, d) => acc + parseFloat(d.amount), 0);
    const claimableTaxRelief = unclaimedTotal * 0.25;

    res.json({
      claims,
      settings: settings || null,
      unclaimed: {
        count: unclaimedDonations.length,
        totalAmount: unclaimedTotal.toFixed(2),
        claimableGiftAid: claimableTaxRelief.toFixed(2),
        donations: unclaimedDonations,
      }
    });
  } catch (error) {
    console.error("Failed to fetch gift aid claims:", error);
    res.status(500).json({ message: "Failed to fetch gift aid claims" });
  }
});

router.post("/:charityId/gift-aid-claims", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { claimStartDate, claimEndDate } = req.body;

    // Find all eligible unclaimed donations in the range
    const eligibleDonations = await db.select()
      .from(charityDonations)
      .where(and(
        eq(charityDonations.charityId, charityId),
        eq(charityDonations.isGiftAidEligible, true),
        eq(charityDonations.giftAidClaimed, false)
      ));

    if (eligibleDonations.length === 0) {
      return res.status(400).json({ message: "No eligible unclaimed donations found for this period" });
    }

    const totalDonations = eligibleDonations.reduce((acc, d) => acc + parseFloat(d.amount), 0);
    const giftAidAmount = totalDonations * 0.25;
    const claimReference = `GA-${charityId}-${Date.now().toString().slice(-6)}`;

    const [claim] = await db.insert(charityGiftAidClaims).values({
      charityId,
      claimReference,
      claimStartDate: claimStartDate || eligibleDonations[0].donationDate,
      claimEndDate: claimEndDate || eligibleDonations[eligibleDonations.length - 1].donationDate,
      totalDonations: totalDonations.toFixed(2),
      giftAidAmount: giftAidAmount.toFixed(2),
      status: "Submitted",
      submissionDate: new Date(),
      hmrcResponse: "Claim validated and prepared for HMRC Charities repayment portal submission.",
    });

    // Mark donations as claimed
    for (const d of eligibleDonations) {
      await db.update(charityDonations)
        .set({ giftAidClaimed: true })
        .where(eq(charityDonations.id, d.id));
    }

    res.json({
      id: claim.insertId,
      claimReference,
      totalDonations: totalDonations.toFixed(2),
      giftAidAmount: giftAidAmount.toFixed(2),
      message: "Gift Aid claim generated and submitted successfully",
    });
  } catch (error) {
    console.error("Failed to submit gift aid claim:", error);
    res.status(500).json({ message: "Failed to submit gift aid claim" });
  }
});

// Update Gift Aid Settings
router.post("/:charityId/gift-aid-settings", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      authorisedFirstName, authorisedLastName, charityIdNumber,
      charityCommissionRef, phone, postcode, regulator
    } = req.body;

    const existing = await db.select().from(charityGiftAidSettings).where(eq(charityGiftAidSettings.charityId, charityId));

    if (existing.length > 0) {
      await db.update(charityGiftAidSettings)
        .set({
          authorisedFirstName,
          authorisedLastName,
          charityIdNumber,
          charityCommissionRef,
          phone,
          postcode,
          regulator,
          updatedAt: new Date(),
        })
        .where(eq(charityGiftAidSettings.charityId, charityId));
    } else {
      await db.insert(charityGiftAidSettings).values({
        charityId,
        authorisedFirstName,
        authorisedLastName,
        charityIdNumber,
        charityCommissionRef,
        phone,
        postcode,
        regulator: regulator || "Charity Commission for England and Wales",
      });
    }

    res.json({ message: "Gift Aid authorised official settings saved" });
  } catch (error) {
    console.error("Failed to save gift aid settings:", error);
    res.status(500).json({ message: "Failed to save gift aid settings" });
  }
});

// ---------------------------------------------
// TASKS: ACTIVITIES & SPONSOR EVENTS
// ---------------------------------------------

router.get("/:charityId/activities", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const activities = await db.select()
      .from(charityActivities)
      .where(eq(charityActivities.charityId, charityId))
      .orderBy(desc(charityActivities.id));
    res.json(activities);
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

router.post("/:charityId/activities", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { activityName, activityCode, description, status } = req.body;

    if (!activityName) {
      return res.status(400).json({ message: "Activity Name is required" });
    }

    const [result] = await db.insert(charityActivities).values({
      charityId,
      activityName: activityName.trim(),
      activityCode: activityCode || null,
      description: description || null,
      status: status || "Active",
    });

    res.json({ id: result.insertId, message: "Activity created successfully" });
  } catch (error) {
    console.error("Failed to create activity:", error);
    res.status(500).json({ message: "Failed to create activity" });
  }
});

router.get("/:charityId/sponsor-events", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const events = await db.select()
      .from(charitySponsorEvents)
      .where(eq(charitySponsorEvents.charityId, charityId))
      .orderBy(desc(charitySponsorEvents.eventDate));
    res.json(events);
  } catch (error) {
    console.error("Failed to fetch sponsor events:", error);
    res.status(500).json({ message: "Failed to fetch sponsor events" });
  }
});

router.post("/:charityId/sponsor-events", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { eventName, eventDate, description, status } = req.body;

    if (!eventName) {
      return res.status(400).json({ message: "Event Name is required" });
    }

    const [result] = await db.insert(charitySponsorEvents).values({
      charityId,
      eventName: eventName.trim(),
      eventDate: eventDate || null,
      description: description || null,
      status: status || "Active",
    });

    res.json({ id: result.insertId, message: "Sponsor Event created successfully" });
  } catch (error) {
    console.error("Failed to create sponsor event:", error);
    res.status(500).json({ message: "Failed to create sponsor event" });
  }
});

// ---------------------------------------------
// ACCOUNTS PRODUCTION
// ---------------------------------------------

// Periods
router.get("/:charityId/periods", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periods = await db.select()
      .from(charityAccountingPeriods)
      .where(eq(charityAccountingPeriods.charityId, charityId))
      .orderBy(desc(charityAccountingPeriods.startDate));
    res.json(periods);
  } catch (error) {
    console.error("Failed to fetch periods:", error);
    res.status(500).json({ message: "Failed to fetch periods" });
  }
});

router.post("/:charityId/periods", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { startDate, endDate, accountingStandard } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start Date and End Date are required" });
    }

    const [result] = await db.insert(charityAccountingPeriods).values({
      charityId,
      startDate,
      endDate,
      isActive: true,
      accountingStandard: accountingStandard || "SORP_FRS102",
    });

    res.json({ id: result.insertId, message: "Accounting period added successfully" });
  } catch (error) {
    console.error("Failed to create period:", error);
    res.status(500).json({ message: "Failed to create period" });
  }
});

// Trial Balance
router.get("/:charityId/trial-balance", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    let query = db.select().from(charityTrialBalanceLines).where(eq(charityTrialBalanceLines.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityTrialBalanceLines).where(
        and(eq(charityTrialBalanceLines.charityId, charityId), eq(charityTrialBalanceLines.periodId, periodId))
      );
    }

    const lines = await query;

    // Calculate totals
    const totalUnrestrictedDebit = lines.reduce((acc, l) => acc + parseFloat(l.unrestrictedDebit || "0"), 0);
    const totalUnrestrictedCredit = lines.reduce((acc, l) => acc + parseFloat(l.unrestrictedCredit || "0"), 0);
    const totalRestrictedDebit = lines.reduce((acc, l) => acc + parseFloat(l.restrictedDebit || "0"), 0);
    const totalRestrictedCredit = lines.reduce((acc, l) => acc + parseFloat(l.restrictedCredit || "0"), 0);
    const totalEndowmentDebit = lines.reduce((acc, l) => acc + parseFloat(l.endowmentDebit || "0"), 0);
    const totalEndowmentCredit = lines.reduce((acc, l) => acc + parseFloat(l.endowmentCredit || "0"), 0);

    res.json({
      lines,
      totals: {
        unrestrictedDebit: totalUnrestrictedDebit.toFixed(2),
        unrestrictedCredit: totalUnrestrictedCredit.toFixed(2),
        restrictedDebit: totalRestrictedDebit.toFixed(2),
        restrictedCredit: totalRestrictedCredit.toFixed(2),
        endowmentDebit: totalEndowmentDebit.toFixed(2),
        endowmentCredit: totalEndowmentCredit.toFixed(2),
        totalDebit: (totalUnrestrictedDebit + totalRestrictedDebit + totalEndowmentDebit).toFixed(2),
        totalCredit: (totalUnrestrictedCredit + totalRestrictedCredit + totalEndowmentCredit).toFixed(2),
      }
    });
  } catch (error) {
    console.error("Failed to fetch trial balance:", error);
    res.status(500).json({ message: "Failed to fetch trial balance" });
  }
});

router.post("/:charityId/trial-balance", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { periodId, lines } = req.body;

    if (!periodId || !Array.isArray(lines)) {
      return res.status(400).json({ message: "Period ID and Lines array are required" });
    }

    // Delete existing lines for this period
    await db.delete(charityTrialBalanceLines)
      .where(and(eq(charityTrialBalanceLines.charityId, charityId), eq(charityTrialBalanceLines.periodId, parseInt(periodId))));

    // Insert new lines
    if (lines.length > 0) {
      for (const line of lines) {
        if (line.nominalCode && line.accountName) {
          await db.insert(charityTrialBalanceLines).values({
            charityId,
            periodId: parseInt(periodId),
            nominalCode: line.nominalCode,
            accountName: line.accountName,
            sorpCategory: line.sorpCategory || null,
            unrestrictedDebit: line.unrestrictedDebit ? parseFloat(line.unrestrictedDebit).toFixed(2) : "0.00",
            unrestrictedCredit: line.unrestrictedCredit ? parseFloat(line.unrestrictedCredit).toFixed(2) : "0.00",
            restrictedDebit: line.restrictedDebit ? parseFloat(line.restrictedDebit).toFixed(2) : "0.00",
            restrictedCredit: line.restrictedCredit ? parseFloat(line.restrictedCredit).toFixed(2) : "0.00",
            endowmentDebit: line.endowmentDebit ? parseFloat(line.endowmentDebit).toFixed(2) : "0.00",
            endowmentCredit: line.endowmentCredit ? parseFloat(line.endowmentCredit).toFixed(2) : "0.00",
          });
        }
      }
    }

    res.json({ message: "Trial balance saved successfully" });
  } catch (error) {
    console.error("Failed to save trial balance:", error);
    res.status(500).json({ message: "Failed to save trial balance" });
  }
});

// Statement of Financial Activities (SoFA) Report
router.get("/:charityId/sofa-report", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    let query = db.select().from(charityTrialBalanceLines).where(eq(charityTrialBalanceLines.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityTrialBalanceLines).where(
        and(eq(charityTrialBalanceLines.charityId, charityId), eq(charityTrialBalanceLines.periodId, periodId))
      );
    }

    const lines = await query;

    // Categorize into SORP Income and Expenditure sections
    const incomeCategories = [
      { name: "Donations and legacies", lines: [] as any[] },
      { name: "Charitable activities", lines: [] as any[] },
      { name: "Other trading activities", lines: [] as any[] },
      { name: "Investments", lines: [] as any[] },
      { name: "Other income", lines: [] as any[] },
    ];

    const expenseCategories = [
      { name: "Raising funds", lines: [] as any[] },
      { name: "Charitable activities", lines: [] as any[] },
      { name: "Other expenditure", lines: [] as any[] },
    ];

    lines.forEach(l => {
      const code = parseInt(l.nominalCode);
      const isIncome = code >= 4000 && code < 5000;
      const isExpense = code >= 5000 && code < 9000;

      const unr = (parseFloat(l.unrestrictedCredit || "0") - parseFloat(l.unrestrictedDebit || "0"));
      const resVal = (parseFloat(l.restrictedCredit || "0") - parseFloat(l.restrictedDebit || "0"));
      const end = (parseFloat(l.endowmentCredit || "0") - parseFloat(l.endowmentDebit || "0"));

      if (isIncome) {
        const cat = incomeCategories.find(c => c.name.toLowerCase() === (l.sorpCategory || "").toLowerCase()) || incomeCategories[0];
        cat.lines.push({
          nominalCode: l.nominalCode,
          accountName: l.accountName,
          unrestricted: unr,
          restricted: resVal,
          endowment: end,
          total: unr + resVal + end,
        });
      } else if (isExpense) {
        // For expense, debit is positive
        const expUnr = (parseFloat(l.unrestrictedDebit || "0") - parseFloat(l.unrestrictedCredit || "0"));
        const expRes = (parseFloat(l.restrictedDebit || "0") - parseFloat(l.restrictedCredit || "0"));
        const expEnd = (parseFloat(l.endowmentDebit || "0") - parseFloat(l.endowmentCredit || "0"));
        const cat = expenseCategories.find(c => c.name.toLowerCase() === (l.sorpCategory || "").toLowerCase()) || expenseCategories[1];
        cat.lines.push({
          nominalCode: l.nominalCode,
          accountName: l.accountName,
          unrestricted: expUnr,
          restricted: expRes,
          endowment: expEnd,
          total: expUnr + expRes + expEnd,
        });
      }
    });

    res.json({
      incomeCategories,
      expenseCategories,
    });
  } catch (error) {
    console.error("Failed to generate SoFA report:", error);
    res.status(500).json({ message: "Failed to generate SoFA report" });
  }
});

// Trustees Report (TAR)
router.get("/:charityId/trustees-report", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    let query = db.select().from(charityTrusteesReports).where(eq(charityTrusteesReports.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityTrusteesReports).where(
        and(eq(charityTrusteesReports.charityId, charityId), eq(charityTrusteesReports.periodId, periodId))
      );
    }

    const [report] = await query;
    res.json(report || null);
  } catch (error) {
    console.error("Failed to fetch trustees report:", error);
    res.status(500).json({ message: "Failed to fetch trustees report" });
  }
});

router.post("/:charityId/trustees-report", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      periodId, objectivesActivities, achievementsPerformance,
      financialReview, structureGovernance, referenceAdmin, exemptionsApplied, status
    } = req.body;

    if (!periodId) return res.status(400).json({ message: "Period ID is required" });

    const existing = await db.select().from(charityTrusteesReports).where(
      and(eq(charityTrusteesReports.charityId, charityId), eq(charityTrusteesReports.periodId, parseInt(periodId)))
    );

    if (existing.length > 0) {
      await db.update(charityTrusteesReports)
        .set({
          objectivesActivities,
          achievementsPerformance,
          financialReview,
          structureGovernance,
          referenceAdmin,
          exemptionsApplied,
          status: status || "Draft",
          updatedAt: new Date(),
        })
        .where(eq(charityTrusteesReports.id, existing[0].id));
    } else {
      await db.insert(charityTrusteesReports).values({
        charityId,
        periodId: parseInt(periodId),
        objectivesActivities,
        achievementsPerformance,
        financialReview,
        structureGovernance,
        referenceAdmin,
        exemptionsApplied,
        status: status || "Draft",
      });
    }

    res.json({ message: "Trustees' Annual Report saved successfully" });
  } catch (error) {
    console.error("Failed to save trustees report:", error);
    res.status(500).json({ message: "Failed to save trustees report" });
  }
});

// Independent Examiner's Report (IER)
router.get("/:charityId/ier-report", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    let query = db.select().from(charityIndependentExaminerReports).where(eq(charityIndependentExaminerReports.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityIndependentExaminerReports).where(
        and(eq(charityIndependentExaminerReports.charityId, charityId), eq(charityIndependentExaminerReports.periodId, periodId))
      );
    }

    const [report] = await query;
    res.json(report || null);
  } catch (error) {
    console.error("Failed to fetch IER report:", error);
    res.status(500).json({ message: "Failed to fetch IER report" });
  }
});

router.post("/:charityId/ier-report", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      periodId, examinerName, examinerQualification, accountingBody,
      examinerAddress, reportDate, basisOfReport, examinerStatement,
      concernsOrMatters, isGrossIncomeOver250k
    } = req.body;

    if (!periodId) return res.status(400).json({ message: "Period ID is required" });

    const existing = await db.select().from(charityIndependentExaminerReports).where(
      and(eq(charityIndependentExaminerReports.charityId, charityId), eq(charityIndependentExaminerReports.periodId, parseInt(periodId)))
    );

    if (existing.length > 0) {
      await db.update(charityIndependentExaminerReports)
        .set({
          examinerName,
          examinerQualification,
          accountingBody,
          examinerAddress,
          reportDate: reportDate || null,
          basisOfReport,
          examinerStatement,
          concernsOrMatters,
          isGrossIncomeOver250k: isGrossIncomeOver250k ?? false,
          updatedAt: new Date(),
        })
        .where(eq(charityIndependentExaminerReports.id, existing[0].id));
    } else {
      await db.insert(charityIndependentExaminerReports).values({
        charityId,
        periodId: parseInt(periodId),
        examinerName,
        examinerQualification,
        accountingBody,
        examinerAddress,
        reportDate: reportDate || null,
        basisOfReport,
        examinerStatement,
        concernsOrMatters,
        isGrossIncomeOver250k: isGrossIncomeOver250k ?? false,
      });
    }

    res.json({ message: "Independent Examiner's Report saved successfully" });
  } catch (error) {
    console.error("Failed to save IER report:", error);
    res.status(500).json({ message: "Failed to save IER report" });
  }
});

// Report Settings (Trustees, Patrons, Bankers, Solicitors)
router.get("/:charityId/report-settings", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    let query = db.select().from(charityReportSettings).where(eq(charityReportSettings.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityReportSettings).where(
        and(eq(charityReportSettings.charityId, charityId), eq(charityReportSettings.periodId, periodId))
      );
    }

    const [settings] = await query;
    res.json(settings || null);
  } catch (error) {
    console.error("Failed to fetch report settings:", error);
    res.status(500).json({ message: "Failed to fetch report settings" });
  }
});

router.post("/:charityId/report-settings", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const {
      periodId, trusteesJson, patronsJson, bankersJson, solicitorsJson,
      investmentAdvisorsJson, balanceSheetDisclosures, trusteesReportDisclosures,
      additionalNotesJson, accountingPoliciesJson
    } = req.body;

    if (!periodId) return res.status(400).json({ message: "Period ID is required" });

    const existing = await db.select().from(charityReportSettings).where(
      and(eq(charityReportSettings.charityId, charityId), eq(charityReportSettings.periodId, parseInt(periodId)))
    );

    if (existing.length > 0) {
      await db.update(charityReportSettings)
        .set({
          trusteesJson,
          patronsJson,
          bankersJson,
          solicitorsJson,
          investmentAdvisorsJson,
          balanceSheetDisclosures,
          trusteesReportDisclosures,
          additionalNotesJson,
          accountingPoliciesJson,
          updatedAt: new Date(),
        })
        .where(eq(charityReportSettings.id, existing[0].id));
    } else {
      await db.insert(charityReportSettings).values({
        charityId,
        periodId: parseInt(periodId),
        trusteesJson,
        patronsJson,
        bankersJson,
        solicitorsJson,
        investmentAdvisorsJson,
        balanceSheetDisclosures,
        trusteesReportDisclosures,
        additionalNotesJson,
        accountingPoliciesJson,
      });
    }

    res.json({ message: "Report settings saved successfully" });
  } catch (error) {
    console.error("Failed to save report settings:", error);
    res.status(500).json({ message: "Failed to save report settings" });
  }
});

// =============================================
// BALANCE SHEET (WITH FUND-WISE BREAKDOWN)
// =============================================

router.get("/:charityId/balance-sheet", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;

    const [charity] = await db.select().from(charities).where(eq(charities.id, charityId));
    if (!charity) return res.status(404).json({ message: "Charity not found" });

    let query = db.select().from(charityTrialBalanceLines).where(eq(charityTrialBalanceLines.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityTrialBalanceLines).where(
        and(eq(charityTrialBalanceLines.charityId, charityId), eq(charityTrialBalanceLines.periodId, periodId))
      );
    }
    const lines = await query;

    // Categorize balance sheet lines into FRS 102 SORP sections
    const fixedAssets: any[] = [];
    const currentAssets: any[] = [];
    const currentLiabilities: any[] = [];
    const longTermLiabilities: any[] = [];

    lines.forEach(l => {
      const code = parseInt(l.nominalCode);
      const unr = (parseFloat(l.unrestrictedDebit || "0") - parseFloat(l.unrestrictedCredit || "0"));
      const resVal = (parseFloat(l.restrictedDebit || "0") - parseFloat(l.restrictedCredit || "0"));
      const end = (parseFloat(l.endowmentDebit || "0") - parseFloat(l.endowmentCredit || "0"));
      const total = unr + resVal + end;

      if (code < 1000) {
        // Fixed assets (debit is positive)
        fixedAssets.push({ nominalCode: l.nominalCode, accountName: l.accountName, unrestricted: unr, restricted: resVal, endowment: end, total });
      } else if (code >= 1000 && code < 2000) {
        // Current assets (debit is positive)
        currentAssets.push({ nominalCode: l.nominalCode, accountName: l.accountName, unrestricted: unr, restricted: resVal, endowment: end, total });
      } else if (code >= 2000 && code < 3000) {
        // Current liabilities (credit is positive liability)
        const lUnr = parseFloat(l.unrestrictedCredit || "0") - parseFloat(l.unrestrictedDebit || "0");
        const lRes = parseFloat(l.restrictedCredit || "0") - parseFloat(l.restrictedDebit || "0");
        const lEnd = parseFloat(l.endowmentCredit || "0") - parseFloat(l.endowmentDebit || "0");
        currentLiabilities.push({ nominalCode: l.nominalCode, accountName: l.accountName, unrestricted: lUnr, restricted: lRes, endowment: lEnd, total: lUnr + lRes + lEnd });
      } else if (code >= 3000 && code < 3500) {
        // Long term creditors
        const ltUnr = parseFloat(l.unrestrictedCredit || "0") - parseFloat(l.unrestrictedDebit || "0");
        const ltRes = parseFloat(l.restrictedCredit || "0") - parseFloat(l.restrictedDebit || "0");
        const ltEnd = parseFloat(l.endowmentCredit || "0") - parseFloat(l.endowmentDebit || "0");
        longTermLiabilities.push({ nominalCode: l.nominalCode, accountName: l.accountName, unrestricted: ltUnr, restricted: ltRes, endowment: ltEnd, total: ltUnr + ltRes + ltEnd });
      }
    });

    const sumCategory = (arr: any[]) => ({
      unrestricted: arr.reduce((s, a) => s + a.unrestricted, 0),
      restricted: arr.reduce((s, a) => s + a.restricted, 0),
      endowment: arr.reduce((s, a) => s + a.endowment, 0),
      total: arr.reduce((s, a) => s + a.total, 0),
    });

    const totFixed = sumCategory(fixedAssets);
    const totCurrentAssets = sumCategory(currentAssets);
    const totCurrentLiab = sumCategory(currentLiabilities);
    const totLongTermLiab = sumCategory(longTermLiabilities);

    const netCurrentAssets = {
      unrestricted: totCurrentAssets.unrestricted - totCurrentLiab.unrestricted,
      restricted: totCurrentAssets.restricted - totCurrentLiab.restricted,
      endowment: totCurrentAssets.endowment - totCurrentLiab.endowment,
      total: totCurrentAssets.total - totCurrentLiab.total,
    };

    const totalAssetsLessCurrentLiab = {
      unrestricted: totFixed.unrestricted + netCurrentAssets.unrestricted,
      restricted: totFixed.restricted + netCurrentAssets.restricted,
      endowment: totFixed.endowment + netCurrentAssets.endowment,
      total: totFixed.total + netCurrentAssets.total,
    };

    const netAssets = {
      unrestricted: totalAssetsLessCurrentLiab.unrestricted - totLongTermLiab.unrestricted,
      restricted: totalAssetsLessCurrentLiab.restricted - totLongTermLiab.restricted,
      endowment: totalAssetsLessCurrentLiab.endowment - totLongTermLiab.endowment,
      total: totalAssetsLessCurrentLiab.total - totLongTermLiab.total,
    };

    res.json({
      isFundWise: charity.isFundWiseBalanceSheet || false,
      charityType: charity.charityType,
      fixedAssets,
      currentAssets,
      currentLiabilities,
      longTermLiabilities,
      totals: {
        fixedAssets: totFixed,
        currentAssets: totCurrentAssets,
        currentLiabilities: totCurrentLiab,
        netCurrentAssets,
        totalAssetsLessCurrentLiab,
        longTermLiabilities: totLongTermLiab,
        netAssets,
      }
    });
  } catch (error) {
    console.error("Failed to generate balance sheet:", error);
    res.status(500).json({ message: "Failed to generate balance sheet" });
  }
});

// =============================================
// ADDITIONAL DISCLOSURES (ADDITIONAL NOTES & POLICIES)
// =============================================

router.get("/:charityId/additional-disclosures", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : null;
    let query = db.select().from(charityAdditionalDisclosures).where(eq(charityAdditionalDisclosures.charityId, charityId));
    if (periodId) {
      query = db.select().from(charityAdditionalDisclosures).where(
        and(eq(charityAdditionalDisclosures.charityId, charityId), eq(charityAdditionalDisclosures.periodId, periodId))
      );
    }
    const items = await query.orderBy(charityAdditionalDisclosures.sequence, charityAdditionalDisclosures.id);
    res.json(items);
  } catch (error) {
    console.error("Failed to fetch additional disclosures:", error);
    res.status(500).json({ message: "Failed to fetch additional disclosures" });
  }
});

router.post("/:charityId/additional-disclosures", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { periodId, disclosureType, title, content, isActive, sequence } = req.body;
    if (!periodId || !disclosureType || !title || !content) {
      return res.status(400).json({ message: "periodId, disclosureType, title and content are required" });
    }
    const [inserted] = await db.insert(charityAdditionalDisclosures).values({
      charityId,
      periodId: parseInt(periodId),
      disclosureType,
      title,
      content,
      isActive: isActive ?? true,
      sequence: sequence || 1,
    });
    res.json({ id: inserted.insertId, message: "Additional disclosure saved" });
  } catch (error) {
    console.error("Failed to create additional disclosure:", error);
    res.status(500).json({ message: "Failed to create additional disclosure" });
  }
});

router.put("/:charityId/additional-disclosures/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    const { title, content, isActive, sequence } = req.body;
    await db.update(charityAdditionalDisclosures)
      .set({
        title,
        content,
        isActive: isActive ?? true,
        sequence: sequence || 1,
        updatedAt: new Date(),
      })
      .where(and(eq(charityAdditionalDisclosures.id, id), eq(charityAdditionalDisclosures.charityId, charityId)));
    res.json({ message: "Additional disclosure updated" });
  } catch (error) {
    console.error("Failed to update additional disclosure:", error);
    res.status(500).json({ message: "Failed to update additional disclosure" });
  }
});

router.delete("/:charityId/additional-disclosures/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    await db.delete(charityAdditionalDisclosures)
      .where(and(eq(charityAdditionalDisclosures.id, id), eq(charityAdditionalDisclosures.charityId, charityId)));
    res.json({ message: "Additional disclosure deleted" });
  } catch (error) {
    console.error("Failed to delete additional disclosure:", error);
    res.status(500).json({ message: "Failed to delete additional disclosure" });
  }
});

// =============================================
// BANK ACCOUNTS & TRANSFERS
// =============================================

router.get("/:charityId/banks", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const bankList = await db.select({
      id: charityBankAccounts.id,
      charityId: charityBankAccounts.charityId,
      accountName: charityBankAccounts.accountName,
      accountCode: charityBankAccounts.accountCode,
      accountType: charityBankAccounts.accountType,
      accountNumber: charityBankAccounts.accountNumber,
      sortCode: charityBankAccounts.sortCode,
      fundId: charityBankAccounts.fundId,
      currentBalance: charityBankAccounts.currentBalance,
      isActive: charityBankAccounts.isActive,
      fundName: charityFunds.fundName,
      fundType: charityFunds.fundType,
    })
    .from(charityBankAccounts)
    .leftJoin(charityFunds, eq(charityBankAccounts.fundId, charityFunds.id))
    .where(eq(charityBankAccounts.charityId, charityId))
    .orderBy(desc(charityBankAccounts.id));

    res.json(bankList);
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error);
    res.status(500).json({ message: "Failed to fetch bank accounts" });
  }
});

router.post("/:charityId/banks", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { accountName, accountCode, accountType, accountNumber, sortCode, fundId, currentBalance } = req.body;
    if (!accountName || !accountName.trim()) {
      return res.status(400).json({ message: "Account name is required" });
    }
    const [inserted] = await db.insert(charityBankAccounts).values({
      charityId,
      accountName,
      accountCode: accountCode || null,
      accountType: accountType || "Current Account",
      accountNumber: accountNumber || null,
      sortCode: sortCode || null,
      fundId: fundId ? parseInt(fundId) : null,
      currentBalance: currentBalance || "0.00",
    });
    res.json({ id: inserted.insertId, message: "Bank account created" });
  } catch (error) {
    console.error("Failed to create bank account:", error);
    res.status(500).json({ message: "Failed to create bank account" });
  }
});

router.delete("/:charityId/banks/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    await db.delete(charityBankAccounts)
      .where(and(eq(charityBankAccounts.id, id), eq(charityBankAccounts.charityId, charityId)));
    res.json({ message: "Bank account deleted" });
  } catch (error) {
    console.error("Failed to delete bank account:", error);
    res.status(500).json({ message: "Failed to delete bank account" });
  }
});

router.post("/:charityId/bank-transfers", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { fromBankId, toBankId, fromFundId, toFundId, amount, reference, transferDate } = req.body;
    if (!fromBankId || !toBankId || !amount) {
      return res.status(400).json({ message: "fromBankId, toBankId and amount are required" });
    }
    const transferAmount = parseFloat(amount);
    
    // Deduct from source bank
    const [sourceBank] = await db.select().from(charityBankAccounts).where(eq(charityBankAccounts.id, parseInt(fromBankId)));
    if (sourceBank) {
      const newSourceBal = Math.max(0, (parseFloat(sourceBank.currentBalance || "0") - transferAmount)).toFixed(2);
      await db.update(charityBankAccounts).set({ currentBalance: newSourceBal }).where(eq(charityBankAccounts.id, sourceBank.id));
    }
    
    // Add to dest bank
    const [destBank] = await db.select().from(charityBankAccounts).where(eq(charityBankAccounts.id, parseInt(toBankId)));
    if (destBank) {
      const newDestBal = (parseFloat(destBank.currentBalance || "0") + transferAmount).toFixed(2);
      await db.update(charityBankAccounts).set({ currentBalance: newDestBal }).where(eq(charityBankAccounts.id, destBank.id));
    }

    // If funds are involved, record fund transfer
    if (fromFundId && toFundId && fromFundId !== toFundId) {
      await db.insert(charityFundTransfers).values({
        charityId,
        fromFundId: parseInt(fromFundId),
        toFundId: parseInt(toFundId),
        amount: transferAmount.toFixed(2),
        transferDate: transferDate || new Date().toISOString().split("T")[0],
        reason: reference || "Bank & Fund Transfer",
      });
    }

    res.json({ message: "Bank transfer processed successfully" });
  } catch (error) {
    console.error("Failed to process bank transfer:", error);
    res.status(500).json({ message: "Failed to process bank transfer" });
  }
});

// =============================================
// INCOME (INVOICES) & EXPENDITURE (BILLS)
// =============================================

router.get("/:charityId/invoices", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const invoiceList = await db.select({
      id: charityInvoices.id,
      charityId: charityInvoices.charityId,
      invoiceNumber: charityInvoices.invoiceNumber,
      customerName: charityInvoices.customerName,
      invoiceDate: charityInvoices.invoiceDate,
      dueDate: charityInvoices.dueDate,
      amount: charityInvoices.amount,
      status: charityInvoices.status,
      notes: charityInvoices.notes,
      fundId: charityInvoices.fundId,
      activityId: charityInvoices.activityId,
      fundName: charityFunds.fundName,
      activityName: charityActivities.activityName,
    })
    .from(charityInvoices)
    .leftJoin(charityFunds, eq(charityInvoices.fundId, charityFunds.id))
    .leftJoin(charityActivities, eq(charityInvoices.activityId, charityActivities.id))
    .where(eq(charityInvoices.charityId, charityId))
    .orderBy(desc(charityInvoices.id));

    res.json(invoiceList);
  } catch (error) {
    console.error("Failed to fetch charity invoices:", error);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

router.post("/:charityId/invoices", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { invoiceNumber, customerName, invoiceDate, dueDate, fundId, activityId, amount, status, notes } = req.body;
    if (!customerName || !amount) {
      return res.status(400).json({ message: "customerName and amount are required" });
    }
    const [inserted] = await db.insert(charityInvoices).values({
      charityId,
      invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      customerName,
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || null,
      fundId: fundId ? parseInt(fundId) : null,
      activityId: activityId ? parseInt(activityId) : null,
      amount: parseFloat(amount).toFixed(2),
      status: status || "Paid",
      notes: notes || null,
    });
    res.json({ id: inserted.insertId, message: "Invoice recorded successfully" });
  } catch (error) {
    console.error("Failed to create charity invoice:", error);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

router.delete("/:charityId/invoices/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    await db.delete(charityInvoices)
      .where(and(eq(charityInvoices.id, id), eq(charityInvoices.charityId, charityId)));
    res.json({ message: "Invoice deleted" });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

router.get("/:charityId/bills", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const billList = await db.select({
      id: charityBills.id,
      charityId: charityBills.charityId,
      billNumber: charityBills.billNumber,
      supplierName: charityBills.supplierName,
      billDate: charityBills.billDate,
      dueDate: charityBills.dueDate,
      amount: charityBills.amount,
      status: charityBills.status,
      notes: charityBills.notes,
      fundId: charityBills.fundId,
      activityId: charityBills.activityId,
      fundName: charityFunds.fundName,
      activityName: charityActivities.activityName,
    })
    .from(charityBills)
    .leftJoin(charityFunds, eq(charityBills.fundId, charityFunds.id))
    .leftJoin(charityActivities, eq(charityBills.activityId, charityActivities.id))
    .where(eq(charityBills.charityId, charityId))
    .orderBy(desc(charityBills.id));

    res.json(billList);
  } catch (error) {
    console.error("Failed to fetch charity bills:", error);
    res.status(500).json({ message: "Failed to fetch bills" });
  }
});

router.post("/:charityId/bills", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { billNumber, supplierName, billDate, dueDate, fundId, activityId, amount, status, notes } = req.body;
    if (!supplierName || !amount) {
      return res.status(400).json({ message: "supplierName and amount are required" });
    }
    const [inserted] = await db.insert(charityBills).values({
      charityId,
      billNumber: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
      supplierName,
      billDate: billDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || null,
      fundId: fundId ? parseInt(fundId) : null,
      activityId: activityId ? parseInt(activityId) : null,
      amount: parseFloat(amount).toFixed(2),
      status: status || "Paid",
      notes: notes || null,
    });
    res.json({ id: inserted.insertId, message: "Bill recorded successfully" });
  } catch (error) {
    console.error("Failed to create charity bill:", error);
    res.status(500).json({ message: "Failed to create bill" });
  }
});

router.delete("/:charityId/bills/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    await db.delete(charityBills)
      .where(and(eq(charityBills.id, id), eq(charityBills.charityId, charityId)));
    res.json({ message: "Bill deleted" });
  } catch (error) {
    console.error("Failed to delete bill:", error);
    res.status(500).json({ message: "Failed to delete bill" });
  }
});

// =============================================
// CONTACTS (TRUSTEES, DONORS, SUPPLIERS, CUSTOMERS)
// =============================================

router.get("/:charityId/contacts", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const contactList = await db.select()
      .from(charityContacts)
      .where(eq(charityContacts.charityId, charityId))
      .orderBy(desc(charityContacts.id));
    res.json(contactList);
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

router.post("/:charityId/contacts", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const { contactType, contactPerson, role, phone, mobile, email, website, address } = req.body;
    if (!contactPerson || !contactPerson.trim()) {
      return res.status(400).json({ message: "Contact person name is required" });
    }
    const [inserted] = await db.insert(charityContacts).values({
      charityId,
      contactType: contactType || "Trustee",
      contactPerson,
      role: role || null,
      phone: phone || null,
      mobile: mobile || null,
      email: email || null,
      website: website || null,
      address: address || null,
    });
    res.json({ id: inserted.insertId, message: "Contact added successfully" });
  } catch (error) {
    console.error("Failed to create contact:", error);
    res.status(500).json({ message: "Failed to create contact" });
  }
});

router.delete("/:charityId/contacts/:id", async (req: any, res) => {
  try {
    const charityId = parseInt(req.params.charityId);
    const id = parseInt(req.params.id);
    await db.delete(charityContacts)
      .where(and(eq(charityContacts.id, id), eq(charityContacts.charityId, charityId)));
    res.json({ message: "Contact deleted" });
  } catch (error) {
    console.error("Failed to delete contact:", error);
    res.status(500).json({ message: "Failed to delete contact" });
  }
});

export default router;
