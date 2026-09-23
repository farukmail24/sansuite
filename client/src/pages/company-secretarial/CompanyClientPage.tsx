import { useState, useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Building2, Users, UserCog, Plus, X, Save, Trash2, AlertCircle, CheckCircle2, ExternalLink,
  RefreshCw, FileText, Landmark, Shield, Clock, Calendar, Mail, Check, Printer, Send,
  ChevronRight, Info, AlertTriangle, FileCheck
} from "lucide-react";
import { getCompanyTypeLabel, getOfficerRoleLabel } from "../../lib/chEnumerations";

export default function CompanyClientPage() {
  const [match, params] = useRoute("/company-secretarial/:id");
  const clientId = match ? params.id : "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const activeTab = searchParams.get("tab") || "details";
  const detailsSubTab = searchParams.get("subtab") || "main";

  // Modals state
  const [showShareholderModal, setShowShareholderModal] = useState(false);
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [showPscModal, setShowPscModal] = useState(false);
  const [showCs01Modal, setShowCs01Modal] = useState(false);
  const [showPrintRegistersModal, setShowPrintRegistersModal] = useState(false);

  // Forms state
  const [shareholderForm, setShareholderForm] = useState({
    name: "", shareholderType: "Individual", email: "",
    shareClass: "Ordinary", sharesHeld: "1", nominalValue: "1.00",
    appointmentDate: new Date().toISOString().split("T")[0]
  });

  const [officerForm, setOfficerForm] = useState({
    name: "", role: "Director", appointmentDate: new Date().toISOString().split("T")[0],
    dateOfBirth: "", nationality: "British", occupation: "Company Director",
    countryOfResidence: "United Kingdom", serviceAddress: "", residentialAddress: ""
  });

  const [pscForm, setPscForm] = useState({
    name: "", kind: "individual-person-with-significant-control",
    natureOfControl: "ownership-of-shares-25-to-50-percent",
    notifiedOn: new Date().toISOString().split("T")[0], dateOfBirth: "",
    nationality: "British", countryOfResidence: "United Kingdom", address: ""
  });

  const [cs01Verification, setCs01Verification] = useState({
    verifiedEmail: "",
    confirmNoChanges: true,
    confirmOfficers: true,
    confirmShareholders: true,
    notes: "Confirmation statement filed under Companies Act 2006 with ECCTA registered email verification."
  });

  // Query full record
  const { data: csData, isLoading: isLoadingCs } = useQuery({
    queryKey: ["/api/company-secretarial/record", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/company-secretarial/record/${clientId}`);
      if (!res.ok) return { record: null, shareholders: [], officers: [], pscs: [], filings: [], client: null };
      return res.json();
    },
    enabled: !!clientId,
  });

  const client = csData?.client;
  const record = csData?.record;
  const shareholders: any[] = csData?.shareholders || [];
  const officers: any[] = csData?.officers || [];
  const pscs: any[] = csData?.pscs || [];
  const filings: any[] = csData?.filings || [];

  // 11-Tab Company Details Form state
  const [detailsForm, setDetailsForm] = useState<any>({});

  useEffect(() => {
    if (record || client) {
      setDetailsForm({
        companyName: client?.clientName || "",
        companyRegNo: record?.companyRegNo || client?.registrationNumber || "",
        companyType: record?.companyType || client?.clientType || "Limited",
        previousName: record?.previousName || "",
        dateOfNameChange: record?.dateOfNameChange ? record.dateOfNameChange.split("T")[0] : "",
        nameChangeMethod: record?.nameChangeMethod || "NA",
        authCode: record?.authCode || "",
        filingPreference: record?.filingPreference || "we_file",
        accountingReferenceDate: record?.accountingReferenceDate || "31-12",
        lastAccountsDate: record?.lastAccountsDate ? record.lastAccountsDate.split("T")[0] : "",
        nextAccountsDue: record?.nextAccountsDue ? record.nextAccountsDue.split("T")[0] : "",
        confirmationReviewDate: record?.confirmationReviewDate ? record.confirmationReviewDate.split("T")[0] : "",
        nextConfirmationDue: record?.nextConfirmationDue ? record.nextConfirmationDue.split("T")[0] : "",
        incorporationDate: record?.incorporationDate ? record.incorporationDate.split("T")[0] : "",
        registeredAddress: record?.registeredAddress || client?.address || "",
        registeredEmail: record?.registeredEmail || client?.email || "",
        sailAddress: record?.sailAddress || "",
        registersLocation: record?.registersLocation || "registered_office",
        hmrcUtr: record?.hmrcUtr || client?.utrNumber || "",
        taxOffice: record?.taxOffice || "",
        sicCode: record?.sicCode || "62020",
        agmDate: record?.agmDate ? record.agmDate.split("T")[0] : "",
        firstBoardMeetingDate: record?.firstBoardMeetingDate ? record.firstBoardMeetingDate.split("T")[0] : "",
        corporateOfficerRegName: record?.corporateOfficerRegName || "",
        corporateOfficerLegalForm: record?.corporateOfficerLegalForm || "",
        corporateOfficerGoverningLaw: record?.corporateOfficerGoverningLaw || "",
        isOffshore: !!record?.isOffshore,
        notes: record?.notes || "",
      });

      setCs01Verification(prev => ({
        ...prev,
        verifiedEmail: record?.registeredEmail || client?.email || ""
      }));
    }
  }, [record, client]);

  // Mutations
  const saveDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/company-secretarial/record", {
        clientId,
        ...detailsForm
      });
      if (!res.ok) throw new Error("Failed to save company details");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      toast({ title: "Details Saved", description: "Company secretarial information updated successfully.", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error Saving", description: e.message, type: "error" })
  });

  const addShareholder = useMutation({
    mutationFn: async () => {
      if (!shareholderForm.name || !shareholderForm.sharesHeld) throw new Error("Name and Shares Held are required");
      const res = await apiRequest("POST", "/api/company-secretarial/shareholders", { ...shareholderForm, clientId });
      if (!res.ok) throw new Error("Failed to add shareholder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "Shareholder Added", description: "The shareholder has been registered in the members book." });
      setShowShareholderModal(false);
      setShareholderForm({
        name: "", shareholderType: "Individual", email: "",
        shareClass: "Ordinary", sharesHeld: "1", nominalValue: "1.00",
        appointmentDate: new Date().toISOString().split("T")[0]
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const removeShareholder = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/company-secretarial/shareholders/${id}`);
      if (!res.ok) throw new Error("Failed to remove shareholder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "Shareholder Removed", description: "Shareholder removed from register." });
    },
  });

  const addOfficer = useMutation({
    mutationFn: async () => {
      if (!officerForm.name) throw new Error("Officer Name is required");
      const res = await apiRequest("POST", "/api/company-secretarial/officers", { ...officerForm, clientId });
      if (!res.ok) throw new Error("Failed to appoint officer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "Officer Appointed", description: "Officer added to the statutory register." });
      setShowOfficerModal(false);
      setOfficerForm({
        name: "", role: "Director", appointmentDate: new Date().toISOString().split("T")[0],
        dateOfBirth: "", nationality: "British", occupation: "Company Director",
        countryOfResidence: "United Kingdom", serviceAddress: "", residentialAddress: ""
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const resignOfficer = useMutation({
    mutationFn: async ({ id, resignationDate }: { id: number; resignationDate: string }) => {
      const res = await apiRequest("PATCH", `/api/company-secretarial/officers/${id}`, { resignationDate, isActive: false });
      if (!res.ok) throw new Error("Failed to record resignation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "Resignation Recorded", description: "Officer marked as resigned in the register." });
    },
  });

  const removeOfficer = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/company-secretarial/officers/${id}`);
      if (!res.ok) throw new Error("Failed to delete officer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "Officer Deleted", description: "Officer removed from record." });
    },
  });

  const addPsc = useMutation({
    mutationFn: async () => {
      if (!pscForm.name) throw new Error("PSC Name is required");
      const res = await apiRequest("POST", "/api/company-secretarial/psc", { ...pscForm, clientId });
      if (!res.ok) throw new Error("Failed to register PSC");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "PSC Registered", description: "Person with Significant Control added." });
      setShowPscModal(false);
      setPscForm({
        name: "", kind: "individual-person-with-significant-control",
        natureOfControl: "ownership-of-shares-25-to-50-percent",
        notifiedOn: new Date().toISOString().split("T")[0], dateOfBirth: "",
        nationality: "British", countryOfResidence: "United Kingdom", address: ""
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const removePsc = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/company-secretarial/psc/${id}`);
      if (!res.ok) throw new Error("Failed to remove PSC");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      toast({ title: "PSC Removed", description: "Person with Significant Control removed." });
    },
  });

  const fileCS01Mutation = useMutation({
    mutationFn: async () => {
      if (!cs01Verification.verifiedEmail) {
        throw new Error("UK ECCTA 2024 Requirement: Registered Email Address is mandatory to file CS01.");
      }
      const res = await apiRequest("POST", "/api/company-secretarial/cs01/file", {
        clientId,
        verifiedEmail: cs01Verification.verifiedEmail,
        notes: cs01Verification.notes,
        confirmNoChanges: cs01Verification.confirmNoChanges
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to file CS01");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "CS01 Filed Successfully", description: `${data.message} Next review rolled forward.`, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      setShowCs01Modal(false);
    },
    onError: (e: any) => toast({ title: "Filing Error", description: e.message, type: "error" })
  });

  const syncChMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/company-secretarial/sync-ch/${clientId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to sync with Companies House");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Companies House Sync Complete", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
    },
    onError: (e: any) => toast({ title: "Sync Failed", description: e.message, type: "error" })
  });

  const rollDeadlineMutation = useMutation({
    mutationFn: async (taskType: "cs01" | "accounts") => {
      const res = await apiRequest("POST", "/api/company-secretarial/deadlines/roll", { clientId, taskType });
      if (!res.ok) throw new Error("Failed to roll deadline");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Deadline Rolled", description: data.message, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const archiveMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      const res = await apiRequest("POST", `/api/company-secretarial/archive/${clientId}`, { isArchived });
      if (!res.ok) throw new Error("Failed to archive company");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/record", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Archive Status Updated", description: data.message, type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/company-secretarial/company/${clientId}`);
      if (!res.ok) throw new Error("Failed to delete company");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Company Deleted", description: "Company and all associated secretarial records removed.", type: "success" });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-secretarial/deadlines"] });
      navigate("/company-secretarial");
    },
    onError: (e: any) => toast({ title: "Delete Failed", description: e.message, type: "error" })
  });

  // Query Statutory Registers Print Data
  const { data: registersData } = useQuery({
    queryKey: ["/api/company-secretarial/registers", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/company-secretarial/registers/${clientId}`);
      return res.ok ? await res.json() : null;
    },
    enabled: showPrintRegistersModal
  });

  const regNo = record?.companyRegNo || client?.registrationNumber;
  const totalShares = shareholders.reduce((s: number, sh: any) => s + parseFloat(sh.sharesHeld || "0"), 0);

  const sidebar = [
    { label: "Action Station", icon: <Shield size={15} />, route: "/company-secretarial" },
    { label: "All Companies", icon: <Building2 size={15} />, route: "/company-secretarial?tab=companies" },
    { label: "Company Workspace", icon: <Landmark size={15} />, route: `/company-secretarial/${clientId}` },
  ];

  return (
    <AppLayout sidebar={sidebar} module="Company Secretarial">
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Breadcrumb & Quick Action Sub-bar */}
        <div className="bg-slate-900 text-slate-300 px-6 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/company-secretarial")} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <span>/</span>
            <button onClick={() => navigate("/company-secretarial?tab=companies")} className="hover:text-white transition-colors cursor-pointer">
              Companies
            </button>
            <span>/</span>
            <span className="font-semibold text-white">{client?.clientName || "Loading..."}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrintRegistersModal(true)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={13} /> Print Statutory Registers
            </button>
            <button
              onClick={() => syncChMutation.mutate()}
              disabled={syncChMutation.isPending || !regNo}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncChMutation.isPending ? "animate-spin" : ""} />
              {syncChMutation.isPending ? "Syncing..." : "Sync Companies House"}
            </button>
          </div>
        </div>

        <div className="p-6 w-full mx-auto space-y-6">
          {/* Company Hero Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-slate-800 text-white rounded-xl flex items-center justify-center text-2xl font-bold shadow-inner">
                  {client?.clientName?.charAt(0) || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-800">{client?.clientName}</h1>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      {client?.tradingStatus || "Active"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>
                      CRN:{" "}
                      {regNo ? (
                        <a
                          href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(regNo.trim())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          {regNo} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-400">Not assigned</span>
                      )}
                    </span>
                    <span>&bull;</span>
                    <span>Type: {record?.companyType || client?.clientType || "Limited"}</span>
                    {record?.registeredEmail && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Mail size={12} className="text-indigo-600" /> {record.registeredEmail}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl truncate">
                    {record?.registeredAddress || client?.address || "No registered address provided."}
                  </p>
                </div>
              </div>

              {/* Compliance Dates Badges & Actions */}
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirmation Statement</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {record?.nextConfirmationDue
                      ? new Date(record.nextConfirmationDue).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })
                      : "Not scheduled"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => setShowCs01Modal(true)}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                    >
                      File CS01
                    </button>
                    <button
                      onClick={() => rollDeadlineMutation.mutate("cs01")}
                      disabled={rollDeadlineMutation.isPending}
                      className="px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      +1 yr
                    </button>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>

                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Accounts</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {record?.nextAccountsDue
                      ? new Date(record.nextAccountsDue).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })
                      : "Not scheduled"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => rollDeadlineMutation.mutate("accounts")}
                      disabled={rollDeadlineMutation.isPending}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Roll Accounts (+1 yr)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <div className="flex gap-1.5 bg-slate-200/70 p-1.5 rounded-xl w-fit overflow-x-auto">
            {[
              { id: "details", label: "Company Details (11 Tabs)", icon: <Building2 size={14} /> },
              { id: "shareholders", label: `Members (${shareholders.length})`, icon: <Users size={14} /> },
              { id: "officers", label: `Officers (${officers.length})`, icon: <UserCog size={14} /> },
              { id: "pscs", label: `PSCs (${pscs.length})`, icon: <Shield size={14} /> },
              { id: "registers", label: "Statutory Books", icon: <FileText size={14} /> },
              { id: "filings", label: `Filing History (${filings.length})`, icon: <Send size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/company-secretarial/${clientId}?tab=${tab.id}`)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: 11-TAB COMPANY DETAILS WORKSPACE */}
          {activeTab === "details" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* 11 Sub-tabs bar matching Capium screenshots */}
              <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
                {[
                  { id: "main", label: "Main details" },
                  { id: "accounts", label: "Accounts dates" },
                  { id: "confirmation", label: "Confirmation Statement" },
                  { id: "other_dates", label: "Other dates" },
                  { id: "office_email", label: "Regd office, email, SAIL & HMRC" },
                  { id: "doc_locations", label: "Document locations" },
                  { id: "contact", label: "Contact Details" },
                  { id: "sic", label: "SIC codes" },
                  { id: "staff_notes", label: "Staff & notes" },
                  { id: "agm", label: "AGM & Meetings" },
                  { id: "first_board", label: "1st Board Meeting" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => navigate(`/company-secretarial/${clientId}?tab=details&subtab=${st.id}`)}
                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${detailsSubTab === st.id
                      ? "border-indigo-600 text-indigo-700 bg-white font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                      }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Subtab Contents */}
              <div className="p-8 space-y-6">
                {/* 1. Main Details */}
                {detailsSubTab === "main" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={detailsForm.companyName || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, companyName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Registration Number (CRN)</label>
                      <input
                        type="text"
                        value={detailsForm.companyRegNo || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, companyRegNo: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Type</label>
                      <select
                        value={detailsForm.companyType || "Limited"}
                        onChange={(e) => setDetailsForm({ ...detailsForm, companyType: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="Limited">Private Limited Company (Ltd)</option>
                        <option value="LLP">Limited Liability Partnership (LLP)</option>
                        <option value="PLC">Public Limited Company (PLC)</option>
                        <option value="Limited by Guarantee">Limited by Guarantee</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Companies House Filing Preference</label>
                      <select
                        value={detailsForm.filingPreference || "we_file"}
                        onChange={(e) => setDetailsForm({ ...detailsForm, filingPreference: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="we_file">We do it (Accountant files forms)</option>
                        <option value="client_cs01">Client files CS01</option>
                        <option value="client_all">Client files all Companies House forms</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Previous Name (if any)</label>
                      <input
                        type="text"
                        placeholder="Former registered name"
                        value={detailsForm.previousName || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, previousName: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date of Any Name Change</label>
                      <input
                        type="date"
                        value={detailsForm.dateOfNameChange || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, dateOfNameChange: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Means of Name Change</label>
                      <select
                        value={detailsForm.nameChangeMethod || "NA"}
                        onChange={(e) => setDetailsForm({ ...detailsForm, nameChangeMethod: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="NA">N/A (No name change)</option>
                        <option value="NM01">Resolution (Form NM01)</option>
                        <option value="NM04">Provision in Articles (Form NM04)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">6-Digit E-Filing Auth Code</label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="WebFiling code"
                        value={detailsForm.authCode || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, authCode: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Accounts Dates */}
                {detailsSubTab === "accounts" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accounting Reference Date (ARD)</label>
                      <input
                        type="text"
                        placeholder="e.g. 31-12 (DD-MM)"
                        value={detailsForm.accountingReferenceDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, accountingReferenceDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Accounts Made Up To</label>
                      <input
                        type="date"
                        value={detailsForm.lastAccountsDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, lastAccountsDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Next Accounts Due Date</label>
                      <input
                        type="date"
                        value={detailsForm.nextAccountsDue || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, nextAccountsDue: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Confirmation Statement */}
                {detailsSubTab === "confirmation" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmation Review Date</label>
                      <input
                        type="date"
                        value={detailsForm.confirmationReviewDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, confirmationReviewDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Next Confirmation Statement Due Date</label>
                      <input
                        type="date"
                        value={detailsForm.nextConfirmationDue || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, nextConfirmationDue: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCs01Modal(true)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                      >
                        <Send size={14} /> Open Confirmation Statement (CS01) Filing Window
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Other Dates */}
                {detailsSubTab === "other_dates" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Incorporation Date</label>
                      <input
                        type="date"
                        value={detailsForm.incorporationDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, incorporationDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Regd office, email, SAIL & HMRC */}
                {detailsSubTab === "office_email" && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                      <Info size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-indigo-900 leading-relaxed">
                        <strong>Economic Crime and Corporate Transparency Act (ECCTA 2024):</strong> From 4th March 2024, every UK company must maintain an authentic <strong>Registered Email Address</strong> on record with Companies House. This is verified during CS01 filing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Registered Email Address * (Statutory Requirement)
                        </label>
                        <input
                          type="email"
                          placeholder="official@company.co.uk"
                          value={detailsForm.registeredEmail || ""}
                          onChange={(e) => setDetailsForm({ ...detailsForm, registeredEmail: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registered Office Address *</label>
                        <textarea
                          rows={3}
                          value={detailsForm.registeredAddress || ""}
                          onChange={(e) => setDetailsForm({ ...detailsForm, registeredAddress: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          SAIL Address (Single Alternative Inspection Location)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Leave blank if all registers are kept at the registered office"
                          value={detailsForm.sailAddress || ""}
                          onChange={(e) => setDetailsForm({ ...detailsForm, sailAddress: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">HMRC Corporation Tax UTR</label>
                        <input
                          type="text"
                          placeholder="10-digit UTR"
                          value={detailsForm.hmrcUtr || ""}
                          onChange={(e) => setDetailsForm({ ...detailsForm, hmrcUtr: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tax Office</label>
                        <input
                          type="text"
                          placeholder="e.g. Manchester East"
                          value={detailsForm.taxOffice || ""}
                          onChange={(e) => setDetailsForm({ ...detailsForm, taxOffice: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Country *</label>
                        <select
                          value={detailsForm.country || "United Kingdom"}
                          onChange={(e) => setDetailsForm({ ...detailsForm, country: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                        >
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="England and Wales">England and Wales</option>
                          <option value="Scotland">Scotland</option>
                          <option value="Northern Ireland">Northern Ireland</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-bold text-slate-800">Company as Corporate Officer / Non-UK PSC</h4>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!detailsForm.isOffshore}
                            onChange={(e) => setDetailsForm({ ...detailsForm, isOffshore: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span>Offshore Registration (Tick if registered outside UK)</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Registry Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Companies House / Registry"
                            value={detailsForm.corporateOfficerRegName || ""}
                            onChange={(e) => setDetailsForm({ ...detailsForm, corporateOfficerRegName: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Legal Form</label>
                          <input
                            type="text"
                            placeholder="e.g. Limited Company"
                            value={detailsForm.corporateOfficerLegalForm || ""}
                            onChange={(e) => setDetailsForm({ ...detailsForm, corporateOfficerLegalForm: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Governing Law</label>
                          <input
                            type="text"
                            placeholder="e.g. English Law"
                            value={detailsForm.corporateOfficerGoverningLaw || ""}
                            onChange={(e) => setDetailsForm({ ...detailsForm, corporateOfficerGoverningLaw: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Document locations */}
                {detailsSubTab === "doc_locations" && (
                  <div className="space-y-4 max-w-xl">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location of Statutory Registers</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="registersLocation"
                          value="registered_office"
                          checked={detailsForm.registersLocation === "registered_office"}
                          onChange={(e) => setDetailsForm({ ...detailsForm, registersLocation: e.target.value })}
                          className="text-indigo-600"
                        />
                        <span className="text-xs font-semibold text-slate-800">
                          Registered Office ({record?.registeredAddress || client?.address || "Address"})
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                        <input
                          type="radio"
                          name="registersLocation"
                          value="sail"
                          checked={detailsForm.registersLocation === "sail"}
                          onChange={(e) => setDetailsForm({ ...detailsForm, registersLocation: e.target.value })}
                          className="text-indigo-600"
                        />
                        <span className="text-xs font-semibold text-slate-800">
                          Single Alternative Inspection Location (SAIL)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 7. Contact Details */}
                {detailsSubTab === "contact" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={detailsForm.registeredEmail || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, registeredEmail: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* 8. SIC Codes (Capium Article 9000224253 & img_4) */}
                {detailsSubTab === "sic" && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        UK Standard Industrial Classification (SIC Codes) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 62020 - Information technology consultancy activities"
                        value={detailsForm.sicCode || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, sicCode: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-slate-700">Quick Select Standard UK SIC Codes:</div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { code: "62020", desc: "62020 Information tech consultancy" },
                          { code: "62012", desc: "62012 Business & domestic software" },
                          { code: "82990", desc: "82990 Other business support services" },
                          { code: "70229", desc: "70229 Management consultancy" },
                          { code: "69201", desc: "69201 Accounting & auditing activities" },
                          { code: "68209", desc: "68209 Letting of own real estate" }
                        ].map(s => (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => setDetailsForm({ ...detailsForm, sicCode: s.code })}
                            className="px-2.5 py-1 text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg transition-colors cursor-pointer text-slate-700 font-medium"
                          >
                            + {s.desc}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center gap-4 text-xs font-medium">
                        <a
                          href="https://www.gov.uk/get-information-about-a-company"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          SIC Code Lookup (gov.uk) <ExternalLink size={12} />
                        </a>
                        <span className="text-slate-300">&bull;</span>
                        <a
                          href="https://resources.companieshouse.gov.uk/sic/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          External list of SIC codes from Companies House <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. Staff & Notes (Capium Article 9000225975) */}
                {detailsSubTab === "staff_notes" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Secretarial &amp; Compliance Notes</label>
                      <textarea
                        rows={4}
                        placeholder="Internal practice notes regarding company administration..."
                        value={detailsForm.notes || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, notes: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                      />
                    </div>

                    {/* Archive & Delete Panel (Article 9000225975) */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                        <div className="space-y-1 text-xs">
                          <h4 className="font-bold text-slate-800">Archive or Delete Company (Capium Guidance)</h4>
                          <p className="text-slate-600 leading-relaxed">
                            We always advise to <strong>archive a client</strong> rather than delete them as you don&apos;t pay for archived clients and this way you save all your proof of work and registers. If you delete, you will never get that information back.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        {record?.isArchived ? (
                          <>
                            <span className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 flex items-center gap-1.5">
                              <CheckCircle2 size={13} /> Archived on {record.archivedAt ? new Date(record.archivedAt).toLocaleDateString("en-GB") : "Record"}
                            </span>
                            <button
                              type="button"
                              onClick={() => archiveMutation.mutate(false)}
                              disabled={archiveMutation.isPending}
                              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                              Unarchive Company
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to permanently delete this company and all its officers, members, and secretarial registers? This cannot be undone.")) {
                                  deleteCompanyMutation.mutate();
                                }
                              }}
                              disabled={deleteCompanyMutation.isPending}
                              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 size={14} /> Permanently Delete Company
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archiveMutation.mutate(true)}
                            disabled={archiveMutation.isPending}
                            className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            Archive Company in CoSec
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 10. AGM & Meetings */}
                {detailsSubTab === "agm" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Annual General Meeting (AGM) Date</label>
                      <input
                        type="date"
                        value={detailsForm.agmDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, agmDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* 11. 1st Board Meeting */}
                {detailsSubTab === "first_board" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Board Meeting Date</label>
                      <input
                        type="date"
                        value={detailsForm.firstBoardMeetingDate || ""}
                        onChange={(e) => setDetailsForm({ ...detailsForm, firstBoardMeetingDate: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => saveDetailsMutation.mutate()}
                    disabled={saveDetailsMutation.isPending}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {saveDetailsMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Company Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHAREHOLDERS (REGISTER OF MEMBERS) */}
          {activeTab === "shareholders" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-bold text-slate-800">Register of Members (Shareholders)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total issued share capital: <span className="font-semibold text-slate-700">{totalShares.toLocaleString()}</span> shares
                  </p>
                </div>
                <button
                  onClick={() => setShowShareholderModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Allot / Add Shareholder
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Member Name</th>
                      <th className="py-3.5 px-6">Type</th>
                      <th className="py-3.5 px-6">Share Class</th>
                      <th className="py-3.5 px-6 text-right">Shares Held</th>
                      <th className="py-3.5 px-6 text-right">% Ownership</th>
                      <th className="py-3.5 px-6">Allotted Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {shareholders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          No shareholders recorded in the register yet.
                        </td>
                      </tr>
                    ) : (
                      shareholders.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-800">{s.name}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">{s.shareholderType}</td>
                          <td className="py-3.5 px-6 text-xs font-medium text-slate-700">{s.shareClass}</td>
                          <td className="py-3.5 px-6 text-right font-mono font-semibold text-slate-800">
                            {parseFloat(s.sharesHeld).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="font-bold text-slate-900">{parseFloat(s.percentageOwnership).toFixed(2)}%</span>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {s.appointmentDate ? new Date(s.appointmentDate).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => removeShareholder.mutate(s.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICERS (DIRECTORS & SECRETARIES) */}
          {activeTab === "officers" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-bold text-slate-800">Register of Officers (Directors &amp; Secretaries)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Appointed company officers under Companies Act 2006.</p>
                </div>
                <button
                  onClick={() => setShowOfficerModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Appoint Officer (AP01/AP03)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Officer Name</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6">Appointed</th>
                      <th className="py-3.5 px-6">Nationality</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {officers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          No officers recorded in the register.
                        </td>
                      </tr>
                    ) : (
                      officers.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-800">
                            <div>{o.name}</div>
                            {o.serviceAddress && <div className="text-[11px] text-slate-400 mt-0.5">{o.serviceAddress}</div>}
                          </td>
                          <td className="py-3.5 px-6 text-xs font-semibold text-slate-700">{o.role}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {o.appointmentDate ? new Date(o.appointmentDate).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">{o.nationality || "British"}</td>
                          <td className="py-3.5 px-6">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${o.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {o.isActive ? "Active" : "Resigned"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {o.isActive && (
                                <button
                                  onClick={() => resignOfficer.mutate({ id: o.id, resignationDate: new Date().toISOString().split("T")[0] })}
                                  className="px-2.5 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                  title="Record TM01 Resignation"
                                >
                                  Resign
                                </button>
                              )}
                              <button
                                onClick={() => removeOfficer.mutate(o.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PSCs (REGISTER OF PERSONS WITH SIGNIFICANT CONTROL) */}
          {activeTab === "pscs" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-bold text-slate-800">Register of Persons with Significant Control (PSC)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Statutory PSC compliance under Small Business, Enterprise and Employment Act 2015.</p>
                </div>
                <button
                  onClick={() => setShowPscModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} /> Add PSC (PSC01)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6">Kind</th>
                      <th className="py-3.5 px-6">Nature of Control</th>
                      <th className="py-3.5 px-6">Notified Date</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {pscs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          No PSC records found.
                        </td>
                      </tr>
                    ) : (
                      pscs.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-800">{p.name}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-600">
                            {p.kind?.replace(/-/g, " ") || "Individual PSC"}
                          </td>
                          <td className="py-3.5 px-6 text-xs">
                            <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {p.natureOfControl || "Ownership of shares >25%"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">
                            {p.notifiedOn ? new Date(p.notifiedOn).toLocaleDateString("en-GB") : "—"}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${p.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                              {p.isActive ? "Active" : "Ceased"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => removePsc.mutate(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: STATUTORY REGISTERS (THE 5 OFFICIAL BOOKS) */}
          {activeTab === "registers" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Statutory Registers (Official Books)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official registers required to be maintained under the Companies Act 2006.
                  </p>
                </div>
                <button
                  onClick={() => setShowPrintRegistersModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer size={15} /> Print Complete Registers
                </button>
              </div>

              {/* Register 1: Directors */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserCog size={16} className="text-indigo-600" /> 1. Register of Directors
                </h3>
                <div className="text-xs text-slate-600">
                  {officers.filter(o => o.role?.includes("Director")).length === 0 ? (
                    <p className="text-slate-400">No directors recorded.</p>
                  ) : (
                    officers.filter(o => o.role?.includes("Director")).map(d => (
                      <div key={d.id} className="py-2 border-b border-slate-100 flex justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{d.name}</span> &bull; {d.nationality || "British"} &bull; {d.occupation || "Director"}
                        </div>
                        <span className="text-slate-500">Appointed: {d.appointmentDate ? new Date(d.appointmentDate).toLocaleDateString("en-GB") : "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Register 2: Members */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" /> 2. Register of Members (Shareholders)
                </h3>
                <div className="text-xs text-slate-600">
                  {shareholders.length === 0 ? (
                    <p className="text-slate-400">No members recorded.</p>
                  ) : (
                    shareholders.map(s => (
                      <div key={s.id} className="py-2 border-b border-slate-100 flex justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{s.name}</span> ({s.shareClass} shares)
                        </div>
                        <span className="font-mono font-bold">{parseFloat(s.sharesHeld).toLocaleString()} shares ({s.percentageOwnership}%)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Register 3: PSCs */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Shield size={16} className="text-indigo-600" /> 3. Register of Persons with Significant Control (PSC)
                </h3>
                <div className="text-xs text-slate-600">
                  {pscs.length === 0 ? (
                    <p className="text-slate-400">No PSCs recorded.</p>
                  ) : (
                    pscs.map(p => (
                      <div key={p.id} className="py-2 border-b border-slate-100 flex justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{p.name}</span>
                        </div>
                        <span className="text-slate-500">{p.natureOfControl}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FILING HISTORY */}
          {activeTab === "filings" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Companies House Filing History</h2>
                <button
                  onClick={() => setShowCs01Modal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  + New CS01 Filing
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-6">Form Type</th>
                      <th className="py-3.5 px-6">Submission Date</th>
                      <th className="py-3.5 px-6">Transaction ID</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {filings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          No submissions recorded for this company yet.
                        </td>
                      </tr>
                    ) : (
                      filings.map((f: any) => (
                        <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-bold text-indigo-700 text-xs">{f.formType}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">{new Date(f.submissionDate).toLocaleString("en-GB")}</td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{f.transactionId || "—"}</td>
                          <td className="py-3.5 px-6">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              {f.status || "Accepted"}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-xs text-slate-500">{f.notes || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: APPOINT OFFICER */}
        {showOfficerModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm">Appoint Company Officer (Form AP01 / AP03)</h3>
                <button onClick={() => setShowOfficerModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={officerForm.name}
                    onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
                    <select
                      value={officerForm.role}
                      onChange={(e) => setOfficerForm({ ...officerForm, role: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                    >
                      <option value="Director">Director (AP01)</option>
                      <option value="Secretary">Secretary (AP03)</option>
                      <option value="LLP Member">LLP Member</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Appointment Date</label>
                    <input
                      type="date"
                      value={officerForm.appointmentDate}
                      onChange={(e) => setOfficerForm({ ...officerForm, appointmentDate: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nationality</label>
                    <input
                      type="text"
                      value={officerForm.nationality}
                      onChange={(e) => setOfficerForm({ ...officerForm, nationality: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Occupation</label>
                    <input
                      type="text"
                      value={officerForm.occupation}
                      onChange={(e) => setOfficerForm({ ...officerForm, occupation: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Service Address</label>
                  <input
                    type="text"
                    placeholder="Leave blank to use registered office"
                    value={officerForm.serviceAddress}
                    onChange={(e) => setOfficerForm({ ...officerForm, serviceAddress: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button onClick={() => setShowOfficerModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => addOfficer.mutate()}
                    disabled={addOfficer.isPending}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Appoint Officer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ALLOT / ADD SHAREHOLDER */}
        {showShareholderModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm">Allot Shares / Register Member (SH01)</h3>
                <button onClick={() => setShowShareholderModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Shareholder Name *</label>
                  <input
                    type="text"
                    value={shareholderForm.name}
                    onChange={(e) => setShareholderForm({ ...shareholderForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Share Class</label>
                    <input
                      type="text"
                      value={shareholderForm.shareClass}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, shareClass: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Number of Shares *</label>
                    <input
                      type="number"
                      value={shareholderForm.sharesHeld}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, sharesHeld: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nominal Value (£)</label>
                    <input
                      type="text"
                      value={shareholderForm.nominalValue}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, nominalValue: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Allotment Date</label>
                    <input
                      type="date"
                      value={shareholderForm.appointmentDate}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, appointmentDate: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button onClick={() => setShowShareholderModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => addShareholder.mutate()}
                    disabled={addShareholder.isPending}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Save Allotment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD PSC */}
        {showPscModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-bold text-sm">Register PSC (Form PSC01)</h3>
                <button onClick={() => setShowPscModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PSC Full Name *</label>
                  <input
                    type="text"
                    value={pscForm.name}
                    onChange={(e) => setPscForm({ ...pscForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nature of Control *</label>
                  <select
                    value={pscForm.natureOfControl}
                    onChange={(e) => setPscForm({ ...pscForm, natureOfControl: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="ownership-of-shares-25-to-50-percent">Ownership of shares (25% to 50%)</option>
                    <option value="ownership-of-shares-50-to-75-percent">Ownership of shares (50% to 75%)</option>
                    <option value="ownership-of-shares-75-to-100-percent">Ownership of shares (75% to 100%)</option>
                    <option value="voting-rights-25-to-50-percent">Voting rights (25% to 50%)</option>
                    <option value="right-to-appoint-and-remove-directors">Right to appoint and remove directors</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nationality</label>
                    <input
                      type="text"
                      value={pscForm.nationality}
                      onChange={(e) => setPscForm({ ...pscForm, nationality: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notified Date</label>
                    <input
                      type="date"
                      value={pscForm.notifiedOn}
                      onChange={(e) => setPscForm({ ...pscForm, notifiedOn: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button onClick={() => setShowPscModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => addPsc.mutate()}
                    disabled={addPsc.isPending}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Save PSC
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: FORMAL CS01 REVIEW & FILING */}
        {showCs01Modal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-sm">File Confirmation Statement (CS01)</h3>
                </div>
                <button onClick={() => setShowCs01Modal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500">
                  Verify the statutory declaration below before submitting form CS01 to Companies House.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Mandatory Registered Email Address (ECCTA 2024) *
                    </label>
                    <input
                      type="email"
                      value={cs01Verification.verifiedEmail}
                      onChange={(e) => setCs01Verification({ ...cs01Verification, verifiedEmail: e.target.value })}
                      placeholder="official@company.co.uk"
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-2 pt-2 text-xs text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cs01Verification.confirmNoChanges}
                        onChange={(e) => setCs01Verification({ ...cs01Verification, confirmNoChanges: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      I confirm that all company details, officers, and PSC registers are accurate.
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cs01Verification.confirmShareholders}
                        onChange={(e) => setCs01Verification({ ...cs01Verification, confirmShareholders: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      Statement of capital and shareholder allocations are up to date.
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                  <button onClick={() => setShowCs01Modal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                    Cancel
                  </button>
                  <button
                    onClick={() => fileCS01Mutation.mutate()}
                    disabled={fileCS01Mutation.isPending}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                  >
                    {fileCS01Mutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Confirm &amp; File CS01
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PRINT STATUTORY REGISTERS */}
        {showPrintRegistersModal && registersData && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
                <h3 className="font-bold text-sm">Official Statutory Registers Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={13} /> Print / Save PDF
                  </button>
                  <button onClick={() => setShowPrintRegistersModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>
              </div>

              <div className="p-8 space-y-8 bg-white text-slate-900 text-xs">
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <h1 className="text-xl font-extrabold uppercase tracking-wider">{registersData.company.name}</h1>
                  <p className="font-semibold text-slate-700">Company Registration No: {registersData.company.regNo}</p>
                  <p className="text-slate-500">Registered Office: {registersData.company.registeredAddress}</p>
                  <p className="text-[10px] text-slate-400 pt-1">
                    Statutory Books Kept under Section 1136 Companies Act 2006 &bull; Generated: {new Date(registersData.generatedAt).toLocaleString("en-GB")}
                  </p>
                </div>

                {/* Section 1: Directors */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-300 pb-1">Register of Directors</h3>
                  <table className="w-full text-left border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] font-bold">
                      <tr>
                        <th className="p-2 border">Full Name</th>
                        <th className="p-2 border">Nationality</th>
                        <th className="p-2 border">Occupation</th>
                        <th className="p-2 border">Appointed</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registersData.registers.directors.map((d: any) => (
                        <tr key={d.id} className="border-b">
                          <td className="p-2 border font-semibold">{d.name}</td>
                          <td className="p-2 border">{d.nationality || "British"}</td>
                          <td className="p-2 border">{d.occupation || "Director"}</td>
                          <td className="p-2 border">{d.appointmentDate ? new Date(d.appointmentDate).toLocaleDateString("en-GB") : "—"}</td>
                          <td className="p-2 border">{d.isActive ? "Active" : "Resigned"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Members */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-300 pb-1">Register of Members (Shareholders)</h3>
                  <table className="w-full text-left border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] font-bold">
                      <tr>
                        <th className="p-2 border">Certificate</th>
                        <th className="p-2 border">Member Name</th>
                        <th className="p-2 border">Class</th>
                        <th className="p-2 border text-right">Shares</th>
                        <th className="p-2 border text-right">Nominal Value</th>
                        <th className="p-2 border text-right">% Holding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registersData.registers.members.map((m: any) => (
                        <tr key={m.id} className="border-b">
                          <td className="p-2 border font-mono">{m.certificateNumber}</td>
                          <td className="p-2 border font-semibold">{m.name}</td>
                          <td className="p-2 border">{m.shareClass}</td>
                          <td className="p-2 border text-right font-mono">{parseFloat(m.sharesHeld).toLocaleString()}</td>
                          <td className="p-2 border text-right font-mono">£{m.totalNominalValue}</td>
                          <td className="p-2 border text-right font-bold">{m.percentageOwnership}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 3: PSCs */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider border-b border-slate-300 pb-1">Register of Persons with Significant Control (PSC)</h3>
                  <table className="w-full text-left border border-slate-200">
                    <thead className="bg-slate-100 text-[10px] font-bold">
                      <tr>
                        <th className="p-2 border">Full Name</th>
                        <th className="p-2 border">Nature of Control</th>
                        <th className="p-2 border">Notified Date</th>
                        <th className="p-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registersData.registers.pscs.map((p: any) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2 border font-semibold">{p.name}</td>
                          <td className="p-2 border">{p.natureOfControl}</td>
                          <td className="p-2 border">{p.notifiedOn ? new Date(p.notifiedOn).toLocaleDateString("en-GB") : "—"}</td>
                          <td className="p-2 border">{p.isActive ? "Active" : "Ceased"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
