import { useState, useEffect, useMemo } from "react";
import { useRoute, Link, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ClientWorkspaceLayout from "./workspace/ClientWorkspaceLayout";
import {
  Building2, Users, FileText, PieChart, Award, BookOpen,
  Layers, Heading, FileDiff, Lock, Save, CheckCircle2,
  Edit3, X, Plus, KeyRound, Eye, EyeOff, ShieldCheck,
  Landmark, Scale, Briefcase
} from "lucide-react";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function ReportSettingsPage() {
  const [, params] = useRoute("/accounts-production/:clientId/settings");
  const clientId = params?.clientId;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("company_info");
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Note Modal state
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [editingNoteContent, setEditingNoteContent] = useState("");

  // Tab 1: Company Info
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registeredOffice, setRegisteredOffice] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [companySize, setCompanySize] = useState("Micro-entity");
  const [taxonomy, setTaxonomy] = useState("FRS 105 (Micro-entities)");
  const [currency, setCurrency] = useState("Pound Sterling (£)");
  const [disclosures, setDisclosures] = useState({
    tangibleAssets: true,
    debtors: true,
    creditors: true,
    intangibleAssets: false,
    employees: true,
    directorsRemuneration: true,
  });

  // Tab 2: Company Contacts (Directors, Bankers, Solicitors, Accountants)
  const [companyContacts, setCompanyContacts] = useState({
    bankers: { bankName: "", branch: "", accountNo: "", address: "" },
    solicitors: { firmName: "", contactPerson: "", address: "" },
    accountants: { firmName: "", contactPerson: "", qualification: "ICAEW / ACCA", address: "" },
  });

  // Tab 3: Director's Report
  const [directorsReportSignatory, setDirectorsReportSignatory] = useState("");
  const [balanceSheetSignatory, setBalanceSheetSignatory] = useState("");
  const [relatedNotes, setRelatedNotes] = useState({
    directorsReport: true,
    principalActivities: true,
    directorsResponsibilities: true,
    politicalDonations: false,
    smallCompanyExemptions: true,
    businessReview: true,
    goingConcern: true,
    futureProspects: true,
    dividends: true,
  });
  const [noteTexts, setNoteTexts] = useState({
    directorsReportText: "The director presents the annual report and the financial statements of the company for the year ended.",
    principalActivitiesText: "The principal activity of the company during the financial year was the provision of professional and business services.",
    directorsResponsibilitiesText: "The director is responsible for preparing the director's report and the financial statements in accordance with applicable law and regulations and in accordance with United Kingdom Generally Accepted Accounting Practice.",
    politicalDonationsText: "No political or charitable donations were made during the reporting period.",
    smallCompanyExemptionsText: "This report has been prepared in accordance with the special provisions relating to companies subject to the small companies regime within Part 15 of the Companies Act 2006.",
    businessReviewText: "",
    goingConcernText: "After making enquiries, the director has a reasonable expectation that the company has adequate resources to continue in operational existence for the foreseeable future. Accordingly, the financial statements have been prepared on a going concern basis.",
    futureProspectsText: "The director is satisfied with the current trading conditions and remains optimistic about the company's future prospects.",
    dividendsText: "No dividends were paid or declared during the year (prior year: £nil).",
  });

  // Tab 4: Share Capital (Capium Parity Multi-Class Ledger)
  const [shareCapitalList, setShareCapitalList] = useState<any[]>([
    {
      id: "share-1",
      shareType: "Equity",
      shareClass: "Ordinary shares",
      issueDate: new Date().toISOString().split("T")[0],
      numberOfShares: 100,
      nominalValue: 1.0,
      allottedShares: 100,
      authorisedShares: 100,
      buyBackDate: "",
      buyBackShares: 0,
      isPartlyPaid: false,
      amountPaidPerShare: 1.0,
      totalPaidUp: 100,
    },
  ]);
  const [displayAuthorisedShares, setDisplayAuthorisedShares] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [shareForm, setShareForm] = useState<any>({
    shareType: "Equity",
    shareClass: "Ordinary - Class 1",
    issueDate: new Date().toISOString().split("T")[0],
    numberOfShares: 100,
    nominalValue: 1.0,
    allottedShares: 100,
    authorisedShares: 100,
    buyBackDate: "",
    buyBackShares: 0,
    isPartlyPaid: false,
    amountPaidPerShare: 1.0,
  });
  const [shareCapitalData, setShareCapitalData] = useState({
    shareClass: "Ordinary shares",
    numberOfShares: 100,
    nominalValue: 1.0,
    totalPaidUp: 100,
  });

  // Tab 5: Accountant's Report
  const [accountantsReportData, setAccountantsReportData] = useState({
    included: true,
    accountantName: "",
    firmName: "",
    qualification: "ICAEW / ACCA Chartered Accountants",
    engagementDate: new Date().toISOString().split("T")[0],
    compilationReportText: "In accordance with our engagement letter, we have compiled the financial statements from the accounting records and information supplied to us.",
  });

  // Tab 6: Accounting Policies
  const [policies, setPolicies] = useState({
    basisOfPreparation: "These financial statements have been prepared under FRS 105 / FRS 102 1A Micro-entities Regime in UK GAAP.",
    turnoverRecognition: "Turnover is measured at the fair value of consideration received or receivable, net of VAT and trade discounts.",
    tangibleFixedAssets: "Tangible fixed assets are measured at cost less accumulated depreciation. Depreciation is calculated at 25% straight line.",
    financialInstruments: "Financial instruments are classified and measured in accordance with FRS section 11 basic financial instruments.",
  });

  // Tab 7: Additional Notes
  const [additionalNotesData, setAdditionalNotesData] = useState({
    employeeCount: 1,
    debtorsTrade: 0,
    creditorsTrade: 0,
    directorsLoansText: "No advances or loans were made to directors during the period requiring disclosure under section 413 of the Companies Act 2006.",
  });

  // Tab 8: Customise Headings
  const [customHeadings, setCustomHeadings] = useState({
    profitAndLossTitle: "Profit and Loss Account",
    balanceSheetTitle: "Balance Sheet",
    notesTitle: "Notes to the Financial Statements",
    columnHeaderStyle: "YYYY", // YYYY, DD/MM/YYYY, DD Month YYYY
  });

  // Tab 9: Revised Accounts
  const [revisedAccounts, setRevisedAccounts] = useState({
    isRevised: false,
    revisionType: "Replacement", // Replacement or SupplementaryNote
    originalFilingDate: "",
    reason: "",
    statutoryDeclaration: "These revised financial statements replace the original accounts and have been prepared in accordance with Section 454 of the Companies Act 2006.",
  });

  // Tab 10: Data Security
  const [dataSecurity, setDataSecurity] = useState({
    pdfPasswordEnabled: false,
    masterPassword: "",
  });

  // Tab: Auto-Rounding & Entity Type
  const [autoRoundingEnabled, setAutoRoundingEnabled] = useState(false);
  const [roundingAccountPl, setRoundingAccountPl] = useState("7999");
  const [roundingAccountBs, setRoundingAccountBs] = useState("3200");
  const [entityType, setEntityType] = useState("LimitedByShares");

  // CIC34 Notes state
  const [cicNotes, setCicNotes] = useState({
    activitiesAndImpact: "",
    stakeholderConsultation: "",
    directorsRemuneration: "",
    transferOfAssets: "",
    interestPaid: "",
    firstSignatoryId: "",
    secondSignatoryId: "",
  });

  const [hasInitialized, setHasInitialized] = useState(false);
  const [customDirectors, setCustomDirectors] = useState<string[]>([]);
  const [showAddDirectorModal, setShowAddDirectorModal] = useState(false);
  const [newDirectorName, setNewDirectorName] = useState("");

  // Fetch report settings from server
  const { data: dbSettings } = useQuery({
    queryKey: [`/api/accounts-production/${clientId}/report-settings`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/report-settings`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch CIC notes from server
  const { data: dbCicNotes } = useQuery({
    queryKey: [`/api/accounts-production/${clientId}/cic-notes/0`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/cic-notes/0`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch client directors
  const { data: directorsList = [] } = useQuery({
    queryKey: [`/api/accounts-production/${clientId}/ch-directors`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-directors`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Fetch client details
  const { data: client } = useQuery({
    queryKey: [`/api/practice/clients/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practice/clients`);
      if (!res.ok) return null;
      const clients = await res.json();
      const parsedId = parseInt(clientId || "0");
      if (isNaN(parsedId)) return null;
      return clients.find((c: any) => c.id === parsedId) || null;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (client && !companyName) {
      if (client.clientName) setCompanyName(client.clientName);
      if (client.registrationNumber) setRegistrationNumber(client.registrationNumber);
      if (client.address) setRegisteredOffice(client.address);
    }
    if (dbSettings && !hasInitialized) {
      if (dbSettings.companyName) setCompanyName(dbSettings.companyName);
      if (dbSettings.registrationNumber) setRegistrationNumber(dbSettings.registrationNumber);
      if (dbSettings.registeredOffice) setRegisteredOffice(dbSettings.registeredOffice);
      if (dbSettings.authCode) setAuthCode(dbSettings.authCode);
      if (dbSettings.companySize) setCompanySize(dbSettings.companySize);
      if (dbSettings.taxonomy) setTaxonomy(dbSettings.taxonomy);
      if (dbSettings.currency) setCurrency(dbSettings.currency);
      if (dbSettings.disclosures) setDisclosures(dbSettings.disclosures);
      if (dbSettings.directorsReportSignatory) setDirectorsReportSignatory(dbSettings.directorsReportSignatory);
      if (dbSettings.balanceSheetSignatory) setBalanceSheetSignatory(dbSettings.balanceSheetSignatory);
      if (dbSettings.relatedNotes) setRelatedNotes(dbSettings.relatedNotes);
      if (dbSettings.noteTexts) setNoteTexts(dbSettings.noteTexts);
      if (dbSettings.policies) setPolicies(dbSettings.policies);
      if (dbSettings.additionalNotesData) setAdditionalNotesData(dbSettings.additionalNotesData);
      if (dbSettings.companyContacts) setCompanyContacts(dbSettings.companyContacts);
      if (dbSettings.shareCapitalList && Array.isArray(dbSettings.shareCapitalList) && dbSettings.shareCapitalList.length > 0) {
        setShareCapitalList(dbSettings.shareCapitalList);
      }
      if (dbSettings.displayAuthorisedShares !== undefined) {
        setDisplayAuthorisedShares(Boolean(dbSettings.displayAuthorisedShares));
      }
      if (dbSettings.shareCapitalData) setShareCapitalData(dbSettings.shareCapitalData);
      if (dbSettings.accountantsReportData) setAccountantsReportData(dbSettings.accountantsReportData);
      if (dbSettings.customHeadings) setCustomHeadings(dbSettings.customHeadings);
      if (dbSettings.revisedAccounts) setRevisedAccounts(dbSettings.revisedAccounts);
      if (dbSettings.dataSecurity) setDataSecurity(dbSettings.dataSecurity);
      if (dbSettings.autoRoundingEnabled !== undefined) setAutoRoundingEnabled(Boolean(dbSettings.autoRoundingEnabled));
      if (dbSettings.roundingAccountPl) setRoundingAccountPl(dbSettings.roundingAccountPl);
      if (dbSettings.roundingAccountBs) setRoundingAccountBs(dbSettings.roundingAccountBs);
      if (dbSettings.entityType) setEntityType(dbSettings.entityType);
      setHasInitialized(true);
    }
    if (dbCicNotes) {
      setCicNotes({
        activitiesAndImpact: dbCicNotes.activitiesAndImpact || "",
        stakeholderConsultation: dbCicNotes.stakeholderConsultation || "",
        directorsRemuneration: dbCicNotes.directorsRemuneration || "",
        transferOfAssets: dbCicNotes.transferOfAssets || "",
        interestPaid: dbCicNotes.interestPaid || "",
        firstSignatoryId: dbCicNotes.firstSignatoryId ? String(dbCicNotes.firstSignatoryId) : "",
        secondSignatoryId: dbCicNotes.secondSignatoryId ? String(dbCicNotes.secondSignatoryId) : "",
      });
    }
  }, [client, dbSettings, dbCicNotes, hasInitialized, companyName]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload = {
        companyName,
        registrationNumber,
        registeredOffice,
        authCode,
        companySize,
        taxonomy,
        currency,
        disclosures,
        directorsReportSignatory,
        balanceSheetSignatory,
        relatedNotes,
        noteTexts,
        policies,
        additionalNotesData,
        companyContacts,
        shareCapitalData: {
          shareClass: shareCapitalList[0]?.shareClass || "Ordinary shares",
          numberOfShares: shareCapitalList.reduce((sum, s) => sum + (Number(s.allottedShares || s.numberOfShares) || 0), 0),
          nominalValue: shareCapitalList[0]?.nominalValue || 1.0,
          totalPaidUp: shareCapitalList.reduce((sum, s) => sum + (Number(s.totalPaidUp) || 0), 0),
        },
        shareCapitalList,
        displayAuthorisedShares,
        accountantsReportData,
        customHeadings,
        revisedAccounts,
        dataSecurity,
        autoRoundingEnabled,
        roundingAccountPl,
        roundingAccountBs,
        entityType,
      };

      await apiRequest("POST", `/api/accounts-production/${clientId}/report-settings`, payload);
      await apiRequest("POST", `/api/accounts-production/${clientId}/cic-notes/save`, {
        periodId: 0,
        ...cicNotes,
      });
      await queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/report-settings`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/cic-notes/0`] });

      toast({
        title: "Report Settings Saved",
        description: "All report configurations, disclosures, and CIC notes updated successfully.",
      });
    } catch {
      toast({
        title: "Error Saving Settings",
        description: "Failed to update report settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openNoteEditor = (key: string, title: string, currentContent: string) => {
    setEditingNoteKey(key);
    setEditingNoteTitle(title);
    setEditingNoteContent(currentContent);
  };

  const saveNoteEditor = () => {
    if (!editingNoteKey) return;
    if (editingNoteKey in noteTexts) {
      setNoteTexts({ ...noteTexts, [editingNoteKey]: editingNoteContent });
    } else if (editingNoteKey in policies) {
      setPolicies({ ...policies, [editingNoteKey]: editingNoteContent });
    } else if (editingNoteKey in additionalNotesData) {
      setAdditionalNotesData({ ...additionalNotesData, [editingNoteKey]: editingNoteContent });
    }
    setEditingNoteKey(null);
    toast({
      title: "Paragraph Updated",
      description: `Updated text for ${editingNoteTitle}. Click Save Settings to persist changes.`,
    });
  };

  const openAddShareModal = () => {
    setEditingShareId(null);
    setShareForm({
      shareType: "Equity",
      shareClass: "Ordinary - Class 1",
      issueDate: new Date().toISOString().split("T")[0],
      numberOfShares: 100,
      nominalValue: 1.0,
      allottedShares: 100,
      authorisedShares: 100,
      buyBackDate: "",
      buyBackShares: 0,
      isPartlyPaid: false,
      amountPaidPerShare: 1.0,
    });
    setShowShareModal(true);
  };

  const openEditShareModal = (item: any) => {
    setEditingShareId(item.id);
    setShareForm({ ...item });
    setShowShareModal(true);
  };

  const handleSaveShareForm = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(shareForm.numberOfShares) || 0;
    const nom = Number(shareForm.nominalValue) || 1.0;
    const buyBack = Number(shareForm.buyBackShares) || 0;
    const netShares = Math.max(0, (Number(shareForm.allottedShares) || qty) - buyBack);
    const paidRate = shareForm.isPartlyPaid ? (Number(shareForm.amountPaidPerShare) || nom) : nom;
    const totalPaid = Math.round(netShares * paidRate * 100) / 100;

    const record = {
      id: editingShareId || `share-${Date.now()}`,
      shareType: shareForm.shareType || "Equity",
      shareClass: shareForm.shareClass?.trim() || "Ordinary shares",
      issueDate: shareForm.issueDate || new Date().toISOString().split("T")[0],
      numberOfShares: qty,
      nominalValue: nom,
      allottedShares: Number(shareForm.allottedShares) || qty,
      authorisedShares: Number(shareForm.authorisedShares) || qty,
      buyBackDate: shareForm.buyBackDate || "",
      buyBackShares: buyBack,
      isPartlyPaid: Boolean(shareForm.isPartlyPaid),
      amountPaidPerShare: shareForm.isPartlyPaid ? Number(shareForm.amountPaidPerShare) : nom,
      totalPaidUp: totalPaid,
    };

    if (editingShareId) {
      setShareCapitalList((prev) => prev.map((s) => (s.id === editingShareId ? record : s)));
    } else {
      setShareCapitalList((prev) => [...prev, record]);
    }

    setShowShareModal(false);
    toast({
      title: editingShareId ? "Share Capital Updated" : "New Share Added",
      description: `${record.shareClass} successfully ${editingShareId ? "updated" : "added"}. Click Save Settings to persist.`,
    });
  };

  const handleDeleteShare = (id: string) => {
    setShareCapitalList((prev) => prev.filter((s) => s.id !== id));
    toast({
      title: "Share Class Removed",
      description: "Click Save Settings to persist the change.",
    });
  };

  const handleAddCustomDirector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectorName.trim()) return;
    const name = newDirectorName.trim();
    if (!customDirectors.includes(name)) {
      setCustomDirectors([...customDirectors, name]);
    }
    setDirectorsReportSignatory(name);
    setShowAddDirectorModal(false);
    setNewDirectorName("");
    toast({
      title: "Signatory Director Added",
      description: `Added ${name} to director signatories list.`,
    });
  };

  const directorOptions = useMemo(() => {
    const dbNames = directorsList.map((d: any) => d.name).filter(Boolean);
    const set = new Set([...dbNames, ...customDirectors, directorsReportSignatory, balanceSheetSignatory].filter(Boolean));
    return Array.from(set);
  }, [directorsList, customDirectors, directorsReportSignatory, balanceSheetSignatory]);

  if (!clientId) return <Redirect to="/accounts-production" />;

  const tabs = [
    { id: "company_info", label: "Company Info", icon: <Building2 size={14} /> },
    { id: "auto_rounding", label: "Auto-Rounding & Entity", icon: <Scale size={14} /> },
    { id: "company_contacts", label: "Company Contacts", icon: <Users size={14} /> },
    { id: "directors_report", label: "Director's Report", icon: <FileText size={14} /> },
    { id: "share_capital", label: "Share Capital", icon: <PieChart size={14} /> },
    { id: "accountants_report", label: "Accountant's Report", icon: <Award size={14} /> },
    { id: "accounting_policies", label: "Accounting Policy", icon: <BookOpen size={14} /> },
    { id: "additional_notes", label: "Additional Notes", icon: <Layers size={14} /> },
    { id: "cic_notes", label: "CIC34 Notes", icon: <Briefcase size={14} /> },
    { id: "customise_headings", label: "Customise Headings", icon: <Heading size={14} /> },
    { id: "revised_accounts", label: "Revised Accounts", icon: <FileDiff size={14} /> },
    { id: "data_security", label: "Data Security", icon: <Lock size={14} /> },
  ];

  return (
    <ClientWorkspaceLayout activeSection="Report Settings">
      <div className="p-6 space-y-5">
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="text-sky-600 dark:text-sky-400" size={18} />
              Report Settings & Disclosures
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Maintain statutory reporting parameters, company contacts, disclosure policies, and filing security for {companyName || client?.clientName || "Client"}.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <CheckCircle2 size={14} className="animate-spin" /> Saving Settings...
              </>
            ) : (
              <>
                <Save size={14} /> Save Report Settings
              </>
            )}
          </button>
        </div>

        {/* Main Grid: Left Tabs & Right Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Vertical Tabs */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Sections & Subsections
            </div>
            <div className="p-1 space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold shadow-2xs border border-sky-100 dark:border-sky-900/40"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className={isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400"}>
                      {tab.icon}
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Tab Content Container */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* TAB 1: COMPANY INFO */}
            {activeTab === "company_info" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Building2 size={16} className="text-sky-600 dark:text-sky-400" />
                      Company Information & Setup
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory registered details for UK Companies House filing
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    UK Companies Act 2006
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Registered Company Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Companies House Registration Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Registered Office Address
                      </label>
                      <textarea
                        rows={3}
                        value={registeredOffice}
                        onChange={(e) => setRegisteredOffice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Companies House WebFiling Authentication Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                        placeholder="6-character code"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Entity Size Classification
                      </label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      >
                        <option value="Micro-entity">Micro-entity (Turnover ≤ £632k, Balance Sheet ≤ £316k)</option>
                        <option value="Small">Small Company (Turnover ≤ £10.2m, Balance Sheet ≤ £5.1m)</option>
                        <option value="Medium">Medium-sized Company</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Accounting Framework & Taxonomy
                      </label>
                      <select
                        value={taxonomy}
                        onChange={(e) => setTaxonomy(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      >
                        <option value="FRS 105 (Micro-entities)">FRS 105 (Micro-entities Regime)</option>
                        <option value="FRS 102 (Small Companies)">FRS 102 Section 1A (Small Entities)</option>
                        <option value="Full FRS 102">Full FRS 102 Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Presentational Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      >
                        <option value="Pound Sterling (£)">Pound Sterling (£ - GBP)</option>
                        <option value="Euro (€)">Euro (€ - EUR)</option>
                        <option value="US Dollar ($)">US Dollar ($ - USD)</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Disclosure Inclusion Toggles
                      </label>
                      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={disclosures.tangibleAssets}
                            onChange={(e) => setDisclosures({ ...disclosures, tangibleAssets: e.target.checked })}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Tangible Fixed Assets Movement Schedule</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={disclosures.debtors}
                            onChange={(e) => setDisclosures({ ...disclosures, debtors: e.target.checked })}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Debtors & Prepayments Analysis Note</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={disclosures.creditors}
                            onChange={(e) => setDisclosures({ ...disclosures, creditors: e.target.checked })}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Creditors Due Within & After One Year Note</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={disclosures.employees}
                            onChange={(e) => setDisclosures({ ...disclosures, employees: e.target.checked })}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Average Number of Employees (Companies Act s411)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AUTO-ROUNDING & ENTITY TYPE */}
            {activeTab === "auto_rounding" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Scale className="text-sky-600 dark:text-sky-400" size={16} />
                      Auto-Rounding Difference Engine & Entity Structure
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Configure UK GAAP whole-pound balancing adjustments and statutory entity structure
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                      autoRoundingEnabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      <CheckCircle2 size={11} />
                      {autoRoundingEnabled ? "Balancing Active" : "Unrounded Pennies"}
                    </span>
                  </div>
                </div>

                {/* Statutory Entity Type Selector Card */}
                <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="text-sky-600 dark:text-sky-400" size={15} />
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      Entity Legal Form & Statutory Presentation
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Select the legal constitution of this business. SanSuite automatically adapts statutory terminology (e.g. Income and Expenditure vs Profit & Loss, Surplus vs Profit, Members' Guarantee Reserve vs Share Capital).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[
                      { id: "LimitedByShares", label: "Private Company Limited by Shares (Ltd)", desc: "Standard commercial company with issued share capital & retained profits." },
                      { id: "LimitedByGuarantee", label: "Company Limited by Guarantee", desc: "Non-profit or club with Members' Guarantee, Income & Expenditure, and Surplus/Deficit." },
                      { id: "SoleTrader", label: "Sole Trader / Self-Employed", desc: "Unincorporated trader with Capital Account schedule (Drawings, Capital Introduced)." },
                      { id: "Partnership", label: "Partnership / LLP", desc: "Partners' share of profits and individual partners' capital ledger." },
                      { id: "CIC", label: "Community Interest Company (CIC)", desc: "Social enterprise requiring official CIC34 annual schedule and asset lock disclosures." },
                      { id: "Dormant", label: "Dormant Company (Form AA02)", desc: "Company with no accounting transactions; generates Form AA02 balance sheet with s.480 audit exemption." },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                          entityType === item.id
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100 shadow-2xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{item.label}</span>
                          <input
                            type="radio"
                            name="entityType"
                            value={item.id}
                            checked={entityType === item.id}
                            onChange={() => setEntityType(item.id)}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Auto-Rounding Engine Card */}
                <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="text-indigo-600 dark:text-indigo-400" size={15} />
                      <div>
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                          Automatic Rounding Difference Engine (P&L and Balance Sheet)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Capium-inspired statutory whole-pound rounding rule under UK GAAP FRS 102 / 105
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRoundingEnabled}
                        onChange={(e) => setAutoRoundingEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                    <ShieldCheck size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <span className="font-semibold">Statutory Whole-Pound Rounding Rule:</span> Under UK GAAP, annual accounts filed to Companies House and HMRC round pence to the nearest pound (£). When summing individually rounded nominal lines, rounding deltas of ±£1 or ±£2 may appear between the Profit & Loss Account and Balance Sheet reserves. When enabled, SanSuite automatically absorbs this discrepancy into your designated balancing accounts to guarantee that Net Assets strictly equals Total Reserves down to the exact pound.
                    </div>
                  </div>

                  {autoRoundingEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          P&L Rounding Account (Difference Nominal Code)
                        </label>
                        <select
                          value={roundingAccountPl}
                          onChange={(e) => setRoundingAccountPl(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          <option value="7999">7999 - Rounding Differences (Recommended Standard)</option>
                          <option value="6000">6000 - Administrative Expenses</option>
                          <option value="7000">7000 - General Office Expenses</option>
                          <option value="8500">8500 - Sundry Expenses</option>
                        </select>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          P&L line item where pence round-off adjustments are accumulated.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Balance Sheet Rounding Account (Reserve Balancing Code)
                        </label>
                        <select
                          value={roundingAccountBs}
                          onChange={(e) => setRoundingAccountBs(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          <option value="3200">3200 - Profit & Loss Account / Retained Earnings (Standard)</option>
                          <option value="9999">9999 - Suspense Account</option>
                          <option value="3000">3000 - Other Reserves</option>
                          <option value="2100">2100 - Trade Creditors Rounding Adjustment</option>
                        </select>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Equity reserve account where the net balance sheet pound adjustment is harmonized.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: COMPANY CONTACTS (Directors, Bankers, Solicitors, Accountants) */}
            {activeTab === "company_contacts" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Users size={16} className="text-sky-600 dark:text-sky-400" />
                      Company Contacts & Institutional Advisers
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure appointed officers, bankers, solicitors, and reporting accountants for disclosure pages.
                    </p>
                  </div>
                  <Link
                    href={`/accounts-production/${clientId}/directors`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Users size={13} /> Manage CH Officers
                  </Link>
                </div>

                {/* Section 1: Bankers */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Landmark size={15} className="text-sky-600 dark:text-sky-400" />
                    Company Bankers
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={companyContacts.bankers?.bankName || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            bankers: { ...companyContacts.bankers, bankName: e.target.value },
                          })
                        }
                        placeholder="e.g. Barclays Bank PLC / HSBC UK"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Branch / Sort Code</label>
                      <input
                        type="text"
                        value={companyContacts.bankers?.branch || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            bankers: { ...companyContacts.bankers, branch: e.target.value },
                          })
                        }
                        placeholder="e.g. City of London Branch, 20-00-00"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Bank Branch Address</label>
                      <input
                        type="text"
                        value={companyContacts.bankers?.address || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            bankers: { ...companyContacts.bankers, address: e.target.value },
                          })
                        }
                        placeholder="e.g. 1 Churchill Place, Canary Wharf, London, E14 5HP"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Solicitors */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Scale size={15} className="text-sky-600 dark:text-sky-400" />
                    Company Solicitors / Legal Advisers
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Law Firm Name</label>
                      <input
                        type="text"
                        value={companyContacts.solicitors?.firmName || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            solicitors: { ...companyContacts.solicitors, firmName: e.target.value },
                          })
                        }
                        placeholder="e.g. Clifford & Associates Solicitors LLP"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Contact Solicitor / Partner</label>
                      <input
                        type="text"
                        value={companyContacts.solicitors?.contactPerson || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            solicitors: { ...companyContacts.solicitors, contactPerson: e.target.value },
                          })
                        }
                        placeholder="e.g. Sarah Jenkins LLB"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Firm Registered Address</label>
                      <input
                        type="text"
                        value={companyContacts.solicitors?.address || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            solicitors: { ...companyContacts.solicitors, address: e.target.value },
                          })
                        }
                        placeholder="e.g. 10 Fleet Street, London, EC4Y 1AA"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Accountants */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <Briefcase size={15} className="text-sky-600 dark:text-sky-400" />
                    Reporting Accountants / Auditors
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Accountancy Practice Firm</label>
                      <input
                        type="text"
                        value={companyContacts.accountants?.firmName || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            accountants: { ...companyContacts.accountants, firmName: e.target.value },
                          })
                        }
                        placeholder="e.g. San Accounts Ltd"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Professional Qualification / Body</label>
                      <input
                        type="text"
                        value={companyContacts.accountants?.qualification || ""}
                        onChange={(e) =>
                          setCompanyContacts({
                            ...companyContacts,
                            accountants: { ...companyContacts.accountants, qualification: e.target.value },
                          })
                        }
                        placeholder="e.g. ICAEW / ACCA Chartered Certified Accountants"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DIRECTOR'S REPORT */}
            {activeTab === "directors_report" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText size={16} className="text-sky-600 dark:text-sky-400" />
                      Director's Report Settings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory statements, director signatories, and boilerplate disclosure paragraphs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddDirectorModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <Plus size={13} /> Add Signatory Director
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Signatory (Director's Report)
                    </label>
                    <select
                      value={directorsReportSignatory}
                      onChange={(e) => setDirectorsReportSignatory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    >
                      <option value="">-- Select Director Signatory --</option>
                      {directorOptions.map((name: string, i: number) => (
                        <option key={i} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Signatory (Balance Sheet)
                    </label>
                    <select
                      value={balanceSheetSignatory}
                      onChange={(e) => setBalanceSheetSignatory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    >
                      <option value="">-- Select Director Signatory --</option>
                      {directorOptions.map((name: string, i: number) => (
                        <option key={i} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Related Statutory Disclosures & Text Overrides
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        key: "directorsReportText",
                        toggleKey: "directorsReport",
                        title: "Director's Report Intro",
                        label: "Director's report and financial statements statement",
                        badge: null,
                      },
                      {
                        key: "principalActivitiesText",
                        toggleKey: "principalActivities",
                        title: "Principal Activities",
                        label: "Principal business activities statement",
                        badge: null,
                      },
                      {
                        key: "businessReviewText",
                        toggleKey: "businessReview",
                        title: "Business Review",
                        label: "Business review — auto-inserts live P&L turnover, expenses & profit figures if left blank",
                        badge: "Auto",
                      },
                      {
                        key: "goingConcernText",
                        toggleKey: "goingConcern",
                        title: "Going Concern",
                        label: "Going concern assessment and statutory statement",
                        badge: null,
                      },
                      {
                        key: "futureProspectsText",
                        toggleKey: "futureProspects",
                        title: "Future Prospects",
                        label: "Future prospects and business outlook statement",
                        badge: null,
                      },
                      {
                        key: "dividendsText",
                        toggleKey: "dividends",
                        title: "Dividends",
                        label: "Dividends paid, declared or proposed during the year",
                        badge: null,
                      },
                      {
                        key: "directorsResponsibilitiesText",
                        toggleKey: "directorsResponsibilities",
                        title: "Statement of Director's Responsibilities",
                        label: "Full UK GAAP statutory director's responsibilities statement (Capium-parity)",
                        badge: "Full",
                      },
                      {
                        key: "politicalDonationsText",
                        toggleKey: "politicalDonations",
                        title: "Political Donations",
                        label: "Political and charitable donations disclosure",
                        badge: null,
                      },
                      {
                        key: "smallCompanyExemptionsText",
                        toggleKey: "smallCompanyExemptions",
                        title: "Exemptions Regime",
                        label: "Small companies regime exemption statement",
                        badge: null,
                      },
                    ].map((item: any) => (
                      <div
                        key={item.key}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                      >
                        <label className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none flex-1">
                          <input
                            type="checkbox"
                            checked={(relatedNotes as any)[item.toggleKey]}
                            onChange={(e) =>
                              setRelatedNotes({ ...relatedNotes, [item.toggleKey]: e.target.checked })
                            }
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                          />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${item.badge === "Auto" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"}`}>
                              {item.badge}
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => openNoteEditor(item.key, item.title, (noteTexts as any)[item.key])}
                          className="text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Edit3 size={12} /> Edit Text
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SHARE CAPITAL (CAPIUM PARITY MULTI-CLASS LEDGER) */}
            {activeTab === "share_capital" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <PieChart size={16} className="text-sky-600 dark:text-sky-400" />
                      Share Capital Management
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Companies Act 2006 share allotments, classes, nominal values and buyback register
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={displayAuthorisedShares}
                        onChange={(e) => setDisplayAuthorisedShares(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <span>Display authorised shares in Share Capital note</span>
                    </label>

                    <button
                      type="button"
                      onClick={openAddShareModal}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus size={13} />
                      Add New Share
                    </button>
                  </div>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30">
                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">Total Called Up Capital</span>
                    <span className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-100 mt-0.5 block">
                      £{shareCapitalList.reduce((sum, s) => sum + (Number(s.totalPaidUp) || 0), 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/60 dark:bg-sky-950/30">
                    <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 block">Total Allotted Shares</span>
                    <span className="text-lg font-bold font-mono text-sky-950 dark:text-sky-100 mt-0.5 block">
                      {shareCapitalList.reduce((sum, s) => sum + (Number(s.allottedShares || s.numberOfShares) || 0), 0).toLocaleString("en-GB")} Shares
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/30">
                    <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 block">Active Share Classes</span>
                    <span className="text-lg font-bold font-mono text-purple-950 dark:text-purple-100 mt-0.5 block">
                      {shareCapitalList.length} {shareCapitalList.length === 1 ? "Class" : "Classes"}
                    </span>
                  </div>
                </div>

                {/* Share Capital Ledger Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-3 text-left font-semibold">Share Class &amp; Type</th>
                          <th className="py-2.5 px-3 text-left font-semibold">Issue Date</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Nominal (£)</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Authorised</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Allotted</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Buy Back</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Paid Up (£)</th>
                          <th className="py-2.5 px-3 text-center font-semibold w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {shareCapitalList.length > 0 ? (
                          shareCapitalList.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block">{item.shareClass}</span>
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.shareType || "Equity"}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {item.issueDate || "Initial"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                £{Number(item.nominalValue).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                {(item.authorisedShares || item.numberOfShares || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                                {(item.allottedShares || item.numberOfShares || 0).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.buyBackShares && item.buyBackShares > 0 ? (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded text-[10px] font-mono">
                                    -{item.buyBackShares} on {item.buyBackDate}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.isPartlyPaid ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded text-[10px] font-medium">
                                    Partly (£{item.amountPaidPerShare}/sh)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded text-[10px] font-medium">
                                    Fully Paid
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                £{Number(item.totalPaidUp).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditShareModal(item)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                    title="Edit share class"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShare(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                    title="Delete share class"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              <PieChart size={24} className="mx-auto text-slate-300 mb-2" />
                              <p className="font-medium text-xs">No share capital records found.</p>
                              <p className="text-[11px] mt-0.5">Click &quot;Add New Share&quot; to define issued share classes.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/50 text-sky-800 dark:text-sky-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck size={16} className="shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                  <div>
                    <strong>Companies Act 2006 &amp; FRS 102 Section 1A Statutory Rule:</strong> The total called up share capital across all allotted classes directly feeds into the Statement of Financial Position (Balance Sheet) and Statutory Note 7. New share issues and buybacks during the period are reflected in the Statement of Changes in Equity and iXBRL accounts pack.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ACCOUNTANT'S REPORT */}
            {activeTab === "accountants_report" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Award size={16} className="text-sky-600 dark:text-sky-400" />
                      Chartered Accountant's Report Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Chartered compilation statement, practice credentials, and engagement dates
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Include Accountant's Compilation Report in Final Accounts
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Turn off if filing un-compiled unaudited micro-entity statements.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={accountantsReportData.included}
                        onChange={(e) =>
                          setAccountantsReportData({ ...accountantsReportData, included: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {accountantsReportData.included && (
                    <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Signing Accountant Name
                          </label>
                          <input
                            type="text"
                            value={accountantsReportData.accountantName}
                            onChange={(e) =>
                              setAccountantsReportData({
                                ...accountantsReportData,
                                accountantName: e.target.value,
                              })
                            }
                            placeholder="e.g. David Sterling FCA"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Accountancy Practice / Firm Name
                          </label>
                          <input
                            type="text"
                            value={accountantsReportData.firmName}
                            onChange={(e) =>
                              setAccountantsReportData({
                                ...accountantsReportData,
                                firmName: e.target.value,
                              })
                            }
                            placeholder="e.g. San Accounts Ltd"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Professional Body & Qualification
                          </label>
                          <input
                            type="text"
                            value={accountantsReportData.qualification}
                            onChange={(e) =>
                              setAccountantsReportData({
                                ...accountantsReportData,
                                qualification: e.target.value,
                              })
                            }
                            placeholder="e.g. ICAEW / ACCA Chartered Accountants"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Report Signing Date
                          </label>
                          <input
                            type="date"
                            value={accountantsReportData.engagementDate}
                            onChange={(e) =>
                              setAccountantsReportData({
                                ...accountantsReportData,
                                engagementDate: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Standard Compilation Paragraph Wording
                        </label>
                        <textarea
                          rows={4}
                          value={accountantsReportData.compilationReportText}
                          onChange={(e) =>
                            setAccountantsReportData({
                              ...accountantsReportData,
                              compilationReportText: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: ACCOUNTING POLICIES */}
            {activeTab === "accounting_policies" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen size={16} className="text-sky-600 dark:text-sky-400" />
                      Accounting Policies & Measurement Framework
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory measurement bases under UK GAAP (FRS 102 Section 1A / FRS 105)
                    </p>
                  </div>
                  <Link
                    href={`/accounts-production/${clientId}/accounting-policies`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen size={13} /> Full Policy Editor
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { key: "basisOfPreparation", title: "1. Basis of Preparation", val: policies.basisOfPreparation },
                    { key: "turnoverRecognition", title: "2. Turnover & Revenue Recognition", val: policies.turnoverRecognition },
                    { key: "tangibleFixedAssets", title: "3. Tangible Fixed Assets & Depreciation", val: policies.tangibleFixedAssets },
                    { key: "financialInstruments", title: "4. Financial Instruments & Taxation", val: policies.financialInstruments },
                  ].map((p) => (
                    <div
                      key={p.key}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.title}</span>
                        <button
                          type="button"
                          onClick={() => openNoteEditor(p.key, p.title, p.val)}
                          className="text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={12} /> Edit Policy Text
                        </button>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-sans">{p.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: ADDITIONAL NOTES */}
            {activeTab === "additional_notes" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers size={16} className="text-sky-600 dark:text-sky-400" />
                      Additional Statutory Disclosure Notes
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory note summaries (employees s411, debtors, creditors, director loans s413)
                    </p>
                  </div>
                  <Link
                    href={`/accounts-production/${clientId}/statutory-notes`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Layers size={13} /> Full Statutory Matrix
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Average Employees Note (s411)
                    </h4>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Average Number of Staff employed during period
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={additionalNotesData.employeeCount}
                        onChange={(e) =>
                          setAdditionalNotesData({
                            ...additionalNotesData,
                            employeeCount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      Directors' Loans Disclosure (s413)
                    </h4>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Disclosure Text
                      </label>
                      <textarea
                        rows={3}
                        value={additionalNotesData.directorsLoansText}
                        onChange={(e) =>
                          setAdditionalNotesData({
                            ...additionalNotesData,
                            directorsLoansText: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: CUSTOMISE HEADINGS */}
            {activeTab === "customise_headings" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Heading size={16} className="text-sky-600 dark:text-sky-400" />
                      Customise Statement Titles & Column Year Headings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure report section headings and date header style for annual statements (Capium parity)
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Column Year Header Style */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div>
                      <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Column Header Year Format
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        Controls how period headers appear at the top of financial statements columns.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "YYYY", label: "Year Only (e.g. 2025)", example: "2025 | 2024" },
                        { id: "DD/MM/YYYY", label: "Full Date (e.g. 31/03/2025)", example: "31/03/2025 | 31/03/2024" },
                        { id: "DD Month YYYY", label: "Expanded (e.g. 31 March 2025)", example: "31 March 2025 | 31 March 2024" },
                      ].map((fmt) => (
                        <label
                          key={fmt.id}
                          className={`p-3 rounded-lg border cursor-pointer flex flex-col justify-between transition-colors ${
                            customHeadings.columnHeaderStyle === fmt.id
                              ? "border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-semibold"
                              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="colHeaderFmt"
                              checked={customHeadings.columnHeaderStyle === fmt.id}
                              onChange={() =>
                                setCustomHeadings({ ...customHeadings, columnHeaderStyle: fmt.id })
                              }
                              className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                            />
                            <span>{fmt.label}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 mt-2">{fmt.example}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Statement Titles */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Statement Title Customization
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          Profit & Loss Account Title
                        </label>
                        <input
                          type="text"
                          value={customHeadings.profitAndLossTitle}
                          onChange={(e) =>
                            setCustomHeadings({ ...customHeadings, profitAndLossTitle: e.target.value })
                          }
                          placeholder="e.g. Income Statement / Statement of Comprehensive Income"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                          Balance Sheet Title
                        </label>
                        <input
                          type="text"
                          value={customHeadings.balanceSheetTitle}
                          onChange={(e) =>
                            setCustomHeadings({ ...customHeadings, balanceSheetTitle: e.target.value })
                          }
                          placeholder="e.g. Statement of Financial Position"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: REVISED ACCOUNTS */}
            {activeTab === "revised_accounts" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileDiff size={16} className="text-sky-600 dark:text-sky-400" />
                      Revised & Amended Accounts (Companies Act 2006 s454)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Prepare revised filleted or full accounts to rectify defects in previously submitted accounts
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Enable Revised Accounts Mode for this Client
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Applies statutory s454 revision disclosures and replaces original accounts with Companies House.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={revisedAccounts.isRevised}
                        onChange={(e) =>
                          setRevisedAccounts({ ...revisedAccounts, isRevised: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {revisedAccounts.isRevised && (
                    <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Revision Method
                          </label>
                          <select
                            value={revisedAccounts.revisionType}
                            onChange={(e) =>
                              setRevisedAccounts({
                                ...revisedAccounts,
                                revisionType: e.target.value as any,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          >
                            <option value="Replacement">Revision by Replacement (Full Replacement of Defective Accounts)</option>
                            <option value="SupplementaryNote">Revision by Supplementary Note</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Original Submission Filing Date
                          </label>
                          <input
                            type="date"
                            value={revisedAccounts.originalFilingDate}
                            onChange={(e) =>
                              setRevisedAccounts({ ...revisedAccounts, originalFilingDate: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Reason for Revision & Defect Rectification
                        </label>
                        <input
                          type="text"
                          value={revisedAccounts.reason}
                          onChange={(e) =>
                            setRevisedAccounts({ ...revisedAccounts, reason: e.target.value })
                          }
                          placeholder="e.g. Rectification of tangible fixed asset depreciation note in original accounts"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Statutory Section 454 Statement (Printed on Cover & Notes)
                        </label>
                        <textarea
                          rows={3}
                          value={revisedAccounts.statutoryDeclaration}
                          onChange={(e) =>
                            setRevisedAccounts({
                              ...revisedAccounts,
                              statutoryDeclaration: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CIC34 NOTES */}
            {activeTab === "cic_notes" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Briefcase size={16} className="text-sky-600 dark:text-sky-400" />
                      Form CIC34 Community Interest Company Report
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory disclosures required by Section 34 of the Companies (Audit, Investigations and Community Enterprise) Act 2004
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                    <ShieldCheck size={12} /> Statutory Form CIC34
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Part 1 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Part 1: General Description of Company's Activities and Impact
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Describe in detail how the company's activities during the period benefited the community or a section of the community.
                    </p>
                    <textarea
                      rows={4}
                      value={cicNotes.activitiesAndImpact}
                      onChange={(e) => setCicNotes({ ...cicNotes, activitiesAndImpact: e.target.value })}
                      placeholder="Enter general description of activities and community benefit..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  {/* Part 2 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Part 2: Consultation with Stakeholders
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Describe the steps taken to consult persons affected by the company's activities and the outcome of that consultation.
                    </p>
                    <textarea
                      rows={3}
                      value={cicNotes.stakeholderConsultation}
                      onChange={(e) => setCicNotes({ ...cicNotes, stakeholderConsultation: e.target.value })}
                      placeholder="Enter details of stakeholder consultations..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  {/* Part 3 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Part 3: Directors' Remuneration and Benefits
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Provide details of remuneration and other benefits received by directors during the financial year.
                    </p>
                    <textarea
                      rows={3}
                      value={cicNotes.directorsRemuneration}
                      onChange={(e) => setCicNotes({ ...cicNotes, directorsRemuneration: e.target.value })}
                      placeholder="Enter directors remuneration details or confirm no remuneration was paid..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  {/* Part 4 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Part 4: Transfer of Assets Other Than for Full Consideration
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Detail any transfer of assets to other community benefit or asset-locked bodies for less than market value.
                    </p>
                    <textarea
                      rows={3}
                      value={cicNotes.transferOfAssets}
                      onChange={(e) => setCicNotes({ ...cicNotes, transferOfAssets: e.target.value })}
                      placeholder="Enter asset transfer details or confirm no transfers were made..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  {/* Part 5 */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Part 5: Dividends and Performance-Related Interest
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Detail dividends paid or interest paid on performance-related loans, complying with CIC asset lock caps.
                    </p>
                    <textarea
                      rows={3}
                      value={cicNotes.interestPaid}
                      onChange={(e) => setCicNotes({ ...cicNotes, interestPaid: e.target.value })}
                      placeholder="Enter dividend or performance interest details..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                  </div>

                  {/* Dual Signatories Block */}
                  <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                    <div>
                      <label className="block font-bold text-slate-900 dark:text-slate-100">
                        Mandatory Dual Signatories for Form CIC34
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        The CIC Regulator strictly mandates that Form CIC34 must be signed on behalf of the board by two active directors.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          First Signatory Director
                        </label>
                        <select
                          value={cicNotes.firstSignatoryId}
                          onChange={(e) => setCicNotes({ ...cicNotes, firstSignatoryId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          <option value="">-- Select First Director --</option>
                          {directorsList.map((d: any) => (
                            <option key={d.id || d.name} value={d.id || d.name}>
                              {d.name} {d.officerRole ? `(${d.officerRole})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Second Signatory Director
                        </label>
                        <select
                          value={cicNotes.secondSignatoryId}
                          onChange={(e) => setCicNotes({ ...cicNotes, secondSignatoryId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          <option value="">-- Select Second Director --</option>
                          {directorsList.map((d: any) => (
                            <option key={d.id || d.name} value={d.id || d.name}>
                              {d.name} {d.officerRole ? `(${d.officerRole})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 10: DATA SECURITY */}
            {activeTab === "data_security" && (
              <div className="p-6 space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Lock size={16} className="text-sky-600 dark:text-sky-400" />
                      Data Security & Document Password Protection
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Protect client privacy by enforcing master password encryption on generated Accounts Report PDFs.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck size={12} /> AES PDF Encryption
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Enable Document Password Protection
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        When enabled, all generated Annual Accounts Report PDFs will require this client's password to open.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dataSecurity.pdfPasswordEnabled}
                        onChange={(e) =>
                          setDataSecurity({ ...dataSecurity, pdfPasswordEnabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {dataSecurity.pdfPasswordEnabled && (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 space-y-3">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        Client Master Password
                      </label>
                      <div className="relative max-w-md">
                        <KeyRound size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={dataSecurity.masterPassword}
                          onChange={(e) =>
                            setDataSecurity({ ...dataSecurity, masterPassword: e.target.value })
                          }
                          placeholder="Enter strong client master password"
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        This password is encrypted per client and required whenever exporting or opening the final accounts pack PDF.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EDIT NOTE TEXT MODAL */}
        {editingNoteKey && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 text-xs animate-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Edit {editingNoteTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Customize boilerplate statutory disclosure wording
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingNoteKey(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Statutory Paragraph Text
                  </label>
                  <textarea
                    rows={6}
                    value={editingNoteContent}
                    onChange={(e) => setEditingNoteContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingNoteKey(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNoteEditor}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Update Paragraph
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD CUSTOM SIGNATORY DIRECTOR MODAL */}
        {showAddDirectorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 text-xs animate-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Add Signatory Director
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add a designated officer to sign annual reports
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDirectorModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomDirector}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Director Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newDirectorName}
                      onChange={(e) => setNewDirectorName(e.target.value)}
                      placeholder="e.g. Johnathan Smith"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddDirectorModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Signatory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD / EDIT SHARE CAPITAL MODAL (CAPIUM PARITY) */}
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {editingShareId ? "Edit Share Capital" : "Add Share Capital"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveShareForm} className="p-5 space-y-4 overflow-y-auto text-xs">
                {/* Share Type & Class Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Share Type
                    </label>
                    <select
                      value={shareForm.shareType || "Equity"}
                      onChange={(e) => setShareForm({ ...shareForm, shareType: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                    >
                      <option value="Equity">Equity</option>
                      <option value="Preference">Preference</option>
                      <option value="Non-Equity">Non-Equity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Share Class Quick Preset
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setShareForm({ ...shareForm, shareClass: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      defaultValue=""
                    >
                      <option value="">-- Choose preset or type below --</option>
                      <option value="Ordinary - Class 1">Ordinary - Class 1</option>
                      <option value="Ordinary - Class 2">Ordinary - Class 2</option>
                      <option value="Ordinary Class A">Ordinary Class A</option>
                      <option value="Ordinary Class B">Ordinary Class B</option>
                      <option value="Ordinary Non-Voting">Ordinary Non-Voting</option>
                      <option value="5% Cumulative Preference">5% Cumulative Preference</option>
                      <option value="Redeemable Preference">Redeemable Preference</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Share Class Title / Description <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shareForm.shareClass || ""}
                    onChange={(e) => setShareForm({ ...shareForm, shareClass: e.target.value })}
                    placeholder="e.g. Ordinary shares, Class A Ordinary"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                {/* Issue Date & Number of Shares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Issue Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={shareForm.issueDate || ""}
                      onChange={(e) => setShareForm({ ...shareForm, issueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. of Shares Allotted <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={shareForm.numberOfShares || ""}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        setShareForm({
                          ...shareForm,
                          numberOfShares: count,
                          allottedShares: count,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Nominal Value & Authorised Shares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Share Value of Each Share (£) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.0001"
                      required
                      value={shareForm.nominalValue || ""}
                      onChange={(e) => setShareForm({ ...shareForm, nominalValue: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. of Shares Authorised
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={shareForm.authorisedShares || ""}
                      onChange={(e) => setShareForm({ ...shareForm, authorisedShares: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Buy Back Fields (Capium Parity) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                    Share Buy Back / Redemption (Optional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Buy Back Date
                      </label>
                      <input
                        type="date"
                        value={shareForm.buyBackDate || ""}
                        onChange={(e) => setShareForm({ ...shareForm, buyBackDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Buy Back Shares Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={shareForm.buyBackShares || ""}
                        onChange={(e) => setShareForm({ ...shareForm, buyBackShares: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Partly Paid Up Option */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(shareForm.isPartlyPaid)}
                      onChange={(e) => setShareForm({ ...shareForm, isPartlyPaid: e.target.checked })}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Shares are partly paid up
                    </span>
                  </label>

                  {shareForm.isPartlyPaid && (
                    <div className="pl-6">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Amount Paid Per Share (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={shareForm.amountPaidPerShare || ""}
                        onChange={(e) => setShareForm({ ...shareForm, amountPaidPerShare: parseFloat(e.target.value) || 0 })}
                        className="w-48 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Real-time Calculation Badge */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                  <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                    Net Paid-Up Capital for this Class:
                  </span>
                  <span className="text-sm font-bold font-mono text-indigo-700 dark:text-indigo-300">
                    £{(
                      Math.max(0, (Number(shareForm.allottedShares || shareForm.numberOfShares) || 0) - (Number(shareForm.buyBackShares) || 0)) *
                      (shareForm.isPartlyPaid ? (Number(shareForm.amountPaidPerShare) || 0) : (Number(shareForm.nominalValue) || 1))
                    ).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    {editingShareId ? "Save Changes" : "Save Share Class"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ClientWorkspaceLayout>
  );
}
