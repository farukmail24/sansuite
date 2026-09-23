import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearch, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import SettingsTabs, { BookkeepingSettingsTabId } from "../../components/bookkeeping/SettingsTabs";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  ChevronRight,
  Building2,
  Calendar,
  ListTree,
  ImageIcon,
  FileText,
  Scale,
  Coins,
  Hash,
  Save,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  RefreshCw,
  UploadCloud,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  X,
  Sliders,
  Check,
  Building,
  Upload,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function BookkeepingSettingsPage() {
  const [match1, params1] = useRoute("/bookkeeping/:id/settings");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const [match3, params3] = useRoute("/bookkeeping/:id");
  const rawClientId = params1?.id || params2?.id || params3?.id || "";

  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch practice clients for client switcher / fallback
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  // Determine active clientId
  const effectiveClientId = useMemo(() => {
    if (rawClientId) return rawClientId;
    if (clients.length > 0) return String(clients[0].id);
    return "";
  }, [rawClientId, clients]);

  const activeClient = useMemo(() => {
    return clients.find((c: any) => String(c.id) === String(effectiveClientId));
  }, [clients, effectiveClientId]);

  // Determine active tab from searchString or window.location.search
  const getTabFromUrl = (search: string): BookkeepingSettingsTabId => {
    const params = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
    const tabParam = params.get("tab") as BookkeepingSettingsTabId;
    const validTabs: BookkeepingSettingsTabId[] = [
      "company_info",
      "accounting_periods",
      "chart_of_accounts",
      "company_logo",
      "templates",
      "opening_balance",
      "currency",
      "sequence",
    ];
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    return "company_info";
  };

  const [activeTab, setActiveTab] = useState<BookkeepingSettingsTabId>(() => getTabFromUrl(searchString));

  // Keep state strictly in sync when URL search query changes (e.g. from sidebar clicks or back/forward)
  useEffect(() => {
    const tabFromUrl = getTabFromUrl(searchString);
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchString]);

  // Tab switching handler
  const handleTabChange = (tabId: BookkeepingSettingsTabId) => {
    setActiveTab(tabId);
    const targetUrl = effectiveClientId
      ? `/bookkeeping/${effectiveClientId}/settings?tab=${tabId}`
      : `/bookkeeping/settings?tab=${tabId}`;
    navigate(targetUrl);
  };

  const handleClientChange = (newClientId: string) => {
    navigate(`/bookkeeping/${newClientId}/settings?tab=${activeTab}`);
  };

  // =========================================================================
  // TAB 1: COMPANY INFO & PREFERENCES
  // =========================================================================
  const [companySubTab, setCompanySubTab] = useState<"info" | "preferences">("info");
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);

  const { data: companyData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/company-info`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!effectiveClientId,
  });

  const companyInfo = companyData?.companyInfo || {};

  // Company Edit Form State
  const [editForm, setEditForm] = useState<any>({});
  useEffect(() => {
    if (companyInfo.name || companyInfo.id) {
      setEditForm({
        name: companyInfo.name || "",
        type: companyInfo.type || "Limited",
        registrationNumber: companyInfo.registrationNumber || "",
        utrNumber: companyInfo.utrNumber || "",
        currency: companyInfo.currency || "Pound Sterling",
        businessStartDate: companyInfo.businessStartDate || "",
        bookStartDate: companyInfo.bookStartDate || "",
        yearEnd: companyInfo.yearEnd || "31/12",
        vatScheme: companyInfo.vatScheme || "Standard VAT Accrual Based",
        vatNumber: companyInfo.vatNumber || "",
        vatRegistrationDate: companyInfo.vatRegistrationDate || "",
        vatSubmitType: companyInfo.vatSubmitType || "Quarterly",
        address: companyInfo.address || "",
        city: companyInfo.city || "",
        county: companyInfo.county || "",
        postcode: companyInfo.postcode || "",
        country: companyInfo.country || "United Kingdom",
        phone: companyInfo.phone || "",
        email: companyInfo.email || "",
        website: companyInfo.website || "",
      });
    }
  }, [companyInfo]);

  // Preferences Form State
  const [prefForm, setPrefForm] = useState({
    manualBankReconciliation: false,
    useDocTemplate: true,
    defaultPagePeriod: "All",
  });
  useEffect(() => {
    if (companyData?.settingsPreferences) {
      setPrefForm({
        manualBankReconciliation: Boolean(companyData.settingsPreferences.manualBankReconciliation),
        useDocTemplate: Boolean(companyData.settingsPreferences.useDocTemplate),
        defaultPagePeriod: companyData.settingsPreferences.defaultPagePeriod || "All",
      });
    }
  }, [companyData]);

  // Save Company Info Mutation
  const saveCompanyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/company-info`, payload);
      if (!res.ok) throw new Error("Failed to save company information");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Company Info Updated", description: "Company profile details saved successfully." });
      setIsEditCompanyModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Save Preferences Mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/settings-preferences`, payload);
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      toast({ title: "Preferences Saved", description: "Bookkeeping preferences updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // =========================================================================
  // TAB 2: ACCOUNTING PERIODS
  // =========================================================================
  const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    startDate: "",
    endDate: "",
    periodType: "Current",
    status: "Open",
  });

  const { data: periods = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/periods`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const addPeriodMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/periods`, payload);
      if (!res.ok) throw new Error("Failed to add accounting period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Period Added", description: "Accounting period created successfully." });
      setIsAddPeriodModalOpen(false);
      setNewPeriodForm({ startDate: "", endDate: "", periodType: "Current", status: "Open" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePeriodLockMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/periods/${periodId}/toggle-lock`);
      if (!res.ok) throw new Error("Failed to toggle lock status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Status Updated", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/periods/${periodId}`);
      if (!res.ok) throw new Error("Failed to delete period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/periods`] });
      toast({ title: "Period Deleted", description: "Accounting period removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // =========================================================================
  // TAB 3: CHART OF ACCOUNTS
  // =========================================================================
  const [coaSearch, setCoaSearch] = useState("");
  const [coaCategoryFilter, setCoaCategoryFilter] = useState("All");
  const [coaStatusFilter, setCoaStatusFilter] = useState("All");
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<any>({
    id: null,
    code: "",
    name: "",
    category: "Turnover",
    group: "Turnover",
    status: "Normal",
  });

  const { data: coaAccounts = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/accounts`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const filteredCoa = useMemo(() => {
    return coaAccounts.filter((acc: any) => {
      const matchSearch =
        acc.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
        acc.code.toLowerCase().includes(coaSearch.toLowerCase());
      const matchCat = coaCategoryFilter === "All" || acc.category === coaCategoryFilter;
      const matchStatus = coaStatusFilter === "All" || acc.status === coaStatusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [coaAccounts, coaSearch, coaCategoryFilter, coaStatusFilter]);

  const saveAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/accounts`, payload);
      if (!res.ok) throw new Error("Failed to save account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`] });
      toast({ title: "Account Saved", description: "Chart of Accounts updated." });
      setIsAddAccountModalOpen(false);
      setAccountForm({ id: null, code: "", name: "", category: "Turnover", group: "Turnover", status: "Normal" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/accounts/${accountId}`);
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/accounts`] });
      toast({ title: "Account Deleted", description: "Nominal account removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleExportCoaCsv = () => {
    const headers = ["Nominal Code,Account Name,Category,Group,Status,System Account\n"];
    const rows = filteredCoa.map((a: any) =>
      `"${a.code}","${a.name}","${a.category}","${a.group}","${a.status}","${a.isSystem ? "Yes" : "No"}"`
    );
    const blob = new Blob([headers.join("") + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Chart_of_Accounts_${effectiveClientId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // TAB 4: COMPANY LOGO
  // =========================================================================
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = useAuth.getState().token;
    const formData = new FormData();
    formData.append("logo", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    setLogoUploading(true);
    try {
      const res = await fetch(`/api/bookkeeping/settings/${effectiveClientId}/logo`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Logo Uploaded", description: "Company logo updated successfully." });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/logo`);
      if (!res.ok) throw new Error("Failed to delete logo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/company-info`] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      toast({ title: "Logo Removed", description: "Company logo has been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // =========================================================================
  // TAB 5: INVOICE TEMPLATES (DOC/PDF)
  // =========================================================================
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [showUploadTemplateModal, setShowUploadTemplateModal] = useState(false);
  const [activeTemplateForAction, setActiveTemplateForAction] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplBank, setTplBank] = useState("N/A");
  const [tplIsDefault, setTplIsDefault] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const tplFileInputRef = useRef<HTMLInputElement>(null);

  const { data: templateData, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId],
    queryFn: async () => {
      const url = effectiveClientId
        ? `/api/bookkeeping/invoice-templates?clientId=${effectiveClientId}`
        : `/api/bookkeeping/invoice-templates`;
      const res = await apiRequest("GET", url);
      if (!res.ok) return { templates: [], banks: ["N/A"] };
      return res.json();
    },
  });

  const templates: any[] = templateData?.templates || [];
  const banks: string[] = templateData?.banks || ["N/A"];

  const saveTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/bookkeeping/invoice-templates", payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Success", description: data.message });
      setShowAddTemplateModal(false);
      setEditingTemplateId(null);
      setTplName("");
      setTplBank("N/A");
      setTplIsDefault(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bookkeeping/invoice-templates/${id}/reset`, {});
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reset template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Reset Complete", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/invoice-templates/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete template");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Deleted", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    },
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const token = useAuth.getState().token;
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/bookkeeping/invoice-templates/${id}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/invoice-templates`, effectiveClientId] });
      toast({ title: "Upload Success", description: data.message });
      setShowUploadTemplateModal(false);
      setActiveTemplateForAction(null);
      setUploadFile(null);
    },
    onError: (err: any) => {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDownloadZip = async (tpl: any) => {
    try {
      const token = useAuth.getState().token;
      const queryParams = new URLSearchParams();
      if (effectiveClientId) queryParams.set("clientId", effectiveClientId);
      if (token) queryParams.set("token", token);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const url = `/api/bookkeeping/invoice-templates/${tpl.id}/download-zip${queryString}`;

      toast({
        title: "Downloading Template ZIP",
        description: "Preparing Word documents ZIP (Invoice, Credit Note, Dividend, Quotation)...",
      });

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeCompanyName = (activeClient?.clientName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `InvoiceTemplates_${safeCompanyName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download Complete",
        description: `Downloaded InvoiceTemplates_${safeCompanyName}.zip successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Could not download template ZIP",
        variant: "destructive",
      });
    }
  };

  // =========================================================================
  // TAB 6: OPENING BALANCE
  // =========================================================================
  const [obDate, setObDate] = useState("");
  const [obRows, setObRows] = useState<
    { id?: number; accountName: string; nominalCode: string; debit: number; credit: number }[]
  >([]);

  const { data: obData } = useQuery({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/opening-balances`],
    queryFn: async () => {
      if (!effectiveClientId) return null;
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/opening-balances`);
      return res.ok ? res.json() : null;
    },
    enabled: !!effectiveClientId,
  });

  useEffect(() => {
    if (obData) {
      setObDate(obData.balanceDate || new Date().toISOString().split("T")[0]);
      if (obData.balances && obData.balances.length > 0) {
        setObRows(obData.balances);
      } else {
        setObRows([
          { accountName: "Current Bank Account", nominalCode: "1200", debit: 0, credit: 0 },
          { accountName: "Accounts Receivable (Debtors)", nominalCode: "1100", debit: 0, credit: 0 },
          { accountName: "Opening Retained Earnings", nominalCode: "3200", debit: 0, credit: 0 },
        ]);
      }
    }
  }, [obData]);

  const addObRow = () => {
    setObRows([...obRows, { accountName: "", nominalCode: "", debit: 0, credit: 0 }]);
  };

  const removeObRow = (index: number) => {
    setObRows(obRows.filter((_, i) => i !== index));
  };

  const updateObRow = (index: number, field: string, value: any) => {
    const updated = [...obRows];
    (updated[index] as any)[field] = value;
    setObRows(updated);
  };

  const totalDebit = useMemo(() => {
    return obRows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  }, [obRows]);

  const totalCredit = useMemo(() => {
    return obRows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  }, [obRows]);

  const balanceDifference = useMemo(() => {
    return Math.abs(totalDebit - totalCredit);
  }, [totalDebit, totalCredit]);

  const isBalanced = useMemo(() => {
    return balanceDifference < 0.009;
  }, [balanceDifference]);

  const saveOpeningBalancesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/opening-balances`, {
        balanceDate: obDate,
        balances: obRows,
      });
      if (!res.ok) throw new Error("Failed to save opening balances");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/opening-balances`] });
      toast({ title: "Opening Balances Saved", description: "Opening balance journal recorded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // =========================================================================
  // TAB 7: MULTI-CURRENCY
  // =========================================================================
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [currencyForm, setCurrencyForm] = useState<any>({
    id: null,
    currencyName: "",
    code: "",
    symbol: "",
    rate: 1.0,
    isDefault: false,
  });

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/currencies`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  const saveCurrencyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/currencies`, payload);
      if (!res.ok) throw new Error("Failed to save currency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Currency Saved", description: "Currency rate details saved." });
      setIsAddCurrencyModalOpen(false);
      setCurrencyForm({ id: null, currencyName: "", code: "", symbol: "", rate: 1.0, isDefault: false });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (currencyId: number) => {
      const res = await apiRequest("DELETE", `/api/bookkeeping/settings/${effectiveClientId}/currencies/${currencyId}`);
      if (!res.ok) throw new Error("Failed to delete currency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Currency Deleted", description: "Currency rate removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const syncRatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/currencies/sync-rates`);
      if (!res.ok) throw new Error("Failed to sync rates");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/currencies`] });
      toast({ title: "Rates Synchronised", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // =========================================================================
  // TAB 8: CUSTOMISE SEQUENCE
  // =========================================================================
  const [sequencesState, setSequencesState] = useState<any[]>([]);

  const { data: sequencesData = [] } = useQuery<any[]>({
    queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/sequences`],
    queryFn: async () => {
      if (!effectiveClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/settings/${effectiveClientId}/sequences`);
      return res.ok ? res.json() : [];
    },
    enabled: !!effectiveClientId,
  });

  useEffect(() => {
    if (sequencesData.length > 0) {
      setSequencesState(sequencesData);
    }
  }, [sequencesData]);

  const updateSequenceRow = (index: number, field: string, value: any) => {
    const updated = [...sequencesState];
    updated[index] = { ...updated[index], [field]: value };
    setSequencesState(updated);
  };

  const saveSequencesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookkeeping/settings/${effectiveClientId}/sequences`, {
        sequences: sequencesState,
      });
      if (!res.ok) throw new Error("Failed to save sequence configuration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/settings/${effectiveClientId}/sequences`] });
      toast({ title: "Sequences Saved", description: "Transaction sequence formats updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout
      sidebar={effectiveClientId ? getClientSidebar(effectiveClientId) : bookkeepingSidebar}
      module="Bookkeeping"
    >
      <div className="bg-slate-50 min-h-screen pb-16">
        {/* Navigation Breadcrumb & Client Switcher */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center text-xs text-slate-500 gap-2">
            <button
              type="button"
              onClick={() => navigate("/bookkeeping")}
              className="hover:text-purple-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Building2 size={13} />
              <span>Bookkeeping</span>
            </button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-700 font-medium">Settings</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-bold text-purple-700 capitalize">
              {activeTab === "templates" ? "Invoice Templates (Doc/Pdf)" : activeTab.replace("_", " ")}
            </span>
          </div>

          {/* Client Switcher Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              <span>Client:</span>
            </label>
            <select
              value={effectiveClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.clientName || c.companyName || `Client #${c.id}`} ({c.companyType || c.clientType || "Business"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Hub Container */}
        <div className="p-6 w-full mx-auto space-y-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Bookkeeping Settings
                </h1>
                {activeClient && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {activeClient.clientName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure corporate identity, accounting periods, nominal chart of accounts, branding logo, invoice templates, opening balances, multi-currency conversion, and document serial sequences.
              </p>
            </div>
          </div>

          {/* Settings Navigation Tabs with Direct Callback */}
          <SettingsTabs
            activeTab={activeTab}
            clientId={effectiveClientId}
            onTabChange={handleTabChange}
          />

          {/* ================================================================= */}
          {/* TAB 1: COMPANY INFO & SETTINGS */}
          {/* ================================================================= */}
          {activeTab === "company_info" && (
            <div className="space-y-6">
              {/* Sub-tabs header */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setCompanySubTab("info")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${companySubTab === "info"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <Building2 size={14} />
                  <span>Company Information</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanySubTab("preferences")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${companySubTab === "preferences"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <Sliders size={14} />
                  <span>General Preferences</span>
                </button>
              </div>

              {companySubTab === "info" ? (
                <div className="space-y-6">
                  {/* Top Action Bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Company Profile & Statutory Identifiers</h3>
                      <p className="text-xs text-slate-500">Official business profile, registration identifiers, and statutory taxation setup.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditCompanyModalOpen(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Edit Company Info</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Core Corporate Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-purple-700 font-bold text-xs uppercase tracking-wider">
                        <Building2 size={16} />
                        <span>Corporate Identity</span>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Company Legal Name</span>
                          <span className="font-bold text-slate-800 text-sm">{companyInfo.name || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Entity Type</span>
                          <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded-md font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                            {companyInfo.type || "Limited Company"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Companies House Reg No.</span>
                          <span className="font-mono font-bold text-slate-800">{companyInfo.registrationNumber || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Unique Taxpayer Ref (UTR)</span>
                          <span className="font-mono font-bold text-slate-800">{companyInfo.utrNumber || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Functional Currency</span>
                          <span className="font-bold text-slate-800">{companyInfo.currency || "Pound Sterling (GBP £)"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Accounting & VAT */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                        <Calendar size={16} />
                        <span>Accounting & VAT</span>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Financial Year End</span>
                          <span className="font-bold text-slate-800">{companyInfo.yearEnd || "31/12"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Bookkeeping Start Date</span>
                          <span className="font-bold text-slate-800">{companyInfo.bookStartDate || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Business Incorporation Date</span>
                          <span className="font-bold text-slate-800">{companyInfo.businessStartDate || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">VAT Accounting Scheme</span>
                          <span className="font-bold text-slate-800">{companyInfo.vatScheme || "Standard VAT Accrual Based"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">VAT Registration No.</span>
                          <span className="font-mono font-bold text-slate-800">{companyInfo.vatNumber || "Not Registered"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">VAT Filing Frequency</span>
                          <span className="font-bold text-slate-800">{companyInfo.vatSubmitType || "Quarterly"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Contact & Address */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                        <Building size={16} />
                        <span>Contact & Address</span>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-slate-400 block font-medium">Registered Address</span>
                          <span className="font-medium text-slate-800 block">{companyInfo.address || "-"}</span>
                          {companyInfo.city && <span className="font-medium text-slate-700">{companyInfo.city}, </span>}
                          {companyInfo.county && <span className="font-medium text-slate-700">{companyInfo.county}, </span>}
                          <span className="font-bold text-slate-800 block">{companyInfo.postcode || ""}</span>
                          <span className="text-slate-500 block">{companyInfo.country || "United Kingdom"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Telephone</span>
                          <span className="font-bold text-slate-800">{companyInfo.phone || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Primary Email</span>
                          <span className="font-bold text-purple-700">{companyInfo.email || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-medium">Website</span>
                          <span className="font-medium text-slate-800">{companyInfo.website || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Sub-tab 2: General Preferences */
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">General Bookkeeping Preferences</h3>
                    <p className="text-xs text-slate-500">Configure bank statement reconciliation behavior and template selection.</p>
                  </div>

                  <div className="divide-y divide-slate-100 space-y-4">
                    {/* Manual Bank Reconciliation */}
                    <div className="pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-800">Manual Bank Reconciliation</label>
                        <p className="text-xs text-slate-500">
                          Allow manual matching and ledger ticking of bank transactions without automated bank feed rules.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPrefForm((prev) => ({ ...prev, manualBankReconciliation: !prev.manualBankReconciliation }))
                        }
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${prefForm.manualBankReconciliation ? "bg-purple-600" : "bg-slate-300"
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${prefForm.manualBankReconciliation ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Use Document Template */}
                    <div className="pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-800">Use Document Template</label>
                        <p className="text-xs text-slate-500">
                          Automatically apply customized branded PDF templates to invoices, credit notes, and quotations.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrefForm((prev) => ({ ...prev, useDocTemplate: !prev.useDocTemplate }))}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${prefForm.useDocTemplate ? "bg-purple-600" : "bg-slate-300"
                          }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${prefForm.useDocTemplate ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>

                    {/* Default Page Period */}
                    <div className="pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-800">Default Page Period View</label>
                        <p className="text-xs text-slate-500">
                          Select the initial date filter applied when opening Sales, Purchases, and Bank lists.
                        </p>
                      </div>
                      <select
                        value={prefForm.defaultPagePeriod}
                        onChange={(e) => setPrefForm((prev) => ({ ...prev, defaultPagePeriod: e.target.value }))}
                        className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="All">All Transactions</option>
                        <option value="Current Month">Current Month</option>
                        <option value="Current Quarter">Current Quarter</option>
                        <option value="Current Year">Current Accounting Year</option>
                        <option value="Last 30 Days">Last 30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      disabled={savePreferencesMutation.isPending}
                      onClick={() => savePreferencesMutation.mutate(prefForm)}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ACCOUNTING PERIODS */}
          {/* ================================================================= */}
          {activeTab === "accounting_periods" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Accounting Periods Management</h3>
                  <p className="text-xs text-slate-500">
                    Define financial years and control transaction posting lock status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Accounting Period</span>
                </button>
              </div>

              {/* Periods Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                {periods.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-800">No Accounting Periods Recorded</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Add financial years to ensure accurate period ledger postings, journal lockouts, and year-end reporting.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddPeriodModalOpen(true)}
                      className="mt-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} /> Add First Accounting Period
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-3 px-4">Period Type</th>
                          <th className="py-3 px-4">Start Date (From)</th>
                          <th className="py-3 px-4">End Date (To)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Lock Control</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {periods.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.periodType === "Current"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                              >
                                {p.periodType} Period
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">{p.from}</td>
                            <td className="py-3 px-4 font-medium text-slate-700">{p.to}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === "Open"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : p.status === "Locked"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                              >
                                {p.status === "Locked" ? <Lock size={11} /> : <CheckCircle2 size={11} />}
                                <span>{p.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => togglePeriodLockMutation.mutate(p.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${p.isLocked
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                              >
                                {p.isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                <span>{p.isLocked ? "Unlock Period" : "Lock Period"}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this accounting period?")) {
                                    deletePeriodMutation.mutate(p.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Period"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: CHART OF ACCOUNTS */}
          {/* ================================================================= */}
          {activeTab === "chart_of_accounts" && (
            <div className="space-y-6">
              {/* Filter Toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search accounts or code..."
                      value={coaSearch}
                      onChange={(e) => setCoaSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={coaCategoryFilter}
                    onChange={(e) => setCoaCategoryFilter(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Turnover">Turnover / Income</option>
                    <option value="Cost of Sales">Cost of Sales</option>
                    <option value="Administrative Expenses">Administrative Expenses</option>
                    <option value="Current Assets">Current Assets</option>
                    <option value="Fixed Assets">Fixed Assets</option>
                    <option value="Current Liabilities">Current Liabilities</option>
                    <option value="Long Term Liabilities">Long Term Liabilities</option>
                    <option value="Equity">Equity</option>
                    <option value="Bank">Bank & Cash</option>
                  </select>

                  <select
                    value={coaStatusFilter}
                    onChange={(e) => setCoaStatusFilter(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Normal">Normal</option>
                    <option value="Archive">Archive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCoaCsv}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountForm({ id: null, code: "", name: "", category: "Turnover", group: "Turnover", status: "Normal" });
                      setIsAddAccountModalOpen(true);
                    }}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Nominal Account</span>
                  </button>
                </div>
              </div>

              {/* COA Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Nominal Accounts ({filteredCoa.length})</span>
                </div>
                {filteredCoa.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                      <ListTree size={24} />
                    </div>
                    <div className="text-sm font-bold text-slate-800">No Nominal Accounts Found</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Adjust your search or filter, or add a custom nominal account to your Chart of Accounts.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50/40">
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Account Name</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Group Name</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCoa.map((acc: any) => (
                          <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-purple-700">{acc.code}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span>{acc.name}</span>
                                {acc.isSystem && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                    System
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-md font-semibold text-slate-700 bg-slate-100">
                                {acc.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{acc.group}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-xs ${acc.status === "Normal"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600"
                                  }`}
                              >
                                {acc.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAccountForm({
                                    id: acc.id,
                                    code: acc.code,
                                    name: acc.name,
                                    category: acc.category,
                                    group: acc.group,
                                    status: acc.status,
                                  });
                                  setIsAddAccountModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                                title="Edit Account"
                              >
                                <Edit2 size={13} />
                              </button>
                              {!acc.isSystem && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete account "${acc.name}" (${acc.code})?`)) {
                                      deleteAccountMutation.mutate(acc.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Account"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: COMPANY LOGO */}
          {/* ================================================================= */}
          {activeTab === "company_logo" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Company Logo & Branding</h3>
                <p className="text-xs text-slate-500">
                  Upload your corporate logo for automatic branding on Invoices, Quotations, Statements, and Reports.
                </p>
              </div>

              {/* Guidelines Info Alert */}
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-xl mt-0.5">
                  <ImageIcon size={18} />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-purple-900">Logo Presentation Guidelines</div>
                  <p className="text-purple-700">
                    For optimal high-definition rendering on PDF documents, we recommend an image of approximately{" "}
                    <strong>120 x 600 pixels</strong> (or rectangular landscape format).
                  </p>
                  <p className="text-purple-600 font-medium">Supported formats: PNG, JPG, JPEG, SVG, WEBP (Max 5MB).</p>
                </div>
              </div>

              {/* Logo Card & Upload Zone */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                {companyInfo.logoUrl ? (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-700">Active Company Logo</div>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center max-w-md">
                      <img
                        src={companyInfo.logoUrl}
                        alt="Company Logo"
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw size={13} className={logoUploading ? "animate-spin" : ""} />
                        <span>{logoUploading ? "Uploading..." : "Replace Logo"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Are you sure you want to remove the company logo?")) {
                            deleteLogoMutation.mutate();
                          }
                        }}
                        disabled={deleteLogoMutation.isPending}
                        className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Remove Logo</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/40 rounded-2xl p-12 text-center transition-colors cursor-pointer space-y-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 text-purple-600 mx-auto flex items-center justify-center">
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">Click to upload company logo</span>
                      <span className="text-xs text-slate-500">or drag and drop your file here</span>
                    </div>
                    <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                      Browse File
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: INVOICE TEMPLATES (DOC/PDF) */}
          {/* ================================================================= */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Invoice Templates (Doc/Pdf)</h3>
                  <p className="text-xs text-slate-500">
                    Customise corporate invoices, credit notes, dividend vouchers, and quotations using Word (.docx) templates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refetchTemplates()}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Refresh templates"
                  >
                    <RefreshCw size={14} className={templatesLoading ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setTplName("");
                      setTplBank("N/A");
                      setTplIsDefault(templates.length === 0);
                      setShowAddTemplateModal(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Template</span>
                  </button>
                </div>
              </div>

              {/* Templates Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold select-none">
                        <th className="py-3 px-4">Template Name</th>
                        <th className="py-3 px-4 text-center">Default</th>
                        <th className="py-3 px-4">Invoice File</th>
                        <th className="py-3 px-4">Credit Note File</th>
                        <th className="py-3 px-4">Dividend File</th>
                        <th className="py-3 px-4">Quotation File</th>
                        <th className="py-3 px-4">Updated On</th>
                        <th className="py-3 px-4">Bank</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {templatesLoading ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-purple-600" />
                              <span>Loading invoice templates...</span>
                            </div>
                          </td>
                        </tr>
                      ) : templates.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            No templates found. Click &quot;+ Add Template&quot; to configure your first document style.
                          </td>
                        </tr>
                      ) : (
                        templates.map((tpl: any) => (
                          <tr key={tpl.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-800">
                              {tpl.templateName}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {tpl.isDefault ? (
                                <span className="inline-flex items-center justify-center text-emerald-600 font-bold" title="Default Template">
                                  <CheckCircle2 size={16} />
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.invoiceFile || "Invoice.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.creditNoteFile || "CreditNote.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.dividendFile || "Dividend.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.quotationFile || "Quotation.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-600">{tpl.updatedOn || "-"}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">{tpl.bank || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="relative inline-block text-left">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    const action = e.target.value;
                                    e.target.value = "";
                                    if (action === "download") {
                                      handleDownloadZip(tpl);
                                    } else if (action === "upload") {
                                      setActiveTemplateForAction(tpl);
                                      setUploadFile(null);
                                      setShowUploadTemplateModal(true);
                                    } else if (action === "edit") {
                                      setEditingTemplateId(tpl.id);
                                      setTplName(tpl.templateName);
                                      setTplBank(tpl.bank || "N/A");
                                      setTplIsDefault(Boolean(tpl.isDefault));
                                      setShowAddTemplateModal(true);
                                    } else if (action === "reset") {
                                      if (confirm(`Reset template "${tpl.templateName}" back to standard system files?`)) {
                                        resetTemplateMutation.mutate(tpl.id);
                                      }
                                    } else if (action === "delete") {
                                      if (confirm(`Delete template "${tpl.templateName}"?`)) {
                                        deleteTemplateMutation.mutate(tpl.id);
                                      }
                                    }
                                  }}
                                  className="text-xs border border-slate-300 bg-white hover:border-slate-400 text-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer shadow-2xs font-bold"
                                >
                                  <option value="" disabled>Select Action</option>
                                  <option value="download">Download (.zip)</option>
                                  <option value="upload">Upload Custom</option>
                                  <option value="edit">Edit Details</option>
                                  <option value="reset">Reset to Default</option>
                                  {!tpl.isDefault && <option value="delete">Delete</option>}
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Guidance Callout */}
                <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="border-l-4 border-purple-500 bg-purple-50/60 p-4 rounded-r-2xl text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-900 leading-snug">
                      Customise your company invoice, credit note and dividend templates through Word (.docx) documents with ease.
                    </p>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                      <li>Select <strong>Download (.zip)</strong> under the Action column to download template Word files.</li>
                      <li>Adjust typography, headers, or styles in Microsoft Word.</li>
                      <li>Ensure placeholder merge tags enclosed within <strong>« »</strong> operators (e.g. <code>«InvoiceNo»</code>) remain intact.</li>
                      <li>Select <strong>Upload Custom</strong> to apply your updated documents.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 6: OPENING BALANCE */}
          {/* ================================================================= */}
          {activeTab === "opening_balance" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Opening Balances Journal</h3>
                  <p className="text-xs text-slate-500">
                    Record opening assets, liabilities, and retained earnings as of your bookkeeping conversion date.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">Balance Date:</label>
                    <input
                      type="date"
                      value={obDate}
                      onChange={(e) => setObDate(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addObRow}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Row</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => saveOpeningBalancesMutation.mutate()}
                    disabled={saveOpeningBalancesMutation.isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{saveOpeningBalancesMutation.isPending ? "Saving..." : "Save Balances"}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Balance Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Total Debits</span>
                  <span className="text-lg font-black text-slate-900">£{totalDebit.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Total Credits</span>
                  <span className="text-lg font-black text-slate-900">£{totalCredit.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Difference</span>
                  <span className={`text-lg font-black ${isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                    £{balanceDifference.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">Ledger Status</span>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-1 ${isBalanced
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                    >
                      {isBalanced ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      <span>{isBalanced ? "In Balance" : "Out of Balance"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Opening Balances Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 w-1/2">Nominal Account</th>
                        <th className="py-3 px-4 w-28">Code</th>
                        <th className="py-3 px-4 w-40">Debit (£)</th>
                        <th className="py-3 px-4 w-40">Credit (£)</th>
                        <th className="py-3 px-4 text-right w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {obRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              list="coaAccountOptions"
                              value={row.accountName}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateObRow(idx, "accountName", val);
                                const matchCoa = coaAccounts.find((a: any) => a.name === val);
                                if (matchCoa) {
                                  updateObRow(idx, "nominalCode", matchCoa.code);
                                }
                              }}
                              placeholder="Select or enter account name..."
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={row.nominalCode}
                              onChange={(e) => updateObRow(idx, "nominalCode", e.target.value)}
                              placeholder="Code"
                              className="w-full font-mono border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.debit || ""}
                              onChange={(e) => updateObRow(idx, "debit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-right font-mono border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.credit || ""}
                              onChange={(e) => updateObRow(idx, "credit", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full text-right font-mono border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => removeObRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                        <td colSpan={2} className="py-3 px-4 text-right text-slate-700">
                          Grand Totals:
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          £{totalDebit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          £{totalCredit.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Datalist for Account Name Autocomplete */}
              <datalist id="coaAccountOptions">
                {coaAccounts.map((a: any) => (
                  <option key={a.id} value={a.name}>
                    {a.code} - {a.name} ({a.category})
                  </option>
                ))}
              </datalist>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 7: CURRENCY */}
          {/* ================================================================= */}
          {activeTab === "currency" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Multi-Currency & Exchange Rates</h3>
                  <p className="text-xs text-slate-500">
                    Base Currency is <strong>Pound Sterling (GBP £)</strong>. Maintain official exchange conversion rates for international sales and purchases.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => syncRatesMutation.mutate()}
                    disabled={syncRatesMutation.isPending}
                    className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} className={syncRatesMutation.isPending ? "animate-spin" : ""} />
                    <span>{syncRatesMutation.isPending ? "Syncing..." : "Sync Benchmark Rates"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrencyForm({ id: null, currencyName: "", code: "", symbol: "", rate: 1.0, isDefault: false });
                      setIsAddCurrencyModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Currency</span>
                  </button>
                </div>
              </div>

              {/* Currency Rates Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">Currency Name</th>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Symbol</th>
                        <th className="py-3 px-4">Conversion Rate (to 1 GBP)</th>
                        <th className="py-3 px-4">Primary Default</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currencies.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{c.currencyName}</td>
                          <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-700">{c.symbol}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            1 GBP = {c.rate.toFixed(4)} {c.code}
                          </td>
                          <td className="py-3 px-4">
                            {c.isDefault ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Check size={11} /> Default
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrencyForm({
                                  id: c.id,
                                  currencyName: c.currencyName,
                                  code: c.code,
                                  symbol: c.symbol,
                                  rate: c.rate,
                                  isDefault: c.isDefault,
                                });
                                setIsAddCurrencyModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                              title="Edit Currency Rate"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove currency "${c.currencyName}" (${c.code})?`)) {
                                  deleteCurrencyMutation.mutate(c.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Currency"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 8: CUSTOMISE SEQUENCE */}
          {/* ================================================================= */}
          {activeTab === "sequence" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Transaction Number Sequences</h3>
                  <p className="text-xs text-slate-500">
                    Define custom prefix, sequential starting index number, and postfix for all financial document types.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSequencesMutation.mutate()}
                  disabled={saveSequencesMutation.isPending}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{saveSequencesMutation.isPending ? "Saving..." : "Save Sequences"}</span>
                </button>
              </div>

              {/* Sequences Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4 w-1/3">Transaction Type</th>
                        <th className="py-3 px-4 w-40">Prefix</th>
                        <th className="py-3 px-4 w-40">Starting Serial Number</th>
                        <th className="py-3 px-4 w-40">Postfix</th>
                        <th className="py-3 px-4 text-right">Generated Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sequencesState.map((seq, idx) => {
                        const preview = `${seq.prefix || ""}${seq.startNumber || 1}${seq.postfix || ""}`;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                              <Hash size={14} className="text-purple-600" />
                              <span>{seq.transactionType}</span>
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={seq.prefix || ""}
                                onChange={(e) => updateSequenceRow(idx, "prefix", e.target.value)}
                                placeholder="e.g. INV-"
                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="number"
                                min="1"
                                value={seq.startNumber || 1}
                                onChange={(e) => updateSequenceRow(idx, "startNumber", parseInt(e.target.value) || 1)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={seq.postfix || ""}
                                onChange={(e) => updateSequenceRow(idx, "postfix", e.target.value)}
                                placeholder="e.g. /26"
                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono font-bold px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs">
                                {preview}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODALS */}
      {/* ================================================================= */}

      {/* 1. Edit Company Info Modal */}
      {isEditCompanyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Edit Company Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCompanyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCompanyMutation.mutate(editForm);
              }}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Type</label>
                  <select
                    value={editForm.type || "Limited"}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Limited">Limited Company</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Sole Trader">Sole Trader / Individual</option>
                    <option value="Partnership">General Partnership</option>
                    <option value="Charity">Charity / Non-Profit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Functional Currency</label>
                  <select
                    value={editForm.currency || "Pound Sterling"}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Pound Sterling">Pound Sterling (GBP £)</option>
                    <option value="Euro">Euro (EUR €)</option>
                    <option value="US Dollar">US Dollar (USD $)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Companies House Reg No.</label>
                  <input
                    type="text"
                    value={editForm.registrationNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                    placeholder="e.g. 12345678"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unique Taxpayer Ref (UTR)</label>
                  <input
                    type="text"
                    value={editForm.utrNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, utrNumber: e.target.value })}
                    placeholder="10 digits"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Financial Year End</label>
                  <input
                    type="text"
                    value={editForm.yearEnd || "31/12"}
                    onChange={(e) => setEditForm({ ...editForm, yearEnd: e.target.value })}
                    placeholder="DD/MM (e.g. 31/12)"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bookkeeping Start Date</label>
                  <input
                    type="date"
                    value={editForm.bookStartDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, bookStartDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Accounting Scheme</label>
                  <select
                    value={editForm.vatScheme || "Standard VAT Accrual Based"}
                    onChange={(e) => setEditForm({ ...editForm, vatScheme: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Standard VAT Accrual Based">Standard VAT (Invoice Basis)</option>
                    <option value="Cash Accounting Scheme">Cash Accounting Scheme</option>
                    <option value="Flat Rate Scheme">Flat Rate Scheme (FRS)</option>
                    <option value="Not Registered">Not Registered</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Registration Number</label>
                  <input
                    type="text"
                    value={editForm.vatNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, vatNumber: e.target.value })}
                    placeholder="e.g. GB 123 4567 89"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">VAT Return Frequency</label>
                  <select
                    value={editForm.vatSubmitType || "Quarterly"}
                    onChange={(e) => setEditForm({ ...editForm, vatSubmitType: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Quarterly">Quarterly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual Accounting</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telephone</label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Registered Street Address</label>
                  <input
                    type="text"
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={editForm.postcode || ""}
                    onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={editForm.website || ""}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCompanyMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveCompanyMutation.isPending ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Accounting Period Modal */}
      {isAddPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Add Accounting Period</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPeriodModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPeriodMutation.mutate(newPeriodForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPeriodForm({ ...newPeriodForm, periodType: "Current" })}
                    className={`py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${newPeriodForm.periodType === "Current"
                        ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Current Period
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPeriodForm({ ...newPeriodForm, periodType: "Prior" })}
                    className={`py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${newPeriodForm.periodType === "Prior"
                        ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Prior Period
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Period Start Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodForm.startDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Period End Date *</label>
                <input
                  type="date"
                  required
                  value={newPeriodForm.endDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={newPeriodForm.status}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPeriodMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{addPeriodMutation.isPending ? "Creating..." : "Create Period"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add/Edit Nominal Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {accountForm.id ? "Edit Nominal Account" : "Add Nominal Account"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAccountMutation.mutate(accountForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4005"
                  value={accountForm.code}
                  onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                  className="w-full font-mono font-bold text-purple-700 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Subscriptions"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full font-semibold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Accounting Category *</label>
                <select
                  value={accountForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setAccountForm({ ...accountForm, category: cat, group: cat });
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Turnover">Turnover / Income</option>
                  <option value="Cost of Sales">Cost of Sales</option>
                  <option value="Administrative Expenses">Administrative Expenses</option>
                  <option value="Current Assets">Current Assets</option>
                  <option value="Fixed Assets">Fixed Assets</option>
                  <option value="Current Liabilities">Current Liabilities</option>
                  <option value="Long Term Liabilities">Long Term Liabilities</option>
                  <option value="Equity">Equity</option>
                  <option value="Bank">Bank & Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sub-Group</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Expenses"
                  value={accountForm.group}
                  onChange={(e) => setAccountForm({ ...accountForm, group: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={accountForm.status}
                  onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Normal">Normal (Active)</option>
                  <option value="Archive">Archive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveAccountMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveAccountMutation.isPending ? "Saving..." : "Save Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add/Edit Template Modal */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTemplateId ? "Edit Invoice Template" : "Add Invoice Template"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTemplateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTemplateMutation.mutate({
                  id: editingTemplateId,
                  templateName: tplName,
                  bank: tplBank,
                  isDefault: tplIsDefault,
                  clientId: effectiveClientId || null,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. Standard Corporate Template"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Associated Bank Account
                </label>
                <select
                  value={tplBank}
                  onChange={(e) => setTplBank(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="N/A">N/A (No specific bank)</option>
                  {banks.filter((b) => b !== "N/A").map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tplDef"
                  checked={tplIsDefault}
                  onChange={(e) => setTplIsDefault(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="tplDef" className="text-slate-700 font-semibold cursor-pointer">
                  Set as Default Template for this Client
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTemplateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTemplateMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveTemplateMutation.isPending ? "Saving..." : "Save Template"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Upload Customized Template Modal */}
      {showUploadTemplateModal && activeTemplateForAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Upload Custom Template ({activeTemplateForAction.templateName})
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadTemplateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div
                onClick={() => tplFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/30 rounded-2xl p-8 text-center cursor-pointer space-y-2 transition"
              >
                <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-slate-200 text-purple-600 mx-auto flex items-center justify-center">
                  <Upload size={18} />
                </div>
                {uploadFile ? (
                  <div className="font-bold text-purple-700">{uploadFile.name}</div>
                ) : (
                  <div>
                    <span className="font-bold text-slate-800 block">Click to select file</span>
                    <span className="text-slate-500 text-[11px]">.docx, .doc, or .zip archive (Max 10MB)</span>
                  </div>
                )}
              </div>

              <input
                ref={tplFileInputRef}
                type="file"
                accept=".docx,.doc,.zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadTemplateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!uploadFile || uploadTemplateMutation.isPending}
                  onClick={() => {
                    if (uploadFile) {
                      uploadTemplateMutation.mutate({ id: activeTemplateForAction.id, file: uploadFile });
                    }
                  }}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud size={13} />
                  <span>{uploadTemplateMutation.isPending ? "Uploading..." : "Upload & Apply"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add/Edit Currency Modal */}
      {isAddCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {currencyForm.id ? "Edit Currency Rate" : "Add New Currency"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCurrencyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCurrencyMutation.mutate(currencyForm);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Currency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. United States Dollar"
                  value={currencyForm.currencyName}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, currencyName: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISO Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    placeholder="USD"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Currency Symbol *</label>
                  <input
                    type="text"
                    required
                    placeholder="$"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    className="w-full font-bold border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Exchange Rate to 1 GBP *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  placeholder="1.2694"
                  value={currencyForm.rate}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, rate: parseFloat(e.target.value) || 1.0 })}
                  className="w-full font-mono font-bold text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Example: If 1 GBP = 1.25 USD, enter 1.2500
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="currDefault"
                  checked={currencyForm.isDefault}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, isDefault: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="currDefault" className="font-semibold text-slate-700 cursor-pointer">
                  Set as primary default foreign currency
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCurrencyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCurrencyMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{saveCurrencyMutation.isPending ? "Saving..." : "Save Currency"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
