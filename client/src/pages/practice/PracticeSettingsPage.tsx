import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import {
  Building2, Mail, Phone, Globe, Upload, Plus, UserCheck, UserX,
  Edit, Save, ShieldCheck, X, CheckCircle2, Palette, Image as ImageIcon,
  Check, FolderOpen, SlidersHorizontal, FileText, CheckSquare,
  AlertCircle, Shield, Briefcase, Calendar, Clock, DollarSign,
  ChevronRight, Trash2, ArrowLeft, Download, RefreshCw, Sparkles,
  Layers, Tag, ListOrdered, ToggleLeft, ToggleRight, Hash, Send,
  FileSpreadsheet, HelpCircle, Award, Eye, FileSignature, Search,
  ChevronLeft, Info, Receipt, Landmark, CreditCard, Copy, CheckCheck
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { useSearch } from "wouter";
import GlobalMediaLibraryModal from "../../components/common/GlobalMediaLibraryModal";
import { CKEditor3InvoiceEditor } from "../../components/practice/CKEditor3InvoiceEditor";

// Top Settings Navigation Tabs matching sansuite info & Capium
const SETTINGS_TABS = [
  { id: "services", label: "Services", icon: <Briefcase size={15} /> },
  { id: "custom_fields", label: "Custom Fields", icon: <SlidersHorizontal size={15} /> },
  { id: "email_templates", label: "Email Templates", icon: <Mail size={15} /> },
  { id: "document_templates", label: "Document Templates", icon: <FileText size={15} /> },
  { id: "invoice_templates", label: "Invoice Templates", icon: <Receipt size={15} /> },
  { id: "onboarding", label: "Onboarding and KYC", icon: <CheckSquare size={15} /> },
  { id: "risk_assessment", label: "Risk Assessment", icon: <Shield size={15} /> },
  { id: "firm_profile", label: "Firm Details & Branding", icon: <Building2 size={15} /> },
];

export default function PracticeSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchString = useSearch();

  // Read initial tab from URL query if present (e.g. /practice/settings?tab=invoice_templates)
  const getInitialTab = () => {
    const params = new URLSearchParams(searchString || window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["services", "custom_fields", "email_templates", "document_templates", "invoice_templates", "onboarding", "risk_assessment", "firm_profile"].includes(tabParam)) {
      return tabParam;
    }
    return "services";
  };

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  // Keep synced when URL query changes
  useEffect(() => {
    const params = new URLSearchParams(searchString || window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && tabParam !== activeTab && ["services", "custom_fields", "email_templates", "document_templates", "invoice_templates", "onboarding", "risk_assessment", "firm_profile"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchString]);

  // ==========================================
  // TAB 1: SERVICES STATE (Capium Exact Alignment)
  // ==========================================
  const [serviceSubTab, setServiceSubTab] = useState<"services" | "assign">("services");
  const [servicesSearch, setServicesSearch] = useState("");
  const [servicesFilter, setServicesFilter] = useState("all"); // all, active, inactive, default, custom
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesPerPage, setServicesPerPage] = useState(50);

  // Dynamic Real Team Members from users table
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/team"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/team");
      return res.ok ? await res.json() : [];
    },
  });

  // Customise Service Modal State (Screenshots 2, 3, 4)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceModalTab, setServiceModalTab] = useState<"details" | "steps" | "reminders">("details");
  const [serviceForm, setServiceForm] = useState<any>({
    id: null,
    title: "",
    category: "Accounting",
    frequency: "Yearly",
    billable: true,
    fee: "35.00",
    estimatedHours: 4,
    serviceManager: "",
    serviceType: "Default",
    isActive: true,
    addToCalendar: true,
    clientTypes: ["Limited"],
    steps: [
      { id: "s1", title: "Obtain Final Accounts", isMandatory: true },
      { id: "s2", title: "Client Approval", isMandatory: true },
      { id: "s3", title: "Prepare Tax Return", isMandatory: true },
      { id: "s4", title: "File Tax Return", isMandatory: true },
      { id: "s5", title: "Completion", isMandatory: true },
    ],
    remindTeam: true,
    assignAll: true,
    customWorkflow: false,
    reminders: [
      { id: "r1", timing: "1 Month prior to deadlines", staffUser: "", clientUser: "All Client Contacts", cc: "" },
      { id: "r2", timing: "2 Weeks prior to deadlines", staffUser: "", clientUser: "All Client Contacts", cc: "" },
      { id: "r3", timing: "5 Days prior to deadlines", staffUser: "", clientUser: "All Client Contacts", cc: "" },
    ],
  });

  // ==========================================
  // TAB 2: CUSTOM FIELDS STATE
  // ==========================================
  const [customFieldCategory, setCustomFieldCategory] = useState("Client Information");
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [customFieldForm, setCustomFieldForm] = useState<any>({
    id: null,
    label: "",
    category: "Client Information",
    type: "Text",
    options: "",
    required: false,
  });

  // ==========================================
  // TAB 3: EMAIL TEMPLATES STATE (Capium Article 9000165784)
  // ==========================================
  const [emailSubTab, setEmailSubTab] = useState<"standard" | "custom">("standard");
  const [emailSearch, setEmailSearch] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState<any>({
    id: null,
    name: "",
    templateType: "Deadline Reminder Template",
    isCustom: false,
    subject: "",
    triggerDays: 14,
    body: "",
  });

  // ==========================================
  // TAB 4: DOCUMENT TEMPLATES STATE (Capium Articles 9000238645 & 9000172255)
  // ==========================================
  const [docSearch, setDocSearch] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [showDocStep1Modal, setShowDocStep1Modal] = useState(false);
  const [showDocCategoryModal, setShowDocCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customDocCategories, setCustomDocCategories] = useState<string[]>([
    "Proposal Letter",
    "Letter of Engagement",
    "Disengagement Letter for Limited",
    "Disengagement Letter for Individual",
  ]);
  const [docStep1Form, setDocStep1Form] = useState<any>({
    templateName: "",
    templateType: "Proposal Letter",
  });
  const [showDocEditorModal, setShowDocEditorModal] = useState(false);
  const [docEditorTab, setDocEditorTab] = useState<"letter" | "email">("letter");
  const [activeDocForm, setActiveDocForm] = useState<any>({
    id: null,
    title: "",
    fileName: "",
    templateType: "Proposal Letter",
    docType: "Default",
    version: "2026.1",
    content: "",
    emailSubject: "",
    emailBody: "",
  });
  const [showDocPreviewModal, setShowDocPreviewModal] = useState(false);
  const [previewDocData, setPreviewDocData] = useState<any>(null);

  // ==========================================
  // TAB 5: INVOICE TEMPLATES STATE (Capium Screenshots 1, 2, 3)
  // ==========================================
  const [invoiceMode, setInvoiceMode] = useState<"doc" | "pdf">("doc");
  const [pdfCarouselIndex, setPdfCarouselIndex] = useState<number>(0);
  const [showAddDocTemplateModal, setShowAddDocTemplateModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Active PDF template editing form (Screenshots 2 & 3)
  const [pdfForm, setPdfForm] = useState<any>({
    id: null,
    templateName: "SeaGreen",
    templateType: "PDF",
    primaryColor: "#10b981",
    pageSize: "A4",
    titleInvoice: "Invoice",
    titleDraft: "Draft Invoice",
    titleCreditNote: "Credit Note",
    titlePaid: "Invoice",
    marginTop: 25,
    marginBottom: 25,
    marginLeft: 25,
    marginRight: 25,
    footerHeight: 40,
    vatRegNo: true,
    companyRegNo: true,
    bankName: "Barclays Bank UK PLC",
    headerText: "INVOICE / STATUTORY FEE NOTE",
    footerText: "Thank you for your business. Please settle this fee note within 30 days of invoice date.",
    paymentTerms: "Payment Terms: Net 30 Days. Late payments subject to statutory interest under Late Payment of Commercial Debts Act 1998.",
    isDefault: true,
  });

  // Add Bank Account Form Modal (Screenshot 3)
  const [bankAccountForm, setBankAccountForm] = useState<any>({
    id: null,
    bankName: "",
    accountType: "Current",
    currency: "Pound Sterling",
    accountCode: "5242",
    sortCode: "",
    accountNumber: "",
    iban: "",
    bicSwift: "",
    paymentInstructions: "Please quote Invoice Number as payment reference.",
    isDefault: false,
  });

  // Add Doc Template Form Modal (Screenshot 1)
  const [docTemplateForm, setDocTemplateForm] = useState<any>({
    id: null,
    templateName: "",
    fileName: "Invoice.docx",
    bankName: "N/A",
    isDefault: false,
  });

  // Step Edit/Add Modal State (Custom dialog replacing browser prompt)
  const [stepModal, setStepModal] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    groupIndex: number;
    itemIndex?: number;
    title: string;
    groupTitle?: string;
  }>({
    isOpen: false,
    mode: "add",
    groupIndex: 0,
    itemIndex: 0,
    title: "",
    groupTitle: "",
  });

  const handleSaveStepModal = () => {
    if (!stepModal.title.trim()) {
      toast({
        title: "Step Description Required",
        description: "Please enter a valid description for this task step.",
        variant: "destructive",
      });
      return;
    }

    const updated = [...serviceForm.steps];
    if (stepModal.mode === "add") {
      if (typeof updated[stepModal.groupIndex] === "object" && "items" in updated[stepModal.groupIndex]) {
        updated[stepModal.groupIndex] = {
          ...updated[stepModal.groupIndex],
          items: [...(updated[stepModal.groupIndex].items || []), stepModal.title.trim()],
        };
      } else {
        const newStep = {
          id: `s_${Date.now()}`,
          title: stepModal.title.trim(),
          isMandatory: true,
        };
        updated.push(newStep);
      }
    } else {
      // Edit mode
      if (typeof updated[stepModal.groupIndex] === "object" && "items" in updated[stepModal.groupIndex]) {
        if (stepModal.itemIndex !== undefined) {
          updated[stepModal.groupIndex].items[stepModal.itemIndex] = stepModal.title.trim();
        }
      } else if (stepModal.itemIndex !== undefined) {
        if (typeof updated[stepModal.itemIndex] === "object") {
          updated[stepModal.itemIndex] = {
            ...updated[stepModal.itemIndex],
            title: stepModal.title.trim(),
          };
        } else {
          updated[stepModal.itemIndex] = stepModal.title.trim();
        }
      }
    }

    setServiceForm({ ...serviceForm, steps: updated });
    setStepModal({ ...stepModal, isOpen: false, title: "" });
    toast({
      title: stepModal.mode === "add" ? "Step Added" : "Step Updated",
      description: `Task checklist step has been ${stepModal.mode === "add" ? "added" : "updated"} successfully.`,
    });
  };

  // ==========================================
  // TAB 6: ONBOARDING STATE
  // ==========================================
  const [onboardingEntityType, setOnboardingEntityType] = useState("Limited");
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [newOnboardingCriteriaTitle, setNewOnboardingCriteriaTitle] = useState("");
  const [newOnboardingRequired, setNewOnboardingRequired] = useState(true);

  // ==========================================
  // TAB 7: RISK ASSESSMENT STATE
  // ==========================================
  const [riskEntityType, setRiskEntityType] = useState("Limited");
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState<any>({
    title: "",
    category: "Client Risk",
    riskWeight: "Medium",
    riskLevel: "Normal",
  });

  // ==========================================
  // TAB 8: FIRM DETAILS & BRANDING STATE
  // ==========================================
  const [firmName, setFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vatRegNumber, setVatRegNumber] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [hmrcAgentId, setHmrcAgentId] = useState("");

  // ==========================================
  // QUERIES
  // ==========================================
  const { data: practiceSettings, isLoading: isLoadingSettings } = useQuery<any>({
    queryKey: ["/api/practice/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/settings");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: firm } = useQuery({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/myadmin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Sync firm details
  useEffect(() => {
    if (firm) {
      setFirmName(firm.firmName || "");
      setEmail(firm.email || "");
      setPhone(firm.phone || "");
      setWebsite(firm.website || "");
      setVatRegNumber(firm.vatRegNumber || "");
      setUtrNumber(firm.utrNumber || "");
      if (firm.hmrcGatewayId) setHmrcAgentId(firm.hmrcGatewayId);
      if (firm.logoUrl) setLogoPreview(firm.logoUrl);
    }
  }, [firm]);

  // Sync PDF form when invoice templates load
  useEffect(() => {
    if (practiceSettings?.invoiceTemplates?.length > 0) {
      const defaultTpl = practiceSettings.invoiceTemplates.find((t: any) => t.isDefault) || practiceSettings.invoiceTemplates[0];
      if (defaultTpl) {
        setPdfForm({
          id: defaultTpl.id,
          templateName: defaultTpl.templateName || "SeaGreen",
          templateType: "PDF",
          primaryColor: defaultTpl.primaryColor || "#10b981",
          pageSize: defaultTpl.pageSize || "A4",
          titleInvoice: defaultTpl.titleInvoice || "Invoice",
          titleDraft: defaultTpl.titleDraft || "Draft Invoice",
          titleCreditNote: defaultTpl.titleCreditNote || "Credit Note",
          titlePaid: defaultTpl.titlePaid || "Invoice",
          marginTop: defaultTpl.marginTop ?? 25,
          marginBottom: defaultTpl.marginBottom ?? 25,
          marginLeft: defaultTpl.marginLeft ?? 25,
          marginRight: defaultTpl.marginRight ?? 25,
          footerHeight: defaultTpl.footerHeight ?? 40,
          vatRegNo: defaultTpl.vatRegNo !== false,
          companyRegNo: defaultTpl.companyRegNo !== false,
          bankName: defaultTpl.bankName || "Barclays Bank UK PLC",
          headerText: defaultTpl.headerText || "INVOICE / STATUTORY FEE NOTE",
          footerText: defaultTpl.footerText || "Thank you for your business. Please settle this fee note within 30 days of invoice date.",
          paymentTerms: defaultTpl.paymentTerms || "Payment Terms: Net 30 Days. Late payments subject to statutory interest under Late Payment of Commercial Debts Act 1998.",
          isDefault: !!defaultTpl.isDefault,
        });
      }
    }
  }, [practiceSettings]);

  // ==========================================
  // MUTATIONS (DIRECT DATABASE OPERATIONS)
  // ==========================================
  const saveServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/services", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Service Saved", description: "Service configuration saved to database successfully." });
      setShowServiceModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/services/${id}`);
      if (!res.ok) throw new Error("Failed to delete service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Service Deleted", description: "Service removed from database." });
    },
  });

  const assignServiceMutation = useMutation({
    mutationFn: async (payload: { clientId: number; serviceIds: number[] }) => {
      const res = await apiRequest("POST", "/api/practice/settings/services/assign", payload);
      if (!res.ok) throw new Error("Failed to assign services");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Assignments Updated", description: "Client service matrix saved." });
    },
  });

  const saveCustomFieldMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/custom-fields", payload);
      if (!res.ok) throw new Error("Failed to save custom field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Custom Field Saved", description: "Field successfully created in database." });
      setShowCustomFieldModal(false);
    },
  });

  const deleteCustomFieldMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/custom-fields/${id}`);
      if (!res.ok) throw new Error("Failed to delete field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Field Deleted", description: "Custom field removed." });
    },
  });

  const saveEmailTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/email-templates", payload);
      if (!res.ok) throw new Error("Failed to save email template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Email Template Saved", description: "Email template saved in database successfully." });
      setShowEmailModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Error Saving Template", description: err.message, variant: "destructive" });
    },
  });

  const deleteEmailTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/email-templates/${id}`);
      if (!res.ok) throw new Error("Failed to delete email template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Email Template Removed", description: "Template deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error Deleting Template", description: err.message, variant: "destructive" });
    },
  });

  const saveDocTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/document-templates", payload);
      if (!res.ok) throw new Error("Failed to save document template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Document Template Saved", description: "Document template updated successfully." });
      setShowDocEditorModal(false);
      setShowDocStep1Modal(false);
    },
    onError: (err: any) => {
      toast({ title: "Error Saving Document", description: err.message, variant: "destructive" });
    },
  });

  const deleteDocTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/document-templates/${id}`);
      if (!res.ok) throw new Error("Failed to delete document template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Document Template Removed", description: "Template deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error Deleting Document", description: err.message, variant: "destructive" });
    },
  });

  const duplicateDocTemplateMutation = useMutation({
    mutationFn: async (tpl: any) => {
      const payload = {
        title: `${tpl.title} (Copy)`,
        fileName: `${tpl.fileName || tpl.title} (Copy)`,
        templateType: tpl.templateType,
        docType: "Custom",
        version: tpl.version || "2026.1",
        content: tpl.content,
        emailSubject: tpl.emailSubject,
        emailBody: tpl.emailBody,
      };
      const res = await apiRequest("POST", "/api/practice/settings/document-templates", payload);
      if (!res.ok) throw new Error("Failed to duplicate document template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Template Duplicated", description: "Copy of document template created." });
    },
  });

  // Invoice Template Mutations (Articles 9000222508 & 9000172239)
  const saveInvoiceTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/invoice-templates", payload);
      if (!res.ok) throw new Error("Failed to save invoice template");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Invoice Template Saved", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteInvoiceTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/invoice-templates/${id}`);
      if (!res.ok) throw new Error("Failed to delete invoice template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Template Removed", description: "Invoice template deleted from database." });
    },
  });

  // Bank Account Mutations (Screenshot 3)
  const saveBankMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/banks", payload);
      if (!res.ok) throw new Error("Failed to save bank account");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Bank Account Saved", description: data.message });
      setShowAddBankModal(false);
      setPdfForm((prev: any) => ({ ...prev, bankName: bankAccountForm.bankName }));
      setBankAccountForm({
        id: null,
        bankName: "",
        accountType: "Current",
        currency: "Pound Sterling",
        accountCode: "5242",
        sortCode: "",
        accountNumber: "",
        iban: "",
        bicSwift: "",
        paymentInstructions: "Please quote Invoice Number as payment reference.",
        isDefault: false,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/banks/${id}`);
      if (!res.ok) throw new Error("Failed to delete bank");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Bank Removed", description: "Bank account deleted." });
    },
  });

  // Doc Invoice Template Mutations (Screenshot 1)
  const saveDocInvoiceTemplateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/practice/settings/invoice-doc-templates", payload);
      if (!res.ok) throw new Error("Failed to save doc template");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Template Saved", description: data.message });
      setShowAddDocTemplateModal(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetDocTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/practice/settings/invoice-doc-templates/reset", {});
      if (!res.ok) throw new Error("Failed to reset templates");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Templates Reset", description: data.message });
    },
  });

  const deleteDocInvoiceTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/practice/settings/invoice-doc-templates/${id}`);
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Template Removed", description: "Template deleted." });
    },
  });

  const handleDownloadPracticeDocZip = async (tpl: any) => {
    try {
      const token = useAuth.getState().token;
      const queryParams = new URLSearchParams();
      if (token) queryParams.set("token", token);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const url = `/api/practice/settings/invoice-doc-templates/${tpl.id}/download-zip${queryString}`;

      toast({
        title: "Downloading Templates",
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
      const safeName = (firmName || "Practice").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `InvoiceTemplates_${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download Complete",
        description: `Downloaded InvoiceTemplates_${safeName}.zip successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Could not download template ZIP",
        variant: "destructive",
      });
    }
  };

  const saveOnboardingMutation = useMutation({
    mutationFn: async (payload: { entityType: string; criteriaList: any[] }) => {
      const res = await apiRequest("POST", "/api/practice/settings/onboarding", payload);
      if (!res.ok) throw new Error("Failed to save onboarding criteria");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Onboarding Saved", description: data.message });
      setShowOnboardingModal(false);
      setNewOnboardingCriteriaTitle("");
    },
  });

  const saveRiskMutation = useMutation({
    mutationFn: async (payload: { entityType: string; criteriaList: any[] }) => {
      const res = await apiRequest("POST", "/api/practice/settings/risk-assessment", payload);
      if (!res.ok) throw new Error("Failed to save risk criteria");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/settings"] });
      toast({ title: "Risk Matrix Saved", description: data.message });
      setShowRiskModal(false);
    },
  });

  const saveFirmDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/firm-details", {
        firmName,
        email,
        phone,
        website,
        vatRegNumber,
        utrNumber,
        hmrcGatewayId: hmrcAgentId,
        logoUrl: logoPreview,
      });
      if (!res.ok) throw new Error("Failed to save firm details");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
      toast({ title: "Firm Details Saved", description: "Practice identity updated in database." });
    },
  });

  // Database lists
  const servicesList = practiceSettings?.services || [];
  const clientAssignments = practiceSettings?.clientServiceAssignments || {};
  const customFieldsList = practiceSettings?.customFields || [];
  const emailTemplatesList = practiceSettings?.emailTemplates || [];
  const documentTemplatesList = practiceSettings?.documentTemplates || [];
  const invoiceTemplatesList = practiceSettings?.invoiceTemplates || [];
  const invoiceDocTemplatesList = practiceSettings?.invoiceDocTemplates || [];
  const banksList = practiceSettings?.banks || [];
  const onboardingCriteria = practiceSettings?.onboardingCriteria || {};
  const riskCriteria = practiceSettings?.riskCriteria || {};

  // Standard 5 PDF Templates matching Capium Screenshots
  const STANDARD_PDF_TEMPLATES = [
    {
      id: "bluesky",
      name: "BlueSky",
      color: "#0ea5e9",
      borderClass: "border-sky-500",
      accentBg: "bg-sky-600",
      textClass: "text-sky-700",
      description: "Modern Clean Sky Blue",
    },
    {
      id: "seagreen",
      name: "SeaGreen",
      color: "#10b981",
      borderClass: "border-emerald-500",
      accentBg: "bg-emerald-600",
      textClass: "text-emerald-700",
      description: "Standard UK Emerald Theme",
    },
    {
      id: "classic",
      name: "Classic",
      color: "#1e3a8a",
      borderClass: "border-blue-900",
      accentBg: "bg-blue-900",
      textClass: "text-blue-900",
      description: "Traditional UK Chartered Blue",
    },
    {
      id: "horizon",
      name: "Horizon",
      color: "#6c5ce7",
      borderClass: "border-purple-600",
      accentBg: "bg-purple-600",
      textClass: "text-purple-700",
      description: "Sleek Executive Purple",
    },
    {
      id: "executive",
      name: "Executive",
      color: "#0f172a",
      borderClass: "border-slate-800",
      accentBg: "bg-slate-800",
      textClass: "text-slate-800",
      description: "Minimalist Slate Charcoal",
    },
  ];

  // Filtered Services List (Screenshot 1)
  const filteredServices = useMemo(() => {
    return servicesList.filter((s: any) => {
      const matchSearch = s.title.toLowerCase().includes(servicesSearch.toLowerCase());
      if (!matchSearch) return false;
      if (servicesFilter === "active") return s.isActive;
      if (servicesFilter === "inactive") return !s.isActive;
      if (servicesFilter === "default") return s.serviceType === "Default";
      if (servicesFilter === "custom") return s.serviceType === "Custom";
      return true;
    });
  }, [servicesList, servicesSearch, servicesFilter]);

  const totalServices = filteredServices.length;
  const paginatedServices = useMemo(() => {
    const start = (servicesPage - 1) * servicesPerPage;
    return filteredServices.slice(start, start + servicesPerPage);
  }, [filteredServices, servicesPage, servicesPerPage]);

  const copyToClipboard = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast({ title: "Tag Copied", description: `${tag} copied to clipboard.` });
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleOpenCustomiseService = (svc: any) => {
    const defaultStaff = teamMembers[0]?.name || "";
    const isValidStaff = svc.serviceManager && teamMembers.some((m: any) => m.name === svc.serviceManager);
    setServiceForm({
      id: svc.id,
      title: svc.title,
      category: svc.category || "Accounting",
      frequency: svc.frequency || "Yearly",
      billable: svc.billable !== false,
      fee: svc.fee || "35.00",
      estimatedHours: svc.estimatedHours || 4,
      serviceManager: isValidStaff ? svc.serviceManager : defaultStaff,
      serviceType: svc.serviceType || "Default",
      isActive: svc.isActive !== false,
      addToCalendar: svc.addToCalendar !== false,
      clientTypes: svc.clientTypes || ["Limited"],
      steps: svc.steps || [],
      remindTeam: svc.remindTeam !== false,
      assignAll: svc.assignAll !== false,
      customWorkflow: !!svc.customWorkflow,
      reminders: svc.reminders || [],
    });
    setServiceModalTab("details");
    setShowServiceModal(true);
  };

  const handleOpenNewCustomService = () => {
    const defaultStaff = teamMembers[0]?.name || "";
    setServiceForm({
      id: null,
      title: "",
      category: "Accounting",
      frequency: "Yearly",
      billable: true,
      fee: "50.00",
      estimatedHours: 2,
      serviceManager: defaultStaff,
      serviceType: "Custom",
      isActive: true,
      addToCalendar: true,
      clientTypes: ["Limited", "Sole Trader"],
      steps: [
        { id: "s1", title: "Information Gathering", isMandatory: true },
        { id: "s2", title: "Work Preparation", isMandatory: true },
        { id: "s3", title: "Client Approval", isMandatory: true },
        { id: "s4", title: "Completion", isMandatory: true },
      ],
      remindTeam: true,
      assignAll: false,
      customWorkflow: false,
      reminders: [
        { id: "r1", timing: "1 Month prior to deadlines", staffUser: defaultStaff, clientUser: "All Client Contacts", cc: "" },
      ],
    });
    setServiceModalTab("details");
    setShowServiceModal(true);
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="practice">
      <div className="p-6 space-y-6 w-full mx-auto">
        {/* ========================================================= */}
        {/* TAB 1: SERVICES (Capium Exact Alignment - Screenshot 1)   */}
        {/* ========================================================= */}
        {activeTab === "services" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Sub-tabs: Services vs Assign Services (Matrix) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => setServiceSubTab("services")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${serviceSubTab === "services"
                    ? "bg-purple-100 text-purple-800 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  Services ({servicesList.length})
                </button>
                <button
                  onClick={() => setServiceSubTab("assign")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${serviceSubTab === "assign"
                    ? "bg-purple-100 text-purple-800 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  Assign Services (Matrix)
                </button>
              </div>

              {serviceSubTab === "services" && (
                <div className="flex items-center gap-3">
                  {/* Quick Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick Search by Service Title"
                      value={servicesSearch}
                      onChange={(e) => {
                        setServicesSearch(e.target.value);
                        setServicesPage(1);
                      }}
                      className="w-64 pl-3 pr-8 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
                    />
                    <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
                  </div>

                  {/* Filter Dropdown */}
                  <select
                    value={servicesFilter}
                    onChange={(e) => {
                      setServicesFilter(e.target.value);
                      setServicesPage(1);
                    }}
                    className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                  >
                    <option value="all">Show All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="default">Default</option>
                    <option value="custom">Custom</option>
                  </select>

                  {/* Add Custom Service Button */}
                  <button
                    onClick={handleOpenNewCustomService}
                    className="px-3 py-1 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Custom Service</span>
                  </button>
                </div>
              )}
            </div>

            {/* SERVICES TABLE (Screenshot 1) */}
            {serviceSubTab === "services" && (
              <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-700 font-semibold">
                        <th className="py-2.5 px-4">Service Title</th>
                        <th className="py-2.5 px-4">Frequency</th>
                        <th className="py-2.5 px-4">Steps</th>
                        <th className="py-2.5 px-4">Estimated Hours</th>
                        <th className="py-2.5 px-4">Service Manager</th>
                        <th className="py-2.5 px-4">Service Type</th>
                        <th className="py-2.5 px-4">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingSettings ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400">
                            Loading Practice Services from Database...
                          </td>
                        </tr>
                      ) : paginatedServices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-400">
                            No services match your search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedServices.map((svc: any) => (
                          <tr key={svc.id} className="hover:bg-purple-50/40 transition">
                            <td className="py-2.5 px-4">
                              <button
                                onClick={() => handleOpenCustomiseService(svc)}
                                className="text-purple-600 hover:text-purple-800 font-semibold hover:underline text-left"
                              >
                                {svc.title}
                              </button>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{svc.frequency}</td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {svc.steps?.length ? `${svc.steps.length} Steps` : "0 Steps"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {svc.estimatedHours}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-medium">
                              {(svc.serviceManager && teamMembers.some((m: any) => m.name === svc.serviceManager))
                                ? svc.serviceManager
                                : (teamMembers[0]?.name || svc.serviceManager || "Practice Staff")}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${svc.serviceType === "Default"
                                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}
                              >
                                {svc.serviceType || "Default"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`text-[11px] font-bold ${svc.isActive ? "text-emerald-600" : "text-slate-400"
                                  }`}
                              >
                                {svc.isActive ? "True" : "False"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer / Pagination (Screenshot 1) */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                  <div>
                    Displaying 1 to {Math.min(paginatedServices.length, totalServices)} out of {totalServices} Services
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span>Rows:</span>
                      <select
                        value={servicesPerPage}
                        onChange={(e) => {
                          setServicesPerPage(Number(e.target.value));
                          setServicesPage(1);
                        }}
                        className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        disabled={servicesPage <= 1}
                        onClick={() => setServicesPage((p) => Math.max(1, p - 1))}
                        className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 text-xs"
                      >
                        &lt; Previous
                      </button>
                      <span className="px-2 py-1 font-bold text-purple-700">{servicesPage}</span>
                      <button
                        disabled={servicesPage * servicesPerPage >= totalServices}
                        onClick={() => setServicesPage((p) => p + 1)}
                        className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 text-xs"
                      >
                        Next &gt;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ASSIGN SERVICES MATRIX (Sub-tab 2) */}
            {serviceSubTab === "assign" && (
              <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden p-4 space-y-4">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Client-to-Service Assignment Matrix
                    </h3>
                    <p className="text-xs text-slate-500">
                      Check services to assign statutory workflows and automated reminders to each client.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 sticky top-0 z-10">
                        <th className="py-2.5 px-4 font-bold border-r border-slate-200 bg-slate-100 min-w-[200px]">Client Name</th>
                        <th className="py-2.5 px-3 font-semibold min-w-[100px]">Client Type</th>
                        {servicesList.map((svc: any) => (
                          <th key={svc.id} className="py-2.5 px-2 font-semibold text-center whitespace-nowrap min-w-[90px]">
                            {svc.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientsList.length === 0 ? (
                        <tr>
                          <td colSpan={servicesList.length + 2} className="text-center py-8 text-slate-400">
                            No clients registered. Create clients in My Admin &gt; Clients.
                          </td>
                        </tr>
                      ) : (
                        clientsList.map((client: any) => {
                          const assignedIds: number[] = clientAssignments[client.id] || [];
                          return (
                            <tr key={client.id} className="hover:bg-slate-50">
                              <td className="py-2 px-4 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-200">
                                <div>{client.clientName}</div>
                                <span className="text-[10px] text-slate-400 font-mono">{client.clientCode || `CL${client.id}`}</span>
                              </td>
                              <td className="py-2 px-3 text-xs text-slate-600">{client.clientType}</td>
                              {servicesList.map((svc: any) => {
                                const isChecked = assignedIds.includes(svc.id);
                                return (
                                  <td key={svc.id} className="py-2 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...assignedIds, svc.id]
                                          : assignedIds.filter((id) => id !== svc.id);
                                        assignServiceMutation.mutate({ clientId: client.id, serviceIds: next });
                                      }}
                                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CUSTOM FIELDS (Article 9000179570)                 */}
        {/* ========================================================= */}
        {activeTab === "custom_fields" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200 text-xs font-semibold">
                {["Client Information", "Business Information", "PAYE Details", "Client Key Contact"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCustomFieldCategory(cat)}
                    className={`px-3 py-1 rounded transition ${customFieldCategory === cat ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setCustomFieldForm({
                    id: null,
                    label: "",
                    category: customFieldCategory,
                    type: "Text",
                    options: "",
                    required: false,
                  });
                  setShowCustomFieldModal(true);
                }}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
              >
                <Plus size={13} /> Add Custom Field
              </button>
            </div>

            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Configured Custom Fields: {customFieldCategory}
                </h3>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Seq #</th>
                    <th className="py-2.5 px-4">Field Label</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Field Type</th>
                    <th className="py-2.5 px-4">Mandatory</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customFieldsList.filter((f: any) => f.category === customFieldCategory).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        No custom fields configured for {customFieldCategory}. Click &quot;Add Custom Field&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    customFieldsList
                      .filter((f: any) => f.category === customFieldCategory)
                      .map((f: any, idx: number) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono text-purple-700 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{f.label}</td>
                          <td className="py-2.5 px-4"><span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{f.category}</span></td>
                          <td className="py-2.5 px-4"><span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded">{f.type}</span></td>
                          <td className="py-2.5 px-4">
                            <span className={`text-xs font-bold ${f.required ? "text-rose-600" : "text-slate-400"}`}>
                              {f.required ? "Required" : "Optional"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => deleteCustomFieldMutation.mutate(f.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete Field"
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

        {/* ========================================================= */}
        {/* TAB 3: EMAIL TEMPLATES (Article 9000165784 - img_1.png)    */}
        {/* ========================================================= */}
        {activeTab === "email_templates" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Top Bar: Subtabs (Standard / Custom) + Counter + ADD TEMPLATE Button (Matching Screenshot 1) */}
            <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              {/* Sub-tabs: Standard vs Custom with Purple Indicator */}
              <div className="flex items-center space-x-6 pl-2">
                <button
                  onClick={() => setEmailSubTab("standard")}
                  className={`pb-2 text-xs font-semibold transition cursor-pointer ${
                    emailSubTab === "standard"
                      ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setEmailSubTab("custom")}
                  className={`pb-2 text-xs font-semibold transition cursor-pointer ${
                    emailSubTab === "custom"
                      ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Right Action Section: Counter + Add Template Button */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500 font-medium">
                  Displaying{" "}
                  <strong className="text-slate-800 font-bold">
                    {
                      emailTemplatesList.filter((tpl: any) =>
                        emailSubTab === "custom" ? tpl.isCustom : !tpl.isCustom
                      ).length
                    }
                  </strong>{" "}
                  {emailSubTab === "custom" ? "Custom" : "Standard"} Template(s)
                </span>

                <button
                  onClick={() => {
                    setEmailForm({
                      id: null,
                      name: "",
                      templateType: "Deadline Reminder Template",
                      isCustom: emailSubTab === "custom",
                      subject: "",
                      triggerDays: 14,
                      body: "Dear [contact.name],\n\nThis is a notification from [practice.name] regarding [service.name] for [client.name].\n\nDeadline: [deadline.due_date]\n\nPlease submit all records via your portal: [portal.link]\n\nKind regards,\n[manager.name]\n[practice.name]",
                    });
                    setShowEmailModal(true);
                  }}
                  className="px-4 py-1.5 bg-[#2d8cf0] hover:bg-[#2072c4] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus size={13} /> ADD TEMPLATE
                </button>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Quick Search by Title / Subject / Type"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="w-72 pl-3 pr-8 py-1.5 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
                />
                <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
              </div>
            </div>

            {/* Email Templates Table (Matching Screenshot 1: 9000165784 img_1.png) */}
            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                    <th className="py-3 px-4">
                      <span className="flex items-center gap-1 cursor-pointer">
                        Title <span className="text-[10px] text-slate-400">▼</span>
                      </span>
                    </th>
                    <th className="py-3 px-4">
                      <span className="flex items-center gap-1 cursor-pointer">
                        Template Type <span className="text-[10px] text-slate-400">▼</span>
                      </span>
                    </th>
                    <th className="py-3 px-4">Trigger Timing</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailTemplatesList
                    .filter((tpl: any) => {
                      const matchesTab = emailSubTab === "custom" ? tpl.isCustom : !tpl.isCustom;
                      const matchesSearch =
                        !emailSearch.trim() ||
                        (tpl.name && tpl.name.toLowerCase().includes(emailSearch.toLowerCase())) ||
                        (tpl.subject && tpl.subject.toLowerCase().includes(emailSearch.toLowerCase())) ||
                        (tpl.templateType && tpl.templateType.toLowerCase().includes(emailSearch.toLowerCase()));
                      return matchesTab && matchesSearch;
                    })
                    .map((tpl: any) => (
                      <tr key={tpl.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-purple-600 shrink-0" />
                            <span>{tpl.name}</span>
                          </div>
                          <div className="text-[11px] font-normal text-purple-700 mt-0.5 font-sans">
                            Subject: {tpl.subject}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200">
                            {tpl.templateType || "Deadline Reminder Template"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {tpl.triggerDays > 0 ? `-${tpl.triggerDays} Days prior to deadline` : "On-demand dispatch"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Action Button (Blue square matching Capium) */}
                            <button
                              onClick={() => {
                                setEmailForm({
                                  id: tpl.id,
                                  name: tpl.name,
                                  templateType: tpl.templateType || "Deadline Reminder Template",
                                  isCustom: !!tpl.isCustom,
                                  subject: tpl.subject,
                                  triggerDays: tpl.triggerDays || 14,
                                  body: tpl.body || "",
                                });
                                setShowEmailModal(true);
                              }}
                              className="p-1.5 bg-[#2d87e2] hover:bg-[#2072c4] text-white rounded transition shadow-xs"
                              title="Edit Template"
                            >
                              <Edit size={13} />
                            </button>

                            {/* Delete Action Button */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete email template "${tpl.name}"?`)) {
                                  deleteEmailTemplateMutation.mutate(tpl.id);
                                }
                              }}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded transition shadow-xs"
                              title="Delete Template"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {emailTemplatesList.filter((tpl: any) =>
                    emailSubTab === "custom" ? tpl.isCustom : !tpl.isCustom
                  ).length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Mail size={24} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700">No {emailSubTab} templates found</p>
                          <p className="text-xs text-slate-500">
                            Click &quot;ADD TEMPLATE&quot; above to create a new {emailSubTab} email reminder.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DOCUMENT TEMPLATES (Articles 9000238645 & 9000172255 - img_1 to img_5) */}
        {/* ========================================================= */}
        {activeTab === "document_templates" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Top Action & Search Header (Matching Screenshot 1 & 2: 9000238645 img_1.png) */}
            <div className="bg-white p-3 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <span className="text-xs font-bold text-slate-800">Template</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Quick Search by File Name / Template"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="w-80 pl-3 pr-8 py-1.5 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-slate-800 placeholder-slate-400"
                  />
                  <Search size={14} className="absolute right-2.5 top-2 text-slate-400" />
                </div>
              </div>

              {/* Right Purple New Template Button */}
              <button
                onClick={() => {
                  setDocStep1Form({
                    templateName: "",
                    templateType: "Proposal Letter",
                  });
                  setShowDocStep1Modal(true);
                }}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Plus size={13} /> New Template
              </button>
            </div>

            {/* Document Templates Table (Matching Screenshot 1 & 4) */}
            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          documentTemplatesList.length > 0 &&
                          selectedDocIds.length === documentTemplatesList.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocIds(documentTemplatesList.map((d: any) => d.id));
                          } else {
                            setSelectedDocIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold">File Name</th>
                    <th className="py-3 px-4 font-semibold">Template Type</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentTemplatesList
                    .filter((doc: any) => {
                      if (!docSearch.trim()) return true;
                      const q = docSearch.toLowerCase();
                      return (
                        (doc.fileName && doc.fileName.toLowerCase().includes(q)) ||
                        (doc.title && doc.title.toLowerCase().includes(q)) ||
                        (doc.templateType && doc.templateType.toLowerCase().includes(q)) ||
                        (doc.docType && doc.docType.toLowerCase().includes(q))
                      );
                    })
                    .map((doc: any) => {
                      const isChecked = selectedDocIds.includes(doc.id);
                      return (
                        <tr key={doc.id} className={`hover:bg-slate-50/70 transition ${isChecked ? "bg-purple-50/20" : ""}`}>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocIds([...selectedDocIds, doc.id]);
                                } else {
                                  setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                                }
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-purple-600 shrink-0" />
                              <span>{doc.fileName || doc.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {doc.templateType}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                doc.docType === "Default" || doc.type === "Default"
                                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200 font-bold"
                              }`}
                            >
                              {doc.docType || "Default"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview Action */}
                              <button
                                onClick={() => {
                                  setPreviewDocData(doc);
                                  setShowDocPreviewModal(true);
                                }}
                                className="p-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded transition shadow-xs"
                                title="Preview Document with Merge Tags"
                              >
                                <Eye size={13} />
                              </button>

                              {/* Edit Action Button (Purple / Blue) */}
                              <button
                                onClick={() => {
                                  setActiveDocForm({
                                    id: doc.id,
                                    title: doc.title || doc.fileName,
                                    fileName: doc.fileName || doc.title,
                                    templateType: doc.templateType,
                                    docType: doc.docType || "Default",
                                    version: doc.version || "2026.1",
                                    content: doc.content || "",
                                    emailSubject: doc.emailSubject || `Notice Regarding ${doc.fileName || doc.title}`,
                                    emailBody: doc.emailBody || "Dear [ContactFirstName],\n\nPlease see the attached document for [CompanyName].\n\nKind regards,\n[PracticeName]",
                                  });
                                  setDocEditorTab("letter");
                                  setShowDocEditorModal(true);
                                }}
                                className="p-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded transition shadow-xs"
                                title="Edit Letter & Companion Email"
                              >
                                <Edit size={13} />
                              </button>

                              {/* Duplicate Action */}
                              <button
                                onClick={() => duplicateDocTemplateMutation.mutate(doc)}
                                className="p-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded transition shadow-xs"
                                title="Duplicate Template"
                              >
                                <Copy size={13} />
                              </button>

                              {/* Delete Action (only if custom or permitted) */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete "${doc.fileName || doc.title}"?`)) {
                                    deleteDocTemplateMutation.mutate(doc.id);
                                  }
                                }}
                                className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded transition shadow-xs"
                                title="Delete Template"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {documentTemplatesList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        <div className="max-w-sm mx-auto space-y-2">
                          <FileText size={24} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700">No document templates configured</p>
                          <p className="text-xs text-slate-500">
                            Click &quot;New Template&quot; above to create a statutory proposal or letter of engagement template.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: INVOICE TEMPLATES & BANK (Capium Screenshots 1, 2, 3) */}
        {/* ========================================================= */}
        {activeTab === "invoice_templates" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Navigation & Radio Selectors matching Screenshot 1 & 2 */}
            <div className="bg-white p-4 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-8 pl-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="invoiceRadioSelector"
                    checked={invoiceMode === "doc"}
                    onChange={() => setInvoiceMode("doc")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className={`pb-1.5 transition ${invoiceMode === "doc" ? "border-b-2 border-purple-600 font-bold text-purple-700" : "text-slate-600 hover:text-slate-900"}`}>
                    Templates (Doc)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="invoiceRadioSelector"
                    checked={invoiceMode === "pdf"}
                    onChange={() => setInvoiceMode("pdf")}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className={`pb-1.5 transition ${invoiceMode === "pdf" ? "border-b-2 border-purple-600 font-bold text-purple-700" : "text-slate-600 hover:text-slate-900"}`}>
                    Templates (Pdf)
                  </span>
                </label>
              </div>

              {invoiceMode === "doc" && (
                <button
                  onClick={() => setShowAddDocTemplateModal(true)}
                  className="px-4 py-1.5 bg-[#2d87e2] hover:bg-[#2072c4] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition flex items-center gap-1.5"
                >
                  <Plus size={13} /> Add Template
                </button>
              )}
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: TEMPLATES (DOC) (Screenshot 1: 9000195170 img_1.png)              */}
            {/* ========================================================================= */}
            {invoiceMode === "doc" && (
              <div className="space-y-6">
                {/* Full-Width Templates Table matching Capium Screenshot 1 */}
                <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                    <button
                      onClick={() => {
                        setDocTemplateForm({
                          id: null,
                          templateName: "",
                          bankName: "N/A",
                          fileName: "Invoice.docx",
                          isDefault: false,
                        });
                        setShowAddDocTemplateModal(true);
                      }}
                      className="bg-[#00a2d3] hover:bg-[#008cb6] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-1.5 transition shadow-xs"
                    >
                      <Plus size={14} /> Template
                    </button>

                    <h2 className="text-sm font-bold text-slate-700">
                      Invoice Templates (Doc/Pdf)
                    </h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-[#fbfcfd] text-slate-600 font-semibold select-none">
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
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {invoiceDocTemplatesList.map((tpl: any) => (
                          <tr key={tpl.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{tpl.templateName}</td>
                            <td className="py-3.5 px-4 text-center">
                              {tpl.isDefault ? (
                                <span className="inline-flex items-center justify-center text-emerald-600 font-bold" title="Default Template">
                                  <CheckCircle2 size={16} />
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.invoiceFile || tpl.fileName || "Invoice.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.creditNoteFile || "CreditNote.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.dividendFile || "Dividend.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-700 font-mono">{tpl.quotationFile || "Quotation.docx"}</td>
                            <td className="py-3.5 px-4 text-slate-600">{tpl.updatedOn || "-"}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">{tpl.bankName || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center">
                              {/* Capium Action Dropdown Selector */}
                              <div className="relative inline-block text-left">
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    const action = e.target.value;
                                    e.target.value = "";
                                    if (action === "download") {
                                      handleDownloadPracticeDocZip(tpl);
                                    } else if (action === "upload") {
                                      setDocTemplateForm(tpl);
                                      setShowAddDocTemplateModal(true);
                                    } else if (action === "edit") {
                                      setDocTemplateForm(tpl);
                                      setShowAddDocTemplateModal(true);
                                    } else if (action === "reset") {
                                      if (confirm(`Reset template "${tpl.templateName}" back to standard SanSuite defaults?`)) {
                                        resetDocTemplatesMutation.mutate();
                                      }
                                    } else if (action === "delete") {
                                      if (confirm(`Delete template "${tpl.templateName}"?`)) {
                                        deleteDocInvoiceTemplateMutation.mutate(tpl.id);
                                      }
                                    }
                                  }}
                                  className="text-xs border border-slate-300 bg-white hover:border-slate-400 text-slate-700 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500 outline-none cursor-pointer shadow-2xs font-medium"
                                >
                                  <option value="" disabled>Select Action</option>
                                  <option value="download">Download</option>
                                  <option value="upload">Upload</option>
                                  <option value="edit">Edit</option>
                                  <option value="reset">Reset</option>
                                  {!tpl.isDefault && <option value="delete">Delete</option>}
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Guidance and Instructions matching Capium Screenshot 1 */}
                  <div className="p-6 border-t border-slate-200 bg-[#fcfcfd] space-y-4">
                    {/* Cyan / Blue Callout Box: Steps to add & upload */}
                    <div className="border-l-4 border-[#00a2d3] bg-[#f0f9fd] p-4 rounded-r text-xs text-slate-700 space-y-2">
                      <p className="font-bold text-slate-900 leading-snug">
                        Customise your company invoice, credit note and dividend templates through word document at ease.
                      </p>
                      <p className="font-semibold text-slate-800">
                        Steps to add &amp; upload your templates:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                        <li>You may either make adjustments to &apos;Default Templates&apos; or add a new template from the page.</li>
                        <li>Select Download option under &apos;Action&apos; column to download zipped word documents.</li>
                        <li>Make necessary adjustments in the documents through simple word formatting.</li>
                        <li>Add your company logo and Save the document.</li>
                        <li>Select &apos;Upload&apos; option under &apos;Action&apos; column to upload the customised templates.</li>
                      </ol>
                    </div>

                    {/* Amber / Gold Warning Box: Tag operators warning */}
                    <div className="border-l-4 border-[#f59e0b] bg-[#fffbeb] p-4 rounded-r text-xs text-slate-700 flex items-start gap-3">
                      <AlertCircle size={16} className="text-[#d97706] shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        <strong className="text-slate-900 font-bold">Warning:</strong> Do not remove information and tags/objects enclosed within &apos;&laquo; &raquo;&apos; operators, unless you wish to exclude that information to be printed on your invoice or credit note. In case you have removed these objects you may download another template and copy it from there into your existing template and upload it again for the impact. You may &apos;Reset&apos; templates to default from &apos;Action&apos; button on the page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: TEMPLATES (PDF) (Screenshots 2 & 3: 9000195170/9000172239 img_2/3) */}
            {/* ========================================================================= */}
            {invoiceMode === "pdf" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Edit Invoice Template</h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Template Carousel + Form Inputs (4 Columns) */}
                  <div className="lg:col-span-4 bg-white rounded border border-slate-200 shadow-xs p-4 space-y-4">
                    {/* Template Miniature Carousel Slider (Screenshots 2 & 3) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Choose Template Style</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPdfCarouselIndex((prev) => Math.max(0, prev - 1))}
                            disabled={pdfCarouselIndex === 0}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={() => setPdfCarouselIndex((prev) => Math.min(STANDARD_PDF_TEMPLATES.length - 2, prev + 1))}
                            disabled={pdfCarouselIndex >= STANDARD_PDF_TEMPLATES.length - 2}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Visible 2 Template Thumbnails */}
                      <div className="grid grid-cols-2 gap-3">
                        {STANDARD_PDF_TEMPLATES.slice(pdfCarouselIndex, pdfCarouselIndex + 2).map((tpl) => {
                          const isSelected = pdfForm.templateName === tpl.name;
                          return (
                            <div
                              key={tpl.id}
                              onClick={() => {
                                setPdfForm((prev: any) => ({
                                  ...prev,
                                  templateName: tpl.name,
                                  primaryColor: tpl.color,
                                }));
                              }}
                              className={`border-2 rounded p-2.5 bg-slate-50/50 cursor-pointer flex flex-col items-center justify-between transition hover:shadow-xs ${isSelected ? "border-purple-600 bg-purple-50/30" : "border-slate-200"
                                }`}
                            >
                              {/* Miniature Invoice Mockup Canvas */}
                              <div className="w-full bg-white border border-slate-200 rounded p-2 shadow-2xs space-y-1 text-[7px] text-slate-400 select-none">
                                <div className="flex justify-between items-center">
                                  <div className="w-4 h-2 bg-slate-200 rounded-2xs" />
                                  <div className="font-bold text-[6px] text-slate-600">INVOICE</div>
                                </div>
                                <div className="w-full h-0.5 rounded-full" style={{ backgroundColor: tpl.color }} />
                                <div className="space-y-0.5 pt-0.5">
                                  <div className="w-12 h-1 bg-slate-200 rounded-2xs" />
                                  <div className="w-8 h-1 bg-slate-200 rounded-2xs" />
                                </div>
                                <div className="w-full border-t border-slate-100 pt-1 flex justify-between font-mono text-[6px]">
                                  <span>Total</span>
                                  <span className="font-bold text-slate-700">£420.00</span>
                                </div>
                              </div>

                              {/* Radio Selector */}
                              <label className="flex items-center gap-1.5 mt-2 cursor-pointer text-xs font-bold text-slate-800">
                                <input
                                  type="radio"
                                  name="templatePresetRadio"
                                  checked={isSelected}
                                  onChange={() => {
                                    setPdfForm((prev: any) => ({
                                      ...prev,
                                      templateName: tpl.name,
                                      primaryColor: tpl.color,
                                    }));
                                  }}
                                  className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                                />
                                <span style={{ color: isSelected ? tpl.color : "#334155" }}>{tpl.name}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inputs Configuration Form (Screenshots 2 & 3) */}
                    <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Template Name</label>
                        <input
                          type="text"
                          value={pdfForm.templateName}
                          onChange={(e) => setPdfForm({ ...pdfForm, templateName: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Page Size</label>
                        <select
                          value={pdfForm.pageSize}
                          onChange={(e) => setPdfForm({ ...pdfForm, pageSize: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium"
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Title (Invoice)</label>
                        <input
                          type="text"
                          value={pdfForm.titleInvoice}
                          onChange={(e) => setPdfForm({ ...pdfForm, titleInvoice: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Title (Draft)</label>
                        <input
                          type="text"
                          value={pdfForm.titleDraft}
                          onChange={(e) => setPdfForm({ ...pdfForm, titleDraft: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>

                      {/* Margins Top / Bottom */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Margin Top (pt)</label>
                          <input
                            type="number"
                            value={pdfForm.marginTop}
                            onChange={(e) => setPdfForm({ ...pdfForm, marginTop: parseInt(e.target.value) || 25 })}
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Margin Bottom (pt)</label>
                          <input
                            type="number"
                            value={pdfForm.marginBottom}
                            onChange={(e) => setPdfForm({ ...pdfForm, marginBottom: parseInt(e.target.value) || 25 })}
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                          />
                        </div>
                      </div>

                      {/* Margins Left / Right */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Margin Left (pt)</label>
                          <input
                            type="number"
                            value={pdfForm.marginLeft}
                            onChange={(e) => setPdfForm({ ...pdfForm, marginLeft: parseInt(e.target.value) || 25 })}
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">Margin Right (pt)</label>
                          <input
                            type="number"
                            value={pdfForm.marginRight}
                            onChange={(e) => setPdfForm({ ...pdfForm, marginRight: parseInt(e.target.value) || 25 })}
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Title (Credit Note)</label>
                        <input
                          type="text"
                          value={pdfForm.titleCreditNote}
                          onChange={(e) => setPdfForm({ ...pdfForm, titleCreditNote: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>

                      {/* Bank Name Dropdown + Purple Bank Icon Button (Screenshot 2 & 3) */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={pdfForm.bankName}
                            onChange={(e) => setPdfForm({ ...pdfForm, bankName: e.target.value })}
                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium text-xs"
                          >
                            <option value="">--Select Bank--</option>
                            {banksList.map((b: any) => (
                              <option key={b.id || b.bankName} value={b.bankName}>
                                {b.bankName} ({b.accountNumber || "Default"})
                              </option>
                            ))}
                          </select>

                          {/* Purple Landmark Bank Button triggering Add Bank Account Modal */}
                          <button
                            type="button"
                            onClick={() => setShowAddBankModal(true)}
                            className="p-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded transition shadow-xs shrink-0"
                            title="Add Bank Account"
                          >
                            <Landmark size={15} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Title (Paid)</label>
                        <input
                          type="text"
                          value={pdfForm.titlePaid}
                          onChange={(e) => setPdfForm({ ...pdfForm, titlePaid: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Footer Height</label>
                        <input
                          type="number"
                          value={pdfForm.footerHeight}
                          onChange={(e) => setPdfForm({ ...pdfForm, footerHeight: parseInt(e.target.value) || 40 })}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                        />
                      </div>

                      {/* Checkboxes for VAT and Company Reg */}
                      <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!pdfForm.vatRegNo}
                            onChange={(e) => setPdfForm({ ...pdfForm, vatRegNo: e.target.checked })}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-semibold text-slate-700">VAT Reg.No</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!pdfForm.companyRegNo}
                            onChange={(e) => setPdfForm({ ...pdfForm, companyRegNo: e.target.checked })}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-semibold text-slate-700">Company Reg.No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: CKEditor 3 WYSIWYG Editor Canvas (8 Columns) */}
                  <div className="lg:col-span-8">
                    <CKEditor3InvoiceEditor
                      pdfForm={pdfForm}
                      setPdfForm={setPdfForm}
                      logoPreview={logoPreview}
                      onPreview={() => setShowInvoicePreviewModal(true)}
                      onSave={() => saveInvoiceTemplateMutation.mutate(pdfForm)}
                      isSaving={saveInvoiceTemplateMutation.isPending}
                      onDownload={() => {
                        toast({
                          title: "Invoice PDF Download",
                          description: `Generating sample PDF for ${pdfForm.templateName} layout.`,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: ONBOARDING AND KYC (Article 9000188953)            */}
        {/* ========================================================= */}
        {activeTab === "onboarding" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200 text-xs font-semibold">
                {["Limited", "SoleTrader", "Partnership", "Individual", "Trust"].map((ent) => (
                  <button
                    key={ent}
                    onClick={() => setOnboardingEntityType(ent)}
                    className={`px-3 py-1 rounded transition ${onboardingEntityType === ent ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {ent} Company
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition flex items-center gap-1"
                >
                  <Download size={13} /> Export PDF Checklist
                </button>

                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
                >
                  <Plus size={13} /> New Criteria
                </button>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  KYC Onboarding Verification Requirements ({onboardingEntityType})
                </h3>
                <span className="text-xs text-purple-700 font-semibold">
                  {(onboardingCriteria[onboardingEntityType] || []).length} mandatory checks configured
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Verification Item / Criteria Description</th>
                    <th className="py-2.5 px-4">Obligatory</th>
                    <th className="py-2.5 px-4">Default Stage</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(onboardingCriteria[onboardingEntityType] || []).map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-purple-700 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{item.title}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.isRequired ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-500"}`}>
                          {item.isRequired ? "Mandatory Check" : "Optional"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4"><span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">Pending Review</span></td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            const updated = (onboardingCriteria[onboardingEntityType] || []).filter((_: any, i: number) => i !== idx);
                            saveOnboardingMutation.mutate({ entityType: onboardingEntityType, criteriaList: updated });
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: RISK ASSESSMENT (Article 9000235538)               */}
        {/* ========================================================= */}
        {activeTab === "risk_assessment" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200 text-xs font-semibold">
                {["Limited", "SoleTrader", "Partnership", "Individual", "Trust"].map((ent) => (
                  <button
                    key={ent}
                    onClick={() => setRiskEntityType(ent)}
                    className={`px-3 py-1 rounded transition ${riskEntityType === ent ? "bg-white text-purple-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {ent} Matrix
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowRiskModal(true)}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
              >
                <Plus size={13} /> New Risk Criteria
              </button>
            </div>

            <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  AML Risk Criteria Matrix ({riskEntityType})
                </h3>
                <span className="text-xs text-purple-700 font-semibold">Linked to My Admin AML Officer</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Risk Assessment Criteria</th>
                    <th className="py-2.5 px-4">Risk Category</th>
                    <th className="py-2.5 px-4">Weight</th>
                    <th className="py-2.5 px-4">Due Diligence Level</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(riskCriteria[riskEntityType] || []).map((rc: any, idx: number) => (
                    <tr key={rc.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-purple-700 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{rc.title}</td>
                      <td className="py-2.5 px-4"><span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{rc.category}</span></td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold ${rc.riskWeight === "High" ? "text-rose-600" : rc.riskWeight === "Medium" ? "text-amber-600" : "text-emerald-600"}`}>
                          {rc.riskWeight} Weight
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${rc.riskLevel === "Enhanced" ? "bg-rose-50 text-rose-700 border border-rose-200" : rc.riskLevel === "Normal" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                          {rc.riskLevel} Due Diligence
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            const updated = (riskCriteria[riskEntityType] || []).filter((_: any, i: number) => i !== idx);
                            saveRiskMutation.mutate({ entityType: riskEntityType, criteriaList: updated });
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: FIRM PROFILE & BRANDING                            */}
        {/* ========================================================= */}
        {activeTab === "firm_profile" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white rounded border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Practice Branding & Identity</h3>
                  <p className="text-xs text-slate-500">Configure firm name, official logo, and HMRC agent credentials.</p>
                </div>
                <button
                  onClick={() => saveFirmDetailsMutation.mutate()}
                  disabled={saveFirmDetailsMutation.isPending}
                  className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
                >
                  <Save size={13} />
                  <span>{saveFirmDetailsMutation.isPending ? "Saving..." : "Save Firm Settings"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-700">Practice Logo</label>
                  <div className="border-2 border-dashed border-slate-200 rounded p-6 text-center space-y-3 bg-slate-50">
                    {logoPreview && !logoLoadError ? (
                      <div className="relative inline-block">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          onError={() => setLogoLoadError(true)}
                          className="max-h-24 mx-auto rounded object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            setLogoLoadError(false);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Building2 size={36} className="mx-auto text-slate-300" />
                        <p className="text-xs text-slate-500">Upload high-res PNG / SVG practice logo</p>
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowMediaModal(true)}
                        className="px-3 py-1 border border-purple-200 bg-purple-50 text-purple-700 rounded text-xs font-semibold hover:bg-purple-100 transition flex items-center gap-1 mx-auto"
                      >
                        <ImageIcon size={13} /> Select from Media Library
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Firm Legal Name *</label>
                      <input
                        type="text"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Practice Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone Number</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Practice VAT Reg No</label>
                      <input
                        type="text"
                        value={vatRegNumber}
                        onChange={(e) => setVatRegNumber(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Practice UTR No</label>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">HMRC Agent ID</label>
                      <input
                        type="text"
                        value={hmrcAgentId}
                        onChange={(e) => setHmrcAgentId(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-purple-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMISE SERVICE MODAL (Capium Exact Alignment - Screenshots 2, 3, 4)    */}
      {/* ========================================================================= */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in">
            {/* Modal Header matching Screenshot 1 & 2 */}
            <div className="px-6 pt-5 pb-3 border-b border-dashed border-slate-300 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Customise Service</span>
              <button
                onClick={() => setShowServiceModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Large Centered Service Name Title Banner (Screenshot 1 & 2) */}
            <div className="text-center pt-3 pb-2">
              <h2 className="text-xl font-normal text-slate-800 tracking-wide font-sans">
                {serviceForm.title || "Custom Service"}
              </h2>
            </div>

            {/* Centered Modal Sub-Tabs (Service Details / Configure Steps / Configure Reminders) */}
            <div className="flex justify-center border-b border-slate-200 text-xs font-semibold text-slate-600 gap-8">
              <button
                onClick={() => setServiceModalTab("details")}
                className={`pb-2.5 text-center transition ${serviceModalTab === "details"
                  ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Service Details
              </button>
              <button
                onClick={() => setServiceModalTab("steps")}
                className={`pb-2.5 text-center transition ${serviceModalTab === "steps"
                  ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Configure Steps
              </button>
              <button
                onClick={() => setServiceModalTab("reminders")}
                className={`pb-2.5 text-center transition ${serviceModalTab === "reminders"
                  ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Configure Reminders
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* TAB 1: SERVICE DETAILS (Screenshot 1: 9000195170 img_1) */}
              {serviceModalTab === "details" && (
                <div className="space-y-4 text-xs max-w-xl mx-auto">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Service Title</label>
                    <input
                      type="text"
                      value={serviceForm.title}
                      disabled={serviceForm.serviceType === "Default"}
                      onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                      placeholder="e.g. MTD - IT"
                      className="col-span-2 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-600 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Frequency</label>
                    <select
                      value={serviceForm.frequency}
                      onChange={(e) => setServiceForm({ ...serviceForm, frequency: e.target.value })}
                      className="col-span-2 border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-800 font-medium"
                    >
                      <option value="Quarterly/Yearly">Quarterly/Yearly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Fortnightly">Fortnightly</option>
                      <option value="Bi-Monthly">Bi-Monthly</option>
                      <option value="One-Time">One-Time</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Billable</label>
                    <select
                      value={serviceForm.billable ? "Yes" : "No"}
                      onChange={(e) => setServiceForm({ ...serviceForm, billable: e.target.value === "Yes" })}
                      className="col-span-2 border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-800"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Fee</label>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-1.5 text-slate-500 font-mono">£</span>
                      <input
                        type="text"
                        value={serviceForm.fee}
                        onChange={(e) => setServiceForm({ ...serviceForm, fee: e.target.value })}
                        className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-start gap-4">
                    <label className="text-slate-600 font-medium pt-1.5">Estimated Hours</label>
                    <div className="col-span-2 space-y-1">
                      <input
                        type="number"
                        step="0.25"
                        value={serviceForm.estimatedHours}
                        onChange={(e) => setServiceForm({ ...serviceForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono"
                      />
                      <div className="flex items-start gap-1 text-[11px] text-slate-400 leading-tight pt-0.5">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>Planned hours are generic guidelines at global level but can be overwritten at each client level and at services</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Service Manager</label>
                    <select
                      value={serviceForm.serviceManager || (teamMembers[0]?.name || "")}
                      onChange={(e) => {
                        const newMgr = e.target.value;
                        const prevMgr = serviceForm.serviceManager;
                        const updatedReminders = (serviceForm.reminders || []).map((rem: any) => ({
                          ...rem,
                          staffUser: (!rem.staffUser || rem.staffUser === prevMgr) ? newMgr : rem.staffUser,
                        }));
                        setServiceForm({
                          ...serviceForm,
                          serviceManager: newMgr,
                          reminders: updatedReminders,
                        });
                      }}
                      className="col-span-2 border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-800 font-medium"
                    >
                      {teamMembers.length === 0 ? (
                        <option value="">No Staff Assigned</option>
                      ) : (
                        teamMembers.map((m: any) => (
                          <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 font-medium">Active</label>
                    <div className="col-span-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setServiceForm({ ...serviceForm, isActive: !serviceForm.isActive })}
                        className={`w-11 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${serviceForm.isActive ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                          }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></span>
                      </button>
                      <span className="ml-2 text-xs font-bold text-slate-700 uppercase">
                        {serviceForm.isActive ? "ON" : "OFF"}
                      </span>
                    </div>
                  </div>

                  {/* Add to Calendar Checkbox */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="flex items-center gap-1">
                      <label className="text-slate-600 font-medium">Add to Calendar</label>
                      <Info size={12} className="text-slate-400 cursor-help" />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        checked={!!serviceForm.addToCalendar}
                        onChange={(e) => setServiceForm({ ...serviceForm, addToCalendar: e.target.checked })}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Client Type Checkboxes (Screenshot 1) */}
                  <div className="grid grid-cols-3 items-start gap-4 pt-1">
                    <label className="text-slate-600 font-medium pt-1">Client Type</label>
                    <div className="col-span-2 flex flex-wrap gap-4">
                      {["Limited", "Sole Trader", "Partnership", "Individual", "Trust", "Charity"].map((cType) => {
                        const isChecked = (serviceForm.clientTypes || []).includes(cType);
                        return (
                          <label key={cType} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = serviceForm.clientTypes || [];
                                const updated = e.target.checked
                                  ? [...current, cType]
                                  : current.filter((t: string) => t !== cType);
                                setServiceForm({ ...serviceForm, clientTypes: updated });
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                            />
                            <span>{cType}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONFIGURE STEPS (Screenshot 2: Task Checklist with Multi-Stage Groups) */}
              {serviceModalTab === "steps" && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="text-center">
                    <h3 className="font-bold text-xs text-slate-800 tracking-wide">
                      Task Checklist
                    </h3>
                  </div>

                  {/* Multi-Stage Step Groups (e.g. 1. Quarterly, 2. Adjustments & Allowance/ Final Submission) */}
                  {Array.isArray(serviceForm.steps) && serviceForm.steps.length > 0 && typeof serviceForm.steps[0] === "object" && "items" in serviceForm.steps[0] ? (
                    <div className="space-y-6">
                      {serviceForm.steps.map((group: any, gIdx: number) => (
                        <div key={group.groupId || gIdx} className="space-y-3">
                          {/* Group Header */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center text-[11px] font-bold">
                                {gIdx + 1}
                              </span>
                              <span className="font-bold text-xs text-slate-800">{group.groupTitle}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setStepModal({
                                  isOpen: true,
                                  mode: "add",
                                  groupIndex: gIdx,
                                  title: "",
                                  groupTitle: group.groupTitle,
                                });
                              }}
                              className="px-3 py-1 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition"
                            >
                              Add Step
                            </button>
                          </div>

                          {/* Group Items List */}
                          <div className="space-y-2 pl-2">
                            {(group.items || []).map((item: string, iIdx: number) => (
                              <div
                                key={iIdx}
                                className="flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded transition group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">•</span>
                                  <span>{item}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 opacity-60 group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStepModal({
                                        isOpen: true,
                                        mode: "edit",
                                        groupIndex: gIdx,
                                        itemIndex: iIdx,
                                        title: item,
                                        groupTitle: group.groupTitle,
                                      });
                                    }}
                                    className="hover:text-purple-700 p-0.5"
                                    title="Edit step"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...serviceForm.steps];
                                      updated[gIdx].items = updated[gIdx].items.filter((_: any, i: number) => i !== iIdx);
                                      setServiceForm({ ...serviceForm, steps: updated });
                                    }}
                                    className="hover:text-rose-600 p-0.5"
                                    title="Remove step"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Fallback Flat Checklist Format */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center text-[11px] font-bold">
                            1
                          </span>
                          <span className="font-bold text-xs text-slate-800">Task Checklist Steps</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newStep = {
                              id: `s_${Date.now()}`,
                              title: `Task Step #${(serviceForm.steps?.length || 0) + 1}`,
                              isMandatory: true,
                            };
                            setServiceForm({
                              ...serviceForm,
                              steps: [...(serviceForm.steps || []), newStep],
                            });
                          }}
                          className="px-3 py-1 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition"
                        >
                          Add Step
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(serviceForm.steps || []).map((step: any, idx: number) => (
                          <div key={step.id || idx} className="flex items-center space-x-2 text-xs">
                            <span className="text-slate-400 font-bold">•</span>
                            <input
                              type="text"
                              value={step.title || step}
                              onChange={(e) => {
                                const updated = [...serviceForm.steps];
                                if (typeof updated[idx] === "object") {
                                  updated[idx] = { ...updated[idx], title: e.target.value };
                                } else {
                                  updated[idx] = e.target.value;
                                }
                                setServiceForm({ ...serviceForm, steps: updated });
                              }}
                              className="flex-1 border border-slate-300 rounded px-3 py-1 text-xs text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = serviceForm.steps.filter((_: any, i: number) => i !== idx);
                                setServiceForm({ ...serviceForm, steps: updated });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONFIGURE REMINDERS (Screenshot 4) */}
              {serviceModalTab === "reminders" && (
                <div className="space-y-4 text-xs max-w-xl mx-auto">
                  {/* 3 Global Toggles */}
                  <div className="space-y-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">
                        Remind me and my team about upcoming deadlines
                      </span>
                      <button
                        type="button"
                        onClick={() => setServiceForm({ ...serviceForm, remindTeam: !serviceForm.remindTeam })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${serviceForm.remindTeam ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                          }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Assign to all clients</span>
                      <button
                        type="button"
                        onClick={() => setServiceForm({ ...serviceForm, assignAll: !serviceForm.assignAll })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${serviceForm.assignAll ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                          }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Custom email workflow</span>
                      <button
                        type="button"
                        onClick={() => setServiceForm({ ...serviceForm, customWorkflow: !serviceForm.customWorkflow })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${serviceForm.customWorkflow ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                          }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>
                  </div>

                  {/* Stacked Reminder Cards */}
                  <div className="space-y-3">
                    {(serviceForm.reminders || []).map((rem: any, idx: number) => (
                      <div key={rem.id || idx} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">Reminder #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = serviceForm.reminders.filter((_: any, i: number) => i !== idx);
                              setServiceForm({ ...serviceForm, reminders: updated });
                            }}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <select
                            value={rem.timing}
                            onChange={(e) => {
                              const updated = [...serviceForm.reminders];
                              updated[idx] = { ...updated[idx], timing: e.target.value };
                              setServiceForm({ ...serviceForm, reminders: updated });
                            }}
                            className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700"
                          >
                            <option value="1 Month prior to deadlines">1 Month prior to deadlines</option>
                            <option value="2 Weeks prior to deadlines">2 Weeks prior to deadlines</option>
                            <option value="1 Week prior to deadlines">1 Week prior to deadlines</option>
                            <option value="5 Days prior to deadlines">5 Days prior to deadlines</option>
                            <option value="1 Day prior to deadlines">1 Day prior to deadlines</option>
                          </select>

                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 min-w-[70px]">Staff User:</span>
                            <div className="flex-1 flex items-center gap-2">
                              {/* Selected Staff Pill Tag */}
                              {(rem.staffUser || serviceForm.serviceManager) ? (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-xs flex items-center gap-1 font-medium shrink-0">
                                  <span>{rem.staffUser || serviceForm.serviceManager}</span>
                                  <X
                                    size={11}
                                    className="cursor-pointer text-slate-400 hover:text-rose-600"
                                    onClick={() => {
                                      const updated = [...serviceForm.reminders];
                                      updated[idx] = { ...updated[idx], staffUser: "" };
                                      setServiceForm({ ...serviceForm, reminders: updated });
                                    }}
                                  />
                                </span>
                              ) : null}

                              {/* Staff User Selector Dropdown */}
                              <select
                                value={rem.staffUser || serviceForm.serviceManager || (teamMembers[0]?.name || "")}
                                onChange={(e) => {
                                  const updated = [...serviceForm.reminders];
                                  updated[idx] = { ...updated[idx], staffUser: e.target.value };
                                  setServiceForm({ ...serviceForm, reminders: updated });
                                }}
                                className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700 font-medium"
                              >
                                {teamMembers.map((m: any) => (
                                  <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                                ))}
                                <option value="All Staff Members">All Staff Members</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 min-w-[70px]">Client:</span>
                            <select
                              value={rem.clientUser || "All Client Contacts"}
                              onChange={(e) => {
                                const updated = [...serviceForm.reminders];
                                updated[idx] = { ...updated[idx], clientUser: e.target.value };
                                setServiceForm({ ...serviceForm, reminders: updated });
                              }}
                              className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700"
                            >
                              <option value="All Client Contacts">All Client Contacts</option>
                              <option value="Primary Director">Primary Director</option>
                              <option value="Finance Contact">Finance Contact</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 min-w-[70px]">Cc:</span>
                            <input
                              type="text"
                              value={rem.cc || ""}
                              onChange={(e) => {
                                const updated = [...serviceForm.reminders];
                                updated[idx] = { ...updated[idx], cc: e.target.value };
                                setServiceForm({ ...serviceForm, reminders: updated });
                              }}
                              placeholder="optional.cc@domain.com"
                              className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        const newReminder = {
                          id: `r_${Date.now()}`,
                          timing: "1 Week prior to deadlines",
                          staffUser: serviceForm.serviceManager || teamMembers[0]?.name || "",
                          clientUser: "All Client Contacts",
                          cc: "",
                        };
                        setServiceForm({
                          ...serviceForm,
                          reminders: [...(serviceForm.reminders || []), newReminder],
                        });
                      }}
                      className="px-3 py-1.5 border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Another Reminder
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Navigation matching Screenshot 1 & 2 */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div>
                {serviceModalTab !== "details" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceModalTab === "reminders") setServiceModalTab("steps");
                      else if (serviceModalTab === "steps") setServiceModalTab("details");
                    }}
                    className="px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition"
                  >
                    Previous
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <div>
                {serviceModalTab !== "reminders" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceModalTab === "details") setServiceModalTab("steps");
                      else if (serviceModalTab === "steps") setServiceModalTab("reminders");
                    }}
                    className="px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saveServiceMutation.isPending}
                    onClick={() => saveServiceMutation.mutate(serviceForm)}
                    className="px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1"
                  >
                    <Save size={13} />
                    <span>{saveServiceMutation.isPending ? "Saving to Database..." : "Save Service"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* CUSTOM FIELD MODAL                                                        */}
      {/* ========================================================================= */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Custom Field</h3>
              <button onClick={() => setShowCustomFieldModal(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Field Label *</label>
                <input
                  type="text"
                  value={customFieldForm.label}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
                  placeholder="e.g. VAT Registration Date"
                  className="w-full border border-slate-300 rounded px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={customFieldForm.category}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, category: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                >
                  <option value="Client Information">Client Information</option>
                  <option value="Business Information">Business Information</option>
                  <option value="PAYE Details">PAYE Details</option>
                  <option value="Client Key Contact">Client Key Contact</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Type</label>
                <select
                  value={customFieldForm.type}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, type: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                >
                  <option value="Text">Text</option>
                  <option value="Number">Number</option>
                  <option value="Date">Date</option>
                  <option value="Dropdown">Dropdown</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqCheck"
                  checked={customFieldForm.required}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, required: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="reqCheck" className="font-semibold text-slate-700 cursor-pointer">
                  Mandatory Field (Required during client onboarding)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setShowCustomFieldModal(false)} className="px-3 py-1.5 border border-slate-300 rounded">Cancel</button>
              <button
                onClick={() => saveCustomFieldMutation.mutate(customFieldForm)}
                className="px-4 py-1.5 bg-[#6c5ce7] text-white rounded font-semibold"
              >
                Save Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMAIL TEMPLATE MODAL (Matching Screenshot 1: 9000165784 img_1.png)        */}
      {/* ========================================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full border border-slate-200 p-6 space-y-4 animate-in fade-in text-xs max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {emailForm.id ? "Edit Email Template" : "New Email Template"}
                </h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto flex-1 pr-1">
              {/* Left Form Inputs (8 Columns) */}
              <div className="lg:col-span-8 space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    placeholder="e.g. Year-End Accounts Due Reminder"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-900 focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Template Type *</label>
                    <select
                      value={emailForm.templateType}
                      onChange={(e) => setEmailForm({ ...emailForm, templateType: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-xs"
                    >
                      <option value="">Select Template</option>
                      <option value="Update Task Template">Update Task Template</option>
                      <option value="Delete Task Template">Delete Task Template</option>
                      <option value="Task Reminder Template">Task Reminder Template</option>
                      <option value="Update Recurring Tasks Template">Update Recurring Tasks Template</option>
                      <option value="New Recurring Task Template">New Recurring Task Template</option>
                      <option value="Delete Recurring Task Template">Delete Recurring Task Template</option>
                      <option value="Deadline Reminder Template">Deadline Reminder Template</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Trigger Days Prior to Deadline</label>
                    <input
                      type="number"
                      value={emailForm.triggerDays}
                      onChange={(e) => setEmailForm({ ...emailForm, triggerDays: parseInt(e.target.value) || 0 })}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Subject *</label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    placeholder="e.g. Statutory Deadline Notice: {ClientName}"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-purple-700 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-hidden text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Content / Body *</label>
                  <textarea
                    id="emailBodyInput"
                    rows={10}
                    value={emailForm.body}
                    onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                    placeholder="Type in your message..."
                    className="w-full border border-slate-300 rounded p-3 font-mono text-xs text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-hidden leading-relaxed"
                  />
                </div>
              </div>

              {/* Right Tokens / Merge Tags Palette (4 Columns - Screenshot 5) */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3 self-start shadow-2xs">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Choose Tokens</h4>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Tasks &amp; Deadlines</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {[
                    "{UserName}",
                    "{ClientName}",
                    "{AccountantName}",
                    "{TaskNumber}",
                    "{TaskName}",
                    "{TaskDueDate}",
                    "{DeadlineName}",
                    "{StatutoryDueDate}",
                    "{DaysRemaining}",
                    "{FirmName}",
                    "{AccountantEmail}",
                    "{AccountantNumber}",
                  ].map((token) => (
                    <button
                      key={token}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", ` ${token} `);
                      }}
                      onClick={() => {
                        setEmailForm((prev: any) => ({
                          ...prev,
                          body: prev.body + ` ${token} `,
                        }));
                        toast({ title: "Token Inserted", description: `Added ${token} into template body.` });
                      }}
                      className="w-full text-left px-3 py-1.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 text-blue-800 rounded font-medium text-[11px] transition shadow-2xs cursor-pointer select-none flex items-center justify-between"
                    >
                      <span>{token}</span>
                      <Plus size={12} className="text-blue-500" />
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-200">
                  Drag and drop above tokens into text area or click to insert.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveEmailTemplateMutation.isPending}
                onClick={() => saveEmailTemplateMutation.mutate(emailForm)}
                className="px-5 py-1.5 bg-[#2d8cf0] hover:bg-[#2072c4] text-white rounded font-bold shadow-xs transition"
              >
                {saveEmailTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT TEMPLATES - STEP 1 MODAL (Matching Screenshot 2: 9000238645 img_4.png) */}
      {/* ========================================================================= */}
      {showDocStep1Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full border border-slate-200 p-6 space-y-6 animate-in fade-in text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">New Template</h3>
              <button
                onClick={() => setShowDocStep1Modal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step 1 Fields (Matching 9000238645 img_4.png 1:1) */}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Template *</label>
                <input
                  type="text"
                  value={docStep1Form.templateName}
                  onChange={(e) => setDocStep1Form({ ...docStep1Form, templateName: e.target.value })}
                  placeholder="e.g. Disengagement Letter"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-slate-700 font-semibold mb-1.5">
                  <span>Choose Template *</span>
                  <Info size={13} className="text-slate-400" />
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={docStep1Form.templateType}
                    onChange={(e) => setDocStep1Form({ ...docStep1Form, templateType: e.target.value })}
                    className="flex-1 border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:ring-1 focus:ring-purple-500 focus:outline-hidden font-medium"
                  >
                    {customDocCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Plus button to add custom category */}
                  <button
                    type="button"
                    onClick={() => setShowDocCategoryModal(true)}
                    className="p-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded transition shadow-xs"
                    title="Add Custom Template Category"
                  >
                    <Plus size={15} />
                  </button>

                  {/* Trash button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (customDocCategories.length > 1) {
                        setCustomDocCategories(customDocCategories.filter((c) => c !== docStep1Form.templateType));
                        setDocStep1Form({ ...docStep1Form, templateType: customDocCategories[0] });
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition"
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!docStep1Form.templateName.trim()) {
                    toast({
                      title: "Template Name Required",
                      description: "Please provide a name for this document template.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Default sample template text matching Capium
                  let defaultLetterBody = `Dear [ContactFirstName] [ContactLastName],\n\n${docStep1Form.templateName.toUpperCase()}\n\nDate: [BusinessStartDate]\nClient: [CompanyName] (Reg No: [RegistrationNo])\n\n1. Scope of Services\n[ServiceDetails]\n\n2. Professional Investment\n[ProposalPriceSummary]\n\nYours sincerely,\n[ServiceManager]\n[PracticeName]`;
                  let defaultEmailBody = `Dear [ContactFirstName],\n\nPlease see attached ${docStep1Form.templateName} for [CompanyName].\n\nBest regards,\n[PracticeName]`;

                  if (docStep1Form.templateType.includes("Disengagement")) {
                    defaultLetterBody = `Dear Directors,\n\nDISENGAGEMENT OF PROFESSIONAL SERVICES\n\nFollowing our decision that we will no longer act in connection with your taxation and statutory affairs for [CompanyName], we are writing to confirm our understanding of remaining responsibilities.\n\n1. The last accounts submitted was for the period ending [BookStartDate].\n2. The last tax return submitted was for the accounting period ended [BookStartDate].\n3. You will be responsible for the agreement of all future statutory filings.\n\nYours sincerely,\n[ServiceManager]\n[PracticeName]`;
                    defaultEmailBody = `Dear Directors,\n\nPlease find attached the formal disengagement notice for [CompanyName].\n\nRegards,\n[PracticeName]`;
                  }

                  setActiveDocForm({
                    id: null,
                    title: docStep1Form.templateName.trim(),
                    fileName: docStep1Form.templateName.trim(),
                    templateType: docStep1Form.templateType,
                    docType: "Custom",
                    version: "2026.1",
                    content: defaultLetterBody,
                    emailSubject: `${docStep1Form.templateName.trim()} for [CompanyName]`,
                    emailBody: defaultEmailBody,
                  });

                  setShowDocStep1Modal(false);
                  setDocEditorTab("letter");
                  setShowDocEditorModal(true);
                }}
                className="px-6 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT TEMPLATES - CREATE CUSTOM CATEGORY MODAL                         */}
      {/* ========================================================================= */}
      {showDocCategoryModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Create Custom Template Category</h3>
              <button
                onClick={() => setShowDocCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Custom Template Category Name *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Payroll SLA Agreement"
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-900 font-medium focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDocCategoryModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    setCustomDocCategories([...customDocCategories, newCategoryName.trim()]);
                    setDocStep1Form({ ...docStep1Form, templateType: newCategoryName.trim() });
                    setNewCategoryName("");
                    setShowDocCategoryModal(false);
                    toast({ title: "Category Added", description: `Added "${newCategoryName.trim()}" category.` });
                  }
                }}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded font-semibold transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT TEMPLATES - STEP 2 FULL WYSIWYG EDITOR MODAL (1:1 with img_5.png) */}
      {/* ========================================================================= */}
      {showDocEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full border border-slate-200 p-6 space-y-4 animate-in fade-in text-xs max-h-[92vh] flex flex-col">
            {/* Modal Title & Close Button */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {activeDocForm.id ? "Edit Template" : "New Template"}
              </h3>
              <button
                onClick={() => setShowDocEditorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Sub-tabs inside Modal (Letter Document vs Email - Matching img_5.png) */}
            <div className="flex items-center space-x-8 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDocEditorTab("letter")}
                className={`pb-1 text-sm font-semibold transition cursor-pointer ${
                  docEditorTab === "letter"
                    ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeDocForm.title || activeDocForm.fileName || "Letter Document"}
              </button>
              <button
                type="button"
                onClick={() => setDocEditorTab("email")}
                className={`pb-1 text-sm font-semibold transition cursor-pointer ${
                  docEditorTab === "email"
                    ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Email
              </button>
            </div>

            {/* 2-Column Layout (Matching img_5.png 1:1) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto flex-1 pr-1 items-start">
              {/* Left Column (8 Columns / ~65%): Toolbar + Document Content */}
              <div className="lg:col-span-8 space-y-3">
                {docEditorTab === "letter" ? (
                  <div className="space-y-2">
                    {/* Simulated CKEditor Toolbar (Matching img_5.png) */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-300 rounded text-slate-700 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const ta = document.getElementById("letterBodyTextarea") as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const text = ta.value;
                            const sel = text.substring(start, end);
                            ta.value = text.substring(0, start) + `**${sel}**` + text.substring(end);
                            setActiveDocForm({ ...activeDocForm, content: ta.value });
                          }
                        }}
                        className="p-1 px-1.5 hover:bg-slate-200 rounded font-bold"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ta = document.getElementById("letterBodyTextarea") as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const text = ta.value;
                            const sel = text.substring(start, end);
                            ta.value = text.substring(0, start) + `*${sel}*` + text.substring(end);
                            setActiveDocForm({ ...activeDocForm, content: ta.value });
                          }
                        }}
                        className="p-1 px-1.5 hover:bg-slate-200 rounded italic font-serif"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ta = document.getElementById("letterBodyTextarea") as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const text = ta.value;
                            const sel = text.substring(start, end);
                            ta.value = text.substring(0, start) + `<u>${sel}</u>` + text.substring(end);
                            setActiveDocForm({ ...activeDocForm, content: ta.value });
                          }
                        }}
                        className="p-1 px-1.5 hover:bg-slate-200 rounded underline"
                        title="Underline"
                      >
                        U
                      </button>
                      <div className="h-4 w-px bg-slate-300 mx-1" />
                      <select className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] bg-white text-slate-700">
                        <option>Styles</option>
                        <option>Heading 1</option>
                        <option>Heading 2</option>
                      </select>
                      <select className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] bg-white text-slate-700">
                        <option>Format</option>
                        <option>Normal</option>
                        <option>Blockquote</option>
                      </select>
                      <select className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] bg-white text-slate-700">
                        <option>Font</option>
                        <option>Arial</option>
                        <option>Times New Roman</option>
                        <option>Courier New</option>
                      </select>
                      <select className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px] bg-white text-slate-700">
                        <option>Size</option>
                        <option>10pt</option>
                        <option>11pt</option>
                        <option>12pt</option>
                        <option>14pt</option>
                      </select>
                    </div>

                    {/* Rich Editor Textarea */}
                    <textarea
                      id="letterBodyTextarea"
                      rows={14}
                      value={activeDocForm.content}
                      onChange={(e) => setActiveDocForm({ ...activeDocForm, content: e.target.value })}
                      placeholder="Type your letter content and insert merge tokens from the right panel..."
                      className="w-full border border-slate-300 rounded p-4 font-sans text-xs text-slate-800 leading-relaxed focus:ring-1 focus:ring-purple-500 focus:outline-hidden shadow-2xs"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Companion Email Subject *</label>
                      <input
                        type="text"
                        value={activeDocForm.emailSubject}
                        onChange={(e) => setActiveDocForm({ ...activeDocForm, emailSubject: e.target.value })}
                        placeholder="e.g. Letter of Engagement for [CompanyName]"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-purple-700 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Companion Email Body *</label>
                      <textarea
                        id="companionEmailTextarea"
                        rows={12}
                        value={activeDocForm.emailBody}
                        onChange={(e) => setActiveDocForm({ ...activeDocForm, emailBody: e.target.value })}
                        placeholder="Type the message accompanying this letter..."
                        className="w-full border border-slate-300 rounded p-3 font-sans text-xs text-slate-800 leading-relaxed focus:ring-1 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (4 Columns / ~35%): "Choose Tokens" Panel (Exact 1:1 Match with img_5.png) */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-xs self-start">
                <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                  Choose Tokens
                </h4>

                {/* 1. Client Tags */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800">Client Tags</h5>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      "CompanyID",
                      "CompanyName",
                      "Email",
                      "CompanyType",
                      "Address",
                      "Phone",
                      "Website",
                      "RegistrationNo",
                      "BusinessStartDate",
                      "BookStartDate",
                      "UTRNo",
                      "OfficeRefNo",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const tagStr = `[${tag}]`;
                          if (docEditorTab === "letter") {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              content: prev.content + ` ${tagStr} `,
                            }));
                          } else {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              emailBody: prev.emailBody + ` ${tagStr} `,
                            }));
                          }
                          toast({ title: "Tag Inserted", description: `Added ${tagStr} to template.` });
                        }}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-left font-mono text-[11px] transition flex items-center justify-between"
                      >
                        <span>{tag}</span>
                        <Plus size={11} className="text-sky-600 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Contact Tags */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-800">Contact Tags</h5>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      "ContactFirstName",
                      "ContactMiddleName",
                      "ContactLastName",
                      "ContactPhoneNumber",
                      "ContactEmail",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const tagStr = `[${tag}]`;
                          if (docEditorTab === "letter") {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              content: prev.content + ` ${tagStr} `,
                            }));
                          } else {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              emailBody: prev.emailBody + ` ${tagStr} `,
                            }));
                          }
                          toast({ title: "Tag Inserted", description: `Added ${tagStr} to template.` });
                        }}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-left font-mono text-[11px] transition flex items-center justify-between"
                      >
                        <span>{tag}</span>
                        <Plus size={11} className="text-sky-600 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Letter Tags */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-800">Letter Tags</h5>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      "PracticeName",
                      "CompanyName",
                      "ServiceDetails",
                      "ServicePriceDetails",
                      "ServiceStart",
                      "ServiceManager",
                      "ClientName",
                      "ProposalPriceSummary",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const tagStr = `[${tag}]`;
                          if (docEditorTab === "letter") {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              content: prev.content + ` ${tagStr} `,
                            }));
                          } else {
                            setActiveDocForm((prev: any) => ({
                              ...prev,
                              emailBody: prev.emailBody + ` ${tagStr} `,
                            }));
                          }
                          toast({ title: "Tag Inserted", description: `Added ${tagStr} to template.` });
                        }}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-left font-mono text-[11px] transition flex items-center justify-between"
                      >
                        <span>{tag}</span>
                        <Plus size={11} className="text-sky-600 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDocEditorModal(false)}
                className="px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveDocTemplateMutation.isPending}
                onClick={() => saveDocTemplateMutation.mutate(activeDocForm)}
                className="px-6 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Save size={13} />
                <span>{saveDocTemplateMutation.isPending ? "Saving..." : "Save Template"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT TEMPLATE PREVIEW MODAL                                           */}
      {/* ========================================================================= */}
      {showDocPreviewModal && previewDocData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full border border-slate-200 p-6 space-y-4 animate-in fade-in text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Document Preview: {previewDocData.fileName || previewDocData.title}
                </h3>
              </div>
              <button
                onClick={() => setShowDocPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Merged Document Simulation */}
            <div className="bg-white border border-slate-200 rounded p-6 shadow-xs overflow-y-auto flex-1 font-serif text-slate-800 text-[13px] leading-relaxed whitespace-pre-line">
              {(previewDocData.content || "")
                .replace(/\[ContactFirstName\]/g, clientsList[0]?.clientName?.split(" ")[0] || "Client")
                .replace(/\[ContactLastName\]/g, clientsList[0]?.clientName?.split(" ")[1] || "Representative")
                .replace(/\[CompanyName\]/g, clientsList[0]?.clientName || firmName || "Client Business Ltd")
                .replace(/\[RegistrationNo\]/g, clientsList[0]?.registrationNumber || "12345678")
                .replace(/\[UTRNo\]/g, clientsList[0]?.utrNumber || "9876543210")
                .replace(/\[BusinessStartDate\]/g, clientsList[0]?.businessStartDate || new Date().toLocaleDateString("en-GB"))
                .replace(/\[BookStartDate\]/g, clientsList[0]?.yearEndFilingDate || new Date().toLocaleDateString("en-GB"))
                .replace(/\[PracticeName\]/g, firmName || "San Accounts Ltd.")
                .replace(/\[ServiceManager\]/g, teamMembers[0]?.name || "Practice Manager")
                .replace(/\[ServiceDetails\]/g, "• Statutory Year-End Accounts (FRS 102 Section 1A)\n• Corporation Tax Return (CT600)\n• Quarterly MTD VAT Returns & Confirmation Statement (CS01)")
                .replace(/\[ProposalPriceSummary\]/g, "• Fixed Monthly Retainer: £250.00 + VAT per month\n• Total Annual Investment: £3,000.00 + VAT")}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowDocPreviewModal(false)}
                className="px-5 py-2 bg-[#6c5ce7] text-white rounded font-semibold shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONBOARDING MODAL                                                          */}
      {/* ========================================================================= */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Onboarding Verification Check ({onboardingEntityType})</h3>
              <button onClick={() => setShowOnboardingModal(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Criteria / Requirement Description *</label>
                <input
                  type="text"
                  value={newOnboardingCriteriaTitle}
                  onChange={(e) => setNewOnboardingCriteriaTitle(e.target.value)}
                  placeholder="e.g. Verify Director Photographic ID & Passport"
                  className="w-full border border-slate-300 rounded px-3 py-1.5"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="onbReq"
                  checked={newOnboardingRequired}
                  onChange={(e) => setNewOnboardingRequired(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="onbReq" className="font-semibold text-slate-700 cursor-pointer">
                  Mandatory Check for Client Clearance
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setShowOnboardingModal(false)} className="px-3 py-1.5 border border-slate-300 rounded">Cancel</button>
              <button
                onClick={() => {
                  if (!newOnboardingCriteriaTitle.trim()) return;
                  const current = onboardingCriteria[onboardingEntityType] || [];
                  const updated = [
                    ...current,
                    { title: newOnboardingCriteriaTitle.trim(), isRequired: newOnboardingRequired },
                  ];
                  saveOnboardingMutation.mutate({ entityType: onboardingEntityType, criteriaList: updated });
                }}
                className="px-4 py-1.5 bg-[#6c5ce7] text-white rounded font-semibold"
              >
                Add Requirement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RISK ASSESSMENT MODAL                                                     */}
      {/* ========================================================================= */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Add Risk Assessment Criteria ({riskEntityType})</h3>
              <button onClick={() => setShowRiskModal(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Risk Description *</label>
                <input
                  type="text"
                  value={riskForm.title}
                  onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                  placeholder="e.g. PEP / Sanctions List Screening Check"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Risk Category</label>
                <select
                  value={riskForm.category}
                  onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                >
                  <option value="Client Risk">Client Risk</option>
                  <option value="Geographic Risk">Geographic Risk</option>
                  <option value="Sector Risk">Sector Risk</option>
                  <option value="Structure Risk">Structure Risk</option>
                  <option value="Standard Risk">Standard Risk</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Weight</label>
                  <select
                    value={riskForm.riskWeight}
                    onChange={(e) => setRiskForm({ ...riskForm, riskWeight: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Due Diligence</label>
                  <select
                    value={riskForm.riskLevel}
                    onChange={(e) => setRiskForm({ ...riskForm, riskLevel: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                  >
                    <option value="Enhanced">Enhanced</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setShowRiskModal(false)} className="px-3 py-1.5 border border-slate-300 rounded">Cancel</button>
              <button
                onClick={() => {
                  if (!riskForm.title.trim()) return;
                  const current = riskCriteria[riskEntityType] || [];
                  const updated = [...current, riskForm];
                  saveRiskMutation.mutate({ entityType: riskEntityType, criteriaList: updated });
                }}
                className="px-4 py-1.5 bg-[#6c5ce7] text-white rounded font-semibold"
              >
                Save Risk Criteria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD BANK ACCOUNT MODAL (Capium Screenshot 3: 9000172239 img_3.png)        */}
      {/* ========================================================================= */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-5 animate-in fade-in text-xs">
            {/* Modal Header with Back Arrow and Title */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Landmark size={16} className="text-purple-600" />
                  <span>Add Bank Account</span>
                </h3>
              </div>
              <button onClick={() => setShowAddBankModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Inputs matching Screenshot 3 */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={bankAccountForm.bankName}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                  placeholder="e.g. Barclays Bank UK PLC, HSBC UK, Lloyds"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Type</label>
                  <select
                    value={bankAccountForm.accountType}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountType: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white font-medium text-xs"
                  >
                    <option value="Current">Current</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Savings">Savings</option>
                    <option value="Client Account">Client Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Currency</label>
                  <select
                    value={bankAccountForm.currency}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, currency: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white font-medium text-xs"
                  >
                    <option value="Pound Sterling">Pound Sterling (£ GBP)</option>
                    <option value="Euro">Euro (€ EUR)</option>
                    <option value="US Dollar">US Dollar ($ USD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Account Code</label>
                <input
                  type="text"
                  value={bankAccountForm.accountCode}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountCode: e.target.value })}
                  placeholder="5242"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sort/ Branch Code *</label>
                  <input
                    type="text"
                    value={bankAccountForm.sortCode}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, sortCode: e.target.value })}
                    placeholder="20-00-00"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-purple-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account No. *</label>
                  <input
                    type="text"
                    value={bankAccountForm.accountNumber}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                    placeholder="88776655"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">IBAN (International)</label>
                  <input
                    type="text"
                    value={bankAccountForm.iban}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, iban: e.target.value })}
                    placeholder="GB29BARC20000088776655"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">BIC / SWIFT</label>
                  <input
                    type="text"
                    value={bankAccountForm.bicSwift}
                    onChange={(e) => setBankAccountForm({ ...bankAccountForm, bicSwift: e.target.value })}
                    placeholder="BARCGB22"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bankAccountForm.bankName.trim()) {
                    toast({ title: "Validation Error", description: "Bank name is required.", variant: "destructive" });
                    return;
                  }
                  saveBankMutation.mutate(bankAccountForm);
                }}
                disabled={saveBankMutation.isPending}
                className="px-6 py-2 bg-[#2d87e2] hover:bg-[#2072c4] text-white rounded font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Save size={14} /> Save Bank Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD DOC TEMPLATE MODAL (Capium Screenshot 1: 9000195170 img_1.png)         */}
      {/* ========================================================================= */}
      {showAddDocTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileText size={16} className="text-purple-600" />
                <span>Add Doc Invoice Template</span>
              </h3>
              <button onClick={() => setShowAddDocTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Template Name *</label>
                <input
                  type="text"
                  value={docTemplateForm.templateName}
                  onChange={(e) => setDocTemplateForm({ ...docTemplateForm, templateName: e.target.value })}
                  placeholder="e.g. Executive Corporate Template"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Default Bank</label>
                <select
                  value={docTemplateForm.bankName}
                  onChange={(e) => setDocTemplateForm({ ...docTemplateForm, bankName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white"
                >
                  <option value="N/A">N/A</option>
                  {banksList.map((b: any) => (
                    <option key={b.id || b.bankName} value={b.bankName}>
                      {b.bankName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Upload Word Document (.docx)</label>
                <div className="border-2 border-dashed border-slate-300 rounded p-4 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
                  <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                  <span className="text-slate-600 font-medium">{docTemplateForm.fileName || "Choose file to upload"}</span>
                  <input
                    type="file"
                    accept=".docx,.doc"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocTemplateForm({
                          ...docTemplateForm,
                          fileName: file.name,
                          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!docTemplateForm.isDefault}
                    onChange={(e) => setDocTemplateForm({ ...docTemplateForm, isDefault: e.target.checked })}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-slate-700">Set as Default Template</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddDocTemplateModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!docTemplateForm.templateName.trim()) {
                    toast({ title: "Error", description: "Template name is required.", variant: "destructive" });
                    return;
                  }
                  saveDocInvoiceTemplateMutation.mutate(docTemplateForm);
                }}
                className="px-5 py-1.5 bg-[#2d87e2] hover:bg-[#2072c4] text-white rounded font-semibold shadow-xs"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INVOICE FULL PRINT PREVIEW MODAL (Exact Capium 1:1 Alignment)             */}
      {/* ========================================================================= */}
      {showInvoicePreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full border border-slate-200 p-6 space-y-4 animate-in fade-in text-xs max-h-[92vh] overflow-y-auto">
            {/* Modal Header matching Screenshot */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">
                Preview Invoice
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoicePreviewModal(false)}
                className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Printable / Preview Invoice Canvas matching Capium Screenshot */}
            <div className="bg-white border border-slate-200 p-8 rounded-xs shadow-xs space-y-5 text-slate-800 font-sans">
              {/* Row 1: Practice Legal Details on the Right */}
              <div className="flex justify-between items-start">
                <div>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="max-h-12 max-w-[140px] object-contain" />
                  ) : null}
                </div>

                <div className="text-right space-y-0.5 text-[11px]">
                  <div
                    className="font-bold text-sm"
                    style={{ color: pdfForm.primaryColor || "#0ea5e9" }}
                  >
                    {firmName || "Practice Name"}
                  </div>
                  {firm?.address && <div className="text-slate-600">{firm.address}</div>}
                  {firm?.city && <div className="text-slate-600">{firm.city}</div>}
                  {firm?.country && <div className="text-slate-600">{firm.country}</div>}
                  {phone && <div className="text-slate-600 font-mono">{phone}</div>}
                </div>
              </div>

              {/* Row 2: Full-Width Theme Colored Title Banner */}
              <div
                className="w-full py-2.5 px-6 rounded-xs flex items-center justify-end shadow-2xs"
                style={{ backgroundColor: pdfForm.primaryColor || "#0ea5e9" }}
              >
                <span className="text-2xl font-bold tracking-wide text-white font-sans">
                  {pdfForm.titleInvoice || "Invoice"}
                </span>
              </div>

              {/* Row 3: Client Info on Left & Metadata on Right */}
              <div className="grid grid-cols-2 gap-8 text-[11px] pt-1">
                {/* Left: Customer Info */}
                <div className="space-y-0.5">
                  <div
                    className="font-bold text-xs pb-0.5"
                    style={{ color: pdfForm.primaryColor || "#0ea5e9" }}
                  >
                    Invoice to customer
                  </div>
                  <div className="font-semibold text-slate-900">{clientsList[0]?.clientName || "Client Name"}</div>
                  {clientsList[0]?.addressLine1 && <div className="text-slate-600">{clientsList[0].addressLine1}</div>}
                  {clientsList[0]?.townCity && <div className="text-slate-600">{clientsList[0].townCity}</div>}
                  {clientsList[0]?.postcode && <div className="text-slate-600">{clientsList[0].postcode}</div>}
                </div>


                {/* Right: Invoice Metadata */}
                <div className="space-y-1.5 text-right font-mono text-[11px]">
                  <div className="flex justify-end gap-6 text-slate-700">
                    <span className="font-sans text-slate-500 min-w-[80px]">Invoice No.</span>
                    <span className="font-semibold">INV-1</span>
                  </div>
                  <div className="flex justify-end gap-6 text-slate-700">
                    <span className="font-sans text-slate-500 min-w-[80px]">Invoice Date</span>
                    <span>01/09/2026</span>
                  </div>
                  <div className="flex justify-end gap-6 text-slate-700">
                    <span className="font-sans text-slate-500 min-w-[80px]">Due Date</span>
                    <span>01/09/2026</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Line Items Table matching Capium Columns & Color */}
              <div className="pt-2">
                <table className="w-full text-left text-[11px] border-t border-b border-slate-200">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold">
                      <th className="py-2.5 px-2" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>Description</th>
                      <th className="py-2.5 px-2 text-right" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>Unit Price</th>
                      <th className="py-2.5 px-2 text-right" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>Quantity</th>
                      <th className="py-2.5 px-2 text-right" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>Net Amount</th>
                      <th className="py-2.5 px-2 text-center" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>VAT Rate</th>
                      <th className="py-2.5 px-2 text-right" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>VAT Amount</th>
                      <th className="py-2.5 px-2 text-right" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="py-2.5 px-2 font-sans text-slate-800">Item1</td>
                      <td className="py-2.5 px-2 text-right">100.00</td>
                      <td className="py-2.5 px-2 text-right">1.00</td>
                      <td className="py-2.5 px-2 text-right">100.00</td>
                      <td className="py-2.5 px-2 text-center font-sans">Reduced (5%)</td>
                      <td className="py-2.5 px-2 text-right">5.00</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900">105.00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-2 font-sans text-slate-800">Item2</td>
                      <td className="py-2.5 px-2 text-right">150.00</td>
                      <td className="py-2.5 px-2 text-right">1.00</td>
                      <td className="py-2.5 px-2 text-right">150.00</td>
                      <td className="py-2.5 px-2 text-center font-sans">Standard (20%)</td>
                      <td className="py-2.5 px-2 text-right">30.00</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900">180.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Row 5: Notes on Left & Totals Breakdown on Right */}
              <div className="flex justify-between items-start pt-2 text-[11px]">
                {/* Notes */}
                <div className="text-slate-600">
                  <span className="font-bold text-slate-700">Notes:</span> Invoice reference
                </div>

                {/* Totals */}
                <div className="w-56 space-y-1 font-mono text-[11px] text-right">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Net Amount:</span>
                    <span>£250.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">VAT Amount:</span>
                    <span>£35.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                    <span className="font-sans">Total Amount:</span>
                    <span style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>£285.00</span>
                  </div>
                </div>
              </div>

              {/* Row 6: Receipts Table on Left & Due Amount on Right */}
              <div className="flex justify-between items-start pt-4 border-t border-slate-200 text-[11px]">
                {/* Receipts Sub-table */}
                <div className="space-y-1.5 w-72">
                  <div className="font-bold text-slate-700">Receipts</div>
                  <table className="w-full text-left text-[10px] border border-slate-200">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-1.5">No.</th>
                        <th className="p-1.5">Date</th>
                        <th className="p-1.5">Account</th>
                        <th className="p-1.5 text-right">Paid Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr>
                        <td className="p-1.5">REC-1</td>
                        <td className="p-1.5">05/06/2014</td>
                        <td className="p-1.5 font-sans">Cash in Hand</td>
                        <td className="p-1.5 text-right font-bold">£200.00</td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t border-slate-200 font-bold bg-slate-50/50">
                      <tr>
                        <td colSpan={3} className="p-1.5 text-right font-sans">Total:</td>
                        <td className="p-1.5 text-right font-mono" style={{ color: pdfForm.primaryColor || "#0ea5e9" }}>£200.00</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Due Amount Box */}
                <div
                  className="px-4 py-2 rounded-xs border text-xs font-bold flex items-center gap-3"
                  style={{
                    borderColor: pdfForm.primaryColor || "#0ea5e9",
                    color: pdfForm.primaryColor || "#0ea5e9",
                    backgroundColor: `${pdfForm.primaryColor || "#0ea5e9"}10`,
                  }}
                >
                  <span className="font-sans">Due Amount:</span>
                  <span className="font-mono text-sm">£85.00</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicePreviewModal(false)}
                className="px-4 py-1.5 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 text-xs transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM TASK CHECKLIST STEP MODAL (Replacing browser prompt)               */}
      {/* ========================================================================= */}
      {stepModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#6c5ce7]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {stepModal.mode === "add" ? `Add Step - ${stepModal.groupTitle || "Checklist"}` : "Edit Checklist Step"}
                </h3>
              </div>
              <button
                onClick={() => setStepModal({ ...stepModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Step Description / Action Item *
                </label>
                <textarea
                  rows={3}
                  value={stepModal.title}
                  onChange={(e) => setStepModal({ ...stepModal, title: e.target.value })}
                  placeholder="e.g. Request / chase client records for the quarter"
                  className="w-full border border-slate-300 rounded p-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-[#6c5ce7] focus:outline-hidden leading-relaxed"
                  autoFocus
                />
              </div>

              {stepModal.groupTitle && (
                <div className="p-2 bg-purple-50 border border-purple-100 rounded text-[11px] text-purple-800 flex items-center gap-1.5">
                  <Info size={13} className="shrink-0" />
                  <span>Target Checklist Group: <strong>{stepModal.groupTitle}</strong></span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStepModal({ ...stepModal, isOpen: false })}
                className="px-4 py-2 border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStepModal}
                className="px-5 py-2 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Save size={13} />
                <span>{stepModal.mode === "add" ? "Add Step" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Media Library Modal for practice logo */}
      <GlobalMediaLibraryModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelectFile={(file) => {
          setLogoPreview(file.url || null);
          setShowMediaModal(false);
        }}
      />
    </AppLayout>
  );
}
