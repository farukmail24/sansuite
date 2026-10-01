import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/queryClient";
import {
  Printer, FileText, Calculator, ChevronRight,
  ChevronLeft, Building2, User, CheckCircle2, Shield,
  CreditCard, Layers, ExternalLink, Calendar, HelpCircle, Eye,
  X, Check
} from "lucide-react";

interface SA100FormReportViewProps {
  clientId: string | number;
  client: any;
  currentReturn: any;
  returns?: any[];
  defaultTab?: "sa100" | "sa302" | "poa";
  onTabChange?: (tab: "sa100" | "sa302" | "poa") => void;
  onClose?: () => void;
  isModal?: boolean;
}

export default function SA100FormReportView({
  clientId,
  client,
  currentReturn,
  returns = [],
  defaultTab = "sa100",
  onTabChange,
  onClose,
  isModal = false,
}: SA100FormReportViewProps) {
  const [activeTab, setActiveTab] = useState<"sa100" | "sa302" | "poa">(defaultTab);
  const [activePage, setActivePage] = useState<number>(1);
  const isScrollingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tab: "sa100" | "sa302" | "poa") => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Fetch practice/firm details for Tax Adviser box (Page TR 7)
  const { data: firmDetails } = useQuery<any>({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const taxYear = currentReturn?.taxYear || "2024/2025";
  const yearMatch = taxYear.match(/(\d{4})/);
  const baseYear = yearMatch ? parseInt(yearMatch[1]) : 2024;
  const nextYear = baseYear + 1;
  const nextYearShort = String(nextYear).slice(-2);
  const baseYearShort = String(baseYear).slice(-2);
  const nextNextYearShort = String(nextYear + 1).slice(-2);

  // Format Date of Birth into single boxes
  const dob = client?.dateOfBirth ? new Date(client.dateOfBirth) : null;
  const dobDay = dob && !isNaN(dob.getTime()) ? String(dob.getDate()).padStart(2, "0") : "";
  const dobMonth = dob && !isNaN(dob.getTime()) ? String(dob.getMonth() + 1).padStart(2, "0") : "";
  const dobYear = dob && !isNaN(dob.getTime()) ? String(dob.getFullYear()) : "";

  // UTR & NINO strings
  const utrStr = String(currentReturn?.utrNumber || client?.utrNumber || "").replace(/\s+/g, "");
  const ninoStr = String(currentReturn?.niNumber || client?.niNumber || "").replace(/\s+/g, "").toUpperCase();

  // Return figures
  const totalIncome = parseFloat(currentReturn?.totalIncomeReceived || currentReturn?.netIncome || "0");
  const personalAllowance = parseFloat(currentReturn?.personalAllowance || "12570");
  const taxableIncome = parseFloat(currentReturn?.taxableIncome || "0");
  const incomeTaxDue = parseFloat(currentReturn?.incomeTaxDue || "0");
  const class2Nic = parseFloat(currentReturn?.class2NicDue || "0");
  const class4Nic = parseFloat(currentReturn?.class4NicDue || "0");
  const netTaxDue = parseFloat(currentReturn?.netTaxDue || "0");
  const firstPoa = parseFloat(currentReturn?.firstPaymentOnAccount || currentReturn?.poaFirstPayment || "0");
  const secondPoa = parseFloat(currentReturn?.secondPaymentOnAccount || currentReturn?.poaSecondPayment || "0");
  const totalDueJan = netTaxDue + firstPoa;

  // Schedules Data
  let sched: any = {};
  if (currentReturn?.schedulesData) {
    try {
      sched = typeof currentReturn.schedulesData === "string" ? JSON.parse(currentReturn.schedulesData) : currentReturn.schedulesData;
    } catch {
      sched = {};
    }
  }

  // Check presence of supplementary schedules
  const hasEmployment = (Array.isArray(sched.employments) && sched.employments.length > 0) || parseFloat(currentReturn?.employmentIncome || "0") > 0;
  const hasSelfEmployment = (Array.isArray(sched.selfEmployments) && sched.selfEmployments.length > 0) || parseFloat(currentReturn?.selfEmploymentProfit || "0") > 0;
  const hasPartnership = (Array.isArray(sched.partnerships) && sched.partnerships.length > 0) || parseFloat(currentReturn?.partnershipProfit || "0") > 0;
  const hasProperty = Boolean(sched.ukProperty?.hasIncome || (Array.isArray(sched.properties) && sched.properties.length > 0) || parseFloat(currentReturn?.propertyIncome || "0") > 0);
  const hasForeign = Boolean(sched.foreign?.hasIncome || (Array.isArray(sched.foreignItems) && sched.foreignItems.length > 0) || parseFloat(currentReturn?.foreignIncome || "0") > 0);
  const hasCapitalGains = Boolean(sched.capitalGains?.hasGains || (Array.isArray(sched.capitalGainsAssets) && sched.capitalGainsAssets.length > 0) || parseFloat(currentReturn?.capitalGainsNet || "0") > 0);
  const hasResidenceRemittance = Boolean(sched.sa109?.claimRemittanceBasis || currentReturn?.claimRemittanceBasis);
  const hasAnySupplementary = hasEmployment || hasSelfEmployment || hasPartnership || hasProperty || hasForeign || hasCapitalGains || hasResidenceRemittance;
  const hasAdditionalInfo = Boolean(parseFloat(sched.seisReliefClaimed || "0") > 0 || parseFloat(sched.eisReliefClaimed || "0") > 0 || parseFloat(sched.vctReliefClaimed || "0") > 0 || sched.hasAdditionalInfo);

  // Bank refund details (from Step 2 & Step 5)
  const bankDetails = sched?.bankRefundDetails || {};
  const isRepaymentToAgent = bankDetails.repaymentOption === "agent";
  const rawSortCode = String(bankDetails.bankSortCode || currentReturn?.bankSortCode || currentReturn?.sortCode || "").replace(/\D/g, "");
  const sortCodeStr = rawSortCode.padEnd(6, " ").slice(0, 6);
  const rawAccountNo = String(bankDetails.bankAccountNumber || currentReturn?.bankAccountNumber || currentReturn?.accountNumber || "").replace(/\D/g, "");
  const accountNoStr = rawAccountNo.padEnd(8, " ").slice(0, 8);
  const accountName = bankDetails.bankAccountName || currentReturn?.bankAccountName || currentReturn?.accountHolderName || client?.clientName || "";
  const bankName = bankDetails.bankName || currentReturn?.bankName || (accountName ? "Assessee Nominated UK Bank" : "");
  const buildingSocietyRef = bankDetails.buildingSocietyRoll || currentReturn?.buildingSocietyRoll || "";

  // Declaration date (submittedAt if available, else current date)
  const declDate = currentReturn?.submittedAt ? new Date(currentReturn.submittedAt) : new Date();
  const declDay = String(declDate.getDate()).padStart(2, "0");
  const declMonth = String(declDate.getMonth() + 1).padStart(2, "0");
  const declYear = String(declDate.getFullYear());
  const declDateStr = declDay + declMonth + declYear;

  // Authentic IR Mark or clean draft state (Rule 6: Zero Mock Data)
  const irMarkDisplay = currentReturn?.irMark
    ? `IR Mark: ${currentReturn.irMark}`
    : "HMRC Self Assessment Return (Draft - Pre-filing)";

  const handlePrint = () => {
    window.print();
  };

  const scrollToPage = (pageNum: number) => {
    setActivePage(pageNum);
    const el = document.getElementById(`sa100-page-${pageNum}`);
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
    for (let i = 1; i <= 10; i++) {
      const el = document.getElementById(`sa100-page-${i}`);
      if (el) {
        const relativeTop = el.offsetTop - container.offsetTop;
        if (relativeTop <= containerTop + 200) {
          setActivePage(i);
        }
      }
    }
  };

  // Helper: Segmented digit boxes (DD MM YYYY, UTR, Sort Code, etc.)
  const renderBoxes = (value: string | number, length: number) => {
    const str = String(value || "").replace(/\s+/g, "");
    const cells = [];
    for (let i = 0; i < length; i++) {
      const char = str[i] || "";
      cells.push(
        <span
          key={i}
          className="inline-flex items-center justify-center w-5 h-6 text-xs font-mono font-bold border border-slate-400 bg-white text-slate-900 uppercase"
        >
          {char}
        </span>
      );
    }
    return <div className="inline-flex gap-0.5">{cells}</div>;
  };

  // Helper: HMRC Currency Box Grid (£ [ ][ ][ ][ ][ ] · 0 0)
  const renderCurrencyBoxes = (val: number | string, boxCount = 6) => {
    const num = Math.round(parseFloat(String(val || "0")));
    const str = num > 0 ? String(num) : "";
    const padded = str.padStart(boxCount, " ");
    return (
      <div className="inline-flex items-center gap-0.5 font-mono text-xs select-none">
        <span className="w-3.5 h-6 text-slate-600 font-bold flex items-center justify-center text-xs">£</span>
        <div className="inline-flex gap-0.5">
          {padded.split("").map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center justify-center w-4.5 h-6 text-xs font-bold border border-slate-300 bg-white ${
                c.trim() ? "text-slate-900 font-bold" : "text-transparent"
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <span className="font-bold text-slate-500 text-[11px] ml-0.5">· 0 0</span>
      </div>
    );
  };

  // Helper: Checkbox 'X' box
  const renderCheckbox = (isChecked: boolean) => (
    <div className="w-5 h-5 border border-slate-400 bg-white font-bold font-mono text-[#008080] flex items-center justify-center text-xs">
      {isChecked ? "X" : ""}
    </div>
  );

  // Helper: Corner Bracket OCR Box (Iconic HMRC address windows)
  const CornerBracketBox = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative p-3.5 ${className}`}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-800" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-800" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-800" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-800" />
      {children}
    </div>
  );

  // Official HMRC Crown Logo
  const HMRCCrownLogo = () => (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full border-2 border-[#008080] flex items-center justify-center text-[#008080] shrink-0 p-1">
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-extrabold text-sm tracking-tight text-[#008080] uppercase">
          HM Revenue
        </div>
        <div className="font-extrabold text-sm tracking-tight text-[#008080] uppercase">
          &amp; Customs
        </div>
      </div>
    </div>
  );

  // 10 Pages list matching HMRC statutory order and scanned JPGs
  const pageList = [
    { id: 1, code: "TR 1", title: "Personal Details", short: "TR 1: Personal Details", boxes: "Boxes 1 – 4", section: "Starting your return" },
    { id: 2, code: "TR 2", title: "What makes up your return", short: "TR 2: What makes up return", boxes: "Boxes 1 – 9", section: "Supplementary schedules" },
    { id: 3, code: "TR 3", title: "Interest, Dividends & Pensions", short: "TR 3: Interest & Dividends", boxes: "Boxes 1 – 20", section: "Income sources" },
    { id: 4, code: "TR 4", title: "Tax Reliefs & Charitable Giving", short: "TR 4: Reliefs & Giving", boxes: "Boxes 1 – 16", section: "Pensions & Gift Aid" },
    { id: 5, code: "TR 5", title: "Student Loan & Child Benefit", short: "TR 5: Student Loan & Child", boxes: "Boxes 1 – 6", section: "Repayments & Charges" },
    { id: 6, code: "TR 6", title: "Underpaid Tax & Bank Refund", short: "TR 6: Bank & Nominee Info", boxes: "Boxes 1 – 14", section: "Direct BACS & Nominees" },
    { id: 7, code: "TR 7", title: "Tax Adviser & Additional Info", short: "TR 7: Adviser & Box 19", boxes: "Boxes 15 – 19", section: "Agent & White space" },
    { id: 8, code: "TR 8", title: "Declaration & Signatures", short: "TR 8: Declaration & Sign", boxes: "Boxes 20 – 26", section: "Official return sign-off" },
    { id: 9, code: "TC 1", title: "SA110 Tax Calc Summary", short: "TC 1: Tax Calc Summary", boxes: "Boxes 1 – 11", section: "Statutory SA110 calc" },
    { id: 10, code: "TC 2", title: "SA110 Adjustments & Surplus", short: "TC 2: Adjustments & Surplus", boxes: "Boxes 12 – 17", section: "Surplus & Adjustments" },
  ];

  return (
    <div className={`flex flex-col ${isModal ? "h-full" : "h-[calc(100vh-140px)] min-h-[700px]"} bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 print:h-auto print:border-none print:shadow-none print:rounded-none`}>
      
      {/* Top Header Bar (Corporation Tax & CT600 Form parity style) */}
      <div className="sa100-modal-header sa100-no-print px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-xs">
        
        {/* Left: Identity, Title, Badges */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200/60 dark:border-teal-800/60 text-[#008080] dark:text-teal-300 flex items-center justify-center shrink-0 shadow-xs font-bold">
            <FileText size={20} className="stroke-[2.2]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                HMRC Self Assessment Return (SA100 & SA110) & SA302
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                currentReturn?.status === "Submitted" || currentReturn?.status === "Accepted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300"
              }`}>
                {currentReturn?.status || "Draft"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-200 font-sans flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                {client?.clientName || "Taxpayer"}
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-300">
                UTR: {client?.utrNumber || currentReturn?.utrNumber || "Not recorded"}
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
              <span>Tax Year: {taxYear}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions & Print */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Form (PDF) Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-[#008080] hover:bg-[#007070] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer active:scale-[0.98]"
            title="Print official HMRC return form or save as PDF"
          >
            <Printer size={13} className="stroke-[2.2]" />
            <span>Print Form (PDF)</span>
          </button>

          {/* Close button if in modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shrink-0"
              title="Close form"
            >
              <X size={15} className="stroke-[2.2]" />
            </button>
          )}
        </div>
      </div>

      {/* Split Body: Left Sidebar Page Nav + Right Main Form Area (Corporation Tax Layout) */}
      <div className="flex-1 flex overflow-hidden print:overflow-visible print:block">
        
        {/* Left Navigation Sidebar: Corporation Tax CT600 Parity */}
        <div className="sa100-modal-sidebar sa100-no-print w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3 space-y-3 overflow-y-auto shrink-0 print:hidden text-xs">
          
          {/* Main Top Module Toggle (SA100 vs SA302) */}
          <div className="bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 font-semibold text-xs">
            <button
              onClick={() => handleTabChange("sa100")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "sa100"
                  ? "bg-white dark:bg-slate-900 text-[#008080] dark:text-teal-300 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileText size={13} />
              <span>SA100 Return</span>
            </button>
            <button
              onClick={() => handleTabChange("sa302")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "sa302"
                  ? "bg-white dark:bg-slate-900 text-[#008080] dark:text-teal-300 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Calculator size={13} />
              <span>SA302 Calc</span>
            </button>
          </div>

          {/* If SA100: 10 Statutory Pages List */}
          {activeTab === "sa100" ? (
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>SA100 Pages (1 – 10)</span>
                <span className="font-mono text-[10px] text-[#008080] bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded font-bold">
                  Page {activePage} of 10
                </span>
              </div>

              {/* 10 Page Items */}
              {pageList.map((p) => {
                const isSelected = activePage === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => scrollToPage(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/60 text-[#008080] dark:text-teal-300 font-bold border-l-4 border-[#008080] shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                      isSelected ? "bg-[#008080] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}>
                      {p.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="leading-tight text-[11px] truncate font-semibold">
                        <span className="font-bold text-[#008080] dark:text-teal-400 mr-1">{p.code}:</span>
                        {p.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{p.boxes}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* If SA302: Computation Sections */
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>SA302 Statement</span>
                <span className="font-mono text-[10px] text-[#008080] bg-teal-50 dark:bg-teal-950 px-1.5 py-0.5 rounded font-bold">
                  1 of 1 Statement
                </span>
              </div>

              {[
                { title: "Income received", sub: "Employment, property, dividends", icon: <FileText size={13} /> },
                { title: "Personal Allowance", sub: "Statutory tax-free deduction", icon: <CheckCircle2 size={13} /> },
                { title: "Income Tax Breakdown", sub: "Non-savings, savings, dividends", icon: <Calculator size={13} /> },
                { title: "National Insurance", sub: "Class 2 & Class 4 NIC", icon: <Shield size={13} /> },
                { title: "Payments on Account", sub: "31 Jan & 31 Jul installments", icon: <CreditCard size={13} /> },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5"
                >
                  <div className="p-1 rounded bg-teal-50 dark:bg-teal-950/60 text-[#008080] dark:text-teal-400 mt-0.5">
                    {s.icon}
                  </div>
                  <div>
                    <div className="font-bold text-[11px] text-slate-900 dark:text-slate-100">{s.title}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Main Form Area: Continuous 10-Page View (Corporation Tax Style) */}
        <div
          id="sa100-modal-body"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="sa100-form-scroll-area flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-100 dark:bg-slate-950 font-sans print:p-0 print:m-0 print:overflow-visible print:bg-white text-slate-900 dark:text-slate-100 space-y-8 print:space-y-0 scroll-smooth"
        >
          {activeTab === "sa100" ? (
            <div className="space-y-8 print:space-y-0">
              
              {/* ======================================================== */}
              {/* PAGE 1: TR 1 (Personal Details & Deadlines) */}
              {/* ======================================================== */}
              <div id="sa100-page-1" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                {/* Red IR Mark Centered */}
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                {/* Header Teal Bar with Crown */}
                <div className="border-b-4 border-[#008080] pb-3 flex justify-between items-start">
                  <HMRCCrownLogo />

                  <div className="text-right">
                    <h2 className="text-2xl font-extrabold text-[#008080] leading-none tracking-tight">
                      Tax Return {nextYear}
                    </h2>
                    <span className="text-xs text-slate-700 font-semibold block mt-1">
                      Tax year 6 April {baseYear} to 5 April {nextYear}
                    </span>
                  </div>
                </div>

                {/* Metadata & OCR Corner-Bracket Address Boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 pb-2 border-b border-[#008080]/30 text-xs">
                  <div className="space-y-2 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-sans text-xs w-28">UTR:</span>
                      <strong className="tracking-wider text-sm text-slate-900">{utrStr || "—"}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-sans text-xs w-28">NINO:</span>
                      <strong className="tracking-wider text-sm text-slate-900">{ninoStr || "—"}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-sans text-xs w-28">Employer ref:</span>
                      <span className="text-slate-800 font-mono">{sched.employments?.[0]?.payeReference || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-sans text-xs w-28">Date:</span>
                      <span className="text-slate-800">06/04/{baseYear}</span>
                    </div>

                    <div className="pt-2 font-sans">
                      <span className="text-[11px] font-medium text-slate-600 block mb-1">HM Revenue &amp; Customs office address:</span>
                      <CornerBracketBox className="bg-slate-50/50">
                        <div className="text-slate-800 text-xs leading-relaxed font-mono">
                          HMRC Self Assessment<br />
                          PO Box 4000, Cardiff CF14 8HR
                        </div>
                      </CornerBracketBox>
                      <div className="text-[11px] text-slate-500 mt-1">Telephone: 0300 200 3300</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-medium text-slate-600 block">Issue address:</span>
                    <CornerBracketBox className="bg-slate-50/50">
                      <strong className="text-slate-900 block text-sm font-sans">{client?.clientName || "Taxpayer"}</strong>
                      <div className="text-slate-700 text-xs mt-1">{client?.addressLine1 || "—"}</div>
                      {client?.addressLine2 && <div className="text-slate-700 text-xs">{client?.addressLine2}</div>}
                      {(client?.city || client?.postcode) && (
                        <div className="text-slate-700 text-xs">{[client?.city, client?.postcode].filter(Boolean).join(" ")}</div>
                      )}
                    </CornerBracketBox>
                    <div className="text-[11px] text-slate-600 pt-1">
                      For Reference: <span className="font-mono font-bold text-slate-800">{utrStr || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Section: Your Tax Return */}
                <div className="space-y-3">
                  <h3 className="text-base font-extrabold text-[#008080]">Your tax return</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    This notice requires you, by law, to make a return of your taxable income and capital gains, and any documents requested, for the year from 6 April {baseYear} to 5 April {nextYear}.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Deadlines Box in Red */}
                    <div className="border-2 border-red-600 bg-white p-4 rounded-lg space-y-2 text-xs">
                      <h4 className="font-bold text-red-600 text-sm">Deadlines</h4>
                      <p className="text-slate-700 text-[11px]">We must receive your tax return by these dates:</p>
                      <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-700">
                        <li>if you are using a <strong>paper return</strong> - by <strong>31 October {baseYear}</strong> (or 3 months after the date of this notice if that's later), or</li>
                        <li>if you are filing a return <strong>online</strong> - by <strong>31 January {nextYear}</strong> (or 3 months after the date of this notice if that's later).</li>
                      </ul>
                      <div className="pt-1.5 space-y-1 text-[11px] text-slate-800">
                        <p>If your <strong>return</strong> is late you will be charged a <strong>£100 penalty</strong>.</p>
                        <p>If your return is more than 3 months late, you will be charged daily penalties of £10 a day.</p>
                        <p>If you <strong>pay</strong> late you will be charged interest and a late payment penalty.</p>
                      </div>
                    </div>

                    {/* How to file instructions */}
                    <div className="border border-slate-300 p-4 rounded-lg space-y-2 text-xs bg-slate-50/50">
                      <h4 className="font-bold text-[#008080] text-sm">How to file your return</h4>
                      <p className="text-slate-700 text-[11px]">
                        Most people file online. To do this go to <strong>hmrc.gov.uk/online</strong>
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        To file on paper, please fill in this form using the rules below:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                        <li>Use black ink and capital letters</li>
                        <li>Enter your figures to the nearest pound - ignore the pence. Round down income and round up expenses and tax paid - it is to your benefit.</li>
                        <li>If a box does not apply, please leave it blank - do not strike through empty boxes or write anything else.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section: Starting your tax return */}
                <div className="border-t-2 border-[#008080] pt-3 space-y-1.5">
                  <h3 className="text-base font-extrabold text-[#008080]">Starting your tax return</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Before you start to fill it in, look through your tax return to make sure there is a section for all your income and claims - you may need some separate supplementary pages (see page TR 2 and the Tax Return Guide). To get notes and helpsheets that will help you fill in this form, go to <strong>hmrc.gov.uk/selfassessmentforms</strong>
                  </p>
                </div>

                {/* Section: Your personal details */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#008080]">Your personal details</h4>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Box 1: Date of Birth */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">1</span>
                          <span className="font-medium text-xs text-slate-900">Your date of birth - <em>it helps get your tax right</em></span>
                        </div>
                        <div className="pl-6 space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono">DD MM YYYY</span>
                          <div className="flex items-center gap-2">
                            {renderBoxes(dobDay, 2)}
                            {renderBoxes(dobMonth, 2)}
                            {renderBoxes(dobYear, 4)}
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Phone number */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">3</span>
                          <span className="font-medium text-xs text-slate-900">Your phone number</span>
                        </div>
                        <div className="pl-6 pt-1">{renderBoxes(client?.phone || client?.mobile || "", 12)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#b2e2e6]/50">
                      {/* Box 2: Address different */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">2</span>
                          <span className="font-medium text-xs text-slate-900">Your name and address - <em>if it is different from what is on the front of this form</em></span>
                        </div>
                        <div className="pl-6 flex items-center gap-3 pt-1">
                          {renderCheckbox(false)}
                          <span className="text-[11px] text-slate-600">Put 'X' in the box</span>
                        </div>
                      </div>

                      {/* Box 4: National Insurance number */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">4</span>
                          <span className="font-medium text-xs text-slate-900">Your National Insurance number - <em>leave blank if shown above</em></span>
                        </div>
                        <div className="pl-6 pt-1">{renderBoxes(ninoStr, 9)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page 1 Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 1</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 2: TR 2 (What makes up your tax return) */}
              {/* ======================================================== */}
              <div id="sa100-page-2" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">What makes up your tax return</h2>
                  <p className="text-xs text-slate-700 mt-1">
                    To make a <strong>complete</strong> return of your taxable income and gains for the year to 5 April {nextYear} you may need to complete some <strong>separate supplementary pages</strong>. Answer the following questions by putting 'X' in the 'Yes' or 'No' box.
                  </p>
                </div>

                {/* 2-Column Layout matching scanned image exactly: Left (1-5), Right (6-9) */}
                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    
                    {/* LEFT COLUMN: Boxes 1 to 5 */}
                    <div className="space-y-4">
                      {/* 1. Employment - Magenta/Purple */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">1</span>
                          <strong className="text-xs text-[#9333ea]">Employment</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          If you were an employee, director, office holder or agency worker in the year to 5 April {nextYear}, do you need to complete <em>Employment</em> pages? Read the guide before answering.
                        </p>
                        <div className="pl-7 flex items-center justify-between pt-1">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasEmployment)}</label>
                            <label className="flex items-center gap-1.5">No {renderCheckbox(!hasEmployment)}</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Number</span>
                            {renderBoxes(hasEmployment ? String(sched.employments?.length || 1) : "", 1)}
                          </div>
                        </div>
                      </div>

                      {/* 2. Self-employment - Orange */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">2</span>
                          <strong className="text-xs text-[#ea580c]">Self-employment</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          Did you work for yourself (on your 'own account' or in self-employment) in the year to 5 April {nextYear}?
                        </p>
                        <div className="pl-7 flex items-center justify-between pt-1">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasSelfEmployment)}</label>
                            <label className="flex items-center gap-1.5">No {renderCheckbox(!hasSelfEmployment)}</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Number</span>
                            {renderBoxes(hasSelfEmployment ? String(sched.selfEmployments?.length || 1) : "", 1)}
                          </div>
                        </div>
                      </div>

                      {/* 3. Partnership - Teal */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">3</span>
                          <strong className="text-xs text-[#0d9488]">Partnership</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          Were you in partnership? Fill in a separate <em>Partnership</em> page for each partnership.
                        </p>
                        <div className="pl-7 flex items-center justify-between pt-1">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasPartnership)}</label>
                            <label className="flex items-center gap-1.5">No {renderCheckbox(!hasPartnership)}</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Number</span>
                            {renderBoxes(hasPartnership ? String(sched.partnerships?.length || 1) : "", 1)}
                          </div>
                        </div>
                      </div>

                      {/* 4. UK property - Red */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">4</span>
                          <strong className="text-xs text-[#dc2626]">UK property</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          Did you receive any income from UK property (including rents and other UK income from land you own or lease out)?
                        </p>
                        <div className="pl-7 flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasProperty)}</label>
                          <label className="flex items-center gap-1.5">No {renderCheckbox(!hasProperty)}</label>
                        </div>
                      </div>

                      {/* 5. Foreign - Olive/Gold */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">5</span>
                          <strong className="text-xs text-[#ca8a04]">Foreign</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          If you were entitled to foreign income, gains, or claim relief for foreign tax paid, do you need to fill in <em>Foreign</em> pages?
                        </p>
                        <div className="pl-7 flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasForeign)}</label>
                          <label className="flex items-center gap-1.5">No {renderCheckbox(!hasForeign)}</label>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Boxes 6 to 9 */}
                    <div className="space-y-4">
                      {/* 6. Trusts etc. - Brown */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">6</span>
                          <strong className="text-xs text-[#9a3412]">Trusts etc.</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          Did you receive or are you treated as having received income from a trust, settlement or estate?
                        </p>
                        <div className="pl-7 flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5">Yes {renderCheckbox(Boolean(sched.trustsIncome || parseFloat(sched.trustIncome || "0") > 0))}</label>
                          <label className="flex items-center gap-1.5">No {renderCheckbox(!Boolean(sched.trustsIncome || parseFloat(sched.trustIncome || "0") > 0))}</label>
                        </div>
                      </div>

                      {/* 7. Capital gains summary - Sky Blue */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">7</span>
                          <strong className="text-xs text-[#0284c7]">Capital gains summary</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          If you sold or disposed of any assets, read the guide to decide if you have to fill in the <em>Capital gains summary</em> page.
                        </p>
                        <div className="pl-7 flex items-center justify-between pt-1">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasCapitalGains)}</label>
                            <label className="flex items-center gap-1.5">No {renderCheckbox(!hasCapitalGains)}</label>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Computation(s) provided</span>
                            {renderCheckbox(Boolean(sched.cgtHasAttachment || sched.cgtComputationProvided))}
                          </div>
                        </div>
                      </div>

                      {/* 8. Residence, remittance basis etc. - Green */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">8</span>
                          <strong className="text-xs text-[#16a34a]">Residence, remittance basis etc.</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          Were you, for all or part of the year to 5 April {nextYear}, not resident or not domiciled in the UK and claiming the remittance basis?
                        </p>
                        <div className="pl-7 flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasResidenceRemittance)}</label>
                          <label className="flex items-center gap-1.5">No {renderCheckbox(!hasResidenceRemittance)}</label>
                        </div>
                      </div>

                      {/* 9. Supplementary pages - Teal */}
                      <div className="space-y-1 pt-3 border-t border-[#b2e2e6]/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-[#008080] text-white font-bold font-mono text-xs flex items-center justify-center shrink-0">9</span>
                          <strong className="text-xs text-[#008080]">Supplementary pages</strong>
                        </div>
                        <p className="text-[11px] text-slate-600 pl-7 leading-tight">
                          If you answered 'Yes' to any of questions 1 to 8, check to see if within this return there is a page dealing with that kind of income.
                        </p>
                        <div className="pl-7 flex items-center gap-3 pt-1">
                          <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasAnySupplementary)}</label>
                          <label className="flex items-center gap-1.5">No {renderCheckbox(!hasAnySupplementary)}</label>
                        </div>

                        <div className="pl-7 pt-2 space-y-1 text-[10px] text-slate-500">
                          <p>Some less common kinds of income and tax reliefs should be returned on <em>Additional information</em> pages.</p>
                          <div className="flex items-center gap-3 pt-0.5">
                            <span className="text-[11px] text-slate-700">Need Additional information pages?</span>
                            <label className="flex items-center gap-1.5">Yes {renderCheckbox(hasAdditionalInfo)}</label>
                            <label className="flex items-center gap-1.5">No {renderCheckbox(!hasAdditionalInfo)}</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 2</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 3: TR 3 (Income) */}
              {/* ======================================================== */}
              <div id="sa100-page-3" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Income</h2>
                </div>

                {/* Section 1: Interest and dividends from UK banks */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Interest and dividends from UK banks, building societies etc.</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>1</strong> Taxed UK interest etc. - net amount after tax taken off</span>
                        {renderCurrencyBoxes(currentReturn?.taxedInterest || sched?.taxedInterest || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>4</strong> Other dividends - do not include the tax credit</span>
                        {renderCurrencyBoxes(sched?.otherDividends || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>2</strong> Untaxed UK interest etc. - amounts with no tax taken off</span>
                        {renderCurrencyBoxes(currentReturn?.savingsInterest || currentReturn?.bankInterest || sched?.savingsInterest || sched?.untaxedInterest || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>5</strong> Foreign dividends (up to £300)</span>
                        {renderCurrencyBoxes(sched?.foreignDividends || (parseFloat(currentReturn?.foreignIncome || "0") > 0 && parseFloat(currentReturn?.foreignIncome || "0") <= 300 ? currentReturn.foreignIncome : 0))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>3</strong> Dividends from UK companies - do not include tax credit</span>
                        {renderCurrencyBoxes(currentReturn?.dividendIncome || sched?.dividendIncome || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>6</strong> Tax taken off foreign dividends</span>
                        {renderCurrencyBoxes(sched?.foreignDividendsTax || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: UK pensions & benefits */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">UK pensions, annuities and other state benefits received</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>7</strong> State Pension - gross amount on pension statement</span>
                        {renderCurrencyBoxes(sched?.statePension || (parseFloat(currentReturn?.pensionIncome || "0") > 0 && !sched?.otherPensions && !sched?.privatePensions ? currentReturn.pensionIncome : 0))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>11</strong> Tax taken off box 10</span>
                        {renderCurrencyBoxes(sched?.pensionTaxDeducted || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>8</strong> State Pension lump sum</span>
                        {renderCurrencyBoxes(sched?.statePensionLumpSum || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>12</strong> Taxable Incapacity Benefit &amp; ESA</span>
                        {renderCurrencyBoxes(sched?.taxableIncapacityBenefit || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>9</strong> Tax taken off box 8</span>
                        {renderCurrencyBoxes(sched?.statePensionLumpSumTax || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>13</strong> Tax taken off Incapacity Benefit in box 12</span>
                        {renderCurrencyBoxes(sched?.incapacityBenefitTax || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>10</strong> Pensions (other than State Pension), retirement annuities</span>
                        {renderCurrencyBoxes(sched?.otherPensions || sched?.privatePensions || currentReturn?.pensionIncome || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>14</strong> Jobseeker's Allowance</span>
                        {renderCurrencyBoxes(sched?.jobseekersAllowance || 0)}
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[11px] text-slate-700 block"><strong>15</strong> Total of any other taxable State Pensions and benefits</span>
                        {renderCurrencyBoxes(sched?.otherStateBenefits || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Other UK Income */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Other UK income not included on supplementary pages</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>16</strong> Other taxable income - before expenses and tax taken off</span>
                        {renderCurrencyBoxes(currentReturn?.otherIncome || currentReturn?.otherUkIncome || sched?.otherIncome || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>19</strong> Benefit from pre-owned assets</span>
                        {renderCurrencyBoxes(sched?.preOwnedAssetsBenefit || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>17</strong> Total amount of allowable expenses</span>
                        {renderCurrencyBoxes(sched?.otherIncomeExpenses || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>20</strong> Description of income in boxes 16 and 19</span>
                        <div className="border border-slate-300 bg-white p-2 rounded h-16 text-[10px] text-slate-700 font-mono flex flex-col justify-around">
                          <div className="border-b border-dotted border-slate-300 pb-0.5 truncate">
                            {sched?.otherIncomeDescription || (parseFloat(currentReturn?.otherIncome || currentReturn?.otherUkIncome || "0") > 0 ? "Sundry taxable income and commissions" : "")}
                          </div>
                          <div className="border-b border-dotted border-slate-300 pb-0.5"></div>
                          <div></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>18</strong> Any tax taken off box 16</span>
                        {renderCurrencyBoxes(sched?.otherIncomeTaxDeducted || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 3</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 4: TR 4 (Tax Reliefs) */}
              {/* ======================================================== */}
              <div id="sa100-page-4" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Tax reliefs</h2>
                </div>

                {/* Section 1: Pension Schemes */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Paying into registered pension schemes and overseas pension schemes</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>1</strong> Payments to registered pension schemes (relief at source)</span>
                        {renderCurrencyBoxes(currentReturn?.pensionContributions || sched?.pensionContributions || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>3</strong> Payments to employer's scheme not deducted before tax</span>
                        {renderCurrencyBoxes(sched?.employerSchemeNotDeducted || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>2</strong> Payments to retirement annuity contract</span>
                        {renderCurrencyBoxes(sched?.retirementAnnuityPayments || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>4</strong> Payments to an overseas pension scheme</span>
                        {renderCurrencyBoxes(sched?.overseasPensionPayments || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Charitable Giving */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Charitable giving</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>5</strong> Gift Aid payments made in year to 5 April {nextYear}</span>
                        {renderCurrencyBoxes(currentReturn?.giftAidDonations || currentReturn?.giftAidPayments || sched?.giftAidDonations || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>9</strong> Value of qualifying shares/securities gifted to charity</span>
                        {renderCurrencyBoxes(sched?.charityGiftShares || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>6</strong> Total of any 'one-off' payments in box 5</span>
                        {renderCurrencyBoxes(sched?.giftAidOneOff || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>10</strong> Value of qualifying land/buildings gifted to charity</span>
                        {renderCurrencyBoxes(sched?.charityGiftLand || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>7</strong> Gift Aid payments treated as made in year to 5 April {baseYear}</span>
                        {renderCurrencyBoxes(sched?.giftAidTreatedPriorYear || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>11</strong> Value of qualifying investments gifted to non-UK charities</span>
                        {renderCurrencyBoxes(sched?.charityGiftInvestmentsNonUk || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>8</strong> Gift Aid payments made after 5 April {nextYear} treated as current year</span>
                        {renderCurrencyBoxes(sched?.giftAidTreatedCurrentYear || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>12</strong> Gift Aid payments to non-UK charities in box 5</span>
                        {renderCurrencyBoxes(sched?.giftAidNonUk || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Blind Person's Allowance */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">Blind Person's Allowance</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>13</strong> If registered blind on local authority register put 'X'</span>
                        {renderCheckbox(Boolean(sched?.isRegisteredBlind || client?.isRegisteredBlind))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>15</strong> Want spouse's or civil partner's surplus allowance put 'X'</span>
                        {renderCheckbox(Boolean(sched?.claimMarriageAllowanceRecipient || currentReturn?.claimMarriageAllowanceRecipient))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>14</strong> Enter name of local authority or other register</span>
                        <div className="border border-slate-300 bg-white p-2 rounded h-8 text-[11px] text-slate-700 font-mono flex items-center">
                          {sched?.blindRegisterAuthority || (sched?.isRegisteredBlind ? client?.city || "Local Authority" : "")}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>16</strong> Want spouse/civil partner to have your surplus allowance put 'X'</span>
                        {renderCheckbox(Boolean(sched?.claimMarriageAllowanceTransferor || currentReturn?.claimMarriageAllowanceTransferor))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 4</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 5: TR 5 (Student Loan, Child Benefit, Service Co) */}
              {/* ======================================================== */}
              <div id="sa100-page-5" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                {/* Student Loan */}
                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Student Loan repayments</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Please read the guide before filling in boxes 1 to 3.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>1</strong> Notification that repayment began before 6 April {baseYear} put 'X'</span>
                      {renderCheckbox(Boolean((currentReturn?.studentLoanPlan && currentReturn.studentLoanPlan !== "None") || (sched?.studentLoanPlan && sched.studentLoanPlan !== "None")))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>3</strong> Think loan fully repaid within next 2 years put 'X'</span>
                      {renderCheckbox(Boolean(sched?.studentLoanRepaidSoon))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>2</strong> Employer deducted Student Loan repayments</span>
                      {renderCurrencyBoxes(currentReturn?.studentLoanDeductions || sched?.studentLoanDeductions || (Array.isArray(sched.employments) ? sched.employments.reduce((sum: number, e: any) => sum + parseFloat(e.studentLoanDeducted || "0"), 0) : 0))}
                    </div>
                  </div>
                </div>

                {/* High Income Child Benefit Charge */}
                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">High Income Child Benefit Charge</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Only fill in if your income was over £50,000 and you or partner entitled to Child Benefit.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>1</strong> Enter total amount of Child Benefit entitled to receive</span>
                      {renderCurrencyBoxes(currentReturn?.childBenefitReceived || sched?.childBenefitReceived || sched?.childBenefit?.amountReceived || 0)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>2</strong> Enter number of children entitled for</span>
                      {renderBoxes(currentReturn?.childBenefitChildrenCount || sched?.childBenefitChildrenCount || sched?.childBenefit?.childrenCount || (parseFloat(currentReturn?.childBenefitReceived || sched?.childBenefitReceived || "0") > 0 ? "1" : ""), 2)}
                    </div>
                  </div>
                </div>

                {/* Service Companies */}
                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Service companies</h2>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-700 block"><strong>1</strong> Dividends and salary from personal service company in tax year</span>
                    {renderCurrencyBoxes(sched?.personalServiceCompanyIncome || 0)}
                  </div>
                </div>

                {/* Finishing your tax return */}
                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Finishing your tax return</h2>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#008080] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">i</div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      <strong>Calculating your tax:</strong> if we receive your tax return by post or online by 31 October {baseYear}, we will do the calculation for you and tell you how much you have to pay before 31 January {nextYear}.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#b2e2e6]/50">
                    <span className="text-[11px] text-slate-700 block font-medium"><strong>1</strong> Income Tax refunded or set off by us or Jobcentre Plus</span>
                    {renderCurrencyBoxes(0)}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 5</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 6: TR 6 (Coding Out & Bank Details) */}
              {/* ======================================================== */}
              <div id="sa100-page-6" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">If you have not paid enough tax</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Use the payslip at the foot of your next statement to pay any tax due.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>2</strong> Collect tax due (under £3,000) through next year's PAYE tax code</span>
                      {renderCheckbox(Boolean(sched?.electPayeCodingOut || currentReturn?.canCodeOut || sched?.canCodeOut))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>3</strong> Do not collect High Income Child Benefit charge through tax code</span>
                      {renderCheckbox(Boolean(sched?.doNotCodeOutHicbc))}
                    </div>
                  </div>
                </div>

                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">If you have paid too much tax (Repayments &amp; Bank Details)</h2>
                  <p className="text-xs text-slate-600 mt-0.5">If you fill in bank details we can make repayment due straight into your account.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>4</strong> Name of bank or building society</span>
                      <div className="p-1.5 border border-slate-300 bg-white rounded font-mono font-bold text-xs">
                        {bankName || "—"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>11</strong> If your nominee is your tax adviser, put 'X'</span>
                      {renderCheckbox(isRepaymentToAgent)}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>5</strong> Name of account holder (or nominee)</span>
                      <div className="p-1.5 border border-slate-300 bg-white rounded font-mono font-bold text-xs">
                        {accountName || "—"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>12</strong> Nominee's address</span>
                      <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">
                        {isRepaymentToAgent ? (firmDetails?.addressLine1 || "Practice Registered Office") : (bankDetails.nomineeAddress || "—")}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>6</strong> Branch sort code</span>
                      <div className="flex items-center gap-1 font-mono">
                        {renderBoxes(sortCodeStr.slice(0, 2), 2)}
                        <span>-</span>
                        {renderBoxes(sortCodeStr.slice(2, 4), 2)}
                        <span>-</span>
                        {renderBoxes(sortCodeStr.slice(4, 6), 2)}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>13</strong> and postcode</span>
                      {renderBoxes(isRepaymentToAgent ? (firmDetails?.postcode || "") : (bankDetails.nomineePostcode || ""), 8)}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>7</strong> Account number</span>
                      {renderBoxes(accountNoStr, 8)}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>14</strong> Authorise nominee to receive repayment signature</span>
                      <div className="border border-dashed border-slate-300 bg-white p-2 rounded h-10 text-[10px] text-slate-600 font-mono flex items-center justify-center text-center">
                        {bankDetails.nomineeDeclaration ? "Authorised direct BACS repayment to nominee account" : "—"}
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-2 pt-2 border-t border-[#b2e2e6]/50">
                      <span className="text-[11px] text-slate-700 block"><strong>8</strong> Building society reference number</span>
                      {renderBoxes(buildingSocietyRef, 18)}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 6</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 7: TR 7 (Tax Adviser & Box 19 Additional Info) */}
              {/* ======================================================== */}
              <div id="sa100-page-7" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Your tax adviser, if you have one</h2>
                  <p className="text-xs text-slate-600 mt-0.5">This section is optional. Please read the guide about authorising your tax adviser.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>15</strong> Your tax adviser's name</span>
                      <div className="p-1.5 border border-slate-300 bg-white rounded font-mono font-bold text-xs">
                        {firmDetails?.firmName || "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>17</strong> The first line of their address including postcode</span>
                      <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">
                        {[firmDetails?.addressLine1, firmDetails?.city, firmDetails?.postcode].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>16</strong> Their phone number</span>
                      {renderBoxes(firmDetails?.phone ? String(firmDetails.phone).replace(/\D/g, "") : "", 14)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>18</strong> The reference your adviser uses for you</span>
                      {renderBoxes(client?.clientCode || firmDetails?.saAgentId || "", 10)}
                    </div>
                  </div>
                </div>

                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Any other information</h2>
                </div>

                {/* Box 19: Full Page White Space Area */}
                <div className="space-y-1">
                  <span className="font-bold text-xs text-slate-900 block"><strong>19</strong> Please give any other information in this space</span>
                  <div className="border-2 border-slate-300 bg-white p-4 rounded-lg min-h-[360px] font-mono text-xs text-slate-700 leading-relaxed">
                    {currentReturn?.additionalInformation || sched?.whiteSpaceNotes || currentReturn?.notes || (
                      <div className="text-slate-500 italic">
                        Return submitted electronically via HMRC Transaction Engine GovTalk XML API. Full schedules and statutory accounts verified under Self Assessment TMA 1970 s9.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 7</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 8: TR 8 (Declaration & Signature) */}
              {/* ======================================================== */}
              <div id="sa100-page-8" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Signing your form and sending it back</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Please fill in this section and sign and date the declaration at box 22.</p>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left side: Boxes 20, 21, 22 */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>20</strong> If this tax return contains provisional or estimated figures, put 'X'</span>
                        {renderCheckbox(Boolean(sched?.hasProvisionalFigures))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>21</strong> If you are enclosing separate supplementary pages, put 'X'</span>
                        {renderCheckbox(hasAnySupplementary)}
                      </div>

                      {/* Box 22: Declaration & Orange-bordered Signature box */}
                      <div className="border-2 border-orange-400 bg-white p-4 rounded-lg space-y-2">
                        <strong className="text-xs text-slate-900 block">22 Declaration</strong>
                        <p className="text-[10px] text-slate-700 leading-normal">
                          I declare that the information I have given on this tax return and any supplementary pages is correct and complete to the best of my knowledge and belief.
                        </p>
                        <p className="text-[10px] text-slate-700 leading-normal font-semibold">
                          I understand that I may have to pay financial penalties and face prosecution if I give false information.
                        </p>
                        <div className="pt-1">
                          <span className="text-[11px] font-bold text-slate-800 block mb-1">Signature</span>
                          <div className="border-2 border-orange-300 p-3 rounded h-16 bg-white flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-800 font-bold text-sm">
                              {client?.clientName || "Assessee Signature"}
                            </span>
                            {currentReturn?.status === "Submitted" || currentReturn?.submittedAt ? (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                HMRC Submission Verified
                              </span>
                            ) : client?.esignStatus === "Signed" ? (
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                Electronic Signature Verified
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                                Ready for Assessee Sign-off
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-[11px] text-slate-700 font-mono">Date DD MM YYYY</span>
                          {renderBoxes(declDateStr, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Boxes 23-26 */}
                    <div className="space-y-3 border-l border-[#b2e2e6]/60 pl-5">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>23</strong> If you have signed on behalf of someone else, enter the capacity. For example, executor, receiver</span>
                        <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">{sched?.signatoryCapacity || "Taxpayer / Self"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>24</strong> Enter the name of the person you have signed for</span>
                        <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">{client?.clientName || "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>25</strong> If you filled in boxes 23 and 24 enter your name</span>
                        <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">{sched?.signatoryName || client?.clientName || "Self"}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>26</strong> and your address</span>
                        <div className="p-1.5 border border-slate-300 bg-white rounded font-mono text-xs">{[client?.addressLine1, client?.city, client?.postcode].filter(Boolean).join(", ") || "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA100 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TR 8</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 9: TC 1 (SA110 Tax Calculation Summary) */}
              {/* ======================================================== */}
              <div id="sa100-page-9" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-page">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                {/* Header SA110 */}
                <div className="border-b-4 border-[#008080] pb-3 flex justify-between items-start">
                  <HMRCCrownLogo />

                  <div className="text-right">
                    <h2 className="text-2xl font-extrabold text-[#008080] leading-none tracking-tight">
                      Tax calculation summary
                    </h2>
                    <span className="text-xs text-slate-700 font-semibold block mt-1">
                      Tax year 6 April {baseYear} to 5 April {nextYear}
                    </span>
                  </div>
                </div>

                {/* Name and UTR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#f0f9fa] p-3.5 rounded-lg border border-[#b2e2e6]">
                  <div>
                    <span className="text-[11px] text-slate-600 block">Your name</span>
                    <strong className="text-xs text-slate-900 font-mono">{client?.clientName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-600 block">Your Unique Taxpayer Reference (UTR)</span>
                    {renderBoxes(utrStr, 10)}
                  </div>
                </div>

                {/* Info Note */}
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="w-4 h-4 rounded-full bg-[#008080] text-white flex items-center justify-center font-bold text-[10px] shrink-0">i</div>
                  <span>To get notes and helpsheets that will help you fill in this form, go to <strong>hmrc.gov.uk/selfassessmentforms</strong></span>
                </div>

                {/* Self Assessment Summary Boxes 1 - 6 */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[#008080]">Self Assessment</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>1</strong> Total tax (this may include Student Loan repayment) and Class 4 NICs due</span>
                        {renderCurrencyBoxes(incomeTaxDue + class4Nic + parseFloat(currentReturn?.studentLoanDue || "0"))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>4</strong> Class 4 NICs due</span>
                        {renderCurrencyBoxes(class4Nic)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>2</strong> Total tax and Class 4 NICs overpaid</span>
                        {renderCurrencyBoxes(netTaxDue < 0 ? Math.abs(netTaxDue) : 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>5</strong> Capital Gains Tax due</span>
                        {renderCurrencyBoxes(currentReturn?.capitalGainsTaxDue || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>3</strong> Student Loan repayment due</span>
                        {renderCurrencyBoxes(currentReturn?.studentLoanDue || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>6</strong> Pension charges due</span>
                        {renderCurrencyBoxes(sched?.pensionChargesDue || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Underpaid Tax and other debts Boxes 7 - 9 */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[#008080]">Underpaid tax and other debts</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>7</strong> Underpaid tax for earlier years in tax code</span>
                        {renderCurrencyBoxes(sched?.underpaidTaxPriorYears || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>9</strong> Outstanding debt in your tax code</span>
                        {renderCurrencyBoxes(sched?.taxCodeDebt || 0)}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>8</strong> Underpaid tax for {baseYear}-{nextYearShort} in code for {nextYearShort}-{nextNextYearShort}</span>
                        {renderCurrencyBoxes(sched?.underpaidTaxCurrentYear || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payments on Account Boxes 10 - 11 */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[#008080]">Payments on account</h3>
                  <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>10</strong> Claiming to reduce payments on account put 'X'</span>
                        {renderCheckbox(Boolean(currentReturn?.poaReducedReason))}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-700 block"><strong>11</strong> Your first payment on account for next year</span>
                        {renderCurrencyBoxes(firstPoa)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA110 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TC 1</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PAGE 10: TC 2 (SA110 Adjustments & Surplus) */}
              {/* ======================================================== */}
              <div id="sa100-page-10" className="sa100-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 shadow-md max-w-4xl mx-auto space-y-5 text-xs print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:break-after-avoid">
                
                <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-1">
                  {irMarkDisplay}
                </div>

                <div className="border-b-4 border-[#008080] pb-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Blind person's surplus allowance &amp; married couple's allowance</h2>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>12</strong> Blind person's surplus allowance you can have</span>
                      {renderCurrencyBoxes(sched?.blindSurplusAllowance || 0)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>13</strong> Spouse/civil partner surplus allowance</span>
                      {renderCurrencyBoxes(sched?.marriageAllowanceTaxReducer || 0)}
                    </div>
                  </div>
                </div>

                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Adjustments to tax due</h2>
                </div>

                <div className="bg-[#f0f9fa] border border-[#b2e2e6] rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>14</strong> Increase in tax due because of adjustments to earlier year</span>
                      {renderCurrencyBoxes(sched?.adjustmentIncrease || 0)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-700 block"><strong>15</strong> Decrease in tax due because of adjustments to earlier year</span>
                      {renderCurrencyBoxes(sched?.adjustmentDecrease || 0)}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <span className="text-[11px] text-slate-700 block"><strong>16</strong> Any {nextYearShort}-{nextNextYearShort} repayment you are claiming now</span>
                      {renderCurrencyBoxes(sched?.repaymentClaimedNow || 0)}
                    </div>
                  </div>
                </div>

                <div className="border-b-4 border-[#008080] pb-2 pt-2">
                  <h2 className="text-lg font-extrabold text-[#008080]">Any other information</h2>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-700 block font-medium"><strong>17</strong> Please give any other information in this space</span>
                  <div className="border-2 border-slate-300 bg-white p-4 rounded-lg min-h-[300px] font-mono text-xs text-slate-600 leading-relaxed">
                    {sched?.whiteSpaceNotesTC2 || `SA110 Tax calculation completed with HMRC verified statutory standard formulas (TMA 1970 s9). Total tax & NICs liability: £${netTaxDue.toFixed(2)}.`}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span className="font-bold">SA110 {nextYear}</span>
                  <span className="font-bold text-slate-800">Page TC 2</span>
                  <span>HMRC {baseYearShort}/{nextYearShort}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* SA302 COMPUTATION SCHEDULE (Exact Scanned Image Parity) */
            /* ======================================================== */
            <div id="sa302-document" className="sa302-paper-page bg-white text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto space-y-6 text-xs font-sans print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none print:space-y-2 print:break-after-avoid">
              
              {/* Red IR Mark Centered */}
              <div className="text-center font-mono text-[11px] font-bold text-red-600 select-none pb-2 print:pb-1">
                {irMarkDisplay}
              </div>

              {/* Title */}
              <div className="text-center pb-3 print:pb-1">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight print:text-lg">
                  Tax Calculation (SA302)
                </h1>
              </div>

              {/* Top Client Metadata Badges (Light Blue Pills matching scanned image) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-200 text-xs print:pb-2.5 print:gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600">Client Name:</span>
                  <span className="px-3 py-1 rounded bg-[#e6f4f8] text-slate-900 font-bold font-mono">
                    {client?.clientName || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600">UTR No :</span>
                  <span className="px-3 py-1 rounded bg-[#e6f4f8] text-slate-900 font-bold font-mono tracking-wider">
                    {utrStr || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-600">Tax Year :</span>
                  <span className="px-3 py-1 rounded bg-[#e6f4f8] text-slate-900 font-bold font-mono">
                    {taxYear}
                  </span>
                </div>
              </div>

              {/* Section 1: Income Received */}
              <div className="space-y-4 print:space-y-1.5">
                <div className="bg-[#e6f4f8] px-3.5 py-1.5 rounded font-bold text-slate-900 text-xs">
                  Income received (before tax taken off)
                </div>

                <div className="space-y-2 px-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900">Total income received</span>
                    <span className="font-mono font-bold text-slate-900">
                      £{totalIncome.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-2 text-xs italic text-slate-700">minus</div>

                  <div className="flex justify-between items-center text-xs pl-6">
                    <span className="text-slate-700">Personal Allowance</span>
                    <span className="font-mono text-slate-900 border-b border-slate-400 pb-0.5 w-32 text-right">
                      £{personalAllowance.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <strong className="text-slate-900">Total</strong>
                    <span className="font-mono font-bold text-slate-900 border-b border-slate-400 pb-0.5 w-32 text-right">
                      £{personalAllowance.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2">
                    <strong className="text-slate-900">Total income on which tax is due</strong>
                    <span className="font-mono font-bold text-slate-900 border-b-2 border-double border-slate-900 pb-0.5 w-32 text-right">
                      £{taxableIncome.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: How I have worked out your Income Tax */}
              <div className="space-y-4 pt-4 print:space-y-1.5 print:pt-2">
                <div className="bg-[#e6f4f8] px-3.5 py-1.5 rounded font-bold text-slate-900 text-xs">
                  How I have worked out your Income Tax
                </div>

                <div className="space-y-2 px-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900">Income Tax charged</span>
                    <span className="font-mono font-bold text-slate-900 border-b border-slate-400 pb-0.5 w-32 text-right">
                      £{incomeTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {(class2Nic > 0 || class4Nic > 0) && (
                    <div className="flex justify-between items-center text-xs pl-4">
                      <span className="text-slate-700">Class 2 &amp; Class 4 National Insurance contributions</span>
                      <span className="font-mono text-slate-900 w-32 text-right">
                        £{(class2Nic + class4Nic).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-3 print:pt-1.5">
                    <strong className="text-slate-900">Total tax due</strong>
                    <span className="font-mono font-bold text-slate-900 border-b-2 border-double border-slate-900 pb-0.5 w-32 text-right">
                      £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Payment on account due */}
              <div className="space-y-4 pt-4 print:space-y-1.5 print:pt-2">
                <div className="bg-[#e6f4f8] px-3.5 py-1.5 rounded font-bold text-slate-900 text-xs">
                  Payment on account due
                </div>

                <div className="space-y-2 px-2 text-xs">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-900">Total Income Tax Due</strong>
                    <span className="font-mono font-bold text-slate-900 border-b border-slate-400 pb-0.5 w-32 text-right">
                      £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700 pt-1">
                    <span>Decrease in tax due because of adjustment to earlier year</span>
                    <span className="font-mono w-32 text-right">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>{nextYearShort}-{nextNextYearShort} repayment being claimed now</span>
                    <span className="font-mono w-32 text-right">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Payment on account already made in the year</span>
                    <span className="font-mono w-32 text-right">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Other payments made towards balancing payment</span>
                    <span className="font-mono w-32 text-right">£0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Amount to be collected via PAYE</span>
                    <span className="font-mono w-32 text-right">£0.00</span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-center">
                    <strong className="text-slate-900">Tax due</strong>
                    <span className="font-mono font-bold text-slate-900 border-b border-slate-400 pb-0.5 w-32 text-right">
                      £{netTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-700 pt-2 print:pt-1">
                    <span>Calculated Payment on Account due by 31st January {nextYear}</span>
                    <span className="font-mono w-32 text-right">
                      £{firstPoa.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Payment Pill Boxes matching scanned image */}
                  <div className="pt-3 space-y-2 print:pt-1.5 print:space-y-1">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900">Total payment due by 31st January {nextYear}</strong>
                      <span className="px-4 py-1.5 rounded bg-[#e6f4f8] text-slate-900 font-mono font-bold text-xs w-36 text-right">
                        £{totalDueJan.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900">Total payment due by 31st July {nextYear}</strong>
                      <span className="px-4 py-1.5 rounded bg-[#e6f4f8] text-slate-900 font-mono font-bold text-xs w-36 text-right">
                        £{secondPoa.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SA302 Footer */}
              <div className="pt-8 border-t border-slate-200 text-center text-xs text-slate-500 font-mono print:pt-3">
                1 of 1
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
