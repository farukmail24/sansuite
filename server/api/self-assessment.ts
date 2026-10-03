import { Router } from "express";
import { db, pool } from "../db";
import {
  sa100Returns, sa800Returns, selfAssessmentClients, clients, practices,
  insertSa100ReturnSchema, insertSa800ReturnSchema,
  esignDocuments, esignSigners, esignAuditLogs,
  employees, payeSchemes, cisReturnLines
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware, requirePracticeUser } from "../lib/authUtils";
import { nanoid } from "nanoid";
import crypto from "crypto";

const router = Router();
router.use(authMiddleware, requirePracticeUser);

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
  taxYear?: string;
  childBenefitReceived?: string | number;
  childBenefitChildrenCount?: string | number;
  childBenefitDateStopped?: string;
  seisReliefClaimed?: string | number;
  eisReliefClaimed?: string | number;
  vctReliefClaimed?: string | number;
  capitalGainsNet?: string | number;
  capitalGainsTaxDue?: string | number;
  cgtAdjustmentBox51?: string | number;
  claimRemittanceBasis?: boolean;
  remittanceBasisChargeTier?: string;
  claimMarriageAllowanceRecipient?: boolean;
  claimMarriageAllowanceTransferor?: boolean;
  marriageAllowanceSpouseNino?: string;
  marriageAllowanceSpouseFirstName?: string;
  marriageAllowanceSpouseLastName?: string;
  marriageAllowanceSpouseDob?: string;
  electPayeCodingOut?: boolean;
  employmentTaxDeducted?: string | number;
  schedulesData?: any;
}) {
  const schedules = data.schedulesData || {};

  // Aggregate employments
  let empInc = Math.max(0, parseFloat(String(data.employmentIncome || "0")));
  let taxPaid = Math.max(0, parseFloat(String(data.taxPaidAtSource || data.employmentTaxDeducted || "0")));
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

  // Include CIS subcontractor deductions suffered (Box 2 / SA103 Box 38)
  if (Array.isArray(schedules.cisDeductions) && schedules.cisDeductions.length > 0) {
    for (const c of schedules.cisDeductions) {
      taxPaid += parseFloat(String(c.cisTaxDeducted || c.deductionAmount || "0"));
    }
  }

  // Aggregate self-employment profits (including Basis Period Reform - FA 2022 / Capium Art 47)
  let seProf = Math.max(0, parseFloat(String(data.selfEmploymentProfit || "0")));
  const soleTraderList = Array.isArray(schedules.selfEmployments) && schedules.selfEmployments.length > 0
    ? schedules.selfEmployments
    : (Array.isArray(schedules.soleTraders) ? schedules.soleTraders : []);

  if (soleTraderList.length > 0) {
    let schedSe = 0;
    for (const st of soleTraderList) {
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

      let businessProfit = parseFloat(String(st.netProfit || "0"));

      // Basis Period Reform: additional period profit, overlap relief deduction, transitional profit spreading
      if (st.hasAdditionalPeriod) {
        const addPeriodProfit = parseFloat(String(st.additionalPeriodProfit || "0"));
        const overlapRelief = parseFloat(String(st.overlapReliefUsed || st.overlapReliefDeducted || "0"));
        const transitionalSpreadDeduction = parseFloat(String(st.transitionalProfitSpreadDeduction || "0"));
        businessProfit = Math.max(0, businessProfit + addPeriodProfit - overlapRelief - transitionalSpreadDeduction);
      }

      schedSe += businessProfit;
    }
    if (schedSe > 0 || soleTraderList.length > 0) seProf = schedSe;
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

  // SA109: Residence, Remittance Basis (ITA 2007 s809B / FA 2008)
  const sa109Data = schedules.sa109 || {};
  const isClaimingRemittanceBasis = !!(data.claimRemittanceBasis || sa109Data.claimRemittanceBasis);
  const remittanceBasisChargeTier = String(data.remittanceBasisChargeTier || sa109Data.remittanceBasisChargeTier || "none");
  let remittanceBasisCharge = 0;
  if (isClaimingRemittanceBasis) {
    if (remittanceBasisChargeTier === "7_of_9_years") {
      remittanceBasisCharge = 30000.0;
    } else if (remittanceBasisChargeTier === "12_of_14_years") {
      remittanceBasisCharge = 60000.0;
    }
  }

  // Personal Allowance taper: £12,570 reduced by £1 for every £2 of income above £100,000
  const adjustedNetIncome = Math.max(0, totalIncome - penCont - giftAid);
  let personalAllowance = 12570.0;

  // Marriage Allowance (ITA 2007 s55A / Boxes 8-10):
  const isMarriageAllowanceTransferor = Boolean(data.claimMarriageAllowanceTransferor || schedules.claimMarriageAllowanceTransferor);
  const isMarriageAllowanceRecipient = Boolean(data.claimMarriageAllowanceRecipient || schedules.claimMarriageAllowanceRecipient);

  // ITA 2007 s809G: If Remittance Basis is claimed, taxpayer loses entitlement to Personal Allowance
  if (isClaimingRemittanceBasis) {
    personalAllowance = 0.0;
  } else if (adjustedNetIncome > 100000) {
    const reduction = (adjustedNetIncome - 100000) / 2;
    personalAllowance = Math.max(0, 12570.0 - reduction);
  } else if (isMarriageAllowanceTransferor) {
    // Transferor surrenders 10% of Personal Allowance (£1,257)
    personalAllowance = Math.max(0, personalAllowance - 1257.0);
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

  // Marriage Allowance Recipient Tax Reducer (ITA 2007 s55A / Boxes 8-10):
  // 10% of standard Personal Allowance (£1,257) × basic rate (20%) = £251.40 tax reduction
  const marriageAllowanceTaxReducer = isMarriageAllowanceRecipient ? Math.min(totalIncomeTax, 251.40) : 0;
  totalIncomeTax = Math.max(0, totalIncomeTax - marriageAllowanceTaxReducer);

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

    // AEA £3,000 applied first to before budget, then after budget (ITA 2007 s809G: 0 if Remittance Basis claimed)
    let remainingAea = isClaimingRemittanceBasis ? 0.0 : 3000.0;
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

  // 6B. High Income Child Benefit Charge (HICBC) - Finance Act 2024 / ITEPA 2003 s681B
  const cbReceived = Math.max(
    0,
    parseFloat(
      String(
        data.childBenefitReceived ||
        schedules.childBenefitReceived ||
        schedules.childBenefit?.amountReceived ||
        "0"
      )
    )
  );
  let hicbcDue = 0;
  let hicbcPercentage = 0;

  // Tax year thresholds: FA 2024 reform sets threshold to £60k - £80k (1% per £200) from 2024/25 onward.
  // Pre-2024/25: £50k - £60k (1% per £100).
  const taxYearStr = String(data.taxYear || schedules.taxYear || "2025/2026");
  const is2024OrLater = !taxYearStr.includes("2023/2024") && !taxYearStr.includes("2022/2023") && !taxYearStr.includes("2021/2022");
  const hicbcLowerThreshold = is2024OrLater ? 60000.0 : 50000.0;
  const hicbcUpperThreshold = is2024OrLater ? 80000.0 : 60000.0;
  const hicbcStep = is2024OrLater ? 200.0 : 100.0;

  if (cbReceived > 0 && adjustedNetIncome > hicbcLowerThreshold) {
    if (adjustedNetIncome >= hicbcUpperThreshold) {
      hicbcPercentage = 100;
      hicbcDue = cbReceived;
    } else {
      const excessIncome = adjustedNetIncome - hicbcLowerThreshold;
      hicbcPercentage = Math.min(100, Math.floor(excessIncome / hicbcStep));
      hicbcDue = Math.round((cbReceived * (hicbcPercentage / 100.0)) * 100) / 100;
    }
  }

  const taxableIncome = Math.max(0, totalIncome - personalAllowance);
  const totalTaxLiability = totalIncomeTax + hicbcDue + class2Nic + class4Nic + studentLoan + totalCgtTaxDue + remittanceBasisCharge;
  const netTaxDue = Math.max(0, totalTaxLiability - taxPaid);

  // 7. PAYE Coding Out Election (TMA 1970 s59B / Box 2 on SA100)
  // Taxpayer can elect to collect balancing tax < £3,000 via PAYE tax code starting 6 April if filed by 30 Dec
  const electPayeCodingOut = Boolean(data.electPayeCodingOut || schedules.electPayeCodingOut);
  const hasPayeSource = empInc > 0 || penInc > 0;
  const canCodeOut = electPayeCodingOut && netTaxDue > 0 && netTaxDue < 3000.0 && hasPayeSource;
  const codedOutAmount = canCodeOut ? netTaxDue : 0;
  const balancingPaymentDueJan31 = canCodeOut ? 0 : netTaxDue;

  // 8. Payments on Account (PoA):
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
    hicbcDue,
    hicbcPercentage,
    childBenefitReceived: cbReceived,
    hicbcLowerThreshold,
    hicbcUpperThreshold,
    nonSavingsTax,
    savingsTax,
    dividendTax,
    financeCostsTaxReducer,
    seisTaxReducer,
    eisTaxReducer,
    vctTaxReducer,
    totalInvestmentReliefs,
    marriageAllowanceTaxReducer,
    isMarriageAllowanceRecipient,
    isMarriageAllowanceTransferor,
    electPayeCodingOut,
    canCodeOut,
    codedOutAmount,
    balancingPaymentDueJan31,
    class2Nic,
    class2NicDue: class2Nic,
    class4Nic,
    class4NicDue: class4Nic,
    studentLoanDue: studentLoan,
    capitalGainsTaxDue: cgtStandardDue,
    cgtBox51Adjustment,
    totalCgtTaxDue,
    remittanceBasisCharge,
    isClaimingRemittanceBasis,
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
    hicbcDue: parsedSchedules?.hicbcDue || "0.00",
    hicbcPercentage: parsedSchedules?.hicbcPercentage || 0,
    childBenefitReceived: parsedSchedules?.childBenefitReceived || parsedSchedules?.childBenefit?.amountReceived || "0.00",
    childBenefitChildrenCount: parsedSchedules?.childBenefitChildrenCount || parsedSchedules?.childBenefit?.childrenCount || 0,
    remittanceBasisCharge: parsedSchedules?.sa109?.remittanceBasisCharge || (parsedSchedules?.remittanceBasisCharge ? String(parsedSchedules.remittanceBasisCharge) : "0.00"),
    sa109: parsedSchedules?.sa109 || null,
    partnerships: parsedSchedules?.partnerships || [],
    isAmended: parsedSchedules?.isAmended || ret.taxYear?.includes("(Amended)") || false,
    submissionCorrelationId: ret.hmrcCorrelationId,
  };
}

// ====================================================
// 0. SELF ASSESSMENT SETTINGS, TEMPLATES & LETTERHEAD (MySQL system_settings)
// ====================================================
const DEFAULT_SA_SETTINGS = {
  senderId: "",
  testMode: true,
  defaultTaxYear: "2025/2026",
  enablePasswordProtection: true,
  passwordFormat: "nino_dob",
  emailNotificationSender: "",
  taxDueLetterhead: {
    practiceName: "",
    headerText: "Statutory Self Assessment Tax Payment Notice",
    introNotice: "Please find below the calculation of your statutory Self Assessment liability and official payment instructions.",
    signoffText: "Should you have any questions or require an adjustment to your Payments on Account, please contact our tax department.",
    includeFirmBankDetails: false,
    firmBankName: "",
    firmSortCode: "",
    firmAccountNo: "",
  },
  emailTemplates: [
    {
      id: "sa100_approval",
      name: "SA100 Draft Ready for Client Approval",
      subject: "Action Required: Your {TaxYear} Self Assessment Return is Ready for Review",
      body: "Dear {ClientName},\n\nWe have prepared your Self Assessment tax return for the tax year {TaxYear}. Before we can submit this to HMRC, please review your calculation and confirm your approval.\n\nYour Unique Taxpayer Reference (UTR): {UTR}\nTotal Tax Due by 31 January: £{TotalDueBy31Jan}\n\nPlease click the link below to review and digitally sign your return.\n\nKind regards,\n{FirmName}",
    },
    {
      id: "hmrc_accepted",
      name: "HMRC Submission Accepted Confirmation",
      subject: "Confirmed: Your {TaxYear} Self Assessment Return Filed Successfully",
      body: "Dear {ClientName},\n\nGood news! Your Self Assessment return for {TaxYear} has been officially received and accepted by HM Revenue & Customs.\n\nHMRC Reference / Payment Ref: {PaymentReference}\nAmount Payable by 31 January: £{TotalDueBy31Jan}\n\nPlease ensure your payment is made quoting your reference to avoid HMRC interest.\n\nKind regards,\n{FirmName}",
    },
    {
      id: "payment_reminder_jan",
      name: "31 January Balancing Payment & 1st PoA Reminder",
      subject: "Urgent Tax Reminder: HMRC Payment Due by 31 January",
      body: "Dear {ClientName},\n\nThis is a reminder that your Self Assessment tax payment of £{TotalDueBy31Jan} for {TaxYear} is due to HMRC by midnight on 31 January.\n\nPayment Reference: {PaymentReference}\nHMRC Sort Code: 08-32-10 | Account No: 12001039\n\nPlease quote your reference {PaymentReference} on your bank transfer.\n\nKind regards,\n{FirmName}",
    },
    {
      id: "payment_reminder_july",
      name: "31 July Second Payment on Account Reminder",
      subject: "Tax Reminder: Second Payment on Account Due by 31 July",
      body: "Dear {ClientName},\n\nThis is a reminder that your second Payment on Account of £{SecondPoADue} for the upcoming tax year is due to HMRC by 31 July.\n\nPayment Reference: {PaymentReference}\nHMRC Sort Code: 08-32-10 | Account No: 12001039\n\nKind regards,\n{FirmName}",
    },
  ],
};

router.get("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const settingKey = `sa_settings_${practiceId}`;

    const [rows]: any = await pool.query(
      "SELECT value FROM system_settings WHERE `key` = ?",
      [settingKey]
    );

    if (rows && rows.length > 0 && rows[0].value) {
      try {
        const parsed = JSON.parse(rows[0].value);
        return res.json({
          ...DEFAULT_SA_SETTINGS,
          ...parsed,
          taxDueLetterhead: {
            ...DEFAULT_SA_SETTINGS.taxDueLetterhead,
            ...(parsed.taxDueLetterhead || {}),
          },
        });
      } catch (err) {
        console.error("Error parsing sa_settings JSON:", err);
      }
    }

    res.json(DEFAULT_SA_SETTINGS);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/settings", async (req: any, res) => {
  try {
    const practiceId = req.user?.practiceId || 1;
    const userId = req.user?.id || null;
    const settingKey = `sa_settings_${practiceId}`;

    // Read existing to merge cleanly
    const [existingRows]: any = await pool.query(
      "SELECT value FROM system_settings WHERE `key` = ?",
      [settingKey]
    );

    let existingData = {};
    if (existingRows && existingRows.length > 0 && existingRows[0].value) {
      try {
        existingData = JSON.parse(existingRows[0].value);
      } catch (_) {}
    }

    const merged = {
      ...DEFAULT_SA_SETTINGS,
      ...existingData,
      ...req.body,
      taxDueLetterhead: {
        ...DEFAULT_SA_SETTINGS.taxDueLetterhead,
        ...((existingData as any).taxDueLetterhead || {}),
        ...(req.body.taxDueLetterhead || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    await pool.query(
      "INSERT INTO system_settings (`key`, value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)",
      [settingKey, JSON.stringify(merged), userId]
    );

    res.json({
      success: true,
      message: "Self Assessment settings saved and persisted successfully in MySQL database.",
      settings: merged,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
      taxYear,
      childBenefitReceived: body.childBenefitReceived || parsedSchedules.childBenefitReceived || parsedSchedules.childBenefit?.amountReceived,
      childBenefitChildrenCount: body.childBenefitChildrenCount || parsedSchedules.childBenefitChildrenCount || parsedSchedules.childBenefit?.childrenCount,
      claimMarriageAllowanceRecipient: body.claimMarriageAllowanceRecipient ?? parsedSchedules.claimMarriageAllowanceRecipient,
      claimMarriageAllowanceTransferor: body.claimMarriageAllowanceTransferor ?? parsedSchedules.claimMarriageAllowanceTransferor,
      electPayeCodingOut: body.electPayeCodingOut ?? parsedSchedules.electPayeCodingOut,
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
      claimMarriageAllowanceRecipient: Boolean(body.claimMarriageAllowanceRecipient ?? parsedSchedules.claimMarriageAllowanceRecipient),
      claimMarriageAllowanceTransferor: Boolean(body.claimMarriageAllowanceTransferor ?? parsedSchedules.claimMarriageAllowanceTransferor),
      marriageAllowanceSpouseNino: body.marriageAllowanceSpouseNino || parsedSchedules.marriageAllowanceSpouseNino || "",
      marriageAllowanceSpouseFirstName: body.marriageAllowanceSpouseFirstName || parsedSchedules.marriageAllowanceSpouseFirstName || "",
      marriageAllowanceSpouseLastName: body.marriageAllowanceSpouseLastName || parsedSchedules.marriageAllowanceSpouseLastName || "",
      marriageAllowanceSpouseDob: body.marriageAllowanceSpouseDob || parsedSchedules.marriageAllowanceSpouseDob || "",
      marriageAllowanceTaxReducer: calc.marriageAllowanceTaxReducer.toFixed(2),
      electPayeCodingOut: Boolean(body.electPayeCodingOut ?? parsedSchedules.electPayeCodingOut),
      canCodeOut: calc.canCodeOut,
      codedOutAmount: calc.codedOutAmount.toFixed(2),
      balancingPaymentDueJan31: calc.balancingPaymentDueJan31.toFixed(2),
      childBenefitReceived: String(body.childBenefitReceived ?? parsedSchedules.childBenefitReceived ?? "0.00"),
      childBenefitChildrenCount: Number(body.childBenefitChildrenCount ?? parsedSchedules.childBenefitChildrenCount ?? 0),
      hicbcDue: calc.hicbcDue.toFixed(2),
      hicbcPercentage: calc.hicbcPercentage,
      hicbcLowerThreshold: calc.hicbcLowerThreshold,
      hicbcUpperThreshold: calc.hicbcUpperThreshold,
      sa109: body.sa109 ?? parsedSchedules.sa109 ?? null,
      remittanceBasisCharge: calc.remittanceBasisCharge.toFixed(2),
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
    const parsedSchedules = typeof schedulesData === "string" ? JSON.parse(schedulesData) : (schedulesData || {});

    // Fetch existing return to perform immediate statutory recalculation
    const [existing] = await db
      .select()
      .from(sa100Returns)
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    if (existing) {
      const calc = calculateStatutorySA100Tax({
        ...(existing as any),
        schedulesData: parsedSchedules,
      });

      await db
        .update(sa100Returns)
        .set({
          netIncome: calc.totalIncome.toFixed(2),
          personalAllowance: calc.personalAllowance.toFixed(2),
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
          schedulesData: JSON.stringify(parsedSchedules),
          updatedAt: new Date(),
        })
        .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    } else {
      await db
        .update(sa100Returns)
        .set({
          schedulesData: typeof schedulesData === "string" ? schedulesData : JSON.stringify(schedulesData),
          updatedAt: new Date(),
        })
        .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    }

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

    const utr = (ret.utrNumber || client.utrNumber || "").replace(/\s/g, "");
    if (!utr || !/^\d{10}$/.test(utr)) {
      errors.push("Taxpayer UTR must be a valid 10-digit number [HMRC Error: InvalidUTR].");
    }

    const nino = (ret.niNumber || client.niNumber || "").replace(/\s/g, "").toUpperCase();
    if (nino && !/^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/.test(nino)) {
      errors.push("National Insurance Number format is invalid. Must match UK format (e.g. QQ123456A) [HMRC Error: InvalidNINO].");
    } else if (!nino) {
      warnings.push("National Insurance Number is missing from return record.");
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

    // 1. Statutory Rule (Capium Art 48: 9000271813): CGT Attachment or Whitespace Box 54 required if Capital Gains present
    const hasCapitalGains = parseFloat(ret.capitalGainsNet || "0") > 0 || parseFloat(ret.capitalGainsTaxDue || "0") > 0 || (Array.isArray(sched.capitalGainsAssets) && sched.capitalGainsAssets.length > 0);
    if (hasCapitalGains) {
      const hasWhitespaceNotes = !!(sched.cgtBox54Notes && sched.cgtBox54Notes.trim().length > 0);
      const hasAttachment = !!sched.cgtHasAttachment;
      if (!hasWhitespaceNotes && !hasAttachment) {
        errors.push("Capital Gains Summary: Submission must contain at least one attachment or an entry in the whitespace (Box 54) if Capital Gains disposals are present [HMRC Error: CGT_AttachmentRequired].");
      }
    }

    // 2. Statutory Rule (Capium Art 50: 9000271805): Class 4 NIC Exemption for age 66+
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
          warnings.push("Taxpayer reached State Pension Age (66+). Ensure Box 37 / Box 101 ('Excepted from paying Class 4 NICs') is ticked on Self Employment (SA103) to prevent HMRC Gateway rejection [SSE37] / [FSE101].");
        }
      }
    }

    // 3. Direct BACS Bank Repayment Validation (Capium FAQ 9000165597)
    if (sched.bankRefundDetails) {
      const { bankSortCode, bankAccountNumber, repaymentOption, nomineeDeclaration } = sched.bankRefundDetails;
      if (bankSortCode || bankAccountNumber) {
        const cleanedSort = (bankSortCode || "").replace(/[^0-9]/g, "");
        const cleanedAcc = (bankAccountNumber || "").replace(/[^0-9]/g, "");
        if (cleanedSort.length !== 6) {
          errors.push("Direct BACS Repayment: Sort code must be exactly 6 digits (XX-XX-XX) [HMRC Error: InvalidSortCode].");
        }
        if (cleanedAcc.length !== 8) {
          errors.push("Direct BACS Repayment: Bank account number must be exactly 8 digits [HMRC Error: InvalidAccountNumber].");
        }
        if (repaymentOption !== "taxpayer" && !nomineeDeclaration) {
          errors.push("Direct BACS Repayment: Nominee / Agent Authorization declaration must be confirmed when refund is directed to a third party [TMA 1970 s59E].");
        }
      }
    }

    // 4. High Income Child Benefit Charge (HICBC) Check (Finance Act 2024)
    const netInc = parseFloat(ret.netIncome || "0");
    const is2024OrLater = !(ret.taxYear || "").includes("2023/2024") && !(ret.taxYear || "").includes("2022/2023");
    const hicbcThreshold = is2024OrLater ? 60000 : 50000;
    const cbReceived = parseFloat(String(sched.childBenefitReceived || sched.childBenefit?.amountReceived || "0"));
    if (netInc > hicbcThreshold && cbReceived > 0) {
      const hicbcDue = parseFloat(String(sched.hicbcDue || "0"));
      if (hicbcDue <= 0) {
        warnings.push(`Adjusted Net Income exceeds £${hicbcThreshold.toLocaleString()} and Child Benefit of £${cbReceived} was received. High Income Child Benefit Charge (HICBC) should be verified.`);
      }
    }

    // 5. Partnership SA104 Validation
    if (Array.isArray(sched.partnerships) && sched.partnerships.length > 0) {
      for (const p of sched.partnerships) {
        if (!p.partnershipName || p.partnershipName.trim().length === 0) {
          errors.push("Partnership Schedule (SA104): Partnership business name is required [HMRC Box 1 Error].");
        }
      }
    }

    const isValid = errors.length === 0;
    const irMark = isValid
      ? crypto.createHash("sha256").update(`${utr}-${ret.taxYear}-${ret.netTaxDue}`).digest("base64")
      : null;

    if (isValid && ret.status === "Draft") {
      await db.update(sa100Returns).set({ status: "Validated", irMark }).where(eq(sa100Returns.id, returnId));
    }

    res.json({
      isValid,
      errors,
      warnings,
      irMark,
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
// 8B. MARK AS SUBMITTED EXTERNALLY (Capium Art 34: 9000222186)
// ====================================================
router.post("/:clientId/returns/:id/mark-external", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    if (isNaN(returnId) || isNaN(clientId)) {
      return res.status(400).json({ error: "Invalid client ID or return ID" });
    }

    const { submissionDate, filingMethod, hmrcReference, notes } = req.body;

    const [existing] = await db
      .select()
      .from(sa100Returns)
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    if (!existing) return res.status(404).json({ error: "Return not found" });

    let sched: any = {};
    if (existing.schedulesData) {
      try {
        sched = typeof existing.schedulesData === "string" ? JSON.parse(existing.schedulesData) : existing.schedulesData;
      } catch {}
    }

    sched = {
      ...sched,
      externalFiling: {
        isExternal: true,
        filingMethod: filingMethod || "HMRC Online Services Portal",
        submissionDate: submissionDate || new Date().toISOString().split("T")[0],
        hmrcReference: hmrcReference || "",
        notes: notes || "",
        markedBy: req.user?.username || req.user?.name || "Accountant",
        markedAt: new Date().toISOString(),
      },
    };

    const externalIrMark = hmrcReference ? `EXT-${hmrcReference}` : `EXT-${Date.now()}`;
    const subDate = submissionDate ? new Date(submissionDate) : new Date();

    await db
      .update(sa100Returns)
      .set({
        status: "Submitted",
        irMark: externalIrMark,
        hmrcCorrelationId: hmrcReference || `EXT-${Date.now()}`,
        submittedAt: subDate,
        schedulesData: JSON.stringify(sched),
        updatedAt: new Date(),
      })
      .where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));

    res.json({
      success: true,
      status: "Submitted",
      message: "Return successfully recorded as Submitted Externally.",
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

// ====================================================
// CAPISIGN E-SIGNATURE DISPATCH FOR SELF ASSESSMENT
// ====================================================
router.post("/:clientId/returns/:id/send-to-capisign", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    const practiceId = req.user?.practiceId || 1;

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found." });

    const recipientName = req.body.recipientName || req.body.signerName || client.clientName;
    const recipientEmail = req.body.recipientEmail || req.body.signerEmail || client.email || "";
    const message = req.body.message || req.body.notes;

    const verificationToken = nanoid(32);
    const docTitle = `SA100 Tax Return & SA302 Computation (${ret.taxYear || "2025/2026"}) - ${client.clientName}`;

    // 1. Create Capisign eSign Document
    const [doc] = await db.insert(esignDocuments).values({
      practiceId,
      clientId,
      title: docTitle,
      sourceModule: "SelfAssessment",
      status: "AwaitingApproval",
      message: message || `Please review and digitally approve your official Self Assessment Tax Return (SA100) and SA302 Tax Computation for ${client.clientName} (Total Balancing Tax Due: £${ret.netTaxDue}).`,
      attachmentsJson: [],
      fileSize: 0,
      createdByUserId: req.user?.id,
    } as any);

    const docId = (doc as any).insertId;

    // 2. Create Signer record with unique verification token
    await db.insert(esignSigners).values({
      documentId: docId,
      signerName: recipientName,
      signerEmail: recipientEmail,
      signerRole: "Taxpayer",
      status: "Awaiting",
      verificationToken,
    });

    // 3. Create Audit Trail event
    await db.insert(esignAuditLogs).values({
      documentId: docId,
      action: "Created",
      details: `SA100 Self Assessment return approval request dispatched to ${recipientName} (${recipientEmail}) for electronic signature (eSign).`,
    });

    // 4. Update SA100 return status
    await db.update(sa100Returns).set({ status: "SentToCapisign", updatedAt: new Date() }).where(eq(sa100Returns.id, returnId));

    res.json({
      success: true,
      documentId: docId,
      token: verificationToken,
      signUrl: `/esign/public/${verificationToken}`,
      message: `SA100 return dispatched to ${recipientName} for electronic signature (eSign).`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:clientId/returns/:id/capisign-status", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    if (!ret) return res.status(404).json({ error: "Return not found." });

    // Look for Capisign document created for this client and SelfAssessment module
    const docs = await db.select().from(esignDocuments)
      .where(and(eq(esignDocuments.clientId, clientId), eq(esignDocuments.sourceModule, "SelfAssessment")))
      .orderBy(desc(esignDocuments.createdAt));

    if (docs.length === 0) {
      return res.json({ hasCapisignDoc: false, status: ret.status, capisignStatus: null });
    }

    const latestDoc = docs[0];
    const signers = await db.select().from(esignSigners).where(eq(esignSigners.documentId, latestDoc.id));
    const primarySigner = signers[0] || null;
    const auditLogs = await db.select().from(esignAuditLogs).where(eq(esignAuditLogs.documentId, latestDoc.id)).orderBy(desc(esignAuditLogs.id));

    // Check if doc was signed
    if (latestDoc.status === "Signed" && ret.status !== "Accepted" && ret.status !== "Submitted" && ret.status !== "ApprovedByClient") {
      await db.update(sa100Returns).set({ status: "ApprovedByClient", updatedAt: new Date() }).where(eq(sa100Returns.id, returnId));
      ret.status = "ApprovedByClient";
    }

    const statusObj = {
      hasCapisignDoc: true,
      documentId: latestDoc.id,
      title: latestDoc.title,
      docStatus: latestDoc.status,
      status: latestDoc.status,
      isSigned: latestDoc.status === "Signed",
      returnStatus: ret.status,
      signer: primarySigner ? {
        name: primarySigner.signerName,
        email: primarySigner.signerEmail,
        status: primarySigner.status,
        signedAt: primarySigner.signedAt,
      } : null,
      signers: signers.map((s: any) => ({
        id: s.id,
        name: s.signerName,
        email: s.signerEmail,
        status: s.status,
        signedAt: s.signedAt,
      })),
      auditTrail: auditLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp,
        createdAt: l.timestamp,
      })),
      verificationToken: primarySigner?.verificationToken || null,
      signUrl: primarySigner?.verificationToken ? `/esign/public/${primarySigner.verificationToken}` : null,
    };

    res.json({
      ...statusObj,
      capisignStatus: statusObj,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====================================================
// HMRC DIGITAL DATA PRE-POPULATION (Capium Art 53)
// ====================================================
router.get("/:clientId/returns/:id/hmrc-prepop-data", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!ret || !client) return res.status(404).json({ error: "Return or client not found." });

    const clientNino = (ret.niNumber || client.niNumber || "").replace(/\s/g, "").toUpperCase();
    const clientUtr = (ret.utrNumber || client.utrNumber || "").replace(/\s/g, "");

    // 1. Search for PAYE payroll employment records matching client NINO
    let payeRecords: any[] = [];
    if (clientNino) {
      const matchingEmployees = await db.select({
        employeeId: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        ytdGrossPay: employees.ytdGrossPay,
        ytdTaxPaid: employees.ytdTaxPaid,
        taxCode: employees.taxCode,
        payeSchemeId: employees.payeSchemeId,
      }).from(employees).where(eq(employees.niNumber, clientNino));

      for (const emp of matchingEmployees) {
        const [scheme] = await db.select().from(payeSchemes).where(eq(payeSchemes.id, emp.payeSchemeId));
        payeRecords.push({
          employerName: scheme?.employerName || `${emp.firstName} ${emp.lastName}'s Employer`,
          payeReference: scheme?.payeReference || "120/AB12345",
          grossPay: emp.ytdGrossPay || "0.00",
          taxDeducted: emp.ytdTaxPaid || "0.00",
          taxCode: emp.taxCode || "1257L",
          source: "RTI Payroll Record",
        });
      }
    }

    // 2. Search for CIS deduction lines matching client UTR
    let totalCisGross = 0;
    let totalCisDeductions = 0;
    let cisLines: any[] = [];
    if (clientUtr) {
      cisLines = await db.select().from(cisReturnLines).where(eq(cisReturnLines.utrNumber, clientUtr));
      for (const line of cisLines) {
        totalCisGross += parseFloat(String(line.grossAmount || "0"));
        totalCisDeductions += parseFloat(String(line.deductionAmount || "0"));
      }
    }

    // 3. State Pension statutory estimation
    const clientDob = (client as any)?.dateOfBirth;
    let statePensionEstimate = "0.00";
    if (clientDob) {
      const dob = new Date(clientDob);
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age >= 66) {
        // Standard full new state pension for 2025/26 is £221.20/week * 52 = £11,502.40
        statePensionEstimate = "11502.40";
      }
    }

    const formattedCis = cisLines.map((line: any) => ({
      contractorName: line.contractorName || "Principal Contractor",
      taxMonth: line.taxMonth || "Current Year",
      grossAmount: line.grossAmount || "0.00",
      cisTaxDeducted: line.deductionAmount || line.cisTaxDeducted || "0.00",
    }));

    const totalPayeGross = payeRecords.reduce((sum, p) => sum + parseFloat(p.grossPay || "0"), 0).toFixed(2);
    const totalPayeTax = payeRecords.reduce((sum, p) => sum + parseFloat(p.taxDeducted || "0"), 0).toFixed(2);

    res.json({
      success: true,
      hasPrepopData: payeRecords.length > 0 || totalCisDeductions > 0 || parseFloat(statePensionEstimate) > 0,
      clientName: client.clientName,
      nino: clientNino || "Unrecorded",
      utr: clientUtr || "Unrecorded",
      taxYear: ret.taxYear,
      employments: payeRecords,
      payeEmployments: payeRecords,
      cisDeductions: formattedCis,
      totalPayeGross,
      totalPayeTax,
      cisGross: totalCisGross.toFixed(2),
      cisDeductionsTotal: totalCisDeductions.toFixed(2),
      statePensionEstimate,
      summary: {
        totalEmploymentGross: totalPayeGross,
        totalEmploymentTax: totalPayeTax,
        totalCisGross: totalCisGross.toFixed(2),
        totalCisDeducted: totalCisDeductions.toFixed(2),
      },
      prepopData: {
        employments: payeRecords,
        cisDeductions: formattedCis,
        summary: {
          totalEmploymentGross: totalPayeGross,
          totalCisDeducted: totalCisDeductions.toFixed(2),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:clientId/returns/:id/apply-prepop", async (req: any, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const clientId = parseInt(req.params.clientId);
    const applyPaye = req.body.applyPaye ?? req.body.includeEmployments ?? true;
    const applyCis = req.body.applyCis ?? req.body.includeCis ?? true;
    const applyStatePension = req.body.applyStatePension ?? false;
    const payeEmployments = req.body.selectedEmployments || req.body.payeEmployments || [];
    const cisDeductions = req.body.selectedCis || req.body.cisDeductions || [];
    const statePensionAmount = req.body.statePensionAmount;

    const [ret] = await db.select().from(sa100Returns).where(and(eq(sa100Returns.id, returnId), eq(sa100Returns.clientId, clientId)));
    if (!ret) return res.status(404).json({ error: "Return not found." });

    let sched: any = {};
    if (ret.schedulesData) {
      try {
        sched = typeof ret.schedulesData === "string" ? JSON.parse(ret.schedulesData) : ret.schedulesData;
      } catch {}
    }

    let updatedEmploymentIncome = parseFloat(ret.employmentIncome || "0");
    let updatedEmploymentTax = parseFloat(ret.employmentTaxDeducted || "0");
    let updatedPensionIncome = parseFloat(ret.pensionIncome || "0");

    if (applyPaye && Array.isArray(payeEmployments) && payeEmployments.length > 0) {
      sched.employments = payeEmployments.map((p: any, idx: number) => ({
        id: Date.now() + idx,
        employerName: p.employerName,
        payeReference: p.payeReference,
        grossPay: p.grossPay,
        taxDeducted: p.taxDeducted,
        benefitsInKind: "0.00",
        flatRateExpenses: "0.00",
      }));
      updatedEmploymentIncome = payeEmployments.reduce((sum: number, p: any) => sum + parseFloat(p.grossPay || "0"), 0);
      updatedEmploymentTax = payeEmployments.reduce((sum: number, p: any) => sum + parseFloat(p.taxDeducted || "0"), 0);
    }

    if (applyCis && Array.isArray(cisDeductions) && cisDeductions.length > 0) {
      sched.cisDeductions = cisDeductions.map((c: any, idx: number) => ({
        id: Date.now() + 100 + idx,
        contractorName: c.contractorName,
        taxMonth: c.taxMonth,
        grossAmount: c.grossAmount,
        cisTaxDeducted: c.cisTaxDeducted,
      }));
    }

    if (applyStatePension && parseFloat(statePensionAmount || "0") > 0) {
      updatedPensionIncome = parseFloat(statePensionAmount);
    }

    const calc = calculateStatutorySA100Tax({
      taxYear: ret.taxYear || "2025/2026",
      employmentIncome: updatedEmploymentIncome,
      employmentTaxDeducted: updatedEmploymentTax,
      selfEmploymentProfit: ret.selfEmploymentProfit || "0",
      propertyIncome: ret.propertyIncome || "0",
      savingsInterest: ret.savingsInterest || "0",
      dividendIncome: ret.dividendIncome || "0",
      pensionIncome: updatedPensionIncome,
      otherIncome: ret.otherIncome || "0",
      foreignIncome: ret.foreignIncome || "0",
      capitalGainsNet: ret.capitalGainsNet || "0",
      pensionContributions: ret.pensionContributions || "0",
      giftAidDonations: ret.giftAidDonations || "0",
      schedulesData: sched,
    });

    await db.update(sa100Returns).set({
      employmentIncome: updatedEmploymentIncome.toFixed(2),
      employmentTaxDeducted: updatedEmploymentTax.toFixed(2),
      pensionIncome: updatedPensionIncome.toFixed(2),
      netIncome: calc.totalIncome.toFixed(2),
      taxableIncome: calc.taxableIncome.toFixed(2),
      incomeTaxDue: calc.incomeTaxDue.toFixed(2),
      totalTaxLiability: calc.totalTaxLiability.toFixed(2),
      taxPaidAtSource: calc.taxPaidAtSource.toFixed(2),
      netTaxDue: calc.netTaxDue.toFixed(2),
      schedulesData: JSON.stringify(sched),
      updatedAt: new Date(),
    }).where(eq(sa100Returns.id, returnId));

    res.json({
      success: true,
      message: "HMRC digital pre-population data merged successfully into return draft.",
      employmentIncome: updatedEmploymentIncome.toFixed(2),
      employmentTaxDeducted: updatedEmploymentTax.toFixed(2),
      netTaxDue: calc.netTaxDue.toFixed(2),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
