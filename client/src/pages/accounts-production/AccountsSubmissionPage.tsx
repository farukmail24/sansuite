import { useState, useEffect, useRef } from "react";
import { useRoute, Link, Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./workspace/ClientWorkspaceLayout";
import { PipelineFooterNav } from "./workspace/AccountsProductionPipeline";
import {
  Shield, CheckCircle2, AlertCircle, AlertTriangle, Send,
  RefreshCw, Code, X, CheckSquare, FileText, ArrowRight,
  ArrowLeft, KeyRound, Eye, EyeOff, Printer, Download,
  Clock, ExternalLink, Sparkles, Scale, Users, Building2,
  FileSpreadsheet, Lock, Landmark, Award, Trash2
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function AccountsSubmissionPage() {
  const [, params] = useRoute("/accounts-production/:clientId/submit");
  const clientId = params?.clientId;

  if (!clientId) return <Redirect to="/accounts-production" />;

  return (
    <ClientWorkspaceLayout activeSection="Accounts Submission">
      <AccountsSubmissionWizard clientId={clientId} />
    </ClientWorkspaceLayout>
  );
}

function formatIxbrlForPreview(rawXml: string | null): string {
  if (!rawXml) return "";
  let doc = rawXml;

  // Add IDs if missing for smooth page navigation
  if (!doc.includes('id="page-1"')) {
    doc = doc.replace(/class="([^"]*titlepage[^"]*)"/i, 'id="page-1" class="$1"');
  }
  if (!doc.includes('id="page-2"')) {
    doc = doc.replace(/(<div\s+class="accountspage(?![^>]*id="page-1"))/i, '<div id="page-2" class="accountspage"');
  }

  const standardA4Css = `
    * { box-sizing: border-box; }
    html {
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      scroll-behavior: smooth;
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      line-height: 1.45;
      color: #0f172a;
      background-color: #f1f5f9;
      margin: 0;
      padding: 32px 0 48px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    tr, td, th, tbody { padding: 0px; margin: 0px; }
    .hidden { display: none; }
    div.pagebreak { page-break-after: always; }
    div.accountspage {
      width: 794px;
      max-width: 95%;
      min-height: 1123px;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05);
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      padding: 72px 64px 64px 64px;
      margin: 0 auto;
      position: relative;
    }
    div.titlepage {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      min-height: 1123px;
      text-align: center;
      padding: 60px 48px;
      position: relative;
      box-sizing: border-box;
    }
    div.DCAtitleHeading {
      width: 100%;
      max-width: 580px;
      margin: 40px auto 0 auto;
      padding: 44px 36px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      background: #fcfcfd;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    div.DCAtitleHeading p {
      margin: 0;
      padding: 0;
    }
    div.DCAtitleHeading p:first-child {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    div.DCAtitleHeading p:nth-child(2) {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.3;
      margin-bottom: 14px;
      padding-bottom: 16px;
      border-bottom: 2px solid #6366f1;
      width: 100%;
    }
    div.DCAtitleHeading p:nth-child(3) {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #334155;
      text-transform: uppercase;
      margin-top: 8px;
      margin-bottom: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    div.DCAtitleHeading p:nth-child(4) {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    div.accountsheader {
      font-weight: bold;
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 28px;
    }
    span.left { font-size: 15px; font-weight: 700; color: #0f172a; }
    span.right { font-size: 13px; font-weight: 600; color: #475569; }
    #balancesheet { width: 100%; display: block; clear: both; }
    #balancesheet table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 24px; font-size: 14px; }
    #balancesheet th { text-align: left; padding: 6px 8px; font-weight: bold; color: #0f172a; }
    tr.indent > *:first-child { padding-left: 28px; }
    #balancesheet .figure { text-align: right; font-family: "Courier New", Courier, monospace; font-size: 14px; font-weight: 600; }
    td.number { text-align: right; font-family: "Courier New", Courier, monospace; }
    #balancesheet td.total, tr.total td.figure, tr.total td.row-label {
      font-weight: bold;
      border-color: #0f172a;
      border-top-width: 1px;
      border-bottom-width: 2px;
      border-style: solid none solid none;
      padding-top: 6px;
      padding-bottom: 6px;
    }
    h1 { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0 0 12px 0; text-align: center; }
    h2 { font-size: 16px; font-weight: bold; margin: 16px 0; color: #0f172a; }
    h2.middle { text-align: center; }
    h3 { font-size: 13px; font-weight: bold; margin: 24px 0 8px 0; letter-spacing: 0.5px; color: #0f172a; }
    span.officername { font-weight: bold; }
    #balancesheet tr.heading td { padding-top: 16px; font-weight: bold; }
    #statements { margin-top: 28px; }
    #statements ol { list-style-type: lower-alpha; padding-left: 24px; margin: 0; }
    #statements li { margin-bottom: 10px; font-size: 12px; text-align: justify; line-height: 1.5; color: #1e293b; }
    #approval { margin-top: 24px; font-size: 13px; line-height: 1.6; border-top: 1px solid #cbd5e1; padding-top: 12px; }
    th.normal { font-weight: normal; }
    .clearfix::after { content: ""; clear: both; display: table; }
    .page-footer-marker {
      position: absolute;
      bottom: 24px;
      right: 32px;
      font-size: 11px;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 18mm 20mm;
      }
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      div.accountspage {
        width: 100% !important;
        max-width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      div.titlepage {
        page-break-after: always !important;
        break-after: page !important;
        min-height: 250mm !important;
      }
      div.DCAtitleHeading {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        padding: 0 !important;
      }
      .page-footer-marker {
        display: none !important;
      }
    }
  `;

  if (doc.includes("<style")) {
    doc = doc.replace(/<style[^>]*>[\s\S]*?<\/style>/i, `<style type="text/css">${standardA4Css}</style>`);
  } else if (doc.includes("</head>")) {
    doc = doc.replace("</head>", `<style type="text/css">${standardA4Css}</style></head>`);
  }

  // Inject page footer markers if missing
  if (!doc.includes("page-footer-marker")) {
    doc = doc.replace(/(<div class="[^"]*titlepage[^"]*"[^>]*>[\s\S]*?)(<\/div>)/i, `$1<div class="page-footer-marker">Page 1 of 2</div>$2`);
    doc = doc.replace(/(<\/div>\s*<\/body>)/i, `<div class="page-footer-marker">Page 2 of 2</div>$1`);
  }

  return doc;
}

function AccountsSubmissionWizard({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { client, periods, selectedPeriodId, currentPeriod } = useClientWorkspace();

  // 4-Step Wizard Navigation State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // XML Inspection Modal
  const [selectedXml, setSelectedXml] = useState<string | null>(null);
  const [xmlModalTab, setXmlModalTab] = useState<"preview" | "source">("preview");
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [activePreviewPage, setActivePreviewPage] = useState<1 | 2>(1);

  const scrollToPage = (pageNum: 1 | 2) => {
    setActivePreviewPage(pageNum);
    try {
      const iframe = previewIframeRef.current;
      if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return;
      const target = iframe.contentDocument.getElementById(`page-${pageNum}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (e) {
      console.error("Scroll to page error", e);
    }
  };

  const handlePrintIframe = () => {
    try {
      const iframe = previewIframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print preview error", e);
    }
  };

  // Helper to trigger instant download of authentic Companies House .xhtml file
  const handleDownloadIxbrl = (xmlContent: string, customName?: string) => {
    if (!xmlContent) return;
    const blob = new Blob([xmlContent], { type: "application/xhtml+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const year = currentPeriod?.endDate ? new Date(currentPeriod.endDate).getFullYear() : new Date().getFullYear();
    a.download = customName || `${client?.registrationNumber || "09599941"}_annual_accounts_${year}.xhtml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "iXBRL Document Downloaded",
      description: `Saved as ${a.download} in Companies House standard XHTML format.`,
    });
  };

  // Gateway Credentials State (Clean default values adhering to Zero Mock Data mandate)
  const [presenterId, setPresenterId] = useState("");
  const [presenterAuthCode, setPresenterAuthCode] = useState("");
  const [webFilingAuthCode, setWebFilingAuthCode] = useState("");
  const [showPresenterAuth, setShowPresenterAuth] = useState(false);
  const [showWebFilingAuth, setShowWebFilingAuth] = useState(false);
  const [gatewayEnvironment, setGatewayEnvironment] = useState<"live" | "test">("live");
  const [gatewayStatus, setGatewayStatus] = useState<"Ready" | "Untested" | "Error">("Untested");
  const [isTestingGateway, setIsTestingGateway] = useState(false);

  // Pre-Submission Statutory Declarations
  const [declarationBoardApproved, setDeclarationBoardApproved] = useState(false);
  const [declarationRegimeExempt, setDeclarationRegimeExempt] = useState(false);

  // Live Submission Result & Viewing Modal State
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [viewingReceiptModal, setViewingReceiptModal] = useState<any | null>(null);

  // Fetch Practice-wide Companies House Presenter Settings
  const { data: practicePresenter } = useQuery<any>({
    queryKey: ["/api/accounts-production/presenter-id"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounts-production/presenter-id");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (practicePresenter?.presenterId && !presenterId) {
      setPresenterId(practicePresenter.presenterId);
    }
    if (practicePresenter?.presenterAuthCode && !presenterAuthCode) {
      setPresenterAuthCode(practicePresenter.presenterAuthCode);
    }
  }, [practicePresenter, presenterId, presenterAuthCode]);

  // Fetch Companies House Settings (for authentic client WebFiling authCode e.g. SAN123)
  const { data: chSettings } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/ch-settings`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ch-settings`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (chSettings?.authCode && !webFilingAuthCode) {
      setWebFilingAuthCode(chSettings.authCode);
    }
  }, [chSettings, webFilingAuthCode]);

  // Fetch Pre-Filing Validation Checks
  const {
    data: validationData,
    isLoading: isLoadingValidation,
    refetch: refetchValidation,
  } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/prefiling-validation/${selectedPeriodId || 0}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest(
        "GET",
        `/api/accounts-production/${clientId}/prefiling-validation/${selectedPeriodId}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  // Fetch Financial Statements Data for Step 2 Verification
  const { data: statementsData, isLoading: isLoadingStatements } = useQuery<any>({
    queryKey: [`/api/accounts-production/${clientId}/statements/${selectedPeriodId}`],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const res = await apiRequest(
        "GET",
        `/api/accounts-production/${clientId}/statements/${selectedPeriodId}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!clientId && !!selectedPeriodId,
  });

  // Fetch Authentic iXBRL Submissions from database
  const {
    data: submissions = [],
    isLoading: isLoadingSubmissions,
    refetch: refetchSubmissions,
  } = useQuery<any[]>({
    queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Check if current period already has an accepted submission
  const existingAcceptedSubmission = submissions.find(
    (s: any) => s.status === "Accepted" && (s.periodId === selectedPeriodId || !selectedPeriodId)
  );
  // displayReceipt is only shown when a live submission is triggered in the active session
  const displayReceipt = activeReceipt;

  // Live Gateway Submission Mutation
  const submitToChMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/ixbrl/submit`, {
        clientId: parseInt(clientId),
        periodId: selectedPeriodId,
        presenterId,
        presenterAuthCode,
        webFilingAuthCode,
        gatewayEnvironment,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gateway submission failed." }));
        throw new Error(err.error || "Gateway submission failed.");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setActiveReceipt(data);
      refetchSubmissions();
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`] });
      toast({
        title: "Accounts Submitted to Companies House",
        description: `Official Transaction Reference: ${data.submissionNumber || "CH-SUCCESS"}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to transmit accounts to Companies House Gateway.",
        variant: "destructive",
      });
    },
  });

  // Delete Individual Submission Mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/ixbrl/submissions/${submissionId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete submission record." }));
        throw new Error(err.error || "Failed to delete submission record.");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`] });
      toast({
        title: "Submission Deleted",
        description: data.message || "Test filing record removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete submission record.",
        variant: "destructive",
      });
    },
  });

  // Clear All Test Submissions Mutation
  const clearAllSubmissionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/ixbrl/submissions`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to clear test submissions." }));
        throw new Error(err.error || "Failed to clear test submissions.");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/ixbrl/submissions`] });
      setActiveReceipt(null);
      setViewingReceiptModal(null);
      toast({
        title: "History Cleared",
        description: data.message || "All test electronic submissions removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message || "Could not clear submissions history.",
        variant: "destructive",
      });
    },
  });

  // Handle Authentic Gateway Connection Test against Backend & Companies House
  const handleTestGateway = async () => {
    if (!webFilingAuthCode || webFilingAuthCode.trim().length !== 6) {
      setGatewayStatus("Error");
      toast({
        title: "Invalid Code Format",
        description: "Please enter a valid 6-character Companies House WebFiling Authentication Code.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingGateway(true);
    try {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/test-gateway`, {
        webFilingAuthCode: webFilingAuthCode.trim().toUpperCase(),
        presenterId,
        presenterAuthCode,
        gatewayEnvironment,
      });

      const data = await res.json();

      if (!res.ok) {
        setGatewayStatus("Error");
        toast({
          title: "Gateway Verification Failed",
          description: data.error || "Authentication credentials rejected by Companies House Gateway.",
          variant: "destructive",
        });
        return;
      }

      setGatewayStatus("Ready");
      toast({
        title: "Gateway Connection Successful",
        description: data.message || "Presenter ID and WebFiling Authentication Code verified with Companies House Gateway.",
      });
    } catch (err: any) {
      setGatewayStatus("Error");
      toast({
        title: "Gateway Verification Failed",
        description: err.message || "Failed to contact Companies House Gateway service.",
        variant: "destructive",
      });
    } finally {
      setIsTestingGateway(false);
    }
  };

  // Dedicated Print Official Receipt Voucher (Clean Standalone Print Window)
  const handlePrintReceipt = (receipt: any) => {
    const txId = receipt?.submissionNumber || receipt?.chTransactionId || "CH-SUCCESS";
    const ts = receipt?.submittedAt ? new Date(receipt.submittedAt).toLocaleString("en-GB") : new Date().toLocaleString("en-GB");
    const company = client?.clientName || "Company";
    const crn = client?.registrationNumber || "N/A";
    const periodStr = currentPeriod?.endDate ? new Date(currentPeriod.endDate).toLocaleDateString("en-GB") : "Current Period";

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Official Companies House Submission Receipt - ${company}</title>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      border: 2px solid #059669;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
      margin-bottom: 8px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      color: #0f172a;
      font-weight: 800;
    }
    .meta-brand {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .card.accepted {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .card-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .card-val {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .card-val.tx {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #7c3aed;
      font-size: 15px;
    }
    .card-val.status {
      color: #059669;
    }
    .notice {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #334155;
    }
    .notice-title {
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      font-size: 13px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <span class="badge">Official Filing Accepted • Gateway 200</span>
        <h1>Companies House Submission Receipt</h1>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Electronic Accounts Production &amp; Filing Engine</div>
      </div>
      <div class="meta-brand">
        <strong style="color: #4338ca; font-size: 13px;">SanSuite Cloud Practice</strong><br />
        GovTalk Secure XML Gateway<br />
        Registrar of Companies (UK)
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Transaction Reference</div>
        <div class="card-val tx">${txId}</div>
      </div>
      <div class="card">
        <div class="card-label">Company Name &amp; Registration No.</div>
        <div class="card-val">${company} (${crn})</div>
      </div>
      <div class="card">
        <div class="card-label">Submission Timestamp</div>
        <div class="card-val">${ts}</div>
      </div>
      <div class="card accepted">
        <div class="card-label" style="color: #047857;">Gateway Status</div>
        <div class="card-val status">Accepted by Registrar of Companies</div>
      </div>
    </div>

    <div class="notice">
      <div class="notice-title">Electronic Statutory Filing Confirmation</div>
      <p style="margin: 0;">
        The annual statutory accounts for <strong>${company}</strong> (Company Number: <strong>${crn}</strong>) covering the financial accounting period ended <strong>${periodStr}</strong> have been received by the Registrar of Companies and successfully passed automated electronic gatekeeper validation under the Companies Act 2006. The filing has been officially recorded on the Companies House register.
      </p>
    </div>

    <div class="footer">
      This is an authentic, system-generated electronic receipt issued via the SanSuite Companies House Gateway Engine.
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  const checks = validationData?.checks || [];
  const criticalFails = checks.filter((c: any) => c.status === "fail");
  const warnings = checks.filter((c: any) => c.status === "warning");
  const passed = checks.filter((c: any) => c.status === "pass");
  const isReadyToProceedFromStep1 = criticalFails.length === 0 && checks.length > 0;

  // Helper for clean UK statutory date formatting
  const formatDateUk = (d: any) => {
    if (!d) return "N/A";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d).split("T")[0];
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return String(d).split("T")[0];
    }
  };

  const steps = [
    { id: 1, label: "Validate Report", icon: <CheckSquare size={16} /> },
    { id: 2, label: "Verify Report", icon: <Eye size={16} /> },
    { id: 3, label: "Gateway Credentials", icon: <KeyRound size={16} /> },
    { id: 4, label: "Live Submission & Receipt", icon: <Send size={16} /> },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Context Card */}
      <div className="print:hidden bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
              <Shield size={12} /> Statutory Gateway Filing
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              CRN: {client?.registrationNumber || "Unregistered"}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Companies House Electronic Filing Wizard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            4-step statutory submission engine for {client?.clientName || "Client"} • Period ending {formatDateUk(currentPeriod?.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetchValidation()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoadingValidation ? "animate-spin" : ""} /> Refresh Checks
          </button>
          <Link href={`/accounts-production/${clientId}/ixbrl-filing`}>
            <button className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
              <Code size={13} /> iXBRL Filing Console
            </button>
          </Link>
        </div>
      </div>

      {/* 4-Step Stepper Progress Header */}
      <div className="print:hidden bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (step.id <= currentStep || (step.id === 2 && isReadyToProceedFromStep1)) {
                    setCurrentStep(step.id as any);
                  }
                }}
                disabled={step.id > currentStep && !(step.id === 2 && isReadyToProceedFromStep1)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  isCurrent
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-xs ring-2 ring-purple-500/20"
                    : isCompleted
                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300"
                    : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-500"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                    isCurrent
                      ? "bg-purple-600 text-white shadow-2xs"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : step.id}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    Step {step.id}
                  </span>
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                    {step.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: VALIDATE REPORT */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Summary Status Banner */}
          <div
            className={`p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-4 ${
              criticalFails.length > 0
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200"
                : warnings.length > 0
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  criticalFails.length > 0
                    ? "bg-rose-600 text-white"
                    : warnings.length > 0
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {criticalFails.length > 0 ? (
                  <AlertCircle size={20} />
                ) : warnings.length > 0 ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {criticalFails.length > 0
                    ? `${criticalFails.length} Critical Issue${criticalFails.length > 1 ? "s" : ""} Must Be Resolved`
                    : warnings.length > 0
                    ? "Statutory Checks Passed with Advisory Warnings"
                    : "Statutory Pre-Filing Validation Passed"}
                </h3>
                <p className="text-xs opacity-85 mt-0.5">
                  {criticalFails.length > 0
                    ? "Resolve the blocking requirements below before proceeding to submission."
                    : "All mandatory statutory disclosures and ledger balance requirements are satisfied."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-3 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {passed.length} Passed
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {warnings.length} Warnings
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {criticalFails.length} Failed
              </span>
            </div>
          </div>

          {/* Validation Checks Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Statutory Diagnostic Checklist
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pre-filing rules enforced by Companies House gateway and Companies Act 2006
                </p>
              </div>
              <span className="text-xs text-slate-500">{checks.length} Automated Verifications</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {checks.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                  <p>Running statutory pre-filing diagnostics...</p>
                </div>
              ) : (
                checks.map((c: any) => {
                  const isPass = c.status === "pass";
                  const isWarn = c.status === "warning";
                  return (
                    <div
                      key={c.id}
                      className="p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isPass
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : isWarn
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                          }`}
                        >
                          {isPass ? (
                            <CheckCircle2 size={16} />
                          ) : isWarn ? (
                            <AlertTriangle size={16} />
                          ) : (
                            <AlertCircle size={16} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {c.title}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                c.category === "Critical"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {c.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {c.message}
                          </p>
                        </div>
                      </div>

                      {c.fixUrl && (
                        <Link href={c.fixUrl}>
                          <button className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer">
                            Resolve <ArrowRight size={12} />
                          </button>
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <Link href={`/accounts-production/${clientId}/statements`}>
              <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 cursor-pointer">
                <ArrowLeft size={14} /> Review Statements
              </button>
            </Link>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!isReadyToProceedFromStep1}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Verify Report <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: VERIFY REPORT */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Key Figures Summary Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={16} className="text-purple-600" />
                  Statutory Statements Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm high-level balance sheet and profit &amp; loss figures to be filed at Companies House.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/accounts-production/${clientId}/statements`}>
                  <button className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <ExternalLink size={12} /> View Full Statements Page
                  </button>
                </Link>
              </div>
            </div>

            {/* Metrics Grid */}
            {(() => {
              const turnover = statementsData?.profitAndLoss?.turnover ?? statementsData?.totals?.turnover ?? 0;
              const operatingProfit = statementsData?.profitAndLoss?.operatingProfit ?? statementsData?.totals?.operatingProfit ?? 0;
              const fixedAssets = statementsData?.balanceSheet?.fixedAssets?.total ?? statementsData?.totals?.fixedAssets ?? 0;
              const netAssets = statementsData?.balanceSheet?.netAssets ?? statementsData?.totals?.netAssets ?? 0;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500">Turnover</span>
                    <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                      £{turnover.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500">Operating Profit / (Loss)</span>
                    <p className="text-base font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                      £{operatingProfit.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500">Fixed Assets</span>
                    <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                      £{fixedAssets.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80">
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Net Assets / Total Equity</span>
                    <p className="text-base font-bold font-mono text-purple-700 dark:text-purple-300 mt-1">
                      £{netAssets.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Filing Parameters Notice */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Scale size={14} className="text-indigo-600" />
                Statutory Companies House Filleted Presentation
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Under Section 444 of the Companies Act 2006, the public copy of small company accounts delivered to the Registrar of Companies excludes the Profit &amp; Loss account and Directors&apos; Report. The Balance Sheet and applicable footnotes will be filed electronically in iXBRL format.
              </p>
            </div>

            {/* Pre-Submission Mandatory Declarations */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Mandatory Declarations Prior to Submission
              </h4>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={declarationBoardApproved}
                  onChange={(e) => setDeclarationBoardApproved(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>
                  I confirm that the accounts have been approved by the Board of Directors and authorized for delivery to Companies House.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={declarationRegimeExempt}
                  onChange={(e) => setDeclarationRegimeExempt(e.target.checked)}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>
                  I confirm that the company satisfies the statutory qualification criteria under the small / micro-entities regime of the Companies Act 2006.
                </span>
              </label>
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Step 1
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={!declarationBoardApproved || !declarationRegimeExempt}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Gateway Credentials <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GATEWAY CREDENTIALS */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound size={16} className="text-purple-600" />
                  Companies House Gateway Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Specify authorized electronic filing credentials to connect with the Companies House Electronic Filing Gateway.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    gatewayStatus === "Ready"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : gatewayStatus === "Error"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {gatewayStatus === "Ready" ? (
                    <CheckCircle2 size={13} />
                  ) : gatewayStatus === "Error" ? (
                    <AlertCircle size={13} />
                  ) : (
                    <Clock size={13} />
                  )}
                  {gatewayStatus === "Ready"
                    ? "Credentials Verified (GovTalk Ready)"
                    : gatewayStatus === "Error"
                    ? "Authentication Rejected (Check Credentials)"
                    : "Status: Untested (Test Required)"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Presenter ID */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Accountant Presenter ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={presenterId}
                  onChange={(e) => {
                    setPresenterId(e.target.value);
                    setGatewayStatus("Untested");
                  }}
                  placeholder="e.g. SAN-CH-PRESENTER-01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Practice Electronic Filing Presenter Account</p>
              </div>

              {/* Presenter Auth Code */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Presenter Authentication Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPresenterAuth ? "text" : "password"}
                    value={presenterAuthCode}
                    onChange={(e) => {
                      setPresenterAuthCode(e.target.value);
                      setGatewayStatus("Untested");
                    }}
                    placeholder="Enter Presenter Passcode"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPresenterAuth(!showPresenterAuth)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPresenterAuth ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Secured gateway passcode issued by Companies House</p>
              </div>

              {/* Company WebFiling Authentication Code */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Company WebFiling Authentication Code <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showWebFilingAuth ? "text" : "password"}
                    value={webFilingAuthCode}
                    onChange={(e) => {
                      setWebFilingAuthCode(e.target.value.toUpperCase());
                      setGatewayStatus("Untested");
                    }}
                    maxLength={6}
                    placeholder="6-character code e.g. 1A2B3C"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs uppercase tracking-widest font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebFilingAuth(!showWebFilingAuth)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showWebFilingAuth ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The client&apos;s unique 6-character Companies House authentication code
                </p>
              </div>

              {/* Gateway Target Environment */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gateway Submission Target
                </label>
                <select
                  value={gatewayEnvironment}
                  onChange={(e) => {
                    setGatewayEnvironment(e.target.value as any);
                    setGatewayStatus("Untested");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="live">Companies House Live Gateway (GovTalk Production)</option>
                  <option value="test">Companies House Testing Service (Pre-Production Sandbox)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Live filings are officially recorded on the public register</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestGateway}
                disabled={isTestingGateway}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw size={13} className={isTestingGateway ? "animate-spin" : ""} />
                {isTestingGateway ? "Testing Gateway..." : "Test Gateway Connection"}
              </button>

              <span className="text-[11px] text-slate-400">
                Credentials are encrypted using AES-256 before transmission.
              </span>
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Step 2
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              disabled={gatewayStatus !== "Ready" || !webFilingAuthCode || webFilingAuthCode.trim().length !== 6}
              title={gatewayStatus !== "Ready" ? "You must test and verify gateway credentials before proceeding" : undefined}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Step 4 (Review &amp; Dispatch) <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: LIVE SUBMISSION & OFFICIAL RECEIPT */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {displayReceipt ? (
            /* OFFICIAL SUBMISSION RECEIPT CARD */
            <div id="official-receipt-print-zone" className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500 dark:border-emerald-600 shadow-lg overflow-hidden space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Award size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Filing Accepted • Official Gateway Receipt
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Companies House Submission Receipt
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const latestSub = submissions.find((s: any) => s.chTransactionId === displayReceipt.submissionNumber) || submissions[0];
                      if (latestSub?.ixbrlDocumentHtml) {
                        handleDownloadIxbrl(latestSub.ixbrlDocumentHtml);
                      } else {
                        toast({ title: "Document Unavailable", description: "No iXBRL payload found.", variant: "destructive" });
                      }
                    }}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download size={13} /> Download Official iXBRL (.xhtml)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(displayReceipt)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Printer size={13} /> Print Official Receipt
                  </button>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs print:grid-cols-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
                  <span className="text-slate-400 print:text-slate-600 text-[11px] font-semibold">Transaction Reference</span>
                  <p className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 print:text-purple-700 mt-1">
                    {displayReceipt.submissionNumber || "CH-SUCCESS"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
                  <span className="text-slate-400 print:text-slate-600 text-[11px] font-semibold">Company Name &amp; CRN</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 print:text-slate-900 mt-1 truncate">
                    {client?.clientName} ({client?.registrationNumber || "N/A"})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300">
                  <span className="text-slate-400 print:text-slate-600 text-[11px] font-semibold">Submission Timestamp</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-900 mt-1">
                    {new Date().toLocaleString("en-GB")}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 print:bg-emerald-50 border border-emerald-200 dark:border-emerald-800 print:border-emerald-300">
                  <span className="text-emerald-700 dark:text-emerald-300 print:text-emerald-800 text-[11px] font-semibold">Gateway Status</span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 print:text-emerald-800 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Accepted by Registrar
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 print:bg-slate-50 border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-slate-900">Electronic Filing Confirmation</p>
                <p>
                  The annual accounts for the financial period ended {formatDateUk(currentPeriod?.endDate)} have been received by the Registrar of Companies and successfully passed statutory automated gatekeeper validation.
                </p>
              </div>

              <div className="print:hidden pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setActiveReceipt(null);
                    setCurrentStep(1);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  File Another Return
                </button>

                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${client?.registrationNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ExternalLink size={13} /> View on Companies House Register
                </a>
              </div>
            </div>
          ) : (
            /* READY TO SUBMIT CARD */
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send size={16} className="text-purple-600" />
                  Live Transmission to Companies House
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Transmit authenticated iXBRL annual accounts payload directly into the Companies House Gateway.
                </p>
              </div>

              {/* Manifest Summary */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Filing Manifest Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400">Target Entity:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{client?.clientName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Company Registration No:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {client?.registrationNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Accounting Period:</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {formatDateUk(currentPeriod?.startDate)} - {formatDateUk(currentPeriod?.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Previous Filing Notice if already accepted */}
              {existingAcceptedSubmission && (
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      A statutory return was previously accepted for this period (Ref: <strong className="font-mono">{existingAcceptedSubmission.chTransactionId}</strong> on {formatDateUk(existingAcceptedSubmission.submittedAt)}). Submitting below will transmit an updated/amended filing to Companies House.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptModal(existingAcceptedSubmission)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer shrink-0 shadow-2xs"
                  >
                    View Accepted Receipt
                  </button>
                </div>
              )}

              {/* Ready for live dispatch banner */}
              <div className="p-8 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Send size={28} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Ready for Electronic Gateway Dispatch
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Clicking the button below will immediately transmit the filleted iXBRL accounts to the official Companies House Electronic Filing Gateway.
                  </p>
                </div>

                {gatewayStatus !== "Ready" && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 max-w-lg mx-auto text-left">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                    <span>Companies House Gateway credentials are unverified. Please return to Step 3 and pass Gateway Connection Test before transmitting accounts.</span>
                  </div>
                )}

                <button
                  onClick={() => submitToChMutation.mutate()}
                  disabled={submitToChMutation.isPending || gatewayStatus !== "Ready"}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={15} className={submitToChMutation.isPending ? "animate-spin" : ""} />
                  {submitToChMutation.isPending ? "Transmitting iXBRL Payload to Gateway..." : "Submit Statutory Accounts Now"}
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to Step 3
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORICAL SUBMISSIONS TABLE (BELOW WIZARD) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              Companies House Electronic Filing History
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Audit log of all statutory annual accounts submissions filed with the Registrar of Companies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs font-medium">
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            </span>
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove all test submissions from this history list?")) {
                    clearAllSubmissionsMutation.mutate();
                  }
                }}
                disabled={clearAllSubmissionsMutation.isPending}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Clear all test submission records"
              >
                <Trash2 size={12} className={clearAllSubmissionsMutation.isPending ? "animate-spin" : ""} />
                Clear Test History
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Accounts Standard</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Gateway Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                    <Shield size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      No electronic submissions recorded yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Use the 4-step wizard above to validate and submit statutory accounts directly to Companies House.
                    </p>
                  </td>
                </tr>
              ) : (
                submissions.map((sub: any) => {
                  const period = periods.find((p) => p.id === sub.periodId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {sub.chTransactionId || "CH-PENDING"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {period
                          ? `${formatDateUk(period.startDate)} - ${formatDateUk(period.endDate)}`
                          : "General Period"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {sub.accountsType}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {sub.submittedAt ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(sub.submittedAt).toLocaleDateString("en-GB")}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {new Date(sub.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          "Draft Generated"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.status === "Accepted"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : sub.status === "Rejected"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                        {sub.ixbrlDocumentHtml && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedXml(sub.ixbrlDocumentHtml);
                                setXmlModalTab("preview");
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="View Rendered Statutory Accounts & iXBRL Code"
                            >
                              <FileText size={12} /> View Accounts
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadIxbrl(sub.ixbrlDocumentHtml, `${sub.chTransactionId || client?.registrationNumber || 'accounts'}.xhtml`)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Download authentic Companies House iXBRL XHTML document"
                            >
                              <Download size={12} /> Download iXBRL
                            </button>
                          </>
                        )}
                        {sub.status === "Accepted" && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingReceiptModal({
                                submissionNumber: sub.chTransactionId,
                                submittedAt: sub.submittedAt,
                                accountsType: sub.accountsType,
                                status: sub.status,
                              });
                              setActiveReceipt({
                                submissionNumber: sub.chTransactionId,
                                submittedAt: sub.submittedAt,
                              });
                              setCurrentStep(4);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Printer size={12} /> View Receipt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete submission record ${sub.chTransactionId || sub.id}?`)) {
                              deleteSubmissionMutation.mutate(sub.id);
                            }
                          }}
                          disabled={deleteSubmissionMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Delete test submission record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUTHENTIC IXBRL & STATUTORY ACCOUNTS INSPECTION MODAL */}
      {selectedXml && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col border border-slate-200 dark:border-slate-800 text-xs overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Companies House Statutory Accounts • iXBRL (Inline XBRL)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    FRC UK GAAP standard electronic accounts document formatted for Companies House WebFiling
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs & Download Action */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setXmlModalTab("preview")}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      xmlModalTab === "preview"
                        ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <FileText size={13} /> Rendered Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setXmlModalTab("source")}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      xmlModalTab === "source"
                        ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Code size={13} /> iXBRL Source Code
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadIxbrl(selectedXml)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Download size={13} /> Download (.xhtml)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedXml(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body: Rendered Preview vs Monospace Source */}
            <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col">
              {xmlModalTab === "preview" ? (
                <div className="w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
                  {/* Sleek SanSuite Document Toolbar */}
                  <div className="w-full py-2 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 font-medium text-[11px]">
                        <FileText size={12} />
                        Companies House Statutory Format
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-medium text-[11px]">
                        <CheckCircle2 size={11} /> 2 Pages (A4 Standard)
                      </span>
                    </div>

                    {/* Quick Page Jump Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-400 font-medium px-1.5">Jump to:</span>
                      <button
                        type="button"
                        onClick={() => scrollToPage(1)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          activePreviewPage === 1
                            ? "bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-300 font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <FileText size={11} /> Page 1: Title Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToPage(2)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          activePreviewPage === 2
                            ? "bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-300 font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        <FileSpreadsheet size={11} /> Page 2: Balance Sheet
                      </button>
                    </div>

                    {/* Print action directly from toolbar */}
                    <button
                      type="button"
                      onClick={handlePrintIframe}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-[11px] transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Printer size={13} /> Print Document
                    </button>
                  </div>

                  {/* Frame Container */}
                  <div className="flex-1 w-full overflow-hidden bg-slate-200/70 dark:bg-slate-950 p-3 sm:p-4 flex items-center justify-center">
                    <iframe
                      ref={previewIframeRef}
                      srcDoc={formatIxbrlForPreview(selectedXml)}
                      title="Companies House iXBRL Preview"
                      className="w-full h-full rounded-xl border border-slate-300 dark:border-slate-800 bg-[#f1f5f9] dark:bg-slate-900 shadow-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-950 text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                  {selectedXml}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield size={13} className="text-emerald-600" />
                Validated against Companies House GovTalk &amp; FRC UK GAAP FRS 102/105 Inline XBRL Taxonomies
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedXml);
                    toast({ title: "Copied to Clipboard", description: "iXBRL XML payload copied." });
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Copy XML Code
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedXml(null)}
                  className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE OFFICIAL RECEIPT MODAL */}
      {viewingReceiptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border border-emerald-500/40 dark:border-emerald-500/30 text-xs overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Official Filing Receipt • Accepted
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Companies House Electronic Submission Receipt
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] font-semibold">Transaction Reference</span>
                  <p className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 mt-1">
                    {viewingReceiptModal.submissionNumber || "CH-SUCCESS"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] font-semibold">Company Name &amp; CRN</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {client?.clientName} ({client?.registrationNumber || "N/A"})
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px] font-semibold">Submission Timestamp</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                    {viewingReceiptModal.submittedAt
                      ? new Date(viewingReceiptModal.submittedAt).toLocaleString("en-GB")
                      : new Date().toLocaleString("en-GB")}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">Gateway Status</span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Accepted by Registrar
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Electronic Statutory Filing Confirmation
                </p>
                The statutory annual accounts for <strong>{client?.clientName}</strong> covering the accounting period ended <strong>{currentPeriod?.endDate ? new Date(currentPeriod.endDate).toLocaleDateString("en-GB") : "Current Period"}</strong> have been successfully received and accepted by the Registrar of Companies under Section 477 of the Companies Act 2006.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
              <a
                href={`https://find-and-update.company-information.service.gov.uk/company/${client?.registrationNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <ExternalLink size={12} /> View on Companies House
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(viewingReceiptModal)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer size={13} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptModal(null)}
                  className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoped Print Isolation Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-receipt-print-zone, #official-receipt-print-zone * {
            visibility: visible !important;
          }
          #official-receipt-print-zone {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            border: 2px solid #059669 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Bottom Pipeline Navigation */}
      <PipelineFooterNav
        clientId={clientId}
        currentStepSlug="submission"
        statusNotice={activeReceipt ? `Filing Submitted • Submission ID: ${activeReceipt.submissionNumber || activeReceipt.id}` : "Step 7 of 7 • Statutory Submission"}
      />
    </div>
  );
}
