import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  Settings, Shield, Lock, Mail, Save, CheckCircle2,
  AlertCircle, LayoutDashboard, Users, HelpCircle, FileText,
  Building2, Landmark, Copy, RefreshCw, ChevronRight, Info
} from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

export default function SelfAssessmentSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"gateway" | "letterhead" | "email">("gateway");

  // Gateway & Security State
  const [senderId, setSenderId] = useState("HMRC-AGENT-7781");
  const [testMode, setTestMode] = useState(true);
  const [defaultTaxYear, setDefaultTaxYear] = useState("2025/2026");
  const [enablePasswordProtection, setEnablePasswordProtection] = useState(true);
  const [passwordFormat, setPasswordFormat] = useState("nino_dob");
  const [emailNotificationSender, setEmailNotificationSender] = useState("tax-filings@sansuite.co.uk");

  // Letterhead Template State (Capium Art 44: 9000228367)
  const [practiceName, setPracticeName] = useState("SanSuite Practice Tax Services");
  const [headerText, setHeaderText] = useState("Statutory Self Assessment Tax Payment Notice");
  const [introNotice, setIntroNotice] = useState("Please find below the calculation of your statutory Self Assessment liability and official payment instructions.");
  const [signoffText, setSignoffText] = useState("Should you have any questions or require an adjustment to your Payments on Account, please contact our tax department.");
  const [includeFirmBankDetails, setIncludeFirmBankDetails] = useState(false);
  const [firmBankName, setFirmBankName] = useState("Barclays Bank UK PLC");
  const [firmSortCode, setFirmSortCode] = useState("20-04-15");
  const [firmAccountNo, setFirmAccountNo] = useState("29104756");

  // Email Templates State (Capium Art 22: 9000201868)
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([
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
  ]);

  // Fetch Settings from API
  const { data: serverSettings } = useQuery({
    queryKey: ["/api/self-assessment/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/self-assessment/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (serverSettings) {
      if (serverSettings.senderId) setSenderId(serverSettings.senderId);
      if (serverSettings.testMode !== undefined) setTestMode(serverSettings.testMode);
      if (serverSettings.defaultTaxYear) setDefaultTaxYear(serverSettings.defaultTaxYear);
      if (serverSettings.enablePasswordProtection !== undefined) setEnablePasswordProtection(serverSettings.enablePasswordProtection);
      if (serverSettings.passwordFormat) setPasswordFormat(serverSettings.passwordFormat);
      if (serverSettings.emailNotificationSender) setEmailNotificationSender(serverSettings.emailNotificationSender);

      if (serverSettings.taxDueLetterhead) {
        const lh = serverSettings.taxDueLetterhead;
        if (lh.practiceName) setPracticeName(lh.practiceName);
        if (lh.headerText) setHeaderText(lh.headerText);
        if (lh.introNotice) setIntroNotice(lh.introNotice);
        if (lh.signoffText) setSignoffText(lh.signoffText);
        if (lh.includeFirmBankDetails !== undefined) setIncludeFirmBankDetails(lh.includeFirmBankDetails);
        if (lh.firmBankName) setFirmBankName(lh.firmBankName);
        if (lh.firmSortCode) setFirmSortCode(lh.firmSortCode);
        if (lh.firmAccountNo) setFirmAccountNo(lh.firmAccountNo);
      }

      if (Array.isArray(serverSettings.emailTemplates) && serverSettings.emailTemplates.length > 0) {
        setEmailTemplates(serverSettings.emailTemplates);
      }
    }
  }, [serverSettings]);

  // Check HMRC OAuth Status
  const { data: hmrcStatus } = useQuery({
    queryKey: ["/api/hmrc-gateway/oauth/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/hmrc-gateway/oauth/status");
      if (!res.ok) return { connected: false };
      return res.json();
    },
  });

  const handleConnectHmrc = async () => {
    try {
      const res = await apiRequest("GET", "/api/hmrc-gateway/oauth/auth-url");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      toast({
        title: "Connection Failed",
        description: "Could not generate HMRC authorization URL.",
        type: "error",
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        senderId,
        testMode,
        defaultTaxYear,
        enablePasswordProtection,
        passwordFormat,
        emailNotificationSender,
        taxDueLetterhead: {
          practiceName,
          headerText,
          introNotice,
          signoffText,
          includeFirmBankDetails,
          firmBankName,
          firmSortCode,
          firmAccountNo,
        },
        emailTemplates,
      };

      const res = await apiRequest("POST", "/api/self-assessment/settings", payload);
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Self Assessment statutory parameters, letterhead, and email templates updated.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/self-assessment/settings"] });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, type: "error" });
    },
  });

  // Insert token helper for email templates
  const insertToken = (token: string) => {
    const updated = [...emailTemplates];
    const current = updated[selectedTemplateIndex];
    if (current) {
      current.body = (current.body || "") + " " + token;
      setEmailTemplates(updated);
      toast({
        title: "Token Inserted",
        description: `Added ${token} to email template body.`,
        type: "info",
      });
    }
  };

  const tokens = [
    { label: "Client Name", tag: "{ClientName}" },
    { label: "Tax Year", tag: "{TaxYear}" },
    { label: "UTR (10-Digit)", tag: "{UTR}" },
    { label: "Payment Ref", tag: "{PaymentReference}" },
    { label: "Total Due (31 Jan)", tag: "{TotalDueBy31Jan}" },
    { label: "Second PoA (31 Jul)", tag: "{SecondPoADue}" },
    { label: "Filing Deadline", tag: "{FilingDeadline}" },
    { label: "Practice Name", tag: "{FirmName}" },
  ];

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6 text-xs">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-purple-600" />
                Self Assessment Module Settings & Templates
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure HMRC gateway credentials, custom tax due payment letterhead, and automated client email templates.
              </p>
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save All Settings</span>
                </>
              )}
            </button>
          </div>

          {/* Settings Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { id: "gateway", label: "HMRC Gateway & Security", icon: <Shield size={14} /> },
              { id: "letterhead", label: "Tax Due Notice Letterhead", icon: <FileText size={14} /> },
              { id: "email", label: "Email Notification Templates", icon: <Mail size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: GATEWAY & SECURITY */}
          {activeTab === "gateway" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HMRC Gateway Credentials */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-600" />
                    <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      HMRC Gateway & API Status
                    </h2>
                  </div>
                  {hmrcStatus?.connected && !hmrcStatus?.expired ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-semibold rounded-full border border-rose-200 dark:border-rose-800">
                      Not Connected
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handleConnectHmrc}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-xs cursor-pointer"
                    >
                      {hmrcStatus?.connected ? "Reconnect HMRC Gateway" : "Connect to HMRC Electronic Gateway"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      HMRC Agent Sender ID *
                    </label>
                    <input
                      type="text"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Your official 12-character HMRC Online Services Agent Gateway ID.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Default Tax Year for New Returns
                    </label>
                    <select
                      value={defaultTaxYear}
                      onChange={(e) => setDefaultTaxYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                    >
                      <option value="2025/2026">2025/2026 (Current Tax Year)</option>
                      <option value="2024/2025">2024/2025 (Due 31 Jan 2026)</option>
                      <option value="2023/2024">2023/2024</option>
                      <option value="2022/2023">2022/2023</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={testMode}
                        onChange={(e) => setTestMode(e.target.checked)}
                        className="rounded text-purple-600 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Enable HMRC Test in Live (Sandbox Validation)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                      Validates SA100 returns against HMRC test schema without committing real tax submissions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Security & Encryption */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Lock size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    PDF Document Security & Password Protection
                  </h2>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePasswordProtection}
                      onChange={(e) => setEnablePasswordProtection(e.target.checked)}
                      className="rounded text-purple-600 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Password Protect Exported SA100 / SA302 Computation PDFs
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Encrypts client tax returns and payment slips with AES-128 standard before emailing or downloading.
                  </p>

                  {enablePasswordProtection && (
                    <div className="pt-2 space-y-2">
                      <label className="block text-slate-700 dark:text-slate-300 font-medium">
                        Password Scheme
                      </label>
                      <select
                        value={passwordFormat}
                        onChange={(e) => setPasswordFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                      >
                        <option value="nino_dob">First 4 of NINO + DOB (DDMM)</option>
                        <option value="utr_postcode">First 5 of UTR + Postcode</option>
                        <option value="custom_client">Custom Client Portal Password</option>
                      </select>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Notification Sender Email Address
                    </label>
                    <input
                      type="email"
                      value={emailNotificationSender}
                      onChange={(e) => setEmailNotificationSender(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Sender email shown in client inbox for tax payment notices and eSign requests.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TAX DUE NOTICE LETTERHEAD (Capium Art 44: 9000228367) */}
          {activeTab === "letterhead" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Config */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <FileText size={16} className="text-emerald-600" />
                  <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    Tax Due Notice Document Layout & Text
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Practice / Firm Header Name
                    </label>
                    <input
                      type="text"
                      value={practiceName}
                      onChange={(e) => setPracticeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Introductory Advice Text
                    </label>
                    <textarea
                      rows={3}
                      value={introNotice}
                      onChange={(e) => setIntroNotice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Closing Advice & Sign-Off Notice
                    </label>
                    <textarea
                      rows={3}
                      value={signoffText}
                      onChange={(e) => setSignoffText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                    />
                  </div>

                  {/* Firm Bank Details Option */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFirmBankDetails}
                        onChange={(e) => setIncludeFirmBankDetails(e.target.checked)}
                        className="rounded text-purple-600 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Include Practice Client Account (Pay Firm Directly Instead of HMRC)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6">
                      Enable if your practice collects tax liabilities from clients into a designated client account before settling with HMRC.
                    </p>

                    {includeFirmBankDetails && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={firmBankName}
                            onChange={(e) => setFirmBankName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Sort Code
                          </label>
                          <input
                            type="text"
                            value={firmSortCode}
                            onChange={(e) => setFirmSortCode(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={firmAccountNo}
                            onChange={(e) => setFirmAccountNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Info size={14} className="text-purple-600" />
                    Live Letterhead Preview
                  </span>
                  <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    Client View
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 text-xs">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block mb-1">
                      {practiceName}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      {headerText}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    "{introNotice}"
                  </p>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
                        Total Amount Due by 31 January
                      </span>
                      <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                        £3,450.00
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-bold">
                      Ref: 1234567890K
                    </span>
                  </div>

                  {includeFirmBankDetails && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 space-y-1">
                      <span className="font-bold text-[10px] text-purple-800 dark:text-purple-300 block">
                        Practice Client Escrow Account:
                      </span>
                      <p className="font-mono text-[11px] text-purple-900 dark:text-purple-200">
                        {firmBankName} | Sort: {firmSortCode} | Acc: {firmAccountNo}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 leading-relaxed">
                    {signoffText}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL NOTIFICATION TEMPLATES (Capium Art 22: 9000201868) */}
          {activeTab === "email" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List Selector */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Select Email Template
                </h2>
                <div className="space-y-1.5">
                  {emailTemplates.map((tpl, idx) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateIndex(idx)}
                      className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedTemplateIndex === idx
                          ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/30 ring-1 ring-purple-500"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                          {tpl.name}
                        </span>
                        {selectedTemplateIndex === idx && (
                          <ChevronRight size={14} className="text-purple-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                        {tpl.subject}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Mail size={15} className="text-purple-600" />
                    Edit Template: {emailTemplates[selectedTemplateIndex]?.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Template ID: <code className="font-mono text-purple-600">{emailTemplates[selectedTemplateIndex]?.id}</code>
                  </span>
                </div>

                {/* Merge Token Badges */}
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/60 space-y-1.5">
                  <span className="font-bold text-[10px] text-purple-800 dark:text-purple-300 block">
                    Click to Insert Dynamic Merge Field Token:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tokens.map((tk) => (
                      <button
                        key={tk.tag}
                        type="button"
                        onClick={() => insertToken(tk.tag)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded text-[10px] font-mono font-semibold border border-purple-200 dark:border-purple-800 shadow-2xs transition-colors cursor-pointer"
                        title={`Insert ${tk.label}`}
                      >
                        + {tk.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Email Subject Line *
                    </label>
                    <input
                      type="text"
                      value={emailTemplates[selectedTemplateIndex]?.subject || ""}
                      onChange={(e) => {
                        const updated = [...emailTemplates];
                        updated[selectedTemplateIndex].subject = e.target.value;
                        setEmailTemplates(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                      Email Body Content *
                    </label>
                    <textarea
                      rows={8}
                      value={emailTemplates[selectedTemplateIndex]?.body || ""}
                      onChange={(e) => {
                        const updated = [...emailTemplates];
                        updated[selectedTemplateIndex].body = e.target.value;
                        setEmailTemplates(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
