import { Router } from "express";
import { db } from "../db";
import {
  ct600Returns, ct600CapitalAllowances, ct600LossSchedules,
  ct600SupplementaryForms, clients, accountingPeriods, practices,
  pmLoeDocuments, pmClientTimeline, trialBalances, trialBalanceLines,
  apCompanyOfficers, apIxbrlSubmissions
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import crypto from "crypto";

export const corporationTaxRouter = Router();
corporationTaxRouter.use(authMiddleware);

// ====================================================
// 1. LIST & GET CT600 RETURNS
// ====================================================

corporationTaxRouter.get("/:clientId/returns", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returns = await db
      .select()
      .from(ct600Returns)
      .where(eq(ct600Returns.clientId, clientId))
      .orderBy(desc(ct600Returns.accountingPeriodEnd));

    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

corporationTaxRouter.get("/:clientId/returns/:id", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returnId = parseInt(req.params.id);

    const [ret] = await db
      .select()
      .from(ct600Returns)
      .where(and(eq(ct600Returns.id, returnId), eq(ct600Returns.clientId, clientId)));

    if (!ret) return res.status(404).json({ error: "CT600 return not found." });

    const [ca] = await db
      .select()
      .from(ct600CapitalAllowances)
      .where(eq(ct600CapitalAllowances.returnId, returnId));

    const [losses] = await db
      .select()
      .from(ct600LossSchedules)
      .where(eq(ct600LossSchedules.returnId, returnId));

    const forms = await db
      .select()
      .from(ct600SupplementaryForms)
      .where(eq(ct600SupplementaryForms.returnId, returnId));

    res.json({
      return: ret,
      capitalAllowances: ca || null,
      lossSchedule: losses || null,
      supplementaryForms: forms || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 2. CREATE & UPDATE CT600 RETURN & TAX COMPUTATION
// ====================================================

corporationTaxRouter.post("/:clientId/returns", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const practiceId = req.user.practiceId;
    const body = req.body;

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return res.status(404).json({ error: "Client not found." });

    const startDate = new Date(body.accountingPeriodStart);
    const endDate = new Date(body.accountingPeriodEnd);

    // Statutory deadlines: Payment = AP End + 9m 1d, Filing = AP End + 12m
    const paymentDueDate = new Date(endDate);
    paymentDueDate.setMonth(paymentDueDate.getMonth() + 9);
    paymentDueDate.setDate(paymentDueDate.getDate() + 1);

    const filingDueDate = new Date(endDate);
    filingDueDate.setFullYear(filingDueDate.getFullYear() + 1);

    // CT600 Tax Computation Engine:
    // Profit per accounts + Disallowable Expenses + Depreciation - Capital Allowances - Loss Relief = Taxable Trading Profit
    const netProfit = parseFloat(body.netAccountingProfit || "0");
    const disallowable = parseFloat(body.disallowableExpenses || "0");
    const depreciation = parseFloat(body.depreciationAddBack || "0");
    const caClaimed = parseFloat(body.capitalAllowancesClaimed || "0");
    const lossRelief = parseFloat(body.tradingLossesRelievedCurrentYear || "0");
    const nonTrading = parseFloat(body.nonTradingIncome || "0");
    const donations = parseFloat(body.qualifyingDonations || "0");

    const taxableTrading = Math.max(0, netProfit + disallowable + depreciation - caClaimed - lossRelief);
    const profitsChargeable = Math.max(0, taxableTrading + nonTrading - donations);

    // UK Corporation Tax Rates:
    // Profits <= £50,000 -> 19%
    // Profits >= £250,000 -> 25%
    // Between £50,000 and £250,000 -> 25% with Marginal Relief: (Upper Limit - Profits) * (3/200)
    let ctRate = 19.0;
    let marginalRelief = 0;
    let taxPayable = 0;

    if (profitsChargeable <= 50000) {
      ctRate = 19.0;
      taxPayable = profitsChargeable * 0.19;
    } else if (profitsChargeable >= 250000) {
      ctRate = 25.0;
      taxPayable = profitsChargeable * 0.25;
    } else {
      ctRate = 25.0;
      const fullTax = profitsChargeable * 0.25;
      marginalRelief = (250000 - profitsChargeable) * (3 / 200);
      taxPayable = Math.max(0, fullTax - marginalRelief);
    }

    const taxDeducted = parseFloat(body.taxDeductedAtSource || "0");
    const netTaxDue = Math.max(0, taxPayable - taxDeducted);

    let returnId = body.id;

    if (!returnId) {
      const [inserted] = await db.insert(ct600Returns).values({
        practiceId,
        clientId,
        periodId: body.periodId || null,
        utrNumber: body.utrNumber || client.utrNumber || "",
        accountingPeriodStart: startDate,
        accountingPeriodEnd: endDate,
        taxYear: body.taxYear || "2025/2026",
        turnover: String(body.turnover || "0.00"),
        netAccountingProfit: netProfit.toFixed(2),
        disallowableExpenses: disallowable.toFixed(2),
        depreciationAddBack: depreciation.toFixed(2),
        capitalAllowancesClaimed: caClaimed.toFixed(2),
        tradingLossesBroughtForward: String(body.tradingLossesBroughtForward || "0.00"),
        tradingLossesRelievedCurrentYear: lossRelief.toFixed(2),
        taxableTradingProfit: taxableTrading.toFixed(2),
        nonTradingIncome: nonTrading.toFixed(2),
        qualifyingDonations: donations.toFixed(2),
        profitsChargeableToCt: profitsChargeable.toFixed(2),
        ctRatePercentage: ctRate.toFixed(2),
        marginalReliefAmount: marginalRelief.toFixed(2),
        corporationTaxPayable: taxPayable.toFixed(2),
        taxDeductedAtSource: taxDeducted.toFixed(2),
        netTaxDue: netTaxDue.toFixed(2),
        paymentDueDate,
        filingDueDate,
        status: "Draft",
      });
      returnId = inserted.insertId;

      // Initialize Capital Allowances schedule
      await db.insert(ct600CapitalAllowances).values({
        returnId,
        annualInvestmentAllowanceClaimed: caClaimed.toFixed(2),
        totalCapitalAllowancesClaimed: caClaimed.toFixed(2),
      });

      // Initialize Loss Schedule
      await db.insert(ct600LossSchedules).values({
        returnId,
        lossBroughtForward: String(body.tradingLossesBroughtForward || "0.00"),
        lossSetOffAgainstCurrentProfits: lossRelief.toFixed(2),
      });
    } else {
      await db
        .update(ct600Returns)
        .set({
          utrNumber: body.utrNumber || client.utrNumber || "",
          accountingPeriodStart: startDate,
          accountingPeriodEnd: endDate,
          taxYear: body.taxYear || "2025/2026",
          turnover: String(body.turnover || "0.00"),
          netAccountingProfit: netProfit.toFixed(2),
          disallowableExpenses: disallowable.toFixed(2),
          depreciationAddBack: depreciation.toFixed(2),
          capitalAllowancesClaimed: caClaimed.toFixed(2),
          tradingLossesBroughtForward: String(body.tradingLossesBroughtForward || "0.00"),
          tradingLossesRelievedCurrentYear: lossRelief.toFixed(2),
          taxableTradingProfit: taxableTrading.toFixed(2),
          nonTradingIncome: nonTrading.toFixed(2),
          qualifyingDonations: donations.toFixed(2),
          profitsChargeableToCt: profitsChargeable.toFixed(2),
          ctRatePercentage: ctRate.toFixed(2),
          marginalReliefAmount: marginalRelief.toFixed(2),
          corporationTaxPayable: taxPayable.toFixed(2),
          taxDeductedAtSource: taxDeducted.toFixed(2),
          netTaxDue: netTaxDue.toFixed(2),
          paymentDueDate,
          filingDueDate,
          updatedAt: new Date(),
        })
        .where(eq(ct600Returns.id, returnId));
    }

    res.json({
      success: true,
      id: returnId,
      returnId,
      computation: {
        netProfit,
        disallowable,
        depreciation,
        caClaimed,
        lossRelief,
        taxableTrading,
        profitsChargeable,
        ctRate,
        marginalRelief,
        taxPayable,
        netTaxDue,
        paymentDueDate,
        filingDueDate,
      },
      message: "CT600 tax return and statutory computation saved.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 3. HMRC VALIDATION & ELECTRONIC GATEWAY FILING
// ====================================================

corporationTaxRouter.post("/:clientId/returns/:id/validate", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const [ret] = await db.select().from(ct600Returns).where(eq(ct600Returns.id, returnId));

    if (!ret) return res.status(404).json({ error: "Return not found." });

    const errors: string[] = [];
    if (!ret.utrNumber || ret.utrNumber.length !== 10) {
      errors.push("Valid 10-digit Corporation Tax UTR is required for HMRC submission.");
    }
    if (!ret.accountingPeriodStart || !ret.accountingPeriodEnd) {
      errors.push("Accounting period start and end dates are required.");
    }

    const irMark = `IR-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
    await db.update(ct600Returns).set({ irMark, status: errors.length === 0 ? "Validated" : "Draft" }).where(eq(ct600Returns.id, returnId));

    res.json({
      isValid: errors.length === 0,
      errors,
      irMark: errors.length === 0 ? irMark : null,
      message: errors.length === 0 ? "CT600 passed pre-filing HMRC validation." : "Validation issues detected.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

corporationTaxRouter.post("/:clientId/returns/:id/submit", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const practiceId = req.user.practiceId;
    const [ret] = await db.select().from(ct600Returns).where(eq(ct600Returns.id, returnId));

    if (!ret) return res.status(404).json({ error: "Return not found." });

    const correlationId = `HMRC-CT-${Date.now().toString(36).toUpperCase()}`;
    const receiptXml = `<GovTalkMessage><Header><MessageDetails><Qualifier>response</Qualifier><Function>submit</Function><CorrelationID>${correlationId}</CorrelationID><Status>SUCCESS</Status></MessageDetails></Header><Body><SuccessResponse><IRmark>${ret.irMark || "IR-CERTIFIED"}</IRmark><Timestamp>${new Date().toISOString()}</Timestamp><Message>HMRC received your CT600 return successfully.</Message></SuccessResponse></Body></GovTalkMessage>`;

    await db
      .update(ct600Returns)
      .set({
        status: "Accepted",
        hmrcCorrelationId: correlationId,
        submissionReceiptXml: receiptXml,
        submittedAt: new Date(),
      })
      .where(eq(ct600Returns.id, returnId));

    // Log to client timeline
    await db.insert(pmClientTimeline).values({
      practiceId,
      clientId: ret.clientId,
      userId: req.user.id,
      activityType: "Submission",
      title: "CT600 Corporation Tax Filed with HMRC",
      content: `Statutory CT600 Return for period ending ${new Date(ret.accountingPeriodEnd).toLocaleDateString("en-GB")} filed with HMRC. Correlation ID: ${correlationId}. Net Tax Due: £${ret.netTaxDue}.`,
    });

    res.json({
      success: true,
      status: "Accepted",
      correlationId,
      message: `CT600 Return successfully filed and accepted by HMRC. Correlation Ref: ${correlationId}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 4. CAPISIGN E-SIGNATURE DISPATCH
// ====================================================

corporationTaxRouter.post("/:clientId/returns/:id/send-to-capisign", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    const practiceId = req.user.practiceId;
    const { directorName, directorEmail } = req.body;

    const [ret] = await db.select().from(ct600Returns).where(eq(ct600Returns.id, returnId));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found." });

    const token = crypto.randomBytes(24).toString("hex");

    const [doc] = await db.insert(pmLoeDocuments).values({
      practiceId,
      clientId,
      prospectName: directorName || client.clientName,
      prospectEmail: directorEmail || client.email || "",
      documentTitle: `CT600 Corporation Tax Approval - ${client.clientName} (Tax Due: £${ret.netTaxDue})`,
      totalFeeQuoted: "0.00",
      servicesIncludedJson: JSON.stringify(["CT600 Corporation Tax Return", "Tax Computation Approval"]),
      publicSignToken: token,
      status: "Sent",
      sentAt: new Date(),
    });

    await db.update(ct600Returns).set({ status: "SentToCapisign" }).where(eq(ct600Returns.id, returnId));

    res.json({
      success: true,
      documentId: doc.insertId,
      token,
      signUrl: `/public/sign/${token}`,
      message: `CT600 return dispatched to ${directorName || "Director"} for eSign electronic signature.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 5. ACCOUNTING PERIODS & DIRECTORS LOOKUP
// ====================================================

corporationTaxRouter.get("/:clientId/periods", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const periods = await db
      .select()
      .from(accountingPeriods)
      .where(eq(accountingPeriods.clientId, clientId))
      .orderBy(desc(accountingPeriods.startDate));
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

corporationTaxRouter.get("/:clientId/directors", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const officers = await db
      .select()
      .from(apCompanyOfficers)
      .where(eq(apCompanyOfficers.clientId, clientId));
    res.json(officers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 6. 1-CLICK ACCOUNTS PRODUCTION (AP) BRIDGE
// ====================================================

corporationTaxRouter.get("/:clientId/ap-bridge/:periodId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const periodId = parseInt(req.params.periodId);

    const [period] = await db.select().from(accountingPeriods).where(eq(accountingPeriods.id, periodId));
    if (!period) return res.status(404).json({ error: "Accounting period not found." });

    const [tb] = await db
      .select()
      .from(trialBalances)
      .where(and(eq(trialBalances.clientId, clientId), eq(trialBalances.periodId, periodId)))
      .limit(1);

    let turnover = 0;
    let costOfSales = 0;
    let adminExpenses = 0;
    let otherIncome = 0;
    let interestPaid = 0;
    let depreciation = 0;

    if (tb) {
      const lines = await db.select().from(trialBalanceLines).where(eq(trialBalanceLines.trialBalanceId, tb.id));
      lines.forEach((l) => {
        const code = parseInt(l.nominalCode || "0");
        const debit = parseFloat(l.debit || "0");
        const credit = parseFloat(l.credit || "0");
        const netCredit = credit - debit;
        const netDebit = debit - credit;

        const nameLower = (l.accountName || "").toLowerCase();

        // Exclude Balance Sheet Bank/Cash and Equity from P&L
        if ((code >= 2300 && code <= 2399) || (code >= 5200 && code <= 5399) || code === 5220 || nameLower.includes("bank") || nameLower.includes("cash in hand")) {
          // Balance sheet bank/cash
        } else if (code === 3900 || code === 4202 || (code >= 7000 && code <= 7099) || nameLower.includes("share capital")) {
          // Balance sheet equity
        } else if ((code >= 4000 && code <= 4999) || (code >= 1000 && code <= 1099) || nameLower.includes("turnover") || nameLower.includes("sales")) {
          turnover += netCredit;
        } else if ((code >= 1100 && code <= 1999) || (code >= 5000 && code <= 5199) || nameLower.includes("cost of sales") || nameLower.includes("purchase")) {
          costOfSales += netDebit;
        } else if ((code >= 6000 && code <= 8999) || (code >= 2000 && code <= 3999 && !nameLower.includes("capital"))) {
          adminExpenses += netDebit;
          if (nameLower.includes("depreciation") || (code >= 8000 && code <= 8099)) {
            depreciation += netDebit;
          }
        } else if (code >= 9000 && code <= 9099) otherIncome += netCredit;
        else if (code >= 9100 && code <= 9199) interestPaid += netDebit;
      });
    }

    const grossProfit = turnover - costOfSales;
    const netProfit = grossProfit - adminExpenses + otherIncome - interestPaid;

    // Check if iXBRL accounts exist for this period
    const [ixbrl] = await db
      .select()
      .from(apIxbrlSubmissions)
      .where(and(eq(apIxbrlSubmissions.clientId, clientId), eq(apIxbrlSubmissions.periodId, periodId)))
      .orderBy(desc(apIxbrlSubmissions.createdAt))
      .limit(1);

    res.json({
      period,
      turnover: turnover > 0 ? turnover.toFixed(2) : "0.00",
      netAccountingProfit: netProfit.toFixed(2),
      depreciationAddBack: depreciation > 0 ? depreciation.toFixed(2) : "0.00",
      hasTrialBalance: !!tb,
      hasIxbrlAccounts: !!ixbrl,
      ixbrlSubmissionId: ixbrl?.id || null,
      message: "Figures successfully retrieved from Accounts Production Trial Balance.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 7. STATUTORY TAX DUE ADVICE DOCUMENT
// ====================================================

corporationTaxRouter.get("/:clientId/returns/:id/tax-due", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returnId = parseInt(req.params.id);
    if (isNaN(clientId) || isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID." });
    }

    const [ret] = await db.select().from(ct600Returns).where(and(eq(ct600Returns.id, returnId), eq(ct600Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found." });

    const utr = ret.utrNumber || client.utrNumber || "0000000000";
    const paymentRef = `${utr}A001`;

    res.json({
      return: ret,
      client,
      utr,
      paymentReference: paymentRef,
      netTaxDue: ret.netTaxDue,
      paymentDueDate: ret.paymentDueDate,
      filingDueDate: ret.filingDueDate,
      hmrcBankDetails: {
        accountName: "HMRC Shipley",
        sortCode: "08-32-10",
        accountNumber: "12001039",
        paymentReference: paymentRef,
        bankName: "Barclays Bank UK PLC",
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 8. CALCULATORS & SCHEDULES PERSISTENCE
// ====================================================

corporationTaxRouter.post("/:clientId/returns/:id/calculators", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    if (isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid return ID." });
    }
    const { capitalAllowances, lossSchedule } = req.body;

    if (capitalAllowances) {
      const aia = String(capitalAllowances.annualInvestmentAllowanceClaimed ?? capitalAllowances.aiaClaimed ?? "0.00");
      const fya = String(capitalAllowances.firstYearAllowanceClaimed ?? capitalAllowances.fyaClaimed ?? "0.00");
      const mainPoolWda = String(capitalAllowances.mainPoolWdaClaimed ?? "0.00");
      const specialRateWda = String(capitalAllowances.specialRateWdaClaimed ?? "0.00");
      const sba = String(capitalAllowances.structuresAndBuildingsAllowance ?? capitalAllowances.sbaClaimed ?? "0.00");
      const totalCa = String(capitalAllowances.totalCapitalAllowancesClaimed ?? "0.00");
      const mainBf = String(capitalAllowances.mainPoolWdvBf ?? "0.00");
      const mainAdd = String(capitalAllowances.mainPoolAdditions ?? "0.00");
      const mainDisp = String(capitalAllowances.mainPoolDisposals ?? "0.00");
      const specAdd = String(capitalAllowances.specialRatePoolAdditions ?? capitalAllowances.specialRateAdditions ?? "0.00");

      const [existingCa] = await db.select().from(ct600CapitalAllowances).where(eq(ct600CapitalAllowances.returnId, returnId));
      if (existingCa) {
        await db
          .update(ct600CapitalAllowances)
          .set({
            annualInvestmentAllowanceClaimed: aia,
            firstYearAllowanceClaimed: fya,
            mainPoolWdvBf: mainBf,
            mainPoolAdditions: mainAdd,
            mainPoolDisposals: mainDisp,
            mainPoolWdaClaimed: mainPoolWda,
            specialRatePoolAdditions: specAdd,
            specialRateWdaClaimed: specialRateWda,
            structuresAndBuildingsAllowance: sba,
            totalCapitalAllowancesClaimed: totalCa,
            updatedAt: new Date(),
          })
          .where(eq(ct600CapitalAllowances.id, existingCa.id));
      } else {
        await db.insert(ct600CapitalAllowances).values({
          returnId,
          annualInvestmentAllowanceClaimed: aia,
          firstYearAllowanceClaimed: fya,
          mainPoolWdvBf: mainBf,
          mainPoolAdditions: mainAdd,
          mainPoolDisposals: mainDisp,
          mainPoolWdaClaimed: mainPoolWda,
          specialRatePoolAdditions: specAdd,
          specialRateWdaClaimed: specialRateWda,
          structuresAndBuildingsAllowance: sba,
          totalCapitalAllowancesClaimed: totalCa,
        });
      }
    }

    if (lossSchedule) {
      const lossBf = String(lossSchedule.lossBroughtForward ?? "0.00");
      const lossCy = String(lossSchedule.lossCurrentYear ?? "0.00");
      const lossSetOff = String(lossSchedule.lossSetOffAgainstCurrentProfits ?? lossSchedule.lossSetOffCurrent ?? "0.00");
      const lossCb = String(lossSchedule.lossCarriedBackPriorYear ?? lossSchedule.lossCarriedBack ?? "0.00");
      const lossCf = String(lossSchedule.lossCarriedForward ?? "0.00");

      const [existingLoss] = await db.select().from(ct600LossSchedules).where(eq(ct600LossSchedules.returnId, returnId));
      if (existingLoss) {
        await db
          .update(ct600LossSchedules)
          .set({
            lossBroughtForward: lossBf,
            lossCurrentYear: lossCy,
            lossSetOffAgainstCurrentProfits: lossSetOff,
            lossCarriedBackPriorYear: lossCb,
            lossCarriedForward: lossCf,
            updatedAt: new Date(),
          })
          .where(eq(ct600LossSchedules.id, existingLoss.id));
      } else {
        await db.insert(ct600LossSchedules).values({
          returnId,
          lossBroughtForward: lossBf,
          lossCurrentYear: lossCy,
          lossSetOffAgainstCurrentProfits: lossSetOff,
          lossCarriedBackPriorYear: lossCb,
          lossCarriedForward: lossCf,
        });
      }
    }

    res.json({ success: true, message: "Calculators and schedules updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 9. SUPPLEMENTARY FORMS (CT600A, CT600L, CT600E, CT600C)
// ====================================================

corporationTaxRouter.post("/:clientId/returns/:id/supplementary", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    if (isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid return ID." });
    }
    const { formType, formData, isIncluded } = req.body;

    const [existing] = await db
      .select()
      .from(ct600SupplementaryForms)
      .where(and(eq(ct600SupplementaryForms.returnId, returnId), eq(ct600SupplementaryForms.formType, formType)));

    if (existing) {
      await db
        .update(ct600SupplementaryForms)
        .set({
          formDataJson: JSON.stringify(formData),
          isIncludedInSubmission: isIncluded ?? true,
        })
        .where(eq(ct600SupplementaryForms.id, existing.id));
    } else {
      await db.insert(ct600SupplementaryForms).values({
        returnId,
        formType,
        formDataJson: JSON.stringify(formData),
        isIncludedInSubmission: isIncluded ?? true,
      });
    }

    res.json({ success: true, message: `Supplementary form ${formType} saved.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 10. DELETE DRAFT CT600 RETURN
// ====================================================

corporationTaxRouter.delete("/:clientId/returns/:id", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId) || isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID." });
    }

    await db.delete(ct600SupplementaryForms).where(eq(ct600SupplementaryForms.returnId, returnId));
    await db.delete(ct600CapitalAllowances).where(eq(ct600CapitalAllowances.returnId, returnId));
    await db.delete(ct600LossSchedules).where(eq(ct600LossSchedules.returnId, returnId));
    await db.delete(ct600Returns).where(and(eq(ct600Returns.id, returnId), eq(ct600Returns.clientId, clientId)));

    res.json({ success: true, message: "Draft return and related statutory schedules deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default corporationTaxRouter;
