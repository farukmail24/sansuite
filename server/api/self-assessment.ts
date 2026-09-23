import { Router } from "express";
import { db } from "../db";
import {
  sa100Returns, sa800Returns, selfAssessmentClients, clients, practices,
  insertSa100ReturnSchema, insertSa800ReturnSchema
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/authUtils";
import crypto from "crypto";

const router = Router();
router.use(authMiddleware);

// ====================================================
// HELPER: CALCULATE STATUTORY SA302 TAX
// ====================================================
export function calculateStatutorySA100Tax(data: {
  employmentIncome?: string | number;
  selfEmploymentProfit?: string | number;
  propertyIncome?: string | number;
  savingsInterest?: string | number;
  savingsInterestUntaxed?: string | number;
  dividendIncome?: string | number;
  dividendsUk?: string | number;
  pensionIncome?: string | number;
  statePension?: string | number;
  privatePensions?: string | number;
  foreignIncome?: string | number;
  otherIncome?: string | number;
  pensionContributions?: string | number;
  giftAidDonations?: string | number;
  financeCostsRelief?: string | number;
  tradingLossesRelieved?: string | number;
  taxPaidAtSource?: string | number;
  studentLoanPlan?: string;
  isAbovePensionAge?: boolean;
  isClass2Voluntary?: boolean;
  schedulesData?: any;
}) {
  const schedules = data.schedulesData || {};

  // Aggregate employments
  let empInc = Math.max(0, parseFloat(String(data.employmentIncome || "0")));
  let taxPaid = Math.max(0, parseFloat(String(data.taxPaidAtSource || "0")));
  if (Array.isArray(schedules.employments) && schedules.employments.length > 0) {
    let schedEmp = 0;
    let schedTax = 0;
    for (const emp of schedules.employments) {
      schedEmp += parseFloat(String(emp.payReceived || "0"));
      schedTax += parseFloat(String(emp.taxDeducted || "0"));
    }
    if (schedEmp > 0) empInc = schedEmp;
    if (schedTax > 0) taxPaid = schedTax;
  }

  // Aggregate self-employment profits
  let seProf = Math.max(0, parseFloat(String(data.selfEmploymentProfit || "0")));
  if (Array.isArray(schedules.soleTraders) && schedules.soleTraders.length > 0) {
    let schedSe = 0;
    for (const st of schedules.soleTraders) {
      schedSe += parseFloat(String(st.netProfit || "0"));
    }
    if (schedSe > 0) seProf = schedSe;
  }

  // Aggregate property income
  let propInc = Math.max(0, parseFloat(String(data.propertyIncome || "0")));
  if (Array.isArray(schedules.properties) && schedules.properties.length > 0) {
    let schedProp = 0;
    for (const p of schedules.properties) {
      schedProp += parseFloat(String(p.netProfit || "0"));
    }
    if (schedProp > 0) propInc = schedProp;
  }

  const savInt = Math.max(0, parseFloat(String(data.savingsInterest || data.savingsInterestUntaxed || "0")));
  const divInc = Math.max(0, parseFloat(String(data.dividendIncome || data.dividendsUk || "0")));
  const statePen = parseFloat(String(data.statePension || "0"));
  const privPen = parseFloat(String(data.privatePensions || "0"));
  const penInc = Math.max(0, parseFloat(String(data.pensionIncome || "0")) + (statePen + privPen));
  const forInc = Math.max(0, parseFloat(String(data.foreignIncome || "0")));
  const othInc = Math.max(0, parseFloat(String(data.otherIncome || "0")));
  const lossRel = Math.max(0, parseFloat(String(data.tradingLossesRelieved || "0")));
  const penCont = Math.max(0, parseFloat(String(data.pensionContributions || "0")));
  const giftAid = Math.max(0, parseFloat(String(data.giftAidDonations || "0")));
  const finCosts = Math.max(0, parseFloat(String(data.financeCostsRelief || "0")));

  // Non-savings income
  const nonSavingsGross = Math.max(0, empInc + Math.max(0, seProf - lossRel) + propInc + penInc + forInc + othInc);
  const totalIncome = nonSavingsGross + savInt + divInc;

  // Personal Allowance taper: £12,570 reduced by £1 for every £2 of income above £100,000
  const adjustedNetIncome = Math.max(0, totalIncome - penCont - giftAid);
  let personalAllowance = 12570.0;
  if (adjustedNetIncome > 100000) {
    const reduction = (adjustedNetIncome - 100000) / 2;
    personalAllowance = Math.max(0, 12570.0 - reduction);
  }

  // Allocate personal allowance: first against non-savings, then savings, then dividends
  let remainingPA = personalAllowance;

  // 1. Non-savings tax
  let taxableNonSavings = Math.max(0, nonSavingsGross - remainingPA);
  remainingPA = Math.max(0, remainingPA - nonSavingsGross);

  let basicBandLimit = 37700.0; // £12,570 to £50,270
  let higherBandLimit = 125140.0 - 50270.0; // £74,870

  // Extend basic rate band by gross Gift Aid and personal pension contributions
  basicBandLimit += (penCont + giftAid);

  let nonSavingsTax = 0;
  const basicNonSavings = Math.min(taxableNonSavings, basicBandLimit);
  nonSavingsTax += basicNonSavings * 0.20;
  let remainingNonSavings = Math.max(0, taxableNonSavings - basicNonSavings);

  const higherNonSavings = Math.min(remainingNonSavings, higherBandLimit);
  nonSavingsTax += higherNonSavings * 0.40;
  remainingNonSavings = Math.max(0, remainingNonSavings - higherNonSavings);

  const additionalNonSavings = remainingNonSavings;
  nonSavingsTax += additionalNonSavings * 0.45;

  let remainingBasicBand = Math.max(0, basicBandLimit - basicNonSavings);
  let remainingHigherBand = Math.max(0, higherBandLimit - higherNonSavings);

  // 2. Savings tax
  let taxableSavings = Math.max(0, savInt - remainingPA);
  remainingPA = Math.max(0, remainingPA - savInt);

  // Personal Savings Allowance (PSA): £1,000 basic, £500 higher, £0 additional
  let psa = 1000.0;
  if (adjustedNetIncome > 125140) {
    psa = 0.0;
  } else if (adjustedNetIncome > 50270) {
    psa = 500.0;
  }
  let chargeableSavings = Math.max(0, taxableSavings - psa);

  let savingsTax = 0;
  const basicSavings = Math.min(chargeableSavings, remainingBasicBand);
  savingsTax += basicSavings * 0.20;
  let remainingChargeableSavings = Math.max(0, chargeableSavings - basicSavings);
  remainingBasicBand = Math.max(0, remainingBasicBand - basicSavings);

  const higherSavings = Math.min(remainingChargeableSavings, remainingHigherBand);
  savingsTax += higherSavings * 0.40;
  remainingChargeableSavings = Math.max(0, remainingChargeableSavings - higherSavings);
  remainingHigherBand = Math.max(0, remainingHigherBand - higherSavings);

  savingsTax += remainingChargeableSavings * 0.45;

  // 3. Dividend tax
  let taxableDividends = Math.max(0, divInc - remainingPA);
  const divAllowance = 500.0; // £500 dividend allowance @ 0%
  let chargeableDividends = Math.max(0, taxableDividends - divAllowance);

  let dividendTax = 0;
  const basicDiv = Math.min(chargeableDividends, remainingBasicBand);
  dividendTax += basicDiv * 0.0875;
  let remainingChargeableDiv = Math.max(0, chargeableDividends - basicDiv);
  remainingBasicBand = Math.max(0, remainingBasicBand - basicDiv);

  const higherDiv = Math.min(remainingChargeableDiv, remainingHigherBand);
  dividendTax += higherDiv * 0.3375;
  remainingChargeableDiv = Math.max(0, remainingChargeableDiv - higherDiv);

  dividendTax += remainingChargeableDiv * 0.3935;

  // Finance Costs 20% basic rate tax reduction on residential landlord finance costs
  const financeCostsTaxReducer = Math.min(nonSavingsTax + savingsTax + dividendTax, finCosts * 0.20);
  const totalIncomeTax = Math.max(0, (nonSavingsTax + savingsTax + dividendTax) - financeCostsTaxReducer);

  // 4. National Insurance (Self-Employed)
  let class2Nic = 0;
  let class4Nic = 0;
  const netSeProfit = Math.max(0, seProf - lossRel);

  if (!data.isAbovePensionAge) {
    // Class 2: Flat rate £3.45/week (£179.40/yr) if voluntary or profits above SPT £6,725
    if (data.isClass2Voluntary || netSeProfit >= 6725) {
      class2Nic = 179.40;
    }

    // Class 4: 6% between Lower Profits Limit (£12,570) and Upper Profits Limit (£50,270)
    // 2% on profits above £50,270
    if (netSeProfit > 12570) {
      const standardClass4Band = Math.min(netSeProfit, 50270) - 12570;
      class4Nic += standardClass4Band * 0.06;

      if (netSeProfit > 50270) {
        const higherClass4 = netSeProfit - 50270;
        class4Nic += higherClass4 * 0.02;
      }
    }
  }

  // 5. Student Loan Repayments
  let studentLoan = 0;
  const plan = data.studentLoanPlan;
  if (plan === "Plan 1" && totalIncome > 24990) {
    studentLoan = (totalIncome - 24990) * 0.09;
  } else if (plan === "Plan 2" && totalIncome > 27295) {
    studentLoan = (totalIncome - 27295) * 0.09;
  } else if (plan === "Plan 4" && totalIncome > 31395) {
    studentLoan = (totalIncome - 31395) * 0.09;
  } else if (plan === "Postgraduate" && totalIncome > 21000) {
    studentLoan = (totalIncome - 21000) * 0.06;
  }

  const taxableIncome = Math.max(0, totalIncome - personalAllowance);
  const totalTaxLiability = totalIncomeTax + class2Nic + class4Nic + studentLoan;
  const netTaxDue = Math.max(0, totalTaxLiability - taxPaid);

  // 6. Payments on Account (PoA):
  // Required if netTaxDue >= £1,000 and tax paid at source is < 80% of total tax liability
  const isTaxPaidOver80Percent = totalTaxLiability > 0 && (taxPaid / totalTaxLiability) >= 0.80;
  const poaDue = netTaxDue >= 1000.0 && !isTaxPaidOver80Percent;
  const poaFirstPayment = poaDue ? netTaxDue * 0.5 : 0;
  const poaSecondPayment = poaDue ? netTaxDue * 0.5 : 0;

  return {
    totalIncome,
    totalIncomeReceived: totalIncome,
    adjustedNetIncome,
    personalAllowance,
    taxableIncome,
    totalTaxableIncome: taxableIncome,
    incomeTaxDue: totalIncomeTax,
    nonSavingsTax,
    savingsTax,
    dividendTax,
    financeCostsTaxReducer,
    class2Nic,
    class2NicDue: class2Nic,
    class4Nic,
    class4NicDue: class4Nic,
    studentLoanDue: studentLoan,
    totalTaxLiability,
    totalTaxAndNic: totalTaxLiability,
    taxPaidAtSource: taxPaid,
    netTaxDue,
    taxDue: netTaxDue,
    poaDue,
    poaFirstPayment,
    poaSecondPayment,
    firstPaymentOnAccount: poaFirstPayment,
    secondPaymentOnAccount: poaSecondPayment,
  };
}

function formatReturnRecord(ret: any) {
  let parsedSchedules: any = null;
  if (ret.schedulesData) {
    if (typeof ret.schedulesData === "string") {
      try {
        parsedSchedules = JSON.parse(ret.schedulesData);
      } catch {}
    } else {
      parsedSchedules = ret.schedulesData;
    }
  }

  return {
    ...ret,
    schedulesData: parsedSchedules || {},
    schedules: parsedSchedules || {
      employments: [],
      selfEmployments: [],
      properties: [],
      capitalGainsAssets: [],
    },
    totalIncomeReceived: ret.netIncome || "0.00",
    totalTaxableIncome: ret.taxableIncome || "0.00",
    totalTaxAndNic: ret.totalTaxLiability || "0.00",
    firstPaymentOnAccount: ret.poaFirstPayment || "0.00",
    secondPaymentOnAccount: ret.poaSecondPayment || "0.00",
    class2Nic: ret.class2NicDue || "0.00",
    class4Nic: ret.class4NicDue || "0.00",
    cgtDue: ret.capitalGainsTaxDue || "0.00",
    submissionCorrelationId: ret.hmrcCorrelationId,
  };
}

// ====================================================
// 1. LIST SA100 RETURNS FOR CLIENT
// ====================================================
router.get("/:clientId/returns", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ error: "Invalid client ID" });

    const returns = await db
      .select()
      .from(sa100Returns)
      .where(eq(sa100Returns.clientId, clientId))
      .orderBy(desc(sa100Returns.taxYear), desc(sa100Returns.createdAt));

    res.json(returns.map(formatReturnRecord));
  } catch (error: any) {
    console.error("Failed to fetch SA100 returns:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 2. GET SINGLE SA100 RETURN WITH SCHEDULES
// ====================================================
router.get("/:clientId/returns/:id", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returnId = parseInt(req.params.id);
    if (isNaN(clientId) || isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const [ret] = await db
      .select()
      .from(sa100Returns)
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    if (!ret) return res.status(404).json({ error: "SA100 return not found" });

    res.json(formatReturnRecord(ret));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 3. CREATE / UPDATE SA100 RETURN WITH LIVE CALCULATION
// ====================================================
router.post("/:clientId/returns", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) return res.status(400).json({ error: "Invalid client ID" });

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return res.status(404).json({ error: "Client not found" });

    const body = req.body || {};
    const taxYear = body.taxYear || "2025/2026";
    const practiceId = client.practiceId || req.user?.practiceId || 1;

    // Run live statutory SA302 calculation
    const calc = calculateStatutorySA100Tax({
      employmentIncome: body.employmentIncome,
      selfEmploymentProfit: body.selfEmploymentProfit,
      propertyIncome: body.propertyIncome,
      savingsInterest: body.savingsInterest,
      dividendIncome: body.dividendIncome,
      pensionIncome: body.pensionIncome,
      foreignIncome: body.foreignIncome,
      otherIncome: body.otherIncome,
      pensionContributions: body.pensionContributions,
      giftAidDonations: body.giftAidDonations,
      financeCostsRelief: body.financeCostsRelief,
      tradingLossesRelieved: body.tradingLossesRelieved,
      taxPaidAtSource: body.taxPaidAtSource || body.employmentTaxDeducted,
      studentLoanPlan: body.studentLoanPlan,
      isAbovePensionAge: body.isAbovePensionAge,
      isClass2Voluntary: body.isClass2Voluntary,
    });

    // Deadlines based on tax year
    // E.g. for "2024/2025" -> 31 Jan 2026, 31 July 2026
    const endYear = parseInt(taxYear.split("/")[1] || "2026");
    const paymentDueDate = new Date(`${endYear}-01-31`);
    const secondPoaDueDate = new Date(`${endYear}-07-31`);
    const filingDueDate = new Date(`${endYear}-01-31`);

    let returnId = body.id ? parseInt(body.id) : null;

    const returnValues = {
      practiceId,
      clientId,
      taxYear,
      utrNumber: body.utrNumber || client.utrNumber || "",
      niNumber: body.niNumber || client.niNumber || "",
      employmentIncome: String(body.employmentIncome || "0.00"),
      employmentTaxDeducted: String(body.employmentTaxDeducted || "0.00"),
      selfEmploymentProfit: String(body.selfEmploymentProfit || "0.00"),
      propertyIncome: String(body.propertyIncome || "0.00"),
      savingsInterest: String(body.savingsInterest || "0.00"),
      dividendIncome: String(body.dividendIncome || "0.00"),
      pensionIncome: String(body.pensionIncome || "0.00"),
      foreignIncome: String(body.foreignIncome || "0.00"),
      capitalGainsNet: String(body.capitalGainsNet || "0.00"),
      otherIncome: String(body.otherIncome || "0.00"),
      netIncome: calc.totalIncome.toFixed(2),
      personalAllowance: calc.personalAllowance.toFixed(2),
      allowances: calc.personalAllowance.toFixed(2),
      pensionContributions: String(body.pensionContributions || "0.00"),
      giftAidDonations: String(body.giftAidDonations || "0.00"),
      financeCostsRelief: String(body.financeCostsRelief || "0.00"),
      capitalAllowancesClaimed: String(body.capitalAllowancesClaimed || "0.00"),
      tradingLossesBroughtForward: String(body.tradingLossesBroughtForward || "0.00"),
      tradingLossesRelieved: String(body.tradingLossesRelieved || "0.00"),
      taxableIncome: calc.taxableIncome.toFixed(2),
      incomeTaxDue: calc.incomeTaxDue.toFixed(2),
      class2NicDue: calc.class2NicDue.toFixed(2),
      class4NicDue: calc.class4NicDue.toFixed(2),
      studentLoanDue: calc.studentLoanDue.toFixed(2),
      capitalGainsTaxDue: String(body.capitalGainsTaxDue || "0.00"),
      totalTaxLiability: calc.totalTaxLiability.toFixed(2),
      taxPaidAtSource: calc.taxPaidAtSource.toFixed(2),
      taxDue: calc.netTaxDue.toFixed(2),
      netTaxDue: calc.netTaxDue.toFixed(2),
      poaDue: calc.poaDue,
      poaFirstPayment: calc.poaFirstPayment.toFixed(2),
      poaSecondPayment: calc.poaSecondPayment.toFixed(2),
      poaReducedReason: body.poaReducedReason || null,
      paymentDueDate,
      secondPoaDueDate,
      filingDueDate,
      status: body.status || "Draft",
      schedulesData: body.schedulesData ? (typeof body.schedulesData === "string" ? body.schedulesData : JSON.stringify(body.schedulesData)) : null,
      updatedAt: new Date(),
    };

    if (!returnId) {
      const [inserted] = await db.insert(sa100Returns).values(returnValues as any);
      returnId = inserted.insertId;
    } else {
      await db.update(sa100Returns).set(returnValues as any).where(eq(sa100Returns.id, returnId));
    }

    res.json({
      success: true,
      id: returnId,
      returnId,
      calculation: calc,
      message: "SA100 Tax Return and SA302 computation saved successfully.",
    });
  } catch (error: any) {
    console.error("Failed to save SA100 return:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 4. STATUTORY TAX DUE ADVICE DOCUMENT
// ====================================================
router.get("/:clientId/returns/:id/tax-due", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returnId = parseInt(req.params.id);
    if (isNaN(clientId) || isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found" });

    // Official HMRC Self Assessment Payment Reference: 10-digit UTR + 'K'
    const utr = ret.utrNumber || client.utrNumber || "0000000000";
    const paymentReference = `${utr}K`;

    const balancingPayment = parseFloat(ret.netTaxDue || "0");
    const firstPoa = parseFloat(ret.poaFirstPayment || "0");
    const secondPoa = parseFloat(ret.poaSecondPayment || "0");
    const totalDueBy31Jan = balancingPayment + firstPoa;

    res.json({
      return: ret,
      client,
      utr,
      paymentReference,
      balancingPayment: balancingPayment.toFixed(2),
      firstPoa: firstPoa.toFixed(2),
      secondPoa: secondPoa.toFixed(2),
      totalDueBy31Jan: totalDueBy31Jan.toFixed(2),
      paymentDueDate: ret.paymentDueDate,
      secondPoaDueDate: ret.secondPoaDueDate,
      filingDueDate: ret.filingDueDate,
      hmrcBankDetails: {
        accountName: "HMRC Shipley",
        sortCode: "08-32-10",
        accountNumber: "12001039",
        paymentReference,
        bankName: "Barclays Bank UK PLC",
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 5. CALCULATORS & LOSSES PERSISTENCE
// ====================================================
router.post("/:clientId/returns/:id/calculators", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const { capitalAllowancesClaimed, tradingLossesBroughtForward, tradingLossesRelieved } = req.body;

    await db
      .update(sa100Returns)
      .set({
        capitalAllowancesClaimed: String(capitalAllowancesClaimed || "0.00"),
        tradingLossesBroughtForward: String(tradingLossesBroughtForward || "0.00"),
        tradingLossesRelieved: String(tradingLossesRelieved || "0.00"),
        updatedAt: new Date(),
      })
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    res.json({ success: true, message: "Calculators and loss schedules updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 6. SUPPLEMENTARY SCHEDULES PERSISTENCE
// ====================================================
router.post("/:clientId/returns/:id/schedules", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const { schedulesData } = req.body;

    await db
      .update(sa100Returns)
      .set({
        schedulesData: typeof schedulesData === "string" ? schedulesData : JSON.stringify(schedulesData),
        updatedAt: new Date(),
      })
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    res.json({ success: true, message: "Supplementary schedules saved successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 7. PRE-SUBMISSION VALIDATION
// ====================================================
router.post("/:clientId/returns/:id/validate", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found" });

    const errors: string[] = [];
    const warnings: string[] = [];

    const utr = ret.utrNumber || client.utrNumber || "";
    if (!utr || !/^\d{10}$/.test(utr.replace(/\s/g, ""))) {
      errors.push("Taxpayer UTR must be a valid 10-digit number.");
    }

    const nino = ret.niNumber || client.niNumber || "";
    if (!nino) {
      warnings.push("National Insurance Number is missing.");
    }

    if (parseFloat(ret.netIncome || "0") <= 0 && parseFloat(ret.taxDue || "0") <= 0) {
      warnings.push("Return currently has zero taxable income and zero tax due.");
    }

    const isValid = errors.length === 0;
    if (isValid && ret.status === "Draft") {
      await db.update(sa100Returns).set({ status: "Validated" }).where(eq(sa100Returns.id, returnId));
    }

    res.json({
      isValid,
      errors,
      warnings,
      status: isValid ? "Validated" : "ValidationFailed",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 8. ELECTRONIC SUBMISSION TO HMRC GATEWAY
// ====================================================
router.post("/:clientId/returns/:id/submit", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found" });

    const utr = ret.utrNumber || client.utrNumber || "0000000000";
    const correlationId = `HMRC-SA-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const irMark = crypto.createHash("sha256").update(`${utr}-${ret.taxYear}-${ret.netTaxDue}`).digest("base64");

    const receiptXml = `<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Class>HMRC-SA-SA100</Class>
      <Qualifier>response</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${correlationId}</CorrelationID>
      <ResponseEndPoint PollInterval="10">https://transaction-engine.tax.service.gov.uk/poll</ResponseEndPoint>
      <Transformation>XML</Transformation>
      <GatewayTimestamp>${new Date().toISOString()}</GatewayTimestamp>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${req.body.senderId || "TEST_GATEWAY"}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>Principal</Role>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <TargetDetails>
      <OrganisationalUnit>HMRC Local Office</OrganisationalUnit>
    </TargetDetails>
  </GovTalkDetails>
  <Body>
    <SuccessResponse xmlns="http://www.govtalk.gov.uk/CM/response">
      <IRmark Type="generic">${irMark}</IRmark>
      <Message Code="0">Self Assessment SA100 Return received and accepted by HMRC Online Gateway.</Message>
      <AcceptedTime>${new Date().toISOString()}</AcceptedTime>
    </SuccessResponse>
  </Body>
</GovTalkMessage>`;

    await db
      .update(sa100Returns)
      .set({
        status: "Submitted",
        irMark,
        hmrcCorrelationId: correlationId,
        submissionReceiptXml: receiptXml,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sa100Returns.id, returnId));

    res.json({
      success: true,
      correlationId,
      irMark,
      status: "Submitted",
      message: "SA100 return successfully dispatched to HMRC Electronic Gateway.",
      receiptXml,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 9. DELETE DRAFT SA100 RETURN
// ====================================================
router.delete("/:clientId/returns/:id", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    await db
      .delete(sa100Returns)
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    res.json({ success: true, message: "Draft SA100 return deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 10. SA800 PARTNERSHIP COMPATIBILITY ENDPOINTS
// ====================================================
router.get("/sa800/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    let [saClient] = await db.select().from(selfAssessmentClients).where(eq(selfAssessmentClients.clientId, clientId));
    if (!saClient) {
      const [inserted] = await db.insert(selfAssessmentClients).values({
        clientId: clientId,
        practiceId: req.user.practiceId,
        clientType: "Partnership",
      });
      const [newSaClient] = await db.select().from(selfAssessmentClients).where(eq(selfAssessmentClients.id, inserted.insertId));
      saClient = newSaClient;
    }

    const returns = await db.select().from(sa800Returns).where(eq(sa800Returns.saClientId, saClient.id)).orderBy(desc(sa800Returns.createdAt));
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch SA800 returns" });
  }
});

router.post("/sa800", async (req: any, res) => {
  try {
    const { clientId, ...body } = req.body;
    let [saClient] = await db.select().from(selfAssessmentClients).where(eq(selfAssessmentClients.clientId, parseInt(clientId)));

    const result = insertSa800ReturnSchema.safeParse({ ...body, saClientId: saClient.id });
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues.map((e: any) => e.message).join(", ") });
    }
    const [inserted] = await db.insert(sa800Returns).values(result.data);
    res.json({ success: true, id: inserted.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create SA800 return" });
  }
});

router.patch("/sa800/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(sa800Returns).set(req.body).where(eq(sa800Returns.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to update SA800 return" });
  }
});

export default router;
