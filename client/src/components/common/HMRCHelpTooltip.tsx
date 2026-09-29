import React, { useState, useRef, useEffect } from "react";
import * as Popover from "@radix-ui/react-popover";
import { HelpCircle, Info, ExternalLink, Shield, Calendar, Scale, X } from "lucide-react";

export type HMRCFormCode =
  | "SA100"
  | "SA800"
  | "SA102"
  | "SA103S"
  | "SA103F"
  | "SA104"
  | "SA105"
  | "SA106"
  | "SA108"
  | "SA109"
  | "SA302"
  | "MARRIAGE_ALLOWANCE"
  | "CODING_OUT"
  | "POA"
  | "HICBC"
  | "BASIS_PERIOD";

export interface HMRCGuideData {
  code: string;
  title: string;
  scheduleCategory: string;
  legislation: string;
  whoMustFile: string;
  statutoryThreshold: string;
  deadlineNotice: string;
  keyPoints: string[];
}

export const HMRC_GUIDES: Record<HMRCFormCode, HMRCGuideData> = {
  SA100: {
    code: "SA100",
    title: "Main Individual Tax Return",
    scheduleCategory: "Statutory Core Return",
    legislation: "Taxes Management Act 1970, s8 / s8A",
    whoMustFile: "All UK individuals with untaxed income, sole trader turnover, company directors, high-income earners (> £150,000), or those claiming tax reliefs.",
    statutoryThreshold: "Income exceeding Personal Allowance (£12,570) or untaxed income exceeding £1,000.",
    deadlineNotice: "31 January midnight (online) or 31 October (paper) following the end of the tax year.",
    keyPoints: [
      "Covers core savings interest, dividend vouchers, private pensions, and Gift Aid.",
      "Direct BACS account details for automatic HMRC tax repayments without paper cheque delay.",
      "Integrates with PAYE coding out election (TMA 1970 s59B) if balancing debt < £3,000.",
    ],
  },
  SA800: {
    code: "SA800",
    title: "Partnership Tax Return",
    scheduleCategory: "Entity Statutory Declaration",
    legislation: "Taxes Management Act 1970, s12AA",
    whoMustFile: "The nominated partner of an ordinary, limited, or LLP partnership operating in the UK.",
    statutoryThreshold: "Any active partnership trading or holding income-generating assets in the UK.",
    deadlineNotice: "31 January midnight (online) or 31 October (paper) following the tax year.",
    keyPoints: [
      "Calculates the partnership's total commercial profit or loss.",
      "Generates the Partnership Statement allocating profit shares to partners.",
      "Each partner's allocated share feeds directly into their individual SA104 schedule.",
    ],
  },
  SA102: {
    code: "SA102",
    title: "Employment Supplementary Pages",
    scheduleCategory: "Supplementary Schedule",
    legislation: "Income Tax (Earnings and Pensions) Act 2003 (ITEPA)",
    whoMustFile: "Individuals who worked as employees, held company directorships, or received PAYE income in the tax year.",
    statutoryThreshold: "Any earnings subject to PAYE or director's remuneration, P60, P45, or P11D benefits.",
    deadlineNotice: "Filed simultaneously with the main SA100 return by 31 January.",
    keyPoints: [
      "Box 1: Total gross taxable pay from P60 / P45.",
      "Box 2: Total PAYE tax deducted (credited directly against total Self Assessment tax due).",
      "P11D benefits in kind: company cars, fuel, medical insurance, interest-free director loans.",
    ],
  },
  SA103S: {
    code: "SA103S",
    title: "Self-Employment (Short) Form",
    scheduleCategory: "Simplified 3-Line Accounting",
    legislation: "Income Tax (Trading and Other Income) Act 2005 (ITTOIA)",
    whoMustFile: "Sole traders with straightforward business affairs and turnover strictly below the statutory VAT registration threshold.",
    statutoryThreshold: "Annual gross turnover strictly below £85,000 (raised to £90,000 from April 2024).",
    deadlineNotice: "Filed with the main SA100 return by 31 January.",
    keyPoints: [
      "Simplified 3-line accounting: Turnover, Total Allowable Expenses, and Net Trading Profit.",
      "No detailed balance sheet or categorized expense ledger required by HMRC.",
      "Cannot be used if claiming Capital Allowances, balancing charges, or overlap relief.",
    ],
  },
  SA103F: {
    code: "SA103F",
    title: "Self-Employment (Full) Form",
    scheduleCategory: "Comprehensive Trading Schedule",
    legislation: "ITTOIA 2005 / Finance Act 2022 (Basis Period Reform)",
    whoMustFile: "Sole traders with turnover at or above the VAT threshold (£85,000/£90,000), or those claiming capital allowances.",
    statutoryThreshold: "Gross business turnover £85,000+ or claiming AIA / WDA / Overlap Relief.",
    deadlineNotice: "Filed with the main SA100 return by 31 January.",
    keyPoints: [
      "Mandatory 15-category expense breakdown (cost of goods, motor, rent, professional fees).",
      "Full Capital Allowances schedules: Annual Investment Allowance (AIA), Main Pool WDA (18%), Special Rate (6%).",
      "Basis Period Reform (FA 2022) compliant: handles additional period profit, overlap relief deduction, and 5-year transitional spreading.",
    ],
  },
  SA104: {
    code: "SA104",
    title: "Partnership Share Pages",
    scheduleCategory: "Supplementary Schedule",
    legislation: "Taxes Management Act 1970, s12AB",
    whoMustFile: "Any individual who was a member of a partnership during the tax year.",
    statutoryThreshold: "Any allocated share of profit, loss, or capital allowances from a master SA800 return.",
    deadlineNotice: "Filed with the main SA100 return by 31 January.",
    keyPoints: [
      "Direct 1-click link to the firm's master SA800 Partnership Return in SanSuite.",
      "Automatically populates the individual's profit share percentage.",
      "Computes Class 2 and Class 4 National Insurance Contributions on partnership trading profits.",
    ],
  },
  SA105: {
    code: "SA105",
    title: "UK Property Income",
    scheduleCategory: "Supplementary Schedule",
    legislation: "ITTOIA 2005, Part 3 / Finance (No. 2) Act 2015 s24",
    whoMustFile: "Individuals receiving rental income from UK residential property, commercial lettings, or Furnished Holiday Lets (FHL).",
    statutoryThreshold: "Gross rental receipts exceeding the £1,000 Property Allowance.",
    deadlineNotice: "Filed with the main SA100 return by 31 January.",
    keyPoints: [
      "Section 24 Restriction: Finance costs (mortgage interest) restricted from trading deductions and granted as a 20% basic rate tax reducer.",
      "Supports Rent-a-Room relief (£7,500 threshold) and Property Income Allowance (£1,000).",
      "Automatic ringfencing of property losses carried forward to future years.",
    ],
  },
  SA106: {
    code: "SA106",
    title: "Foreign Income & Tax Credit",
    scheduleCategory: "Supplementary Schedule",
    legislation: "ITTOIA 2005 Part 8 / Taxation (International and Other Provisions) Act 2010",
    whoMustFile: "UK tax residents with overseas savings interest, dividends, foreign pensions, or foreign rental properties.",
    statutoryThreshold: "Any foreign dividend, interest, or property receipt exceeding £300 in the year.",
    deadlineNotice: "Filed with the main SA100 return by 31 January.",
    keyPoints: [
      "Calculates Foreign Tax Credit Relief (FTCR) against UK tax to prevent double taxation under bilateral treaties.",
      "Unremitted offshore gains and foreign branch profits disclosure.",
      "Requires country-by-country breakdown and exchange rates at transaction or average HMRC year rate.",
    ],
  },
  SA108: {
    code: "SA108",
    title: "Capital Gains Tax Summary",
    scheduleCategory: "Supplementary Schedule",
    legislation: "Taxation of Chargeable Gains Act 1992 / Autumn Budget 2024",
    whoMustFile: "Individuals who disposed of chargeable assets (shares, residential property, crypto, commercial assets).",
    statutoryThreshold: "Total net gains exceed the Annual Exempt Amount (£3,000 for 2024/25) or gross disposal proceeds exceed £50,000.",
    deadlineNotice: "Filed with the main SA100 return by 31 January (60-day reporting also required for UK residential property disposals).",
    keyPoints: [
      "Box 51 Adjustment: Automates the Autumn Budget 2024 rate change for disposals on/after 30 October 2024 (18% basic / 24% higher).",
      "Statutory Rule (Capium Art 48): Mandatory attachment or whitespace Box 54 computation required by HMRC Gateway.",
      "Applies Business Asset Disposal Relief (BADR) 10% rate up to £1M lifetime limit.",
    ],
  },
  SA109: {
    code: "SA109",
    title: "Residence, Domicile & Remittance",
    scheduleCategory: "Supplementary Schedule",
    legislation: "Finance Act 2013 Sch 45 (SRT) / Income Tax Act 2007 s809",
    whoMustFile: "Individuals who are non-resident in the UK, non-domiciled, claiming Split-Year treatment, or electing for the Remittance Basis.",
    statutoryThreshold: "Any cross-border tax status claim, overseas work days, or dual-residence treaty relief.",
    deadlineNotice: "Cannot be submitted via HMRC's basic consumer portal; requires commercial software like SanSuite.",
    keyPoints: [
      "Statutory Residence Test (SRT) tracking: Automatic Overseas, Automatic UK, and Sufficient Ties test.",
      "Remittance Basis Charge: £30,000 charge (resident 7 of 9 years) or £60,000 (resident 12 of 14 years).",
      "Claiming remittance basis eliminates the Personal Allowance (£12,570) and Capital Gains Exemption (£3,000) under ITA 2007 s809G.",
    ],
  },
  SA302: {
    code: "SA302",
    title: "Statutory Tax Calculation Summary",
    scheduleCategory: "Official HMRC Tax Computation",
    legislation: "Taxes Management Act 1970 / Income Tax Act 2007",
    whoMustFile: "Not filed by taxpayer; generated automatically by the HMRC engine and SanSuite from the SA100 return.",
    statutoryThreshold: "Statutory computation for all filed and draft returns.",
    deadlineNotice: "Permanent official tax proof for HMRC, mortgage lenders, and tier-1 UK banks.",
    keyPoints: [
      "Detailed breakdown across 20% basic, 40% higher, and 45% additional tax bands.",
      "Personal Allowance taper: £1 reduction per £2 of adjusted net income over £100,000.",
      "Establishes statutory Payments on Account (PoA) if balancing tax >= £1,000 and < 80% deducted at source.",
    ],
  },
  MARRIAGE_ALLOWANCE: {
    code: "ITA 2007 s55A",
    title: "Marriage Allowance Transfer",
    scheduleCategory: "Statutory Relief (Boxes 8-10)",
    legislation: "Income Tax Act 2007, sections 55A to 55E",
    whoMustFile: "Married couples or registered civil partners where one spouse earns less than the Personal Allowance (£12,570).",
    statutoryThreshold: "Transferor must have income < £12,570; recipient spouse must be a basic-rate taxpayer (taxable income < £50,270).",
    deadlineNotice: "Claimable on SA100 or backdated up to 4 previous tax years.",
    keyPoints: [
      "Transfers 10% of Personal Allowance (£1,257) from lower-earning partner to higher-earning partner.",
      "Reduces the recipient spouse's Income Tax bill directly by £251.40 (£1,257 × 20%).",
      "Not available if recipient spouse pays higher or additional rate tax (40% or 45%).",
    ],
  },
  CODING_OUT: {
    code: "TMA 1970 s59B",
    title: "PAYE Coding Out Election",
    scheduleCategory: "Statutory Collection Election (Box 2)",
    legislation: "Taxes Management Act 1970, s59B(1)",
    whoMustFile: "Taxpayers who are employed or receive a PAYE pension and owe less than £3,000 in Self Assessment tax.",
    statutoryThreshold: "Net balancing tax due for the year must be strictly less than £3,000.00.",
    deadlineNotice: "Mandatory Deadline: Return MUST be filed online by 30 December (or 31 October if paper).",
    keyPoints: [
      "HMRC collects the balancing debt in 12 equal monthly installments via the taxpayer's salary PAYE tax code starting 6 April.",
      "Eliminates the requirement to make a lump-sum balancing payment by 31 January.",
      "Does not cancel Payments on Account (PoA) if separately required by statute.",
    ],
  },
  POA: {
    code: "TMA 1970 s59A",
    title: "Payments on Account (PoA)",
    scheduleCategory: "Statutory Advance Tax Installments",
    legislation: "Taxes Management Act 1970, section 59A",
    whoMustFile: "Self-employed, landlords, and taxpayers whose balancing tax bill is £1,000 or more.",
    statutoryThreshold: "Net assessed tax >= £1,000 AND less than 80% of total tax was deducted at source.",
    deadlineNotice: "1st payment due 31 January; 2nd payment due 31 July.",
    keyPoints: [
      "Two equal payments, each 50% of the previous year's Income Tax and Class 4 NIC.",
      "Capital Gains Tax and Student Loan repayments are excluded from PoA calculations.",
      "Can be formally reduced if taxpayer expects profits to fall in the next tax year (with risk of HMRC interest/penalties if under-estimated).",
    ],
  },
  HICBC: {
    code: "ITEPA 2003 s681B",
    title: "High Income Child Benefit Charge",
    scheduleCategory: "Statutory Tax Charge",
    legislation: "Finance Act 2024 / ITEPA 2003 s681B",
    whoMustFile: "Any taxpayer (or their partner) who received Child Benefit and has adjusted net income above the statutory threshold.",
    statutoryThreshold: "Threshold raised to £60,000 from 2024/25 (1% clawback per £200 between £60k and £80k; 100% above £80k).",
    deadlineNotice: "Declared on SA100 and settled with balancing payment by 31 January.",
    keyPoints: [
      "Pre-2024/25: £50,000 to £60,000 (1% per £100).",
      "FA 2024 reform significantly reduces tax burden for dual and single income families.",
      "SanSuite automatically calculates the statutory clawback percentage and tax charge.",
    ],
  },
  BASIS_PERIOD: {
    code: "FA 2022 Sch 1",
    title: "Basis Period Reform (Tax Year Basis)",
    scheduleCategory: "Statutory Accounting Transition",
    legislation: "Finance Act 2022, Schedule 1 / FA 2024",
    whoMustFile: "All unincorporated sole traders and partners who previously used an accounting year-end other than 31 March / 5 April.",
    statutoryThreshold: "All non-5 April sole traders from the 2023/24 transition year onward.",
    deadlineNotice: "Mandatory statutory basis; all businesses assessed strictly on 6 April - 5 April earnings.",
    keyPoints: [
      "Eliminates overlap relief and permanently moves all businesses to the tax year basis.",
      "Allows transitional profits to be spread equally over 5 tax years (2023/24 to 2027/28).",
      "Full statutory calculator built directly into SanSuite SA103F and SA104 schedules.",
    ],
  },
};

