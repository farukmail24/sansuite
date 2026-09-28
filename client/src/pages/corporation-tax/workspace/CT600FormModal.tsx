import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  X, Printer, FileText,
  Save, CheckCircle2, AlertCircle, Building2, HelpCircle,
  Calculator, Check, ArrowRight, ArrowLeft, Info,
  Edit3, Eye
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  client: any;
  currentReturn: any;
}

export default function CT600FormModal({ open, onClose, client, currentReturn }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activePage, setActivePage] = useState<number>(1);
  const isScrollingRef = React.useRef(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);

  // ==========================================
  // Primary Core Return States
  // ==========================================
  const [companyName, setCompanyName] = useState("");
  const [crn, setCrn] = useState("");
  const [utr, setUtr] = useState("");
  const [taxDistrict, setTaxDistrict] = useState("623");
  const [companyType, setCompanyType] = useState("0");
  const [turnover, setTurnover] = useState("0.00");
  const [netProfit, setNetProfit] = useState("0.00");
  const [disallowables, setDisallowables] = useState("0.00");
  const [depreciation, setDepreciation] = useState("0.00");
  const [capitalAllowances, setCapitalAllowances] = useState("0.00");
  const [tradingLossesBroughtForward, setTradingLossesBroughtForward] = useState("0.00");
  const [tradingLossesRelieved, setTradingLossesRelieved] = useState("0.00");
  const [nonTradingIncome, setNonTradingIncome] = useState("0.00");
  const [qualifyingDonations, setQualifyingDonations] = useState("0.00");
  const [taxDeductedAtSource, setTaxDeductedAtSource] = useState("0.00");
  const [associatedCount, setAssociatedCount] = useState("0");
  const [isAmended, setIsAmended] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [declarationName, setDeclarationName] = useState("");
  const [declarationStatus, setDeclarationStatus] = useState("Director");
  const [declarationDate, setDeclarationDate] = useState("");

  // ==========================================
  // Full 100% Statutory HMRC Boxes Container
  // Covers every statutory box 1 to 987
  // ==========================================
  const [boxData, setBoxData] = useState<Record<string, string | boolean>>({
    // Page 1: NI & About Return
    "5": false, // NI trading activity
    "6": false, // SME
    "7": false, // NI employer
    "8": false, // Special circumstances
    "40": false, // Repayment due
    "45": false, // Claim or relief affecting earlier period
    "50": false, // Making >1 return now
    "55": false, // Estimated figures
    "60": false, // Part of group not small
    "65": false, // Notice of disclosable avoidance schemes
    "70": false, // Compensating adjustment claimed
    "75": true,  // Qualifies for SME exemption

    // Page 2: Accounts & Computations / Supplementary pages
    "80": true,  // Attach accounts & computations for period
    "85": false, // Attach accounts for different period
    "90": "",    // Explanation why not attaching
    "95": false, // CT600A Loans to participators
    "100": false, // CT600B Controlled foreign companies
    "105": false, // CT600C Group and consortium
    "110": false, // CT600D Insurance
    "115": false, // CT600E Charities & CASCs
    "120": false, // CT600F Tonnage tax
    "125": false, // CT600G Northern Ireland
    "130": false, // CT600H Cross-border royalties
    "135": false, // CT600I Supplementary charge ring fence
    "140": false, // CT600J Avoidance schemes
    "141": false, // CT600K Restitution tax
    "142": false, // CT600L Research and Development
    "143": false, // CT600M Freeports & Investment Zones
    "144": false, // CT600N Residential Property Developer Tax
    "96": false,  // CT600P Creative industries
    "150": false, // Financial concerns (banks, insurers)
    "170": "0.00", // Bank/building soc interest & non-trading loan profits
    "172": false, // Net of carry back deficit

    // Page 3: Chargeable gains, Deductions & Reliefs
    "175": "0.00", // Annual payments not charged to CT
    "180": "0.00", // Non-exempt foreign dividends
    "185": "0.00", // Income with IT deducted
    "190": "0.00", // Property business income
    "195": "0.00", // Non-trading gains on intangibles
    "200": "0.00", // Tonnage tax profits
    "205": "0.00", // Income not falling under any other heading
    "210": "0.00", // Gross chargeable gains
    "215": "0.00", // Allowable losses including b/fwd
    "225": "0.00", // Losses b/fwd against investment income
    "230": "0.00", // Non-trade deficits b/fwd set against non-trading profits
    "240": "0.00", // Losses on unquoted shares
    "245": "0.00", // Management expenses
    "250": "0.00", // UK property business losses
    "255": "0.00", // CA for management of business
    "260": "0.00", // Non-trade deficits current period

    // Page 4: Deductions continued & Associated companies
    "263": "0.00", // C/fwd non-trade deficits
    "265": "0.00", // Non-trading losses on intangibles
    "275": "0.00", // Total trading losses of this/later period
    "280": false,  // Amounts carried back included in 275
    "285": "0.00", // Trading losses c/fwd claimed against total profits
    "290": "0.00", // Non-trade capital allowances
    "310": "0.00", // Group relief
    "312": "0.00", // Group relief for c/fwd losses
    "320": "0.00", // Ring fence profits included
    "325": "0.00", // Northern Ireland profits included
    "327": "0",    // Assoc count FY1
    "328": "0",    // Assoc count FY2
    "329": true,   // Small profits rate or marginal relief

    // Page 5: Reliefs & Calculations
    "445": "0.00", // Community Investment Tax Relief
    "450": "0.00", // Double Taxation Relief
    "455": false,  // Underlying rate relief claim
    "460": false,  // Carried back from later period
    "465": "0.00", // Advance Corporation Tax
    "471": "0.00", // CJRS received
    "472": "0.00", // CJRS entitlement
    "473": "0.00", // CJRS overpayment already assessed
    "474": "0.00", // Other coronavirus overpayments
    "480": "0.00", // Loans to participators tax
    "485": false,  // Completed box A70 in CT600A
    "490": "0.00", // CFC tax
    "495": "0.00", // Bank levy
    "496": "0.00", // Bank surcharge
    "497": "0.00", // RPDT
    "986": "0.00", // EOGPL
    "987": "0.00", // EGL

    // Page 6: Tax reconciliation & Credits
    "501": "0.00", // EOGPL payable
    "502": "0.00", // EGL payable
    "505": "0.00", // Ring fence supplementary charge
    "520": "0.00", // IT repayable
    "526": "0.00", // Covid overpayment now due
    "527": "0.00", // Restitution tax
    "530": "0.00", // RDEC credit
    "535": "0.00", // (Not currently used)
    "540": "0.00", // Creatives tax credit
    "541": "0.00", // AVEC & VGEC
    "550": "0.00", // Land remediation credit
    "555": "0.00", // Life assurance credit
    "565": "0.00", // CA first-year credit
    "570": "0.00", // Surplus R&D/creatives payable

    // Page 7: Reconciliation cont. & Indicators
    "575": "0.00", // Land remediation payable
    "580": "0.00", // CA FY credit payable
    "585": "0.00", // Ring fence CT included
    "586": "0.00", // NI CT included
    "590": "0.00", // Ring fence supp charge included
    "595": "0.00", // Tax already paid
    "605": "0.00", // Tax overpaid
    "610": "0.00", // Group tax refunds surrendered
    "614": "0.00", // AVEC/VGEC surrendered
    "615": "0.00", // RDEC surrendered
    "620": "0.00", // Franked investment income
    "625": "0",    // Number of 51% group companies
    "630": false,  // Large company instalment payments
    "631": false,  // Very large company instalments
    "635": false,  // Group payment arrangement
    "640": false,  // Written down or sold intangibles
    "645": false,  // Cross-border royalty payments
    "647": "0.00", // Eat Out to Help Out
    "616": false,  // Exporter - goods
    "617": false,  // Exporter - services
    "618": true,   // Exporter - neither

    // Page 8: Enhanced expenditure & Trading capital allowances
    "650": false, // SME R&D claim
    "653": false, // R&D intensive SME
    "655": false, // Large company R&D
    "656": false, // R&D claim notification submitted
    "657": false, // R&D additional info form submitted
    "658": false, // Creatives additional info form submitted
    "659": "0.00", // R&D qualifying expenditure
    "660": "0.00", // R&D enhanced expenditure
    "663": "0.00", // Creatives core expenditure
    "665": "0.00", // Creatives additional deduction
    "670": "0.00", // Total 660 + 665
    "675": "0.00", // SME subcontracted
    "680": "0.00", // Vaccine research
    "685": "0.00", // Land remediation enhanced exp
    "688": "0.00", // Full expensing allowance
    "689": "0.00", // Full expensing balancing charge
    "690": "0.00", // AIA
    "691": "0.00", // Super-deduction allowance
    "692": "0.00", // Super-deduction charge
    "693": "0.00", // Special rate allowance
    "694": "0.00", // Special rate charge
    "695": "0.00", // Special rate pool allowance
    "700": "0.00", // Special rate pool charge
    "705": "0.00", // Main pool allowance
    "710": "0.00", // Main pool charge
    "711": "0.00", // Structures & buildings allowance
    "715": "0.00", // Business premises allowance
    "720": "0.00", // Business premises charge
    "725": "0.00", // Other allowances
    "730": "0.00", // Other charges

    // Page 9: Trading continued & Non-trading allowances
    "713": "0.00", // EV charge-points allowance
    "714": "0.00", // EV charge-points disposal
    "721": "0.00", // Enterprise zones allowance
    "722": "0.00", // Enterprise zones disposal
    "723": "0.00", // Zero emission goods allowance
    "724": "0.00", // Zero emission goods disposal
    "726": "0.00", // Zero emission cars allowance
    "727": "0.00", // Zero emission cars disposal
    "735": "0.00", // AIA non-trade
    "736": "0.00", // Structures non-trade
    "733": "0.00", // Full expensing non-trade allowance
    "734": "0.00", // Full expensing non-trade charge
    "740": "0.00", // Premises non-trade allowance
    "745": "0.00", // Premises non-trade charge
    "741": "0.00", // Super deduction non-trade allowance
    "742": "0.00", // Super deduction non-trade charge
    "743": "0.00", // Special rate non-trade allowance
    "744": "0.00", // Special rate non-trade charge
    "750": "0.00", // Other non-trade allowance
    "755": "0.00", // Other non-trade charge
    "737": "0.00", // EV charge-points non-trade allowance
    "738": "0.00", // EV charge-points non-trade disposal
    "746": "0.00", // Enterprise zones non-trade allowance
    "747": "0.00", // Enterprise zones non-trade disposal
    "748": "0.00", // Zero emission goods non-trade allowance
    "749": "0.00", // Zero emission goods non-trade disposal
    "751": "0.00", // Zero emission cars non-trade allowance
    "752": "0.00", // Zero emission cars non-trade disposal

    // Page 10: Losses & Excess amounts
    "780": "0.00", // Trading losses UK amount
    "785": "0.00", // Trading losses UK max surrender
    "790": "0.00", // Trading losses outside UK
    "795": "0.00", // Non-trade deficits amount
    "800": "0.00", // Non-trade deficits max surrender
    "805": "0.00", // UK property losses amount
    "810": "0.00", // UK property losses max surrender
    "815": "0.00", // Overseas property losses
    "820": "0.00", // Misc transactions losses
    "825": "0.00", // Capital losses
    "830": "0.00", // Non-trading intangibles amount
    "835": "0.00", // Non-trading intangibles max surrender
    "760": "0.00", // FYA machinery & plant
    "765": "0.00", // Environmentally friendly machinery & plant
    "770": "0.00", // Long-life assets & integral features
    "771": "0.00", // Structures & buildings
    "772": "0.00", // Super-deduction
    "773": "0.00", // Special rate allowance
    "775": "0.00", // Other machinery & plant
    "840": "0.00", // Non-trade CA excess
    "845": "0.00", // Qualifying donations excess
    "850": "0.00", // Management expenses excess
    "855": "0.00", // Management expenses max surrender

    // Page 11: Repayments & Surrenders
    "860": "0.00", // Small repayments limit
    "865": "0.00", // CT repayment
    "870": "0.00", // IT repayment
    "875": "0.00", // R&D payable credit
    "880": "0.00", // RDEC payable credit
    "885": "0.00", // Creatives payable credit
    "886": "0.00", // AVEC & VGEC payable credit
    "890": "0.00", // Land remediation payable credit
    "895": "0.00", // CA FY payable credit
    "900": "0.00", // Surrender amount
    "905": false,  // Joint notice attached
    "910": false,  // Joint notice will follow
    "915": "0.00", // Stop repayment amount
    "856": "0.00", // NI losses vs UK
    "857": "0.00", // NI losses vs NI
    "858": "0.00", // UK losses vs NI

    // Page 12: Authority & Repayment Nominee
    "940": "",     // Building society ref
    "943": false,  // R&D payable condition
    "945": "",     // Authority status
    "950": "",     // Authority company name
    "955": "",     // Authorise nominee name
    "960": "",     // Nominee address
    "965": "",     // Nominee ref
    "970": "",     // Nominee recipient name
  });

  const getB = (box: string | number, fallback = ""): any => {
    const val = boxData[String(box)];
    if (val !== undefined && val !== null) return val;
    return fallback;
  };

  const setB = (box: string | number, val: string | boolean) => {
    setBoxData(prev => ({ ...prev, [String(box)]: val }));
  };

  // Dedicated CT600 Form print mode body class
  useEffect(() => {
    if (open) {
      document.body.classList.add("ct600-modal-open");
      return () => {
        document.body.classList.remove("ct600-modal-open");
      };
    }
  }, [open]);

  // Sync state whenever return or client changes
  useEffect(() => {
    if (currentReturn) {
      setCompanyName(client?.clientName || "LIMITED COMPANY");
      setCrn(client?.registrationNumber || "");
      setUtr(currentReturn.utrNumber || client?.utrNumber || "");
      setCompanyType(currentReturn.companyType || "0");
      setTurnover(currentReturn.turnover || "0.00");
      setNetProfit(currentReturn.netAccountingProfit || "0.00");
      setDisallowables(currentReturn.disallowableExpenses || "0.00");
      setDepreciation(currentReturn.depreciationAddBack || "0.00");
      setCapitalAllowances(currentReturn.capitalAllowancesClaimed || "0.00");
      setTradingLossesBroughtForward(currentReturn.tradingLossesBroughtForward || "0.00");
      setTradingLossesRelieved(currentReturn.tradingLossesRelievedCurrentYear || "0.00");
      setNonTradingIncome(currentReturn.nonTradingIncome || "0.00");
      setQualifyingDonations(currentReturn.qualifyingDonations || "0.00");
      setAssociatedCount(String(currentReturn.associatedCompaniesCount || "0"));
      setTaxDeductedAtSource(currentReturn.taxDeductedAtSource || "0.00");
      setIsAmended(Boolean(currentReturn.isAmendedReturn));
      setAmendmentReason(currentReturn.amendmentReason || "");
      setBankName(currentReturn.bankName || "");
      setBankSortCode(currentReturn.bankSortCode || "");
      setBankAccountNumber(currentReturn.bankAccountNumber || "");
      setBankAccountName(currentReturn.bankAccountName || client?.clientName || "");
      setDeclarationName(currentReturn.declarationName || "");
      setDeclarationStatus(currentReturn.declarationStatus || "Director");

      const today = new Date();
      const dDay = String(today.getDate()).padStart(2, "0");
      const dMonth = String(today.getMonth() + 1).padStart(2, "0");
      const dYear = String(today.getFullYear());
      setDeclarationDate(`${dDay}/${dMonth}/${dYear}`);

      // Seed matching supplementary boxes
      setB("145", currentReturn.turnover || "0.00");
      setB("155", currentReturn.netAccountingProfit || "0.00");
      setB("160", currentReturn.tradingLossesBroughtForward || "0.00");
      setB("245", currentReturn.disallowableExpenses || "0.00");
      setB("690", currentReturn.capitalAllowancesClaimed || "0.00");
      setB("780", currentReturn.tradingLossesBroughtForward || "0.00");
      setB("305", currentReturn.qualifyingDonations || "0.00");
      setB("515", currentReturn.taxDeductedAtSource || "0.00");
    }
  }, [currentReturn, client]);

  // Fetch detailed schedules (Capital allowances, loss schedules, supplementary forms)
  const { data: fullReturnDetail } = useQuery<any>({
    queryKey: [`/api/corporation-tax/${client?.id}/returns/${currentReturn?.id}`],
    queryFn: async () => {
      if (!currentReturn?.id || !client?.id) return null;
      const res = await apiRequest("GET", `/api/corporation-tax/${client.id}/returns/${currentReturn.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: open && !!currentReturn?.id && !!client?.id,
  });

  // Sync detailed schedules from Step 4 (Calculators) & Step 5 (Supplementary)
  useEffect(() => {
    if (fullReturnDetail) {
      const ca = fullReturnDetail.capitalAllowances;
      if (ca) {
        if (parseFloat(ca.annualInvestmentAllowanceClaimed || "0") > 0) {
          setB("690", ca.annualInvestmentAllowanceClaimed);
          setCapitalAllowances(ca.annualInvestmentAllowanceClaimed);
        }
        if (parseFloat(ca.firstYearAllowanceClaimed || "0") > 0) {
          setB("760", ca.firstYearAllowanceClaimed);
        }
        if (parseFloat(ca.mainPoolWdaClaimed || "0") > 0) {
          setB("705", ca.mainPoolWdaClaimed);
        }
        if (parseFloat(ca.specialRateWdaClaimed || "0") > 0) {
          setB("695", ca.specialRateWdaClaimed);
        }
        if (parseFloat(ca.structuresAndBuildingsAllowance || "0") > 0) {
          setB("711", ca.structuresAndBuildingsAllowance);
        }
      }

      const loss = fullReturnDetail.lossSchedule;
      if (loss) {
        if (parseFloat(loss.lossBroughtForward || "0") > 0) {
          setB("160", loss.lossBroughtForward);
          setB("780", loss.lossBroughtForward);
          setTradingLossesBroughtForward(loss.lossBroughtForward);
        }
        if (parseFloat(loss.lossCarriedForward || "0") > 0) {
          setB("285", loss.lossCarriedForward);
        }
      }

      const suppForms = fullReturnDetail.supplementaryForms;
      if (Array.isArray(suppForms)) {
        const formA = suppForms.find((f: any) => f.formType === "CT600A");
        if (formA && formA.isIncludedInSubmission) {
          setB("95", true); // Box 95: CT600A attached
          try {
            const parsedA = JSON.parse(formA.formDataJson || "{}");
            const loan = parseFloat(parsedA.loanAmount || "0");
            const rep = parseFloat(parsedA.repaymentAmount || "0");
            const outstanding = Math.max(0, loan - rep);
            if (outstanding > 0) {
              const s455Tax = (outstanding * 0.3375).toFixed(2);
              setB("480", s455Tax); // Box 480: Tax payable on loans to participators
            }
          } catch {}
        }

        const formL = suppForms.find((f: any) => f.formType === "CT600L");
        if (formL && formL.isIncludedInSubmission) {
          setB("142", true); // Box 142: CT600L attached
          setB("650", true); // Box 650: SME R&D claim
          try {
            const parsedL = JSON.parse(formL.formDataJson || "{}");
            if (parsedL.qualifyingExpenditure) {
              setB("659", parsedL.qualifyingExpenditure);
            }
            if (parsedL.enhancedDeduction) {
              setB("660", parsedL.enhancedDeduction);
            }
          } catch {}
        }

        const formE = suppForms.find((f: any) => f.formType === "CT600E");
        if (formE && formE.isIncludedInSubmission) {
          setB("115", true); // Box 115: Charities & CASCs attached
        }
      }

      if (fullReturnDetail.return?.declarationName && (!declarationName || declarationName === "Signatory")) {
        setDeclarationName(fullReturnDetail.return.declarationName);
        if (fullReturnDetail.return.declarationStatus) {
          setDeclarationStatus(fullReturnDetail.return.declarationStatus);
        }
      }
    }
  }, [fullReturnDetail]);

  // Fetch directors & signatories from Accounts Production
  const { data: apDirectors = [] } = useQuery<any[]>({
    queryKey: [`/api/corporation-tax/${client?.id}/directors`],
    queryFn: async () => {
      if (!client?.id) return [];
      const res = await apiRequest("GET", `/api/corporation-tax/${client.id}/directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!client?.id,
  });

  const formatOfficerName = (name: string) => {
    if (!name) return "";
    if (name.includes(",")) {
      const parts = name.split(",").map((p) => p.trim());
      return parts.length >= 2 ? `${parts[1]} ${parts[0]}` : name;
    }
    return name;
  };

  // Auto-populate declaration signatory from Accounts Production if empty
  useEffect(() => {
    if (apDirectors && apDirectors.length > 0) {
      const signatory = apDirectors.find((d: any) => d.isSignatory || d.isSignatoryOnAccounts) || apDirectors[0];
      if (signatory) {
        const formatted = formatOfficerName(signatory.name || signatory.officerName || "");
        if (formatted && (!declarationName || declarationName.trim() === "" || declarationName === "Signatory")) {
          setDeclarationName(formatted);
          if (signatory.role || signatory.officerRole) {
            setDeclarationStatus(signatory.role || signatory.officerRole || "Director");
          }
        }
      }
    }
  }, [apDirectors, declarationName]);

  // Real-time recalculation of tax liabilities
  const numNetProfit = parseFloat(netProfit || "0");
  const numDisallowables = parseFloat(disallowables || "0");
  const numDepreciation = parseFloat(depreciation || "0");
  const numCa = parseFloat(capitalAllowances || "0");
  const numLoss = parseFloat(tradingLossesRelieved || "0");
  const numNonTrading = parseFloat(nonTradingIncome || "0");
  const numDonations = parseFloat(qualifyingDonations || "0");
  const numDeducted = parseFloat(taxDeductedAtSource || "0");

  const taxableTradingProfit = Math.max(0, numNetProfit + numDisallowables + numDepreciation - numCa - numLoss);
  const profitsChargeable = Math.max(0, taxableTradingProfit + numNonTrading - numDonations);

  const numAssoc = parseInt(associatedCount || "0");
  const divisor = 1 + Math.max(0, numAssoc);
  const lowerLimit = 50000 / divisor;
  const upperLimit = 250000 / divisor;

  let ctRate = 19.0;
  let marginalRelief = 0;
  let taxPayable = 0;

  if (profitsChargeable <= lowerLimit) {
    ctRate = 19.0;
    taxPayable = profitsChargeable * 0.19;
  } else if (profitsChargeable >= upperLimit) {
    ctRate = 25.0;
    taxPayable = profitsChargeable * 0.25;
  } else {
    ctRate = 25.0;
    const fullTax = profitsChargeable * 0.25;
    marginalRelief = Math.max(0, (upperLimit - profitsChargeable) * (3 / 200));
    taxPayable = Math.max(0, fullTax - marginalRelief);
  }

  const netTaxDue = Math.max(0, taxPayable - numDeducted);

  // Financial Year Split Calculation (Matches Capium FY 2025 / FY 2026 Breakdown)
  const sDate = currentReturn?.accountingPeriodStart ? new Date(currentReturn.accountingPeriodStart) : new Date(2025, 4, 1);
  const eDate = currentReturn?.accountingPeriodEnd ? new Date(currentReturn.accountingPeriodEnd) : new Date(2026, 3, 30);
  const startYear = sDate.getFullYear();
  const endYear = eDate.getFullYear();
  const fy1Cutoff = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59));

  let fy1Year = startYear;
  let fy2Year = endYear;
  let fy1Days = 365;
  let fy2Days = 0;

  if (eDate > fy1Cutoff && sDate <= fy1Cutoff) {
    fy1Days = Math.max(1, Math.round((fy1Cutoff.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    fy2Days = Math.max(1, Math.round((eDate.getTime() - fy1Cutoff.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const totalDays = fy1Days + fy2Days;
  const fy1Profit = totalDays > 0 ? Math.round((profitsChargeable * fy1Days) / totalDays) : profitsChargeable;
  const fy2Profit = totalDays > 0 && fy2Days > 0 ? profitsChargeable - fy1Profit : 0;
  const fy1Tax = parseFloat((fy1Profit * (ctRate / 100)).toFixed(2));
  const fy2Tax = fy2Days > 0 ? parseFloat((taxPayable - fy1Tax).toFixed(2)) : 0;

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/corporation-tax/${client.id}/returns`, {
        id: currentReturn.id,
        clientId: client.id,
        periodId: currentReturn.periodId,
        utrNumber: utr,
        accountingPeriodStart: currentReturn.accountingPeriodStart,
        accountingPeriodEnd: currentReturn.accountingPeriodEnd,
        taxYear: currentReturn.taxYear,
        turnover,
        netAccountingProfit: netProfit,
        disallowableExpenses: disallowables,
        depreciationAddBack: depreciation,
        capitalAllowancesClaimed: capitalAllowances,
        tradingLossesBroughtForward,
        tradingLossesRelievedCurrentYear: tradingLossesRelieved,
        nonTradingIncome,
        qualifyingDonations,
        taxDeductedAtSource,
        associatedCompaniesCount: numAssoc,
        isAmendedReturn: isAmended,
        amendmentReason,
        companyType,
        bankName,
        bankSortCode,
        bankAccountNumber,
        bankAccountName,
        declarationName,
        declarationStatus,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save CT600 Form");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/corporation-tax/${client.id}/returns`] });
      toast({
        title: "CT600 Form Saved",
        description: "Official statutory boxes and tax calculations updated in database.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save CT600 form.",
        variant: "destructive",
      });
    },
  });

  if (!open || !currentReturn) return null;

  const handlePrint = () => {
    window.print();
  };

  const scrollToPage = (pageNum: number) => {
    setActivePage(pageNum);
    const el = document.getElementById(`ct600-page-${pageNum}`);
    if (el) {
      isScrollingRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 700);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingRef.current) return;
    const container = e.currentTarget;
    const containerTop = container.scrollTop;
    for (let i = 1; i <= 12; i++) {
      const el = document.getElementById(`ct600-page-${i}`);
      if (el) {
        const relativeTop = el.offsetTop - container.offsetTop;
        if (relativeTop <= containerTop + 200) {
          setActivePage(i);
        }
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return { day: "", month: "", year: "" };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: "", month: "", year: "" };
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear());
    return { day, month, year };
  };

  const pStart = formatDate(currentReturn.accountingPeriodStart);
  const pEnd = formatDate(currentReturn.accountingPeriodEnd);

  // Segmented digit boxes (for paper view)
  const renderBoxes = (value: string | number, length: number) => {
    const str = String(value || "").replace(/\s+/g, "");
    const cells = [];
    for (let i = 0; i < length; i++) {
      const char = str[i] || "";
      cells.push(
        <span
          key={i}
          className="inline-flex items-center justify-center w-6 h-7 text-xs font-mono font-bold border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 uppercase"
        >
          {char}
        </span>
      );
    }
    return <div className="inline-flex gap-0.5">{cells}</div>;
  };

  // HMRC Currency Box Grid
  const renderCurrencyBoxes = (val: number | string, boxCount = 8) => {
    const num = Math.round(parseFloat(String(val || "0")));
    const str = num > 0 ? String(num) : "";
    const padded = str.padStart(boxCount, " ");
    return (
      <div className="inline-flex items-center gap-1 font-mono text-xs select-none">
        <span className="w-4 h-6 text-slate-400 font-bold flex items-center justify-center">£</span>
        <div className="inline-flex gap-0.5">
          {padded.split("").map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-5 h-6 text-xs font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 ${
                c.trim() ? "text-slate-900 dark:text-slate-100" : "text-transparent"
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <span className="font-bold text-slate-400">·00</span>
      </div>
    );
  };

  const renderCheckbox = (isChecked: boolean) => (
    <div className="w-6 h-6 border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold font-mono text-[#007077] dark:text-teal-300 flex items-center justify-center text-xs">
      {isChecked ? "X" : ""}
    </div>
  );

  // Subcomponent for interactive/paper checkbox row
  const FormCheck = ({ box, label, subtext }: { box: string | number; label: string; subtext?: string }) => {
    const isChecked = Boolean(getB(box));
    return (
      <div className="flex items-start justify-between gap-3 bg-white/70 dark:bg-slate-800/40 p-2.5 rounded hover:bg-white/90 transition-colors">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            {box}
          </span>
          <div className="min-w-0 pr-1">
            <span className="text-slate-800 dark:text-slate-200 font-medium text-xs leading-tight block">
              {label}
            </span>
            {subtext && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                {subtext}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          {isEditMode ? (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setB(box, e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 cursor-pointer"
            />
          ) : (
            renderCheckbox(isChecked)
          )}
        </div>
      </div>
    );
  };

  // Subcomponent for interactive/paper numeric input row
  const FormAmount = ({
    box,
    label,
    value,
    onChange,
    readOnly = false,
    subtitle,
    isNet = false
  }: {
    box: string | number;
    label: string;
    value: string | number;
    onChange?: (val: string) => void;
    readOnly?: boolean;
    subtitle?: string;
    isNet?: boolean;
  }) => {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded transition-colors ${
        isNet ? "bg-teal-50/70 dark:bg-teal-950/40 font-bold border-l-2 border-[#007077]" : "bg-white/70 dark:bg-slate-800/40"
      }`}>
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            {box}
          </span>
          <div className="min-w-0 pr-2">
            <span className={`text-xs leading-snug block ${isNet ? "text-[#007077] dark:text-teal-300 font-bold" : "text-slate-800 dark:text-slate-200 font-medium"}`}>
              {label}
            </span>
            {subtitle && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-center">
          {isEditMode && !readOnly ? (
            <div className="flex items-center gap-1 font-mono">
              <span className="font-bold text-slate-500 text-xs">£</span>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => {
                  if (onChange) onChange(e.target.value);
                  else setB(box, e.target.value);
                }}
                className="w-36 sm:w-44 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-right font-mono font-bold text-xs rounded focus:border-teal-500 focus:outline-hidden"
              />
            </div>
          ) : (
            <div>{renderCurrencyBoxes(value, 8)}</div>
          )}
        </div>
      </div>
    );
  };

  // Full 12 Pages list in exact serial sequence matching HMRC CT600 Version 3 and Capium
  const pageList = [
    { id: 1, title: "Company Information and About this return", short: "Page 1: Company Info", boxes: "Boxes 1 – 75" },
    { id: 2, title: "Accounts, Turnover and Income", short: "Page 2: Accounts & Turnover", boxes: "Boxes 80 – 172" },
    { id: 3, title: "Chargeable gains and Deductions & reliefs", short: "Page 3: Gains & Deductions", boxes: "Boxes 175 – 260" },
    { id: 4, title: "Tax calculation & Associated companies", short: "Page 4: Tax Calculation", boxes: "Boxes 263 – 425" },
    { id: 5, title: "Reliefs & Calc. of tax outstanding", short: "Page 5: Tax Outstanding", boxes: "Boxes 430 – 497" },
    { id: 6, title: "Tax reconciliation & Credits", short: "Page 6: Tax Reconciliation", boxes: "Boxes 500 – 570" },
    { id: 7, title: "Tax reconciliation cont. & Indicators", short: "Page 7: Tax Due & Indicators", boxes: "Boxes 575 – 647" },
    { id: 8, title: "Enhanced expenditure & Capital allowances", short: "Page 8: Capital Allowances", boxes: "Boxes 650 – 730" },
    { id: 9, title: "EV allowances & Non-trading charges", short: "Page 9: EV & Non-trading", boxes: "Boxes 713 – 755" },
    { id: 10, title: "Losses, deficits & Excess amounts", short: "Page 10: Loss Schedules", boxes: "Boxes 760 – 855" },
    { id: 11, title: "Overpayments, Repayments & Surrender", short: "Page 11: Repayments", boxes: "Boxes 856 – 915" },
    { id: 12, title: "Bank details & Declaration", short: "Page 12: Declaration & Bank", boxes: "Boxes 920 – 985" },
  ];

  const PageHeader = ({ pageNum }: { pageNum: number }) => (
    <div className="border-b-2 border-[#007077] pb-3 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-[#007077]">
            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
          </div>
          <div className="border-l-2 border-[#007077] pl-3 py-0.5">
            <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              HM Revenue
            </div>
            <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              &amp; Customs
            </div>
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-black text-[#007077] tracking-tight leading-none">
            Company Tax Return
          </h1>
          <div className="text-xs sm:text-sm font-bold text-[#007077] mt-0.5">
            CT600 (2026) Version 3
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            for accounting periods starting on or after 1 April 2015
          </div>
        </div>
      </div>
    </div>
  );

  const PageFooter = ({ pageNum }: { pageNum: number }) => (
    <div className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono">
      <span className="font-bold">CT600(2026) Version 3</span>
      <span className="font-bold">Page {pageNum}</span>
      <span className="font-bold">HMRC 04/26</span>
    </div>
  );

  const handlePrevPage = () => {
    scrollToPage(Math.max(1, activePage - 1));
  };

  const handleNextPage = () => {
    scrollToPage(Math.min(12, activePage + 1));
  };

  return (
    <div
      id="ct600-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:static print:bg-white print:overflow-visible"
    >
      <div
        id="ct600-modal-dialog"
        className="relative w-full max-w-7xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[94vh] overflow-hidden print:h-auto print:max-h-none print:w-full print:max-w-none print:border-none print:shadow-none print:rounded-none print:static print:overflow-visible"
      >
        {/* Modal Top Bar */}
        <div className="ct600-modal-header ct600-no-print px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-xs">
          
          {/* Left: Identity, Title, Badges & Company Meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-800/60 text-[#007077] dark:text-teal-300 flex items-center justify-center shrink-0 shadow-xs">
              <FileText size={20} className="stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  HMRC CT600 Corporation Tax Return
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#007077] dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#008080] animate-pulse"></span>
                  2026 Version 3 (HMRC 04/26)
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Building2 size={12} className="text-slate-400" />
                  {companyName || client?.clientName}
                </span>
                <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                  UTR: {utr || "Not Set"}
                </span>
                <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  AP: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{pStart.day}/{pStart.month}/{pStart.year} – {pEnd.day}/{pEnd.month}/{pEnd.year}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Mode Switcher, Actions & Close */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* View Mode Toggle: Interactive Form vs Paper Print View */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isEditMode
                    ? "bg-white dark:bg-slate-900 text-[#007077] dark:text-teal-300 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Edit and recalculate boxes directly"
              >
                <Edit3 size={13} />
                <span>Interactive Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  !isEditMode
                    ? "bg-white dark:bg-slate-900 text-[#007077] dark:text-teal-300 shadow-xs border border-slate-200/60 dark:border-slate-700 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="View authentic HMRC segmented paper form"
              >
                <Eye size={13} />
                <span>Paper Return View</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block"></div>

            {/* Save Form Changes Button */}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              title="Save all edited boxes to database and recalculate"
            >
              <Save size={13} className="stroke-[2.2]" />
              <span>{saveMutation.isPending ? "Saving..." : "Save Changes"}</span>
            </button>

            {/* Print CT600 Form Paper Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#007077] hover:bg-[#005a60] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer active:scale-[0.98]"
              title="Print official HMRC 12-page paper return or save as PDF"
            >
              <Printer size={13} className="stroke-[2.2]" />
              <span>Print Form (PDF)</span>
            </button>

            {/* Close Modal Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={15} className="stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Modal Split Body: Left Sidebar Page Nav + Right Main Form */}
        <div className="flex-1 flex overflow-hidden print:overflow-visible print:block">
          
          {/* Left Page Navigation Sidebar: Exact 12 Pages */}
          <div className="ct600-modal-sidebar ct600-no-print w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3 space-y-1 overflow-y-auto shrink-0 print:hidden text-xs">
            <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>CT600 Pages (1 – 12)</span>
              <span className="font-mono text-[10px] text-teal-600 bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded font-bold">
                Page {activePage} of 12
              </span>
            </div>
            
            {pageList.map((p) => {
              const isSelected = activePage === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => scrollToPage(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-950/60 text-[#007077] dark:text-teal-300 font-bold border-l-4 border-[#007077] shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                    isSelected ? "bg-[#007077] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}>
                    {p.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="leading-tight text-[11px] truncate font-semibold">{p.title}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{p.boxes}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Form Area: Continuous 12-Page View */}
          <div
            id="ct600-modal-body"
            onScroll={handleScroll}
            className="ct600-form-scroll-area flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 dark:bg-slate-950 font-sans print:p-0 print:m-0 print:overflow-visible print:bg-white text-slate-900 dark:text-slate-100 space-y-8 print:space-y-0 scroll-smooth"
          >
            
            {/* ======================================================== */}
            {/* PAGE 1: Company Information & About This Return */}
            {/* ======================================================== */}
            <div
              id="ct600-page-1"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={1} />

              <div className="space-y-1 text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-teal-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-teal-100 dark:border-slate-800">
                <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Your Company Tax Return</h2>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  If we send the company a 'Notice' to deliver a Company Tax Return it has to comply by the filing date or we charge a penalty, even if there is no tax to pay.
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-[10px]">
                  A return includes a Company Tax Return form, any supplementary pages, accounts, computations and any relevant information. The CT600 Guide tells you how the return must be formatted and delivered.
                </p>
              </div>

              {/* Company Information (Boxes 1 - 4) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Company information</h3>

                {/* Box 1: Company Name */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Company name</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono font-bold uppercase text-xs rounded"
                    />
                  ) : (
                    <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono font-bold uppercase text-xs">
                      {companyName}
                    </div>
                  )}
                </div>

                {/* Box 2: Registration Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Company registration number</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      maxLength={8}
                      value={crn}
                      onChange={(e) => setCrn(e.target.value)}
                      placeholder="14804436"
                      className="w-48 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono font-bold text-xs rounded"
                    />
                  ) : (
                    <div>{renderBoxes(crn, 8)}</div>
                  )}
                </div>

                {/* Box 3: Tax Reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Tax reference (UTR)</span>
                  </div>
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={3}
                        value={taxDistrict}
                        onChange={(e) => setTaxDistrict(e.target.value)}
                        className="w-16 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-2 py-1 font-mono font-bold text-xs rounded text-center"
                        title="Tax District"
                      />
                      <input
                        type="text"
                        maxLength={10}
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="2296901577"
                        className="w-44 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono font-bold text-xs rounded"
                        title="Tax Reference (10-digit UTR)"
                      />
                    </div>
                  ) : (
                    <div>{renderBoxes(utr, 10)}</div>
                  )}
                </div>

                {/* Box 4: Type of Company */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">4</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Type of company</span>
                  </div>
                  {isEditMode ? (
                    <select
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                      className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-medium text-xs rounded"
                    >
                      <option value="0">0. Trading or professional services company</option>
                      <option value="1">1. Unit trust / Open-ended investment company</option>
                      <option value="2">2. Close investment-holding company</option>
                      <option value="3">3. Company in liquidation</option>
                      <option value="4">4. Intermediate holding company</option>
                      <option value="5">5. Insurance company</option>
                      <option value="6">6. Member of a group that is not small</option>
                      <option value="7">7. Real Estate Investment Trust (REIT)</option>
                    </select>
                  ) : (
                    <div>{renderBoxes(companyType || "0", 1)}</div>
                  )}
                </div>
              </div>

              {/* Northern Ireland (NI) (Boxes 5 - 8) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Northern Ireland (NI)</h3>
                <p className="text-[11px] text-slate-500">Put an 'X' in the appropriate boxes below</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormCheck box="5" label="NI trading activity" />
                  <FormCheck box="6" label="SME" />
                  <FormCheck box="7" label="NI employer" />
                  <FormCheck box="8" label="Special circumstances" />
                </div>
              </div>

              {/* About this return (Boxes 30, 35, 40 - 75) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">About this return</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  This is the tax return for the company named above, for the period below
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/70 dark:bg-slate-800/40 p-3 rounded">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center">30</span>
                      <span className="font-semibold">from DD MM YYYY</span>
                    </div>
                    <div className="font-mono font-bold text-xs">
                      {renderBoxes(`${pStart.day}${pStart.month}${pStart.year}`, 8)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center">35</span>
                      <span className="font-semibold">to DD MM YYYY</span>
                    </div>
                    <div className="font-mono font-bold text-xs">
                      {renderBoxes(`${pEnd.day}${pEnd.month}${pEnd.year}`, 8)}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">Put an 'X' in the appropriate boxes below</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormCheck box="40" label="A repayment is due for this return period" />
                  <FormCheck box="45" label="Claim or relief affecting an earlier period" />
                  <FormCheck box="50" label="Making more than one return for this company now" />
                  <FormCheck box="55" label="This return contains estimated figures" />
                  <FormCheck box="60" label="Company part of a group that is not small" />
                  <FormCheck box="65" label="Notice of disclosable avoidance schemes" />
                </div>

                {/* Transfer pricing */}
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 pt-2 border-t border-teal-200 dark:border-slate-800">
                  Transfer pricing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormCheck box="70" label="Compensating adjustment claimed" />
                  <FormCheck box="75" label="Company qualifies for SME exemption" />
                </div>
              </div>

              <PageFooter pageNum={1} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 2: Accounts, Turnover and Income */}
            {/* ======================================================== */}
            <div
              id="ct600-page-2"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={2} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">About this return – continued</h2>

              {/* Accounts and computations (Boxes 80, 85, 90) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Accounts and computations</h3>
                
                <div className="space-y-2">
                  <FormCheck box="80" label="I attach accounts and computations for the period to which this return relates" />
                  <FormCheck box="85" label="I attach accounts and computations for a different period" />
                  
                  <div className="bg-white/70 dark:bg-slate-800/40 p-2.5 rounded space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">90</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">If you're not attaching the accounts and computations, explain why</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={String(getB("90"))}
                        onChange={(e) => setB("90", e.target.value)}
                        placeholder="Leave blank if attaching accounts"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs rounded"
                      />
                    ) : (
                      <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                        {String(getB("90")) || "None (Accounts attached)"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplementary pages enclosed (Boxes 95 to 144, 96) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Supplementary pages enclosed
                </h3>
                <p className="text-[11px] text-slate-500">Put an 'X' in the relevant boxes for attached schedules</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormCheck box="95" label="Loans to participators by close companies – form CT600A" />
                  <FormCheck box="100" label="Controlled foreign companies & mismatches – form CT600B" />
                  <FormCheck box="105" label="Group and consortium – form CT600C" />
                  <FormCheck box="110" label="Insurance – form CT600D" />
                  <FormCheck box="115" label="Charities and CASCs – form CT600E" />
                  <FormCheck box="120" label="Tonnage tax – form CT600F" />
                  <FormCheck box="125" label="Northern Ireland – form CT600G" />
                  <FormCheck box="130" label="Cross-border royalties – form CT600H" />
                  <FormCheck box="135" label="Supplementary charge in ring fence trades – form CT600I" />
                  <FormCheck box="140" label="Disclosure of Tax Avoidance Schemes – form CT600J" />
                  <FormCheck box="141" label="Restitution tax – form CT600K" />
                  <FormCheck box="142" label="Research and Development – form CT600L" />
                  <FormCheck box="143" label="Freeports and Investment Zones – form CT600M" />
                  <FormCheck box="144" label="Residential Property Developer Tax (RPDT) – form CT600N" />
                  <FormCheck box="96" label="Creative industries – form CT600P" />
                </div>
              </div>

              {/* Tax calculation – Turnover (Boxes 145 & 150) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Tax calculation – Turnover</h3>
                
                <FormAmount
                  box="145"
                  label="Total turnover from trade"
                  value={turnover}
                  onChange={(val) => {
                    setTurnover(val);
                    setB("145", val);
                  }}
                />

                <FormCheck
                  box="150"
                  label="Banks, building societies, insurance companies and other financial concerns"
                  subtext="Put an 'X' in this box if you do not have a recognised turnover and have not made an entry in box 145"
                />
              </div>

              {/* Income (Boxes 155 to 172) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Income</h3>

                <FormAmount
                  box="155"
                  label="Trading profits (Net Accounting Profit)"
                  value={netProfit}
                  onChange={(val) => {
                    setNetProfit(val);
                    setB("155", val);
                  }}
                />

                <FormAmount
                  box="160"
                  label="Trading losses brought forward set against trading profits"
                  value={tradingLossesBroughtForward}
                  onChange={(val) => {
                    setTradingLossesBroughtForward(val);
                    setB("160", val);
                  }}
                />

                <FormAmount
                  box="165"
                  label="Net trading profits – box 155 minus box 160"
                  value={Math.max(0, numNetProfit - parseFloat(tradingLossesBroughtForward || "0"))}
                  readOnly
                  isNet
                />

                <FormAmount
                  box="170"
                  label="Bank, building society or other interest, and profits from non-trading loan relationships"
                  value={getB("170", "0.00")}
                  onChange={(val) => setB("170", val)}
                />

                <FormCheck
                  box="172"
                  label="Net of carrying back a deficit"
                  subtext="Put an 'X' in box 172 if the figure in box 170 is net of carrying back a deficit from a later accounting period"
                />
              </div>

              <PageFooter pageNum={2} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 3: Chargeable gains and Deductions & reliefs */}
            {/* ======================================================== */}
            <div
              id="ct600-page-3"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={3} />

              {/* Chargeable gains (Boxes 210 - 220) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Chargeable gains</h3>

                <FormAmount
                  box="210"
                  label="Gross chargeable gains"
                  value={getB("210", "0.00")}
                  onChange={(val) => setB("210", val)}
                />

                <FormAmount
                  box="215"
                  label="Allowable losses including losses brought forward"
                  value={getB("215", "0.00")}
                  onChange={(val) => setB("215", val)}
                />

                <FormAmount
                  box="220"
                  label="Net chargeable gains – box 210 minus box 215"
                  value={Math.max(0, parseFloat(getB("210", "0") || "0") - parseFloat(getB("215", "0") || "0"))}
                  readOnly
                  isNet
                />
              </div>

              {/* Income – continued (Boxes 175 - 205) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Income – continued</h3>

                <FormAmount
                  box="175"
                  label="Annual payments not otherwise charged to Corporation Tax and without IT deducted"
                  value={getB("175", "0.00")}
                  onChange={(val) => setB("175", val)}
                />

                <FormAmount
                  box="180"
                  label="Non-exempt dividends or distributions from non-UK resident companies"
                  value={getB("180", "0.00")}
                  onChange={(val) => setB("180", val)}
                />

                <FormAmount
                  box="185"
                  label="Income from which Income Tax has been deducted"
                  value={getB("185", "0.00")}
                  onChange={(val) => setB("185", val)}
                />

                <FormAmount
                  box="190"
                  label="Income from a property business"
                  value={getB("190", "0.00")}
                  onChange={(val) => setB("190", val)}
                />

                <FormAmount
                  box="195"
                  label="Non-trading gains on intangible fixed assets"
                  value={getB("195", "0.00")}
                  onChange={(val) => setB("195", val)}
                />

                <FormAmount
                  box="200"
                  label="Tonnage tax profits"
                  value={getB("200", "0.00")}
                  onChange={(val) => setB("200", val)}
                />

                <FormAmount
                  box="205"
                  label="Income not falling under any other heading"
                  value={getB("205", "0.00")}
                  onChange={(val) => setB("205", val)}
                />
              </div>

              {/* Deductions and reliefs (Boxes 240 - 260) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Deductions and reliefs</h3>

                <FormAmount
                  box="240"
                  label="Losses on unquoted shares"
                  value={getB("240", "0.00")}
                  onChange={(val) => setB("240", val)}
                />

                <FormAmount
                  box="245"
                  label="Management expenses"
                  value={disallowables}
                  onChange={(val) => {
                    setDisallowables(val);
                    setB("245", val);
                  }}
                />

                <FormAmount
                  box="250"
                  label="UK property business losses for this or previous accounting period"
                  value={getB("250", "0.00")}
                  onChange={(val) => setB("250", val)}
                />

                <FormAmount
                  box="255"
                  label="Capital allowances for the purposes of management of the business"
                  value={getB("255", "0.00")}
                  onChange={(val) => setB("255", val)}
                />

                <FormAmount
                  box="260"
                  label="Non-trade deficits for this accounting period from loan relationships and derivative contracts"
                  value={getB("260", "0.00")}
                  onChange={(val) => setB("260", val)}
                />
              </div>

              {/* Profits before deductions and reliefs (Boxes 225 - 235) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Profits before deductions and reliefs</h3>

                <FormAmount
                  box="225"
                  label="Losses brought forward against certain investment income"
                  value={getB("225", "0.00")}
                  onChange={(val) => setB("225", val)}
                />

                <FormAmount
                  box="230"
                  label="Non-trade deficits on loan relationships b/fwd set against non-trading profits"
                  value={getB("230", "0.00")}
                  onChange={(val) => setB("230", val)}
                />

                <FormAmount
                  box="235"
                  label="Profits before other deductions and reliefs"
                  subtitle="Net sum of boxes 165 to 205 and 220 minus sum of boxes 225 and 230"
                  value={profitsChargeable}
                  readOnly
                  isNet
                />
              </div>

              <PageFooter pageNum={3} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 4: Tax Calculation & Associated Companies */}
            {/* ======================================================== */}
            <div
              id="ct600-page-4"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={4} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Deductions and Reliefs – continued</h2>

              {/* Deductions and reliefs cont. (Boxes 263 - 325) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <FormAmount
                  box="263"
                  label="Carried forward non-trade deficits from loan relationships and derivative contracts"
                  value={getB("263", "0.00")}
                  onChange={(val) => setB("263", val)}
                />

                <FormAmount
                  box="265"
                  label="Non-trading losses on intangible fixed assets"
                  value={getB("265", "0.00")}
                  onChange={(val) => setB("265", val)}
                />

                <FormAmount
                  box="275"
                  label="Total trading losses of this or a later accounting period"
                  value={getB("275", "0.00")}
                  onChange={(val) => setB("275", val)}
                />

                <FormCheck
                  box="280"
                  label="Amounts carried back from later accounting periods included in box 275"
                />

                <FormAmount
                  box="285"
                  label="Trading losses carried forward and claimed against total profits"
                  value={getB("285", "0.00")}
                  onChange={(val) => setB("285", val)}
                />

                <FormAmount
                  box="290"
                  label="Non-trade capital allowances"
                  value={getB("290", "0.00")}
                  onChange={(val) => setB("290", val)}
                />

                <FormAmount
                  box="295"
                  label="Total of deductions and reliefs – total of boxes 240 to 275, 285 and 290"
                  value="0.00"
                  readOnly
                  isNet
                />

                <FormAmount
                  box="300"
                  label="Profits before qualifying donations and group relief – box 235 minus box 295"
                  value={profitsChargeable + numDonations}
                  readOnly
                />

                <FormAmount
                  box="305"
                  label="Qualifying donations (charitable gifts)"
                  value={qualifyingDonations}
                  onChange={(val) => {
                    setQualifyingDonations(val);
                    setB("305", val);
                  }}
                />

                <FormAmount
                  box="310"
                  label="Group relief"
                  value={getB("310", "0.00")}
                  onChange={(val) => setB("310", val)}
                />

                <FormAmount
                  box="312"
                  label="Group relief for carried forward losses"
                  value={getB("312", "0.00")}
                  onChange={(val) => setB("312", val)}
                />

                <FormAmount
                  box="315"
                  label="Profits chargeable to Corporation Tax – box 300 minus boxes 305, 310 and 312"
                  value={profitsChargeable}
                  readOnly
                  isNet
                />

                <div className="pt-2 border-t border-teal-200 dark:border-slate-800 space-y-2">
                  <FormAmount
                    box="320"
                    label="Ring fence profits included"
                    value={getB("320", "0.00")}
                    onChange={(val) => setB("320", val)}
                  />
                  <FormAmount
                    box="325"
                    label="Northern Ireland profits included"
                    value={getB("325", "0.00")}
                    onChange={(val) => setB("325", val)}
                  />
                </div>
              </div>

              {/* Associated Companies & Rates (Boxes 326 - 329) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Associated Companies (Finance Act 2021/2023)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/70 dark:bg-slate-800/40 p-3 rounded">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center">326</span>
                      <span className="font-semibold text-xs">In this period</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        value={associatedCount}
                        onChange={(e) => setAssociatedCount(e.target.value)}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-mono font-bold text-xs rounded"
                      />
                    ) : (
                      <div>{renderBoxes(associatedCount, 2)}</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center">327</span>
                      <span className="font-semibold text-xs">In first FY</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        value={String(getB("327", "0"))}
                        onChange={(e) => setB("327", e.target.value)}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-mono font-bold text-xs rounded"
                      />
                    ) : (
                      <div>{renderBoxes(getB("327", "0"), 2)}</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center">328</span>
                      <span className="font-semibold text-xs">In second FY</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        value={String(getB("328", "0"))}
                        onChange={(e) => setB("328", e.target.value)}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-center font-mono font-bold text-xs rounded"
                      />
                    ) : (
                      <div>{renderBoxes(getB("328", "0"), 2)}</div>
                    )}
                  </div>
                </div>

                <FormCheck
                  box="329"
                  label="Chargeable at small profit rate or entitled to marginal relief"
                  subtext="Put an 'X' in box 329 if the company is chargeable at the small profit rate or is entitled to marginal relief"
                />
              </div>

              {/* Tax by Financial Year Table (Boxes 330 - 425) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Tax calculation – Enter how much profit has to be charged and at what rate
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2">Financial Year (yyyy)</th>
                        <th className="p-2">Amount of profit (£)</th>
                        <th className="p-2">Rate of tax %</th>
                        <th className="p-2 text-right">Tax (£ p)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/80 dark:bg-slate-800/50 font-mono">
                      <tr>
                        <td className="p-2 font-bold text-[#007077]">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">330</span>
                          {fy1Year}
                        </td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">335</span>
                          £{fy1Profit.toLocaleString("en-GB")}
                        </td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">340</span>
                          {ctRate.toFixed(2)}%
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">345</span>
                          £{fy1Tax.toFixed(2)}
                        </td>
                      </tr>

                      {fy2Days > 0 ? (
                        <tr>
                          <td className="p-2 font-bold text-[#007077]">
                            <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">380</span>
                            {fy2Year}
                          </td>
                          <td className="p-2">
                            <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">385</span>
                            £{fy2Profit.toLocaleString("en-GB")}
                          </td>
                          <td className="p-2">
                            <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">390</span>
                            {ctRate.toFixed(2)}%
                          </td>
                          <td className="p-2 text-right font-bold text-slate-900 dark:text-slate-100">
                            <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">395</span>
                            £{fy2Tax.toFixed(2)}
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td className="p-2 text-slate-400">
                            <span className="w-6 h-5 rounded-xs bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] inline-flex items-center justify-center mr-1.5">380</span>
                            —
                          </td>
                          <td className="p-2 text-slate-400">
                            <span className="w-6 h-5 rounded-xs bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] inline-flex items-center justify-center mr-1.5">385</span>
                            —
                          </td>
                          <td className="p-2 text-slate-400">
                            <span className="w-6 h-5 rounded-xs bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] inline-flex items-center justify-center mr-1.5">390</span>
                            —
                          </td>
                          <td className="p-2 text-right text-slate-400">
                            <span className="w-6 h-5 rounded-xs bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] inline-flex items-center justify-center mr-1.5">395</span>
                            —
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <PageFooter pageNum={4} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 5: Reliefs & Calc. of Tax Outstanding */}
            {/* ======================================================== */}
            <div
              id="ct600-page-5"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={5} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Tax calculation – continued &amp; Reliefs</h2>

              {/* Box 430 - 440 */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <FormAmount
                  box="430"
                  label="Corporation Tax – total of boxes 345, 360, 375, 395, 410 and 425"
                  value={taxPayable + marginalRelief}
                  readOnly
                />

                <FormAmount
                  box="435"
                  label="Marginal relief"
                  value={marginalRelief}
                  readOnly
                />

                <FormAmount
                  box="440"
                  label="Corporation Tax chargeable – box 430 minus box 435"
                  value={taxPayable}
                  readOnly
                  isNet
                />
              </div>

              {/* Reliefs and deductions in terms of tax (Boxes 445 - 470) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Reliefs and deductions in terms of tax
                </h3>

                <FormAmount
                  box="445"
                  label="Community Investment Tax Relief"
                  value={getB("445", "0.00")}
                  onChange={(val) => setB("445", val)}
                />

                <FormAmount
                  box="450"
                  label="Double Taxation Relief"
                  value={getB("450", "0.00")}
                  onChange={(val) => setB("450", val)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormCheck box="455" label="Box 450 includes an underlying rate relief claim" />
                  <FormCheck box="460" label="Box 450 includes an amount carried back from later period" />
                </div>

                <FormAmount
                  box="465"
                  label="Advance Corporation Tax"
                  value={getB("465", "0.00")}
                  onChange={(val) => setB("465", val)}
                />

                <FormAmount
                  box="470"
                  label="Total reliefs and deduction in terms of tax – total of boxes 445, 450 and 465"
                  value="0.00"
                  readOnly
                  isNet
                />
              </div>

              {/* Coronavirus support schemes and overpayments (Boxes 471 - 474) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Coronavirus support schemes and overpayments
                </h3>

                <FormAmount box="471" label="Coronavirus Job Retention Scheme (CJRS) received" value={getB("471", "0.00")} onChange={(val) => setB("471", val)} />
                <FormAmount box="472" label="CJRS entitlement" value={getB("472", "0.00")} onChange={(val) => setB("472", val)} />
                <FormAmount box="473" label="CJRS overpayment already assessed or voluntary disclosed" value={getB("473", "0.00")} onChange={(val) => setB("473", val)} />
                <FormAmount box="474" label="Other coronavirus overpayments" value={getB("474", "0.00")} onChange={(val) => setB("474", val)} />
              </div>

              {/* Calculation of tax outstanding or overpaid (Boxes 475 - 497) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Calculation of tax outstanding or overpaid
                </h3>

                <FormAmount
                  box="475"
                  label="Net Corporation Tax liability – box 440 minus box 470"
                  value={taxPayable}
                  readOnly
                  isNet
                />

                <FormAmount
                  box="480"
                  label="Tax payable on loans and arrangements to participators (Section 455 CTA 2010)"
                  value={getB("480", "0.00")}
                  onChange={(val) => setB("480", val)}
                />

                <FormCheck box="485" label="Completed box A70 in the supplementary pages CT600A" />

                <FormAmount box="490" label="Controlled Foreign Companies (CFC) tax payable" value={getB("490", "0.00")} onChange={(val) => setB("490", val)} />
                <FormAmount box="495" label="Bank levy payable" value={getB("495", "0.00")} onChange={(val) => setB("495", val)} />
                <FormAmount box="496" label="Bank surcharge payable" value={getB("496", "0.00")} onChange={(val) => setB("496", val)} />
                <FormAmount box="497" label="Residential Property Developer Tax (RPDT) payable" value={getB("497", "0.00")} onChange={(val) => setB("497", val)} />

                {/* Energy levies */}
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 pt-2 border-t border-teal-200 dark:border-slate-800">
                  Energy levies
                </h4>
                <FormAmount box="986" label="Energy (Oil and Gas) Profits Levy (EOGPL) amounts liable" value={getB("986", "0.00")} onChange={(val) => setB("986", val)} />
                <FormAmount box="987" label="Electricity Generator Levy (EGL) exceptional generation receipts" value={getB("987", "0.00")} onChange={(val) => setB("987", val)} />
              </div>

              <PageFooter pageNum={5} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 6: Tax Reconciliation & Credits */}
            {/* ======================================================== */}
            <div
              id="ct600-page-6"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={6} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Calculation of tax outstanding or overpaid – continued</h2>

              {/* Boxes 500 - 528 */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <FormAmount
                  box="500"
                  label="CFC tax, bank levy, bank surcharge and RPDT payable – total of boxes 490, 495, 496 and 497"
                  value="0.00"
                  readOnly
                />

                <FormAmount box="501" label="EOGPL payable" value={getB("501", "0.00")} onChange={(val) => setB("501", val)} />
                <FormAmount box="502" label="EGL payable" value={getB("502", "0.00")} onChange={(val) => setB("502", val)} />
                <FormAmount box="505" label="Supplementary charge (ring fence trades) payable" value={getB("505", "0.00")} onChange={(val) => setB("505", val)} />

                <FormAmount
                  box="510"
                  label="Tax chargeable – total of boxes 475, 480, 500, 501, 502 and 505"
                  value={taxPayable}
                  readOnly
                  isNet
                />

                <FormAmount
                  box="515"
                  label="Income Tax deducted from gross income included in profits"
                  value={taxDeductedAtSource}
                  onChange={(val) => {
                    setTaxDeductedAtSource(val);
                    setB("515", val);
                  }}
                />

                <FormAmount
                  box="520"
                  label="Income Tax repayable to the company"
                  value={getB("520", "0.00")}
                  onChange={(val) => setB("520", val)}
                />

                <FormAmount
                  box="525"
                  label="Self-assessment of tax payable before restitution tax and coronavirus support scheme overpayments"
                  subtitle="Box 510 minus box 515"
                  value={netTaxDue}
                  readOnly
                  isNet
                />

                <FormAmount box="526" label="Coronavirus support schemes overpayment now due – total of boxes 471 and 474 minus boxes 472 and 473" value={getB("526", "0.00")} onChange={(val) => setB("526", val)} />
                <FormAmount box="527" label="Restitution tax" value={getB("527", "0.00")} onChange={(val) => setB("527", val)} />

                <FormAmount
                  box="528"
                  label="Self-assessment of tax payable – total of boxes 525, 526 and 527"
                  value={netTaxDue}
                  readOnly
                  isNet
                />
              </div>

              {/* Tax reconciliation (Boxes 530 - 570) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Tax reconciliation
                </h3>

                <FormAmount box="530" label="Research and Development credit (RDEC)" value={getB("530", "0.00")} onChange={(val) => setB("530", val)} />
                <FormAmount box="540" label="Creatives tax credit" value={getB("540", "0.00")} onChange={(val) => setB("540", val)} />

                <FormAmount
                  box="541"
                  label="Audio-Visual expenditure credit (AVEC) and Video Games expenditure credit (VGEC)"
                  value={getB("541", "0.00")}
                  onChange={(val) => setB("541", val)}
                />

                <FormAmount
                  box="545"
                  label="Total of Research and Development credit, creatives tax credit and AVEC/VGEC"
                  subtitle="Total boxes 530 to 541"
                  value="0.00"
                  readOnly
                  isNet
                />

                <FormAmount box="550" label="Land remediation tax credit" value={getB("550", "0.00")} onChange={(val) => setB("550", val)} />
                <FormAmount box="555" label="Life assurance company tax credit" value={getB("555", "0.00")} onChange={(val) => setB("555", val)} />

                <FormAmount
                  box="560"
                  label="Total land remediation and life assurance company tax credit – total box 550 and 555"
                  value="0.00"
                  readOnly
                />

                <FormAmount box="565" label="Capital allowances first-year tax credit" value={getB("565", "0.00")} onChange={(val) => setB("565", val)} />
                <FormAmount box="570" label="Surplus Research and Development credits and creatives tax credit payable – box 545 minus box 525" value={getB("570", "0.00")} onChange={(val) => setB("570", val)} />
              </div>

              <PageFooter pageNum={6} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 7: Tax Due & Indicators */}
            {/* ======================================================== */}
            <div
              id="ct600-page-7"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={7} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Tax reconciliation – continued &amp; Indicators</h2>

              {/* Tax Reconciliation Cont. (Boxes 575 - 615) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <FormAmount
                  box="575"
                  label="Land remediation or life assurance company tax credit payable"
                  subtitle="– total of boxes 545 and 560 minus boxes 525 and 570"
                  value={getB("575", "0.00")}
                  onChange={(val) => setB("575", val)}
                />

                <FormAmount
                  box="580"
                  label="Capital allowances first-year tax credit payable"
                  subtitle="– boxes 545, 560 and 565 minus boxes 525, 570 and 575"
                  value={getB("580", "0.00")}
                  onChange={(val) => setB("580", val)}
                />

                <FormAmount
                  box="585"
                  label="Ring fence Corporation Tax included"
                  value={getB("585", "0.00")}
                  onChange={(val) => setB("585", val)}
                />

                <FormAmount
                  box="586"
                  label="NI Corporation Tax included"
                  value={getB("586", "0.00")}
                  onChange={(val) => setB("586", val)}
                />

                <FormAmount
                  box="590"
                  label="Ring fence supplementary charge included"
                  value={getB("590", "0.00")}
                  onChange={(val) => setB("590", val)}
                />

                <FormAmount
                  box="595"
                  label="Tax already paid (and not already repaid)"
                  value={getB("595", "0.00")}
                  onChange={(val) => setB("595", val)}
                />

                <FormAmount
                  box="600"
                  label="Tax outstanding – box 525 minus boxes 545, 560, 565 and 595"
                  value={netTaxDue}
                  readOnly
                  isNet
                />

                <FormAmount
                  box="605"
                  label="Tax overpaid including surplus or payable credits"
                  subtitle="– total sum of boxes 545, 560, 565 and 595 minus 525"
                  value={getB("605", "0.00")}
                  onChange={(val) => setB("605", val)}
                />

                <div className="pt-2 border-t border-teal-200 dark:border-slate-800 space-y-2">
                  <FormAmount
                    box="610"
                    label="Group tax refunds surrendered to this company"
                    value={getB("610", "0.00")}
                    onChange={(val) => setB("610", val)}
                  />
                  <FormAmount
                    box="614"
                    label="Audio-Visual expenditure credit and Video Games expenditure credit surrendered to this company"
                    value={getB("614", "0.00")}
                    onChange={(val) => setB("614", val)}
                  />
                  <FormAmount
                    box="615"
                    label="Research and Development expenditure credits surrendered to this company"
                    value={getB("615", "0.00")}
                    onChange={(val) => setB("615", val)}
                  />
                </div>
              </div>

              {/* Indicators and information (Boxes 620 - 647) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Indicators and information
                </h3>

                <FormAmount
                  box="620"
                  label="Franked investment income / Exempt ABGH distributions"
                  value={getB("620", "0.00")}
                  onChange={(val) => setB("620", val)}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-slate-800/40 p-2.5 rounded">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">625</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-xs">Number of 51% group companies</span>
                  </div>
                  <div className="shrink-0 self-end sm:self-center">
                    {isEditMode ? (
                      <input
                        type="number"
                        min="0"
                        value={String(getB("625", "0"))}
                        onChange={(e) => setB("625", e.target.value)}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-center font-mono font-bold text-xs rounded"
                      />
                    ) : (
                      <div>{renderBoxes(getB("625", "0"), 2)}</div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">Put an 'X' in the relevant boxes, if in the period, the company:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormCheck box="630" label="Should have made instalment payments as a large company" />
                  <FormCheck box="631" label="Should have made instalment payments as a very large company" />
                  <FormCheck box="635" label="Is within a group payments arrangement for the period" />
                  <FormCheck box="640" label="Has written down or sold intangible assets" />
                  <FormCheck box="645" label="Has made cross-border royalty payments" />
                </div>

                <FormAmount
                  box="647"
                  label="Eat Out to Help Out Scheme: reimbursed discounts included as taxable income"
                  value={getB("647", "0.00")}
                  onChange={(val) => setB("647", val)}
                />
              </div>

              {/* Exporter information (Boxes 616 - 618) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Exporter information
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  During the return period, did the company export goods and/or services to individuals, enterprises or organisations outside the United Kingdom (UK)?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormCheck box="616" label="Yes – goods" />
                  <FormCheck box="617" label="Yes – services" />
                  <FormCheck box="618" label="No – neither" />
                </div>
              </div>

              <PageFooter pageNum={7} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 8: Enhanced Expenditure & Capital Allowances */}
            {/* ======================================================== */}
            <div
              id="ct600-page-8"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={8} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">
                Information about enhanced expenditure and tax reliefs
              </h2>

              {/* Research and Development or creatives enhanced expenditure (Boxes 650 - 680) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Research and Development (R&amp;D) or creatives enhanced expenditure
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormCheck box="650" label="R&D claim is made by a small or medium-sized enterprise (SME)" />
                  <FormCheck box="653" label="Claim is made by an R&D intensive SME" />
                  <FormCheck box="655" label="Claim is made by a large company" />
                  <FormCheck box="656" label="Confirm R&D claim notification form submitted" />
                  <FormCheck box="657" label="Confirm R&D additional information form submitted" />
                  <FormCheck box="658" label="Confirm Creatives additional info form submitted" />
                </div>

                <div className="pt-2 border-t border-teal-200 dark:border-slate-800 space-y-2">
                  <FormAmount box="659" label="R&D expenditure qualifying for SME/intensive relief" value={getB("659", "0.00")} onChange={(val) => setB("659", val)} />
                  <FormAmount box="660" label="R&D enhanced expenditure" value={getB("660", "0.00")} onChange={(val) => setB("660", val)} />
                  <FormAmount box="663" label="Creatives core expenditure" value={getB("663", "0.00")} onChange={(val) => setB("663", val)} />
                  <FormAmount box="665" label="Creatives additional deduction" value={getB("665", "0.00")} onChange={(val) => setB("665", val)} />
                  <FormAmount box="670" label="Total enhanced expenditure and creatives deduction (660 + 665)" value={getB("670", "0.00")} onChange={(val) => setB("670", val)} />
                  <FormAmount box="675" label="R&D enhanced expenditure of SME subcontracted by large company" value={getB("675", "0.00")} onChange={(val) => setB("675", val)} />
                  <FormAmount box="680" label="Vaccine research expenditure" value={getB("680", "0.00")} onChange={(val) => setB("680", val)} />
                  <FormAmount box="685" label="Land remediation total enhanced expenditure" value={getB("685", "0.00")} onChange={(val) => setB("685", val)} />
                </div>
              </div>

              {/* Capital Allowances and Balancing Charges (Trading) (Boxes 688 - 730) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Allowances and charges in calculation of trading profits and losses
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2">Allowance / Asset Category</th>
                        <th className="p-2">Capital Allowances (£)</th>
                        <th className="p-2 text-right">Balancing Charges (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/80 dark:bg-slate-800/50">
                      <tr>
                        <td className="p-2 font-medium">Annual investment allowance (AIA)</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">690</span>
                          {isEditMode ? (
                            <input
                              type="number"
                              step="0.01"
                              value={capitalAllowances}
                              onChange={(e) => {
                                setCapitalAllowances(e.target.value);
                                setB("690", e.target.value);
                              }}
                              className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right"
                            />
                          ) : (
                            <span className="font-mono">£{parseFloat(capitalAllowances || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Full expensing</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">688</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("688", "0.00"))} onChange={(e) => setB("688", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("688", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">689</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("689", "0.00"))} onChange={(e) => setB("689", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("689", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Machinery and plant – super-deduction</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">691</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("691", "0.00"))} onChange={(e) => setB("691", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("691", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">692</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("692", "0.00"))} onChange={(e) => setB("692", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("692", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Machinery and plant – special rate allowance</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">693</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("693", "0.00"))} onChange={(e) => setB("693", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("693", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">694</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("694", "0.00"))} onChange={(e) => setB("694", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("694", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Machinery and plant – special rate pool</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">695</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("695", "0.00"))} onChange={(e) => setB("695", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("695", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">700</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("700", "0.00"))} onChange={(e) => setB("700", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("700", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Machinery and plant – main pool</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">705</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("705", "0.00"))} onChange={(e) => setB("705", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("705", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">710</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("710", "0.00"))} onChange={(e) => setB("710", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("710", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Structures and buildings</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">711</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("711", "0.00"))} onChange={(e) => setB("711", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("711", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Business premises renovation</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">715</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("715", "0.00"))} onChange={(e) => setB("715", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("715", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">720</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("720", "0.00"))} onChange={(e) => setB("720", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("720", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Other allowances and charges</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">725</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("725", "0.00"))} onChange={(e) => setB("725", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("725", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">730</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("730", "0.00"))} onChange={(e) => setB("730", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("730", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <PageFooter pageNum={8} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 9: EV Allowances & Non-Trading Charges */}
            {/* ======================================================== */}
            <div
              id="ct600-page-9"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={9} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">
                Allowances and charges in calculation of trading profits – continued
              </h2>

              {/* Trading EV & Zero-Emissions (Boxes 713 - 727) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2">Vehicle / Equipment Category</th>
                        <th className="p-2">Capital Allowances (£)</th>
                        <th className="p-2 text-right">Disposal Value (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/80 dark:bg-slate-800/50">
                      <tr>
                        <td className="p-2 font-medium">Electric vehicle charge-points</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">713</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("713", "0.00"))} onChange={(e) => setB("713", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("713", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">714</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("714", "0.00"))} onChange={(e) => setB("714", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("714", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Enterprise zones</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">721</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("721", "0.00"))} onChange={(e) => setB("721", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("721", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">722</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("722", "0.00"))} onChange={(e) => setB("722", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("722", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Zero-emission goods vehicles</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">723</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("723", "0.00"))} onChange={(e) => setB("723", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("723", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">724</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("724", "0.00"))} onChange={(e) => setB("724", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("724", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Zero-emission cars</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">726</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("726", "0.00"))} onChange={(e) => setB("726", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("726", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">727</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("727", "0.00"))} onChange={(e) => setB("727", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("727", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-trading allowances & balancing charges (Boxes 733 - 755) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Allowances and charges not included in calculation of trading profits
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2">Non-trading Category</th>
                        <th className="p-2">Capital Allowances (£)</th>
                        <th className="p-2 text-right">Balancing Charges (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/80 dark:bg-slate-800/50">
                      <tr>
                        <td className="p-2 font-medium">Annual investment allowance</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">735</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("735", "0.00"))} onChange={(e) => setB("735", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("735", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Structures and buildings</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">736</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("736", "0.00"))} onChange={(e) => setB("736", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("736", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Full expensing (non-trading)</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">733</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("733", "0.00"))} onChange={(e) => setB("733", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("733", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">734</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("734", "0.00"))} onChange={(e) => setB("734", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("734", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Business premises renovation</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">740</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("740", "0.00"))} onChange={(e) => setB("740", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("740", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">745</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("745", "0.00"))} onChange={(e) => setB("745", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("745", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Super-deduction (non-trading)</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">741</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("741", "0.00"))} onChange={(e) => setB("741", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("741", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">742</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("742", "0.00"))} onChange={(e) => setB("742", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("742", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Special rate allowance (non-trading)</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">743</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("743", "0.00"))} onChange={(e) => setB("743", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("743", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">744</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("744", "0.00"))} onChange={(e) => setB("744", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("744", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Other non-trade allowances & charges</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">750</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("750", "0.00"))} onChange={(e) => setB("750", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("750", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">755</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("755", "0.00"))} onChange={(e) => setB("755", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("755", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <PageFooter pageNum={9} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 10: Losses, Deficits & Excess Amounts */}
            {/* ======================================================== */}
            <div
              id="ct600-page-10"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={10} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">
                Losses, deficits and excess amounts
              </h2>

              {/* Losses grid (Boxes 780 - 835) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Amount arising &amp; Maximum available for surrender as group relief
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2">Loss Type</th>
                        <th className="p-2">Amount (£)</th>
                        <th className="p-2 text-right">Max Group Relief Surrender (£)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/80 dark:bg-slate-800/50">
                      <tr>
                        <td className="p-2 font-medium">Losses of trades in the UK</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">780</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("780", "0.00"))} onChange={(e) => setB("780", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("780", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">785</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("785", "0.00"))} onChange={(e) => setB("785", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("785", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Losses of trades outside the UK</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">790</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("790", "0.00"))} onChange={(e) => setB("790", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("790", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Non-trade deficits on loan relationships</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">795</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("795", "0.00"))} onChange={(e) => setB("795", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("795", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">800</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("800", "0.00"))} onChange={(e) => setB("800", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("800", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">UK property business losses</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">805</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("805", "0.00"))} onChange={(e) => setB("805", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("805", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">810</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("810", "0.00"))} onChange={(e) => setB("810", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("810", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Overseas property losses</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">815</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("815", "0.00"))} onChange={(e) => setB("815", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("815", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Losses from miscellaneous transactions</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">820</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("820", "0.00"))} onChange={(e) => setB("820", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("820", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Capital losses</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">825</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("825", "0.00"))} onChange={(e) => setB("825", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("825", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right text-slate-400">—</td>
                      </tr>

                      <tr>
                        <td className="p-2 font-medium">Non-trading losses on intangible fixed assets</td>
                        <td className="p-2">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">830</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("830", "0.00"))} onChange={(e) => setB("830", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("830", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="w-6 h-5 rounded-xs bg-[#008080] text-white text-[10px] inline-flex items-center justify-center mr-1.5">835</span>
                          {isEditMode ? (
                            <input type="number" step="0.01" value={String(getB("835", "0.00"))} onChange={(e) => setB("835", e.target.value)} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-mono text-xs rounded text-right" />
                          ) : (
                            <span className="font-mono">£{parseFloat(getB("835", "0") || "0").toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Qualifying expenditure (Boxes 760 - 775) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Qualifying expenditure
                </h3>

                <FormAmount box="760" label="Machinery and plant on which FYA is claimed" value={getB("760", "0.00")} onChange={(val) => setB("760", val)} />
                <FormAmount box="765" label="Designated environmentally friendly machinery & plant" value={getB("765", "0.00")} onChange={(val) => setB("765", val)} />
                <FormAmount box="770" label="Machinery & plant on long-life assets / integral features" value={getB("770", "0.00")} onChange={(val) => setB("770", val)} />
                <FormAmount box="771" label="Structures and buildings" value={getB("771", "0.00")} onChange={(val) => setB("771", val)} />
                <FormAmount box="772" label="Machinery and plant – super-deduction" value={getB("772", "0.00")} onChange={(val) => setB("772", val)} />
                <FormAmount box="773" label="Machinery and plant – special rate allowance" value={getB("773", "0.00")} onChange={(val) => setB("773", val)} />
                <FormAmount box="775" label="Other machinery and plant" value={getB("775", "0.00")} onChange={(val) => setB("775", val)} />
              </div>

              {/* Excess amounts (Boxes 840 - 855) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Excess amounts
                </h3>

                <FormAmount box="840" label="Non-trade capital allowances" value={getB("840", "0.00")} onChange={(val) => setB("840", val)} />
                <FormAmount box="845" label="Qualifying donations" value={getB("845", "0.00")} onChange={(val) => setB("845", val)} />
                <FormAmount box="850" label="Management expenses excess" value={getB("850", "0.00")} onChange={(val) => setB("850", val)} />
                <FormAmount box="855" label="Management expenses max group relief" value={getB("855", "0.00")} onChange={(val) => setB("855", val)} />
              </div>

              <PageFooter pageNum={10} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 11: Overpayments, Repayments & Surrender */}
            {/* ======================================================== */}
            <div
              id="ct600-page-11"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={11} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Overpayments and repayments</h2>

              {/* Small repayments (Box 860) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Small repayments
                </h3>
                <FormAmount
                  box="860"
                  label="Do not repay sums of £ or less"
                  subtitle="Read the overpayments section of Company Tax Return Guide for specific guidance"
                  value={getB("860", "0.00")}
                  onChange={(val) => setB("860", val)}
                />
              </div>

              {/* Repayments for the period (Boxes 865 - 895) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Repayments for the period covered by this return
                </h3>

                <FormAmount box="865" label="Repayment of Corporation Tax" value={getB("865", "0.00")} onChange={(val) => setB("865", val)} />
                <FormAmount box="870" label="Repayment of Income Tax" value={getB("870", "0.00")} onChange={(val) => setB("870", val)} />
                <FormAmount box="875" label="Payable Research and Development tax credit" value={getB("875", "0.00")} onChange={(val) => setB("875", val)} />
                <FormAmount box="880" label="Payable R&D expenditure credit (RDEC)" value={getB("880", "0.00")} onChange={(val) => setB("880", val)} />
                <FormAmount box="885" label="Payable creatives tax credit" value={getB("885", "0.00")} onChange={(val) => setB("885", val)} />
                <FormAmount box="886" label="Payable AVEC and VGEC" value={getB("886", "0.00")} onChange={(val) => setB("886", val)} />
                <FormAmount box="890" label="Payable land remediation or life assurance tax credit" value={getB("890", "0.00")} onChange={(val) => setB("890", val)} />
                <FormAmount box="895" label="Payable capital allowances first-year tax credit" value={getB("895", "0.00")} onChange={(val) => setB("895", val)} />
              </div>

              {/* Surrender of tax refund within group (Boxes 900 - 915) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Surrender of tax refund within group
                </h3>
                <p className="text-[11px] text-slate-500">Including surrenders under the Instalment Payments Regulations</p>

                <FormAmount box="900" label="The following amount is to be surrendered" value={getB("900", "0.00")} onChange={(val) => setB("900", val)} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormCheck box="905" label="The joint Notice is attached" />
                  <FormCheck box="910" label="Or will follow" />
                </div>

                <FormAmount
                  box="915"
                  label="Please stop repayment of following amount until we send you the Notice"
                  value={getB("915", "0.00")}
                  onChange={(val) => setB("915", val)}
                />
              </div>

              {/* Northern Ireland information (Boxes 856 - 858) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-2.5 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Northern Ireland information
                </h3>

                <FormAmount box="856" label="Group relief relates to NI trading losses used against rest of UK" value={getB("856", "0.00")} onChange={(val) => setB("856", val)} />
                <FormAmount box="857" label="Group relief relates to NI trading losses used against NI trading profits" value={getB("857", "0.00")} onChange={(val) => setB("857", val)} />
                <FormAmount box="858" label="Group relief relates to rest of UK losses used against NI trading profits" value={getB("858", "0.00")} onChange={(val) => setB("858", val)} />
              </div>

              <PageFooter pageNum={11} />
            </div>

            {/* ======================================================== */}
            {/* PAGE 12: Bank Details & Declaration */}
            {/* ======================================================== */}
            <div
              id="ct600-page-12"
              className="ct600-paper-page max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 space-y-5 print:break-after-page rounded-xl scroll-mt-14"
            >
              <PageHeader pageNum={12} />

              <h2 className="font-bold text-sm text-[#007077] dark:text-teal-400">Bank details &amp; Declaration</h2>

              {/* Bank details (Boxes 920 - 940) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Bank details (for a person to whom a repayment is to be made)
                </h3>

                {/* Box 920: Bank Name */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">920</span>
                    <span className="font-semibold">Name of bank or building society</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Barclays Bank UK PLC"
                      className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono text-xs rounded"
                    />
                  ) : (
                    <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono text-xs">
                      {bankName || "Barclays Bank UK PLC"}
                    </div>
                  )}
                </div>

                {/* Box 925: Sort Code */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">925</span>
                    <span className="font-semibold">Branch sort code</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      maxLength={6}
                      value={bankSortCode}
                      onChange={(e) => setBankSortCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="200000"
                      className="w-32 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono font-bold text-xs rounded text-center"
                    />
                  ) : (
                    <div>{renderBoxes(bankSortCode || "200000", 6)}</div>
                  )}
                </div>

                {/* Box 930: Account Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">930</span>
                    <span className="font-semibold">Account number</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      maxLength={8}
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="12345678"
                      className="w-40 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono font-bold text-xs rounded text-center"
                    />
                  ) : (
                    <div>{renderBoxes(bankAccountNumber || "12345678", 8)}</div>
                  )}
                </div>

                {/* Box 935: Account Name */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">935</span>
                    <span className="font-semibold">Name of account</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="e.g. JAS DEALS LIMITED"
                      className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono uppercase text-xs rounded"
                    />
                  ) : (
                    <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono uppercase text-xs">
                      {bankAccountName || companyName}
                    </div>
                  )}
                </div>

                {/* Box 940: Building Society Reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">940</span>
                    <span className="font-semibold">Building society reference</span>
                  </div>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={String(getB("940"))}
                      onChange={(e) => setB("940", e.target.value)}
                      placeholder="Reference (if applicable)"
                      className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono text-xs rounded"
                    />
                  ) : (
                    <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono text-xs">
                      {String(getB("940")) || "—"}
                    </div>
                  )}
                </div>
              </div>

              {/* Payments to a person other than the company (Boxes 943 - 970) */}
              <div className="border border-[#bfe0e0] dark:border-slate-800 bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-4 space-y-3 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Payments to a person other than the company
                </h3>

                <FormCheck
                  box="943"
                  label="R&D payable credit condition"
                  subtext="Put an 'X' in box 943 if there is a R&D payable credit and one of the conditions listed in the CT600 Guide is applicable"
                />

                <div className="bg-white/70 dark:bg-slate-800/40 p-3 rounded space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Authority to receive repayment on company's behalf
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">945 Status (secretary, liquidator, agent)</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("945"))} onChange={(e) => setB("945", e.target.value)} placeholder="e.g. Authorised Agent" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("945")) || "—"}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">950 Company Name</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("950"))} onChange={(e) => setB("950", e.target.value)} placeholder="e.g. JAS DEALS LIMITED" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("950")) || companyName}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">955 Nominee Name</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("955"))} onChange={(e) => setB("955", e.target.value)} placeholder="Nominee person / firm" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("955")) || "—"}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">960 Nominee Address</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("960"))} onChange={(e) => setB("960", e.target.value)} placeholder="Nominee full address" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("960")) || "—"}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">965 Nominee Reference</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("965"))} onChange={(e) => setB("965", e.target.value)} placeholder="Reference" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("965")) || "—"}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block mb-1">970 Name to receive payment</span>
                      {isEditMode ? (
                        <input type="text" value={String(getB("970"))} onChange={(e) => setB("970", e.target.value)} placeholder="Payment recipient name" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs rounded" />
                      ) : (
                        <span className="text-xs font-mono">{String(getB("970")) || "—"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Declaration (Boxes 975 - 985) */}
              <div className="border-2 border-[#007077] bg-[#eaf4f4] dark:bg-slate-900/90 rounded-md p-5 space-y-4 text-xs">
                <h3 className="font-black text-sm text-[#007077] dark:text-teal-400 uppercase tracking-wider">
                  Declaration
                </h3>

                <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed text-[11px] space-y-1.5">
                  <p className="font-bold">Statutory Declaration</p>
                  <p>
                    I declare that the information I have given on this Company Tax Return and any supplementary pages is correct and complete to the best of my knowledge and belief.
                  </p>
                  <p>
                    I understand that giving false information in the return, or concealing any part of the company's profits or tax payable, can lead to both the company and me being prosecuted.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Box 975: Name */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex items-center gap-2 pt-1">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">975</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">Name</span>
                    </div>
                    {isEditMode ? (
                      <div className="w-full sm:w-2/3 space-y-1.5">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={declarationName}
                            onChange={(e) => setDeclarationName(e.target.value)}
                            placeholder="Signatory Name (auto-linked from Accounts Production)"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 font-mono text-xs rounded"
                          />
                          {apDirectors.length > 0 && (
                            <select
                              aria-label="Select Signatory from Accounts Production"
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-slate-700 dark:text-slate-300 font-sans cursor-pointer shrink-0"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setDeclarationName(e.target.value);
                                  const match = apDirectors.find((d: any) => formatOfficerName(d.name || d.officerName) === e.target.value);
                                  if (match && (match.role || match.officerRole)) {
                                    setDeclarationStatus(match.role || match.officerRole);
                                  }
                                }
                              }}
                              value={declarationName}
                            >
                              <option value="">-- Choose AP Signatory --</option>
                              {apDirectors.map((d: any, idx: number) => {
                                const formatted = formatOfficerName(d.name || d.officerName);
                                return (
                                  <option key={idx} value={formatted}>
                                    {formatted} {d.isSignatory || d.isSignatoryOnAccounts ? "(Signatory on Accounts)" : `(${d.role || "Director"})`}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                        {apDirectors.length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                            <CheckCircle2 size={12} className="shrink-0" />
                            <span>Accounts Production Signatory: {formatOfficerName(apDirectors.find((d: any) => d.isSignatory || d.isSignatoryOnAccounts)?.name || apDirectors[0]?.name)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>{declarationName || "Arif Ullah"}</span>
                        <span className="text-[10px] font-sans tracking-wide uppercase text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 font-semibold">
                          AP Signatory
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Box 980: Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">980</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">Date DD MM YYYY</span>
                    </div>
                    <div className="font-mono font-bold text-xs">
                      {renderBoxes(declarationDate.replace(/\D/g, ""), 8)}
                    </div>
                  </div>

                  {/* Box 985: Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-5 rounded-xs bg-[#008080] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">985</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">Status</span>
                    </div>
                    {isEditMode ? (
                      <select
                        value={declarationStatus}
                        onChange={(e) => setDeclarationStatus(e.target.value)}
                        className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-600 px-3 py-1 text-xs rounded font-medium"
                      >
                        <option value="Director">Director</option>
                        <option value="Company Secretary">Company Secretary</option>
                        <option value="Authorised Agent">Authorised Agent</option>
                      </select>
                    ) : (
                      <div className="w-full sm:w-2/3 bg-white dark:bg-slate-800 border border-slate-400 px-3 py-1 font-mono text-xs">
                        {declarationStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <PageFooter pageNum={12} />
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="ct600-modal-footer ct600-no-print px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Net Tax Due: <span className="font-mono font-bold text-emerald-600 text-sm">£{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
            <span className="ml-2 text-slate-400">• Rates: {ctRate}% {marginalRelief > 0 ? `(Marginal Relief £${marginalRelief.toFixed(2)})` : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{saveMutation.isPending ? "Saving..." : "Save Form Changes"}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
