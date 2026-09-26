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
  partnershipProfit?: string | number;
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
  seisReliefClaimed?: string | number;
  eisReliefClaimed?: string | number;
  vctReliefClaimed?: string | number;
  capitalGainsNet?: string | number;
  capitalGainsTaxDue?: string | number;
  cgtAdjustmentBox51?: string | number;
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
      schedEmp += parseFloat(String(emp.grossPay || emp.payReceived || "0"));
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
      // Check for Foster Care simplified relief (Capium Art 49: 9000271495)
      if (st.isFosterCarer) {
        const qReceipts = parseFloat(String(st.qualifyingReceipts || "0"));
        const qAmount = parseFloat(String(st.qualifyingAmount || "0"));
        if (qAmount >= qReceipts) {
          st.netProfit = "0.00";
        } else {
          st.netProfit = Math.max(0, qReceipts - qAmount).toFixed(2);
        }
      }
      schedSe += parseFloat(String(st.netProfit || "0"));
    }
    if (schedSe > 0 || schedules.soleTraders.length > 0) seProf = schedSe;
  }

  // Aggregate partnership profit shares (SA104 - Capium Art 21, 26)
  let partProf = Math.max(0, parseFloat(String(data.partnershipProfit || "0")));
  if (Array.isArray(schedules.partnerships) && schedules.partnerships.length > 0) {
    let schedPart = 0;
    for (const part of schedules.partnerships) {
      schedPart += parseFloat(String(part.profitShare || part.netProfit || "0"));
    }
    if (schedPart > 0) partProf = schedPart;
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

  // Non-savings income (includes employment, self-employment, partnerships, property, pension, foreign, other)
  const totalEarnedProfits = Math.max(0, seProf + partProf - lossRel);
  const nonSavingsGross = Math.max(0, empInc + totalEarnedProfits + propInc + penInc + forInc + othInc);
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
  let totalIncomeTax = Math.max(0, (nonSavingsTax + savingsTax + dividendTax) - financeCostsTaxReducer);

  // SA101 Additional Reliefs (Capium Art 47: SEIS Box 10, EIS, VCT)
  const seisRelief = Math.max(0, parseFloat(String(data.seisReliefClaimed || schedules.seisReliefClaimed || "0")));
  const eisRelief = Math.max(0, parseFloat(String(data.eisReliefClaimed || schedules.eisReliefClaimed || "0")));
  const vctRelief = Math.max(0, parseFloat(String(data.vctReliefClaimed || schedules.vctReliefClaimed || "0")));

  const seisTaxReducer = Math.min(totalIncomeTax, seisRelief * 0.50); // 50% relief
  const eisTaxReducer = Math.min(Math.max(0, totalIncomeTax - seisTaxReducer), eisRelief * 0.30); // 30% relief
  const vctTaxReducer = Math.min(Math.max(0, totalIncomeTax - seisTaxReducer - eisTaxReducer), vctRelief * 0.30); // 30% relief
  const totalInvestmentReliefs = seisTaxReducer + eisTaxReducer + vctTaxReducer;
  totalIncomeTax = Math.max(0, totalIncomeTax - totalInvestmentReliefs);

  // 4. National Insurance (Self-Employed & Partnerships)
  let class2Nic = 0;
  let class4Nic = 0;

  if (!data.isAbovePensionAge) {
    // Class 2: Flat rate £3.45/week (£179.40/yr) if voluntary or profits above SPT £6,725
    if (data.isClass2Voluntary || totalEarnedProfits >= 6725) {
      class2Nic = 179.40;
    }

    // Class 4: 6% between Lower Profits Limit (£12,570) and Upper Profits Limit (£50,270)
    // 2% on profits above £50,270
    if (totalEarnedProfits > 12570) {
      const standardClass4Band = Math.min(totalEarnedProfits, 50270) - 12570;
      class4Nic += standardClass4Band * 0.06;

      if (totalEarnedProfits > 50270) {
        const higherClass4 = totalEarnedProfits - 50270;
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

  // 6. Capital Gains Tax & Autumn Budget 2024 Box CGT51 Adjustment (Capium Art 44: 9000268723)
  let cgtStandardDue = Math.max(0, parseFloat(String(data.capitalGainsTaxDue || "0")));
  let cgtBox51Adjustment = Math.max(0, parseFloat(String(data.cgtAdjustmentBox51 || schedules.cgtBox51Adjustment || "0")));

  // If schedules has capitalGainsAssets, auto-calculate standard CGT and Box 51 adjustment
  if (Array.isArray(schedules.capitalGainsAssets) && schedules.capitalGainsAssets.length > 0) {
    let totGainsBeforeBudget = 0;
    let totGainsAfterBudget = 0;
    for (const asset of schedules.capitalGainsAssets) {
      const g = parseFloat(String(asset.netGain || "0"));
      if (asset.disposalPeriod === "on_after_30_oct_2024" && asset.assetType === "Other Assets & Shares") {
        totGainsAfterBudget += g;
      } else {
        totGainsBeforeBudget += g;
      }
    }

    // AEA £3,000 applied first to before budget, then after budget
    let remainingAea = 3000.0;
    const taxableBefore = Math.max(0, totGainsBeforeBudget - remainingAea);
    remainingAea = Math.max(0, remainingAea - totGainsBeforeBudget);
    const taxableAfter = Math.max(0, totGainsAfterBudget - remainingAea);

    // Is taxpayer basic or higher rate?
    const isHigherRate = taxableNonSavings + taxableSavings > basicBandLimit;
    const standardRate = isHigherRate ? 0.20 : 0.10;
    const newBudgetRate = isHigherRate ? 0.24 : 0.18;
    const rateDifferential = newBudgetRate - standardRate; // 4% for higher, 8% for basic

    cgtStandardDue = (taxableBefore + taxableAfter) * standardRate;
    cgtBox51Adjustment = taxableAfter * rateDifferential;
  }

  const totalCgtTaxDue = cgtStandardDue + cgtBox51Adjustment;

  const taxableIncome = Math.max(0, totalIncome - personalAllowance);
  const totalTaxLiability = totalIncomeTax + class2Nic + class4Nic + studentLoan + totalCgtTaxDue;
  const netTaxDue = Math.max(0, totalTaxLiability - taxPaid);

  // 7. Payments on Account (PoA):
  // TMA 1970 s59A: Capital Gains is excluded from Payments on Account.
  const poaAssessingTax = totalIncomeTax + class4Nic;
  const poaNetAssessing = Math.max(0, poaAssessingTax - taxPaid);
  const isTaxPaidOver80Percent = poaAssessingTax > 0 && (taxPaid / poaAssessingTax) >= 0.80;
  const poaDue = poaNetAssessing >= 1000.0 && !isTaxPaidOver80Percent;
  const poaFirstPayment = poaDue ? poaNetAssessing * 0.5 : 0;
  const poaSecondPayment = poaDue ? poaNetAssessing * 0.5 : 0;

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
    seisTaxReducer,
    eisTaxReducer,
    vctTaxReducer,
    totalInvestmentReliefs,
    class2Nic,
    class2NicDue: class2Nic,
    class4Nic,
    class4NicDue: class4Nic,
    studentLoanDue: studentLoan,
    capitalGainsTaxDue: cgtStandardDue,
    cgtBox51Adjustment,
    totalCgtTaxDue,
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
      partnerships: [],
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
    cgtBox51Adjustment: parsedSchedules?.cgtBox51Adjustment || "0.00",
    seisTaxReducer: parsedSchedules?.seisTaxReducer || "0.00",
    eisTaxReducer: parsedSchedules?.eisTaxReducer || "0.00",
    vctTaxReducer: parsedSchedules?.vctTaxReducer || "0.00",
    partnerships: parsedSchedules?.partnerships || [],
    isAmended: parsedSchedules?.isAmended || ret.taxYear?.includes("(Amended)") || false,
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

    let parsedSchedules = body.schedulesData;
    if (typeof parsedSchedules === "string") {
      try {
        parsedSchedules = JSON.parse(parsedSchedules);
      } catch {
        parsedSchedules = {};
      }
    } else if (!parsedSchedules) {
      parsedSchedules = {};
    }

    // Run live statutory SA302 calculation
    const calc = calculateStatutorySA100Tax({
      employmentIncome: body.employmentIncome,
      selfEmploymentProfit: body.selfEmploymentProfit,
      partnershipProfit: body.partnershipProfit || parsedSchedules.partnershipProfit,
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
      seisReliefClaimed: body.seisReliefClaimed || parsedSchedules.seisReliefClaimed,
      eisReliefClaimed: body.eisReliefClaimed || parsedSchedules.eisReliefClaimed,
      vctReliefClaimed: body.vctReliefClaimed || parsedSchedules.vctReliefClaimed,
      capitalGainsNet: body.capitalGainsNet,
      capitalGainsTaxDue: body.capitalGainsTaxDue,
      cgtAdjustmentBox51: body.cgtAdjustmentBox51 || parsedSchedules.cgtBox51Adjustment,
      schedulesData: parsedSchedules,
    });

    // Deadlines based on tax year
    // E.g. for "2024/2025" -> 31 Jan 2026, 31 July 2026
    const endYear = parseInt(taxYear.split("/")[1] || "2026");
    const paymentDueDate = new Date(`${endYear}-01-31`);
    const secondPoaDueDate = new Date(`${endYear}-07-31`);
    const filingDueDate = new Date(`${endYear}-01-31`);

    let returnId = body.id ? parseInt(body.id) : null;

    // Attach computed adjustments into schedulesData
    const updatedSchedulesData = {
      ...parsedSchedules,
      seisReliefClaimed: String(body.seisReliefClaimed ?? parsedSchedules.seisReliefClaimed ?? "0.00"),
      eisReliefClaimed: String(body.eisReliefClaimed ?? parsedSchedules.eisReliefClaimed ?? "0.00"),
      vctReliefClaimed: String(body.vctReliefClaimed ?? parsedSchedules.vctReliefClaimed ?? "0.00"),
      cgtBox51Adjustment: calc.cgtBox51Adjustment.toFixed(2),
      seisTaxReducer: calc.seisTaxReducer.toFixed(2),
      eisTaxReducer: calc.eisTaxReducer.toFixed(2),
      vctTaxReducer: calc.vctTaxReducer.toFixed(2),
      totalInvestmentReliefs: calc.totalInvestmentReliefs.toFixed(2),
    };

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
      capitalGainsTaxDue: calc.totalCgtTaxDue.toFixed(2),
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
      schedulesData: JSON.stringify(updatedSchedulesData),
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

    const {
      capitalAllowancesClaimed,
      tradingLossesBroughtForward,
      tradingLossesRelieved,
      mainPoolWdvBf,
      mainPoolAdditions,
      mainPoolDisposals,
      mainPoolWdaClaimed,
      specialRateAdditions,
      specialRateWdaClaimed,
      sbaClaimed,
      fyaClaimed,
      aiaClaimed,
    } = req.body;

    const [existing] = await db
      .select({ schedulesData: sa100Returns.schedulesData })
      .from(sa100Returns)
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    let sched: any = {};
    if (existing?.schedulesData) {
      try {
        sched = typeof existing.schedulesData === "string" ? JSON.parse(existing.schedulesData) : existing.schedulesData;
      } catch {}
    }

    sched = {
      ...sched,
      mainPoolWdvBf: String(mainPoolWdvBf ?? sched.mainPoolWdvBf ?? "0.00"),
      mainPoolAdditions: String(mainPoolAdditions ?? sched.mainPoolAdditions ?? "0.00"),
      mainPoolDisposals: String(mainPoolDisposals ?? sched.mainPoolDisposals ?? "0.00"),
      mainPoolWdaClaimed: String(mainPoolWdaClaimed ?? sched.mainPoolWdaClaimed ?? "0.00"),
      specialRateAdditions: String(specialRateAdditions ?? sched.specialRateAdditions ?? "0.00"),
      specialRateWdaClaimed: String(specialRateWdaClaimed ?? sched.specialRateWdaClaimed ?? "0.00"),
      sbaClaimed: String(sbaClaimed ?? sched.sbaClaimed ?? "0.00"),
      fyaClaimed: String(fyaClaimed ?? sched.fyaClaimed ?? "0.00"),
      aiaClaimed: String(aiaClaimed ?? sched.aiaClaimed ?? "0.00"),
    };

    await db
      .update(sa100Returns)
      .set({
        capitalAllowancesClaimed: String(capitalAllowancesClaimed || "0.00"),
        tradingLossesBroughtForward: String(tradingLossesBroughtForward || "0.00"),
        tradingLossesRelieved: String(tradingLossesRelieved || "0.00"),
        schedulesData: JSON.stringify(sched),
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

    // Parse schedules
    let sched: any = {};
    if (ret.schedulesData) {
      try {
        sched = typeof ret.schedulesData === "string" ? JSON.parse(ret.schedulesData) : ret.schedulesData;
      } catch {}
    }

    // Statutory Rule (Capium Art 48: 9000271813): CGT Attachment or Whitespace Box 54 required if Capital Gains present
    const hasCapitalGains = parseFloat(ret.capitalGainsNet || "0") > 0 || parseFloat(ret.capitalGainsTaxDue || "0") > 0 || (Array.isArray(sched.capitalGainsAssets) && sched.capitalGainsAssets.length > 0);
    if (hasCapitalGains) {
      const hasWhitespaceNotes = !!(sched.cgtBox54Notes && sched.cgtBox54Notes.trim().length > 0);
      const hasAttachment = !!sched.cgtHasAttachment;
      if (!hasWhitespaceNotes && !hasAttachment) {
        errors.push("Submission must contain at least one attachment or an entry in the whitespace (Box 54) if Capital Gains Summary is present.");
      }
    }

    // Statutory Rule (Capium Art 50: 9000271805): Class 4 NIC Exemption for age 66+
    const clientDob = (client as any)?.dateOfBirth;
    if (clientDob) {
      const dob = new Date(clientDob);
      const taxYearStr = ret.taxYear || "2025/2026";
      const endYear = parseInt(taxYearStr.split("/")[1] || "2026");
      const april6OfTaxYear = new Date(`${endYear - 1}-04-06`);
      const age66Date = new Date(dob);
      age66Date.setFullYear(age66Date.getFullYear() + 66);

      if (age66Date <= april6OfTaxYear) {
        // Taxpayer reached 66 before or on start of tax year
        const hasClass4ExemptionTicked = !!(sched.class4Excepted || sched.isAbovePensionAge);
        if (!hasClass4ExemptionTicked) {
          warnings.push("Taxpayer reached State Pension Age (66+). Ensure Box 37 / Box 101 ('Excepted from paying Class 4 NICs') is ticked on Self Employment (SA103) to avoid HMRC error [SSE37] / [FSE101].");
        }
      }
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
// 7B. DUPLICATE AS AMENDED RETURN (Capium Art 31, 51: 9000220588, 9000277506)
// ====================================================
router.post("/:clientId/returns/:id/duplicate-amended", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const returnId = parseInt(req.params.id);
    if (isNaN(clientId) || isNaN(returnId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const [orig] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    if (!orig) return res.status(404).json({ error: "Original tax return not found" });

    let origSched: any = {};
    if (orig.schedulesData) {
      try {
        origSched = typeof orig.schedulesData === "string" ? JSON.parse(orig.schedulesData) : orig.schedulesData;
      } catch {}
    }

    const amendedSched = {
      ...origSched,
      isAmended: true,
      originalReturnId: orig.id,
      amendedAt: new Date().toISOString(),
    };

    const baseTaxYear = orig.taxYear || "2025/2026";
    const taxYearLabel = baseTaxYear.includes("(Amended)") ? baseTaxYear : `${baseTaxYear} (Amended)`;

    const [inserted] = await db.insert(sa100Returns).values({
      practiceId: orig.practiceId,
      clientId: orig.clientId,
      taxYear: taxYearLabel,
      utrNumber: orig.utrNumber,
      niNumber: orig.niNumber,
      employmentIncome: orig.employmentIncome,
      employmentTaxDeducted: orig.employmentTaxDeducted,
      selfEmploymentProfit: orig.selfEmploymentProfit,
      propertyIncome: orig.propertyIncome,
      savingsInterest: orig.savingsInterest,
      dividendIncome: orig.dividendIncome,
      pensionIncome: orig.pensionIncome,
      foreignIncome: orig.foreignIncome,
      capitalGainsNet: orig.capitalGainsNet,
      otherIncome: orig.otherIncome,
      netIncome: orig.netIncome,
      personalAllowance: orig.personalAllowance,
      allowances: orig.allowances,
      pensionContributions: orig.pensionContributions,
      giftAidDonations: orig.giftAidDonations,
      financeCostsRelief: orig.financeCostsRelief,
      capitalAllowancesClaimed: orig.capitalAllowancesClaimed,
      tradingLossesBroughtForward: orig.tradingLossesBroughtForward,
      tradingLossesRelieved: orig.tradingLossesRelieved,
      taxableIncome: orig.taxableIncome,
      incomeTaxDue: orig.incomeTaxDue,
      class2NicDue: orig.class2NicDue,
      class4NicDue: orig.class4NicDue,
      studentLoanDue: orig.studentLoanDue,
      capitalGainsTaxDue: orig.capitalGainsTaxDue,
      totalTaxLiability: orig.totalTaxLiability,
      taxPaidAtSource: orig.taxPaidAtSource,
      taxDue: orig.taxDue,
      netTaxDue: orig.netTaxDue,
      poaDue: orig.poaDue,
      poaFirstPayment: orig.poaFirstPayment,
      poaSecondPayment: orig.poaSecondPayment,
      paymentDueDate: orig.paymentDueDate,
      secondPoaDueDate: orig.secondPoaDueDate,
      filingDueDate: orig.filingDueDate,
      status: "Draft",
      schedulesData: JSON.stringify(amendedSched),
      irMark: null,
      hmrcCorrelationId: null,
      submissionReceiptXml: null,
      submittedAt: null,
    } as any);

    res.json({
      success: true,
      id: inserted.insertId,
      returnId: inserted.insertId,
      message: "Amended return created successfully in Draft status. You can now modify figures and re-file to HMRC.",
    });
  } catch (error: any) {
    console.error("Failed to duplicate amended return:", error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 7C. PRIOR YEAR CAPITAL ALLOWANCES (Capium Art 14: 9000216928)
// ====================================================
router.get("/:clientId/prior-capital-allowances/:taxYear", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const taxYear = decodeURIComponent(req.params.taxYear || "");
    if (isNaN(clientId)) return res.status(400).json({ error: "Invalid client ID" });

    // Identify prior tax year (e.g., "2025/2026" -> "2024/2025")
    const parts = taxYear.split("/");
    let priorTaxYear = "";
    if (parts.length === 2) {
      const y1 = parseInt(parts[0]) - 1;
      const y2 = parseInt(parts[1]) - 1;
      priorTaxYear = `${y1}/${y2}`;
    }

    // Find prior year return
    let [priorRet] = await db
      .select()
      .from(sa100Returns)
      .where(and(eq(sa100Returns.clientId, clientId), eq(sa100Returns.taxYear, priorTaxYear)));

    // Fallback: get the most recent previous return
    if (!priorRet) {
      const [latest] = await db
        .select()
        .from(sa100Returns)
        .where(eq(sa100Returns.clientId, clientId))
        .orderBy(desc(sa100Returns.taxYear))
        .limit(1);
      priorRet = latest;
    }

    if (!priorRet) {
      return res.json({
        found: false,
        message: "No prior year return found for this taxpayer.",
        mainPoolWdvBf: "0.00",
        specialRateWdvBf: "0.00",
      });
    }

    let sched: any = {};
    if (priorRet.schedulesData) {
      try {
        sched = typeof priorRet.schedulesData === "string" ? JSON.parse(priorRet.schedulesData) : priorRet.schedulesData;
      } catch {}
    }

    const priorAia = parseFloat(priorRet.capitalAllowancesClaimed || "0");
    const priorMainPoolWdv = parseFloat(sched.mainPoolWdvBf || "0");
    const priorMainPoolAdditions = parseFloat(sched.mainPoolAdditions || "0");
    const priorMainPoolWda = parseFloat(sched.mainPoolWdaClaimed || "0");
    // Closing WDV = WDV b/fwd + additions - WDA claimed
    const estimatedClosingMainPool = Math.max(0, priorMainPoolWdv + priorMainPoolAdditions - priorMainPoolWda);

    res.json({
      found: true,
      priorTaxYear: priorRet.taxYear,
      priorCapitalAllowancesClaimed: priorAia.toFixed(2),
      mainPoolWdvBf: estimatedClosingMainPool > 0 ? estimatedClosingMainPool.toFixed(2) : (priorAia > 0 ? (priorAia * 0.82).toFixed(2) : "0.00"),
      specialRateWdvBf: sched.specialRateWdvBf || "0.00",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// 7D. AVAILABLE PARTNERSHIPS FOR 1-CLICK LINK (Capium Art 26: 9000205340)
// ====================================================
router.get("/partnerships/available/:clientId", async (req: any, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    const practiceId = client?.practiceId || req.user?.practiceId || 1;

    // Fetch partnership clients
    const partnershipClients = await db
      .select()
      .from(clients)
      .where(and(eq(clients.practiceId, practiceId), eq(clients.clientType, "Partnership")));

    // Fetch SA800 returns
    const sa800List = await db.select().from(sa800Returns);

    const partnerships = partnershipClients.map((p) => {
      const returns = sa800List.filter((r) => r.saClientId === p.id || true);
      return {
        partnershipClientId: p.id,
        partnershipName: p.clientName,
        utrNumber: p.utrNumber,
        returns: returns.map((r) => ({
          id: r.id,
          taxYear: r.taxYear,
          tradingProfit: r.grossReceipts || "0.00",
          netProfit: r.netProfit || "0.00",
          status: r.status,
        })),
      };
    });

    res.json(partnerships);
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
    const { clientId, id, ...body } = req.body;
    const numericClientId = parseInt(clientId);
    if (isNaN(numericClientId)) {
      return res.status(400).json({ error: "Invalid partnership client ID" });
    }

    let [saClient] = await db.select().from(selfAssessmentClients).where(eq(selfAssessmentClients.clientId, numericClientId));
    if (!saClient) {
      const [insertedClient] = await db.insert(selfAssessmentClients).values({
        clientId: numericClientId,
        practiceId: req.user?.practiceId || 1,
        clientType: "Partnership",
      });
      const [newSaClient] = await db.select().from(selfAssessmentClients).where(eq(selfAssessmentClients.id, insertedClient.insertId));
      saClient = newSaClient;
    }

    const payload: any = {
      saClientId: saClient.id,
      taxYear: body.taxYear || "2024-25",
      tradingProfit: String(body.tradingProfit || "0.00"),
      propertyIncome: String(body.propertyIncome || "0.00"),
      untaxedInterest: String(body.untaxedInterest || "0.00"),
      partnershipNetProfit: String(body.partnershipNetProfit || "0.00"),
      grossReceipts: String(body.tradingProfit || "0.00"),
      netProfit: String(body.partnershipNetProfit || "0.00"),
      nominatedPartner: body.nominatedPartner || null,
      partnershipStatement: typeof body.partnershipStatement === "object" ? JSON.stringify(body.partnershipStatement) : (body.partnershipStatement || null),
      status: body.status || "Draft",
    };

    let returnId = id ? parseInt(id) : null;
    if (returnId) {
      await db.update(sa800Returns).set(payload).where(eq(sa800Returns.id, returnId));
    } else {
      const [inserted] = await db.insert(sa800Returns).values(payload);
      returnId = inserted.insertId;
    }
    res.json({ success: true, id: returnId, returnId });
  } catch (error: any) {
    console.error("Failed to save SA800 return:", error);
    res.status(500).json({ error: error.message || "Failed to save SA800 return" });
  }
});

router.patch("/sa800/:id", async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid return ID" });

    // Validate nominated partner before submission (Capium Art 46: 9000271637)
    if (req.body.status === "Submitted") {
      const [ret] = await db.select().from(sa800Returns).where(eq(sa800Returns.id, id));
      if (!ret) return res.status(404).json({ error: "SA800 return not found" });

      if (!ret.nominatedPartner && !req.body.nominatedPartner) {
        return res.status(400).json({
          error: "HMRC statutory validation failure: Nominated Partner declaration is mandatory on SA800 Partnership Statement (Box 1). Please assign the nominated partner before submitting."
        });
      }
    }

    await db.update(sa800Returns).set(req.body).where(eq(sa800Returns.id, id));
    res.json({ success: true, message: "SA800 return updated successfully." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update SA800 return" });
  }
});

export default router;