export interface HMRCHelpTooltipProps {
  code: HMRCFormCode;
  customLabel?: string;
  showBadge?: boolean;
  showLabel?: boolean;
  inline?: boolean;
}

export default function HMRCHelpTooltip({
  code,
  customLabel,
  showBadge = true,
  showLabel,
  inline = true,
}: HMRCHelpTooltipProps) {
  const displayBadge = showLabel !== undefined ? showLabel : showBadge;
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const guide = HMRC_GUIDES[code];

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!guide) return null;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <span className={`relative ${inline ? "inline-flex items-center gap-1.5" : "flex items-center gap-1.5"}`}>
        {/* Optional Short Code Badge */}
        {displayBadge && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
            {customLabel || guide.code}
          </span>
        )}

        {/* Rounded ? Interactive Button */}
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="w-4 h-4 rounded-full bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-900/50 text-slate-500 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 flex items-center justify-center font-bold text-[10px] transition-colors cursor-help border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0"
            title={`Click or hover for HMRC ${guide.code} statutory guidance`}
            aria-label={`HMRC guidance for ${guide.code}`}
          >
            ?
          </button>
        </Popover.Trigger>
      </span>

      {/* Render directly into document.body to prevent ANY table / card / sidebar overflow clipping */}
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          avoidCollisions={true}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="z-[99999] w-80 sm:w-96 max-h-[85vh] overflow-y-auto p-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-3 animate-in fade-in-50 zoom-in-95 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-600 text-white shadow-2xs">
                  {guide.code}
                </span>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  {guide.scheduleCategory}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                {guide.title}
              </h4>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Legislation Citation */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <Scale size={13} className="text-purple-600 shrink-0" />
            <span className="font-mono text-[10px]">{guide.legislation}</span>
          </div>

          {/* Who Must File & Threshold */}
          <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              <strong className="text-slate-900 dark:text-slate-100 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                Who Must File / Scope:
              </strong>
              <p className="leading-relaxed">{guide.whoMustFile}</p>
            </div>

            <div>
              <strong className="text-slate-900 dark:text-slate-100 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
                Statutory Threshold:
              </strong>
              <p className="leading-relaxed">{guide.statutoryThreshold}</p>
            </div>

            {/* Key Statutory Points */}
            <div>
              <strong className="text-slate-900 dark:text-slate-100 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                Statutory Rules & Compliance:
              </strong>
              <ul className="space-y-1 pl-1">
                {guide.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Statutory Deadline Footer */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
            <Calendar size={12} className="shrink-0" />
            <span>Filing Deadline: {guide.deadlineNotice}</span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
