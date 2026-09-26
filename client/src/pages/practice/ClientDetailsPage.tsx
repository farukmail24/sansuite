import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  ArrowLeft, Building2, User, Users, Phone, Mail,
  Calendar, CheckCircle2, AlertCircle, Clock,
  FileText, Plus, Edit2, Shield, FileSignature,
  DollarSign, CheckSquare, MessageSquare, Send,
  Globe, MapPin, Tag, Filter, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  Layers, ExternalLink, RefreshCw, Paperclip, Upload,
  Bold, Italic, Underline, List, ListOrdered, Code,
  Info, Smartphone, TicketCheck, Eye, ShieldCheck, SlidersHorizontal,
  Trash2, ShieldAlert, Copy, Download, AlertTriangle, Landmark, FileCheck,
  FolderOpen, Folder, GraduationCap, Award, Check
} from "lucide-react";
import GlobalMediaLibraryModal, { MediaFile } from "../../components/common/GlobalMediaLibraryModal";
import Hmrc648Modal from "../../components/practice/Hmrc648Modal";
import { apiRequest } from "../../lib/queryClient";
import { useAuth } from "../../hooks/useAuth";
import {
  parseSicCodes,
  getCompanyTypeLabel,
  getCompanyStatusLabel,
  getStatusBadgeClass,
  getAccountTypeLabel,
  getOfficerRoleLabel,
  getJurisdictionLabel,
} from "../../lib/chEnumerations";


export default function ClientDetailsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const currentUserName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : "Practice Team";


  // Match /practice/clients/:id
  const [, params] = useRoute("/practice/clients/:id");
  const clientId = params?.id ? parseInt(params.id) : 1;

  // Active Main Tab: "timeline" | "onboarding" | "workspace" | "schedule" | "details" | "settings"
  const [activeTab, setActiveTab] = useState<string>("timeline");

  // Sub-tabs Horizontal Scrolling without Scrollbar
  const clientDetailsTabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabScroll = () => {
    const el = clientDetailsTabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    const el = clientDetailsTabsRef.current;
    if (!el) return;
    checkTabScroll();
    el.addEventListener("scroll", checkTabScroll, { passive: true });
    window.addEventListener("resize", checkTabScroll);
    return () => {
      el.removeEventListener("scroll", checkTabScroll);
      window.removeEventListener("resize", checkTabScroll);
    };
  }, [clientDetailsTabsRef, activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    if (clientDetailsTabsRef.current) {
      clientDetailsTabsRef.current.scrollBy({
        left: direction === "left" ? -180 : 180,
        behavior: "smooth"
      });
    }
  };

  // Timeline Sub-Tab: "all" (Activity) | "notes" | "email" | "sms" | "requests"
  const [timelineSubTab, setTimelineSubTab] = useState<string>("all");

  // Timeline Timeframe Filter: "24h" | "7d" | "30d" | "all"
  const [timeframeFilter, setTimeframeFilter] = useState<string>("all");

  // Selected Timeline Topics Filter
  const ALL_TOPICS = [
    "Notes", "Documents", "Tasks", "Deadlines",
    "Events", "Users", "Conversations", "Service",
    "TimeCapture", "Client Details", "Invoice", "SMS"
  ];
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Note Composer State (Screenshot 1)
  const [noteContent, setNoteContent] = useState("");

  // Email Composer State (Screenshot 2)
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    subject: "",
    priority: "Normal",
    message: "",
  });
  const [isEmailMediaModalOpen, setIsEmailMediaModalOpen] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<Array<{
    id: string;
    name: string;
    size: string;
    type: string;
    url?: string;
    source: "upload" | "media_library";
    base64?: string;
  }>>([]);

  // SMS Modal State (Screenshot 3)
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsForm, setSmsForm] = useState({
    senderId: "SanSuite",
    to: "",
    phone: "",
    template: "",
    body: "",
    queueOption: "send",
  });

  // Client Request / Ticket Modal State (Screenshot 4)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isTicketMediaModalOpen, setIsTicketMediaModalOpen] = useState(false);
  const [ticketAttachments, setTicketAttachments] = useState<Array<{
    id: string;
    name: string;
    size: string;
    type: string;
    url?: string;
    source: "upload" | "media_library";
    base64?: string;
  }>>([]);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    clientUser: "",
    file: null as any,
  });

  // Onboarding Accordion States
  const [openAccordion, setOpenAccordion] = useState<string | null>("compliance-checks");
  const [onboardingSearch, setOnboardingSearch] = useState("");
  const [amlSearch, setAmlSearch] = useState("");

  // AML / Electronic Gateway Configuration State (Dilisense & Xama Tech)
  const [isAmlConfigModalOpen, setIsAmlConfigModalOpen] = useState(false);
  const [isScreeningRunning, setIsScreeningRunning] = useState(false);
  const [amlGatewayConfig, setAmlGatewayConfig] = useState({
    provider: "Dilisense (Sanctions & PEP Screening)",
    apiKey: "",
    accountId: "",
    isConfigured: false,
  });

  // HMRC 64-8 Agent Authorisations State & Queries
  const [is648ModalOpen, setIs648ModalOpen] = useState(false);
  const [isAddAuthModalOpen, setIsAddAuthModalOpen] = useState(false);
  const [authForm, setAuthForm] = useState({
    serviceType: "Corporation Tax",
    status: "Authorized",
    codeStatus: "Code Verified",
    agentReference: "",
    notes: "",
  });

  const { data: agentAuthorizations = [], refetch: refetchAuthorizations } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/authorizations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/authorizations`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const createAuthMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/authorizations`, payload);
      if (!res.ok) throw new Error("Failed to add authorisation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/authorizations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/64-8-data`] });
      setIsAddAuthModalOpen(false);
      setAuthForm({
        serviceType: "Corporation Tax",
        status: "Authorized",
        codeStatus: "Code Verified",
        agentReference: "",
        notes: "",
      });
      toast({ title: "Authorisation Saved", description: "HMRC 64-8 regime registered." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to Save", description: err.message, variant: "destructive" });
    },
  });

  const deleteAuthMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/clients/${clientId}/authorizations/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/authorizations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/64-8-data`] });
      toast({ title: "Authorisation Removed" });
    },
  });

  // Fetch saved AML settings from DB to pre-populate the modal
  const { data: savedAmlSettings } = useQuery<any>({
    queryKey: ["/api/aml/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/settings");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Sync amlGatewayConfig state whenever DB data loads/changes
  useEffect(() => {
    if (!savedAmlSettings?.isPracticeCustomized) return;
    const d = savedAmlSettings;
    let provider = "Dilisense (Sanctions & PEP Screening)";
    let apiKey = d.dilisenseKey || "";
    let accountId = "";
    if (d.defaultProvider === "xama") {
      provider = "Xama Technologies (Practice AML & Biometric IDV)";
      apiKey = d.xamaKey || "";
      accountId = d.xamaAccountId || "";
    } else if (d.defaultProvider === "veriphy") {
      provider = "Veriphy (Davies Group - UK)";
      apiKey = d.veriphyKey || "";
      accountId = d.veriphyAccountId || "";
    } else if (d.defaultProvider === "opensanctions") {
      provider = "OpenSanctions (Open Source & Free)";
      apiKey = d.openSanctionsKey || "";
    }
    setAmlGatewayConfig({ provider, apiKey, accountId, isConfigured: true });
  }, [savedAmlSettings]);

  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestAmlConnection = async () => {
    setIsTestingConnection(true);
    try {
      const res = await apiRequest("POST", "/api/pm/aml/test-connection", {
        provider: amlGatewayConfig.provider,
        apiKey: amlGatewayConfig.apiKey,
        accountId: amlGatewayConfig.accountId,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "API Connection Verified",
          description: data.message,
        });
      } else {
        toast({
          title: "Connection Rejected",
          description: data.message || "Failed to authenticate with provider API.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Connection Error",
        description: e.message || "Failed to reach AML Gateway endpoint.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveAmlGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const provLower = amlGatewayConfig.provider.toLowerCase();
      const payload: any = {};
      if (provLower.includes("dilisense")) {
        payload.dilisenseApiKey = amlGatewayConfig.apiKey;
        payload.defaultProvider = "dilisense";
      } else if (provLower.includes("xama")) {
        payload.xamaApiKey = amlGatewayConfig.apiKey;
        payload.xamaAccountId = amlGatewayConfig.accountId;
        payload.defaultProvider = "xama";
      } else if (provLower.includes("veriphy")) {
        payload.veriphyApiKey = amlGatewayConfig.apiKey;
        payload.veriphyAccountId = amlGatewayConfig.accountId;
        payload.defaultProvider = "veriphy";
      } else {
        payload.openSanctionsApiKey = amlGatewayConfig.apiKey;
        payload.defaultProvider = "opensanctions";
      }

      const res = await apiRequest("POST", "/api/aml/settings", payload);
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Gateway Connected & Saved",
          description: data.message || `${amlGatewayConfig.provider} API credentials saved to database successfully.`,
          type: "success",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/aml/settings"] });
        setIsAmlConfigModalOpen(false);
        setAmlGatewayConfig({ ...amlGatewayConfig, isConfigured: true });
      } else {
        toast({
          title: "Save Failed",
          description: data.message || "Failed to save gateway credentials.",
          type: "error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Save Error",
        description: err.message || "Failed to save gateway credentials.",
        variant: "destructive",
      });
    }
  };

  const handleRunElectronicAmlCheck = async () => {
    setIsScreeningRunning(true);
    try {
      const res = await apiRequest("POST", "/api/pm/aml/verify", {
        clientId: client.id,
        provider: amlGatewayConfig.provider,
        // apiKey intentionally omitted — backend always uses DB-saved practice key
      });
      const data = await res.json();
      if (res.ok && data.success) {
        queryClient.invalidateQueries({ queryKey: [`/api/pm/aml/${clientId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
        queryClient.invalidateQueries({ queryKey: ["/api/practice/clients"] });
        
        if (data.provider === "Xama Technologies") {
          toast({
            title: "Xama Onboarding Initiated",
            description: `Biometric verification link generated for ${client.clientName}.`,
            type: "info",
          });
        } else if (data.riskLevel === "High" || data.hasSanction || data.hasCriminal) {
          toast({
            title: "High Risk Sanctions Alert (Red)",
            description: data.message || `Active Sanction or Criminal record flagged for ${client.clientName}!`,
            type: "error",
            variant: "destructive",
          });
        } else if (data.riskLevel === "Medium" || data.hasPep) {
          toast({
            title: "Advisory Screening Alert (Yellow / Medium Risk)",
            description: data.message || `PEP or watchlist advisory match identified for ${client.clientName}.`,
            type: "warning",
          });
        } else {
          toast({
            title: "Dilisense Screening PASSED (Green / Clean)",
            description: data.message || `Zero active Sanctions, Criminal, or PEP matches. Low Risk Verified.`,
            type: "success",
          });
        }
      } else {
        toast({
          title: "AML Screening Error",
          description: data.message || "Failed to process electronic screening. Check API key configuration.",
          type: "error",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "AML Gateway Error",
        description: e.message || "Could not connect to AML Gateway API.",
        type: "error",
        variant: "destructive",
      });
    } finally {
      setIsScreeningRunning(false);
    }
  };

  // Edit Client Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [clientInfoForm, setClientInfoForm] = useState({
    clientName: "",
    clientCode: "",
    email: "",
    phone: "",
    clientType: "Limited",
    addressLine1: "",
    addressLine2: "",
    townCity: "",
    postcode: "",
    country: "United Kingdom",
    website: "",
  });

  const openEditClientInfoModal = () => {
    setClientInfoForm({
      clientName: client.clientName || "",
      clientCode: client.clientCode || `CLI${client.id}`,
      email: client.email || "",
      phone: client.phone || "",
      clientType: client.clientType || "Limited",
      addressLine1: client.addressLine1 || client.address || "",
      addressLine2: client.addressLine2 || "",
      townCity: client.city || client.townCity || "",
      postcode: client.postcode || "",
      country: client.country || "United Kingdom",
      website: client.website || "",
    });
    setIsEditModalOpen(true);
  };

  // Edit Criteria Modal State (Capium Screenshot 1)
  const [isEditCriteriaModalOpen, setIsEditCriteriaModalOpen] = useState(false);
  const [editingCriteriaForm, setEditingCriteriaForm] = useState({
    id: null as number | null,
    type: "aml" as "onboarding" | "aml",
    criteria: "",
    notes: "",
  });

  // New AML Criteria Modal State
  const [isNewAmlCriteriaModalOpen, setIsNewAmlCriteriaModalOpen] = useState(false);
  const [newAmlCriteriaForm, setNewAmlCriteriaForm] = useState({
    question: "",
    isChecked: true,
    notes: "-",
  });

  // Dedicated Print Document State ("aml" | "onboarding" | null)
  const [activePrintDoc, setActivePrintDoc] = useState<"aml" | "onboarding" | null>(null);

  // Add Contact Modal State (Capium Screenshot 2)
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [addContactForm, setAddContactForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    contactType: "Director",
    email: "",
    phone: "",
    idv: "",
    isPrimary: false,
  });

  // Assign Users Modal State (Capium Screenshot 3)
  const [isAssignUsersModalOpen, setIsAssignUsersModalOpen] = useState(false);
  const [assignUserSearch, setAssignUserSearch] = useState("");
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);


  // New Onboarding Criteria Modal State
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    criteria: "",
    notes: "",
    status: "Yes",
    todo: "Completed",
  });

  // Run Risk Assessment Modal State
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({
    riskLevel: "Low",
    notes: "Annual MLR statutory review. Director IDs, OFSI sanctions, and source of funds checked and verified clean.",
    nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  // KYC Document Vault & Media Library State
  const [isKycDocModalOpen, setIsKycDocModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [targetFolderForMedia, setTargetFolderForMedia] = useState<string>("Client-Shared-Docs");
  const [selectedKycFolder, setSelectedKycFolder] = useState<string>("All");
  const [kycSearch, setKycSearch] = useState<string>("");
  const [kycFolders, setKycFolders] = useState<string[]>([
    "Client-Shared-Docs",
    "Internal-Docs",
    "Accountant-Only",
  ]);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [kycDocForm, setKycDocForm] = useState({
    title: "",
    documentType: "ID Proof",
    fileSize: "1.2 MB",
    folder: "Client-Shared-Docs",
    fileUrl: "",
  });

  // AML Staff Training State
  const [isAmlTrainingModalOpen, setIsAmlTrainingModalOpen] = useState(false);
  const [editingAmlTrainingId, setEditingAmlTrainingId] = useState<number | null>(null);
  const [amlTrainingForm, setAmlTrainingForm] = useState({
    staffName: "",
    staffRole: "Assigned Accountant / MLRO",
    courseTitle: "",
    trainingProvider: "",
    certificateRef: "",
    certificateUrl: "",
    completedAt: new Date().toISOString().split("T")[0],
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "Certified Compliant",
    scorePercentage: 100,
    notes: "",
  });

  // Schedule & Meetings State (Capium Screenshot 1)
  const [meetingSearch, setMeetingSearch] = useState("");
  const [meetingGroupBy, setMeetingGroupBy] = useState("Group By Date");
  const [meetingDateFrom, setMeetingDateFrom] = useState("");
  const [meetingDateTo, setMeetingDateTo] = useState("");
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: "",
    host: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:30 AM",
    location: "Zoom Video Meeting",
    agenda: "",

  });
  // meetingsList is fetched from DB via useQuery — defined after clientId is available
  const [meetingsList, setMeetingsList] = useState<any[]>([]);


  // Details Tab Accordion & Sub-sections States (Capium Screenshots 2 to 6)
  const [detailsOpenAccordions, setDetailsOpenAccordions] = useState<string[]>([
    "client-info",
    "business-info",
    "social",
    "paye",
    "directors",
  ]);

  const toggleDetailsAccordion = (key: string) => {
    if (detailsOpenAccordions.includes(key)) {
      setDetailsOpenAccordions(detailsOpenAccordions.filter((k) => k !== key));
    } else {
      setDetailsOpenAccordions([...detailsOpenAccordions, key]);
    }
  };

  // Business Info edit modal state (empty — data comes from client object fetched from DB)
  const [isEditBusinessInfoModalOpen, setIsEditBusinessInfoModalOpen] = useState(false);
  const [businessInfoForm, setBusinessInfoForm] = useState({
    businessStartDate: "",
    bookStartDate: "",
    yearEnd: "",
    vatScheme: "",
    chAuthCode: "",
    sicCode: "",
  });

  // Social Links edit modal state (empty — data comes from client object)
  const [isEditSocialModalOpen, setIsEditSocialModalOpen] = useState(false);
  const [socialInfoForm, setSocialInfoForm] = useState({
    facebook: "",
    twitter: "",
    linkedin: "",
    gplus: "",
  });

  // PAYE Details edit modal state (empty — data comes from client object)
  const [isEditPayeModalOpen, setIsEditPayeModalOpen] = useState(false);
  const [payeInfoForm, setPayeInfoForm] = useState({
    payeEmployerName: "",
    payeReference: "",
    payeAccountsOfficeRef: "",
    payeHmrcOfficeNumber: "",
  });

  // Details Tab Sub-Tabs state
  const [detailsSubTab, setDetailsSubTab] = useState<
    "overview" | "statutory" | "officers" | "psc" | "filings" | "charges" | "paye"
  >("overview");

  // Directors / Officers modal state
  const [isAddDirectorModalOpen, setIsAddDirectorModalOpen] = useState(false);
  const [editingDirectorId, setEditingDirectorId] = useState<number | null>(null);
  const [directorForm, setDirectorForm] = useState({
    name: "",
    email: "",
    mobile: "",
    status: "Active",
  });

  // Shareholders / PSC modal state
  const [isAddShareholderModalOpen, setIsAddShareholderModalOpen] = useState(false);
  const [editingShareholderId, setEditingShareholderId] = useState<number | null>(null);
  const [shareholderForm, setShareholderForm] = useState({
    name: "",
    email: "",
    mobile: "",
    status: "Active",
  });


  // =========================================================
  // SETTINGS TAB ACCORDIONS & CONTROLS STATE (Capium 4 Screenshots)
  // =========================================================
  const [settingsOpenAccordions, setSettingsOpenAccordions] = useState<string[]>([
    "contacts",
    "services",
    "authorizations",
    "periods",
  ]);

  const toggleSettingsAccordion = (key: string) => {
    if (settingsOpenAccordions.includes(key)) {
      setSettingsOpenAccordions(settingsOpenAccordions.filter((k) => k !== key));
    } else {
      setSettingsOpenAccordions([...settingsOpenAccordions, key]);
    }
  };

  // Contacts search & filter
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsFilter, setContactsFilter] = useState("Show All");

  // Services search & filter & modal (Matching Customise Service Screen)
  // Services search & filter & modal (Matching Customise Service Screen)
  const [servicesSearch, setServicesSearch] = useState("");
  const [servicesFilter, setServicesFilter] = useState("Show All");
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [serviceModalTab, setServiceModalTab] = useState<"details" | "steps" | "reminders">("details");
  const [newServiceForm, setNewServiceForm] = useState({
    id: null as number | null,
    serviceTitle: "Custom Service",
    frequency: "Yearly",
    billable: true,
    fee: "50.00",
    estimatedHours: 2,
    serviceManager: "",
    isActive: true,
    addToCalendar: true,
    clientTypes: ["Limited", "Sole Trader"],
    steps: [
      { id: "s1", title: "Review trial balance & bank transactions", isMandatory: true },
      { id: "s2", title: "Reconcile VAT & payroll control accounts", isMandatory: true },
      { id: "s3", title: "Calculate statutory corporation tax / personal tax", isMandatory: true },
      { id: "s4", title: "Generate accounts pack & send for director signing", isMandatory: true },
      { id: "s5", title: "HMRC & Companies House gateway submission", isMandatory: true },
    ],
    reminders: [
      {
        id: "r1",
        timing: "1 Month prior to deadlines",
        staffUser: "",
        clientUser: "All Client Contacts",
        cc: "",
      },
      {
        id: "r2",
        timing: "1 Week prior to deadlines",
        staffUser: "",
        clientUser: "Primary Director",
        cc: "",
      },
    ],
    remindTeam: true,
    assignAll: false,
    customWorkflow: true,
  });

  // Agent Authorization search & filter & modal
  const [authSearch, setAuthSearch] = useState("");
  const [authStatusFilter, setAuthStatusFilter] = useState("All");
  const [authTypeFilter, setAuthTypeFilter] = useState("All");
  const [isNewAuthModalOpen, setIsNewAuthModalOpen] = useState(false);
  const [newAuthForm, setNewAuthForm] = useState({
    serviceType: "Corporation Tax",
    agentReference: "",
    notes: "Digital HMRC 64-8 Agent Authorization Request",
  });

  // Accounting Periods search & filter & modal
  const [periodSearch, setPeriodSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Show All");
  const [isAddPeriodModalOpen, setIsAddPeriodModalOpen] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    periodType: "Annual Accounts & CT600",
    periodStart: new Date().toISOString().split("T")[0],
    periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    statutoryDeadline: new Date(Date.now() + (365 + 270) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  // Dynamic Real Team Members from users table
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/team"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/team");
      return res.ok ? await res.json() : [];
    },
  });

  // Dynamic Meetings from DB (Schedule Tab)
  const { data: dbMeetings = [], refetch: refetchMeetings } = useQuery<any[]>({
    queryKey: [`/api/pm/meetings`, clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/meetings?clientId=${clientId}`);
      return res.ok ? await res.json() : [];
    },
  });

  const { data: tasksList = [] } = useQuery<any[]>({
    queryKey: [`/api/pm/tasks`, clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/tasks?clientId=${clientId}`);
      return res.ok ? await res.json() : [];
    },
    enabled: !!clientId
  });

  const { data: deadlinesList = [] } = useQuery<any[]>({
    queryKey: [`/api/pm/deadlines`, clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/deadlines?clientId=${clientId}`);
      return res.ok ? await res.json() : [];
    },
    enabled: !!clientId
  });

  // Sync meetingsList state with DB data
  useEffect(() => {
    if (dbMeetings.length > 0) setMeetingsList(dbMeetings);
  }, [dbMeetings]);

  // Dynamic Directors from contacts (Director type)
  const { data: directorsList = [], refetch: refetchDirectors } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/contacts`, "director"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/contacts`);
      if (!res.ok) return [];
      const all = await res.json();
      return all.filter((c: any) =>
        (c.contactType || "").toLowerCase() === "director"
      ).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email || "",
        mobile: c.phone || "",
        status: "Active",
      }));
    },
  });

  // Dynamic Shareholders from contacts (Shareholder type)
  const { data: shareholdersList = [], refetch: refetchShareholders } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/contacts`, "shareholder"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/contacts`);
      if (!res.ok) return [];
      const all = await res.json();
      return all.filter((c: any) =>
        (c.contactType || "").toLowerCase() === "shareholder"
      ).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email || "",
        mobile: c.phone || "",
        status: "Active",
      }));
    },
  });


  // Dynamic Settings Queries

  const { data: settingsContacts = [], refetch: refetchSettingsContacts } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/contacts`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/contacts`);
      return res.ok ? await res.json() : [];
    },
  });

  const { data: settingsServices = [], refetch: refetchSettingsServices } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/services`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/services`);
      return res.ok ? await res.json() : [];
    },
  });

  const { data: settingsAuthorizations = [], refetch: refetchSettingsAuths } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/authorizations`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/authorizations`);
      return res.ok ? await res.json() : [];
    },
  });

  const { data: settingsPeriods = [], refetch: refetchSettingsPeriods } = useQuery<any[]>({
    queryKey: [`/api/pm/clients/${clientId}/accounting-periods`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/accounting-periods`);
      return res.ok ? await res.json() : [];
    },
  });

  // Dynamic Settings Mutations
  const refreshChDataMutation = useMutation({
    mutationFn: async () => {
      if (!client.registrationNumber) {
        throw new Error("Missing Company Registration Number.");
      }
      const crn = client.registrationNumber.trim();
      const allRes = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(crn)}/all`);
      if (!allRes.ok) throw new Error("Failed to fetch complete Companies House profile");
      const bundle = await allRes.json();

      const fullProfile = bundle.profile || {};
      fullProfile.officers = bundle.officers || [];
      fullProfile.psc = bundle.psc || [];
      fullProfile.filingHistory = bundle.filingHistory || [];
      fullProfile.charges = bundle.charges || [];
      fullProfile.totalCharges = bundle.totalCharges || 0;

      const cType = (fullProfile.type || fullProfile.company_type || "").toLowerCase();
      const mappedType = cType.includes("llp") ? "Partnership" : cType.includes("sole") ? "SoleTrader" : "Limited";

      const roa = fullProfile.registered_office_address || {};
      const addressLine1 = roa.address_line_1 || "";
      const addressLine2 = roa.address_line_2 || "";
      const city = roa.locality || "";
      const fullAddress = [addressLine1, addressLine2, city].filter(Boolean).join(", ");
      const postcode = roa.postal_code || "";
      const country = roa.country || "United Kingdom";
      const nextCsDue = fullProfile.confirmation_statement?.next_due || undefined;
      const nextAccountsDue = fullProfile.accounts?.next_accounts?.due_on || undefined;

      // Extract & Format Dates
      const rawCreationDate = fullProfile.date_of_creation || "";
      let formattedCreationDate = rawCreationDate;
      if (rawCreationDate.includes("-")) {
        const parts = rawCreationDate.split("-");
        if (parts.length === 3) {
          formattedCreationDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      const businessStartDate = formattedCreationDate || rawCreationDate || undefined;
      const bookStartDate = formattedCreationDate || rawCreationDate || undefined;

      // Extract Year End (DD/MM) from accounting_reference_date or accounts dates
      const accRefDay = fullProfile.accounts?.accounting_reference_date?.day;
      const accRefMonth = fullProfile.accounts?.accounting_reference_date?.month;
      let yearEnd: string | undefined = undefined;
      if (accRefDay && accRefMonth) {
        yearEnd = `${String(accRefDay).padStart(2, "0")}/${String(accRefMonth).padStart(2, "0")}`;
      } else if (fullProfile.accounts?.next_accounts?.period_end_on) {
        const parts = fullProfile.accounts.next_accounts.period_end_on.split("-");
        if (parts.length === 3) {
          yearEnd = `${parts[2]}/${parts[1]}`;
        }
      } else if (fullProfile.accounts?.next_made_up_to) {
        const parts = fullProfile.accounts.next_made_up_to.split("-");
        if (parts.length === 3) {
          yearEnd = `${parts[2]}/${parts[1]}`;
        }
      }

      const sicCodes = (fullProfile.sic_codes || []).join(", ") || undefined;

      const updateRes = await apiRequest("PATCH", `/api/pm/clients/${clientId}`, {
        clientName: fullProfile.company_name || fullProfile.title || undefined,
        clientType: mappedType,
        address: fullAddress || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        townCity: city || undefined,
        postcode: postcode || undefined,
        country: country || undefined,
        nextCsDue,
        nextAccountsDue,
        yearEnd,
        businessStartDate,
        bookStartDate,
        sicCode: sicCodes,
        chDataJson: JSON.stringify(bundle),
        officers: fullProfile.officers,
        psc: fullProfile.psc
      });

      if (!updateRes.ok) throw new Error("Failed to update local database");
      return updateRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/contacts`, "director"] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/contacts`, "shareholder"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies-house/company", client?.registrationNumber, "all"] });
      toast({ title: "Client Sync Complete", description: "Successfully updated details from Companies House." });
    },
    onError: (error: any) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/pm/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to delete client");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
      toast({ title: "Client Deleted", description: "Client permanently removed." });
      setLocation("/practice/clients");
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, status, agreedFee }: { id: number; status?: string; agreedFee?: string }) => {
      const res = await apiRequest("PATCH", `/api/pm/clients/${clientId}/services/${id}`, { status, agreedFee });
      if (!res.ok) throw new Error("Failed to update service");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/services`] });
      toast({ title: "Service Updated", description: "Service configuration saved in database." });
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const res = await apiRequest("PATCH", `/api/pm/clients/${clientId}/services/${payload.id}`, {
          agreedFee: payload.fee,
          status: payload.isActive ? "Active" : "Inactive",
        });
        if (!res.ok) throw new Error("Failed to update service");
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/pm/clients/${clientId}/services`, {
          serviceName: payload.serviceTitle,
          frequency: payload.frequency,
          steps: `${payload.steps?.length || 5} Steps`,
          estimatedHours: payload.estimatedHours?.toString() || "2",
          fee: payload.fee,
        });
        if (!res.ok) throw new Error("Failed to add service");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/services`] });
      setIsNewServiceModalOpen(false);
      toast({ title: "Service Saved", description: "Service configuration saved in database." });
    },
  });

  const addAuthMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/authorizations`, payload);
      if (!res.ok) throw new Error("Failed to create agent authorization");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/authorizations`] });
      setIsNewAuthModalOpen(false);
      toast({ title: "Authorization Requested", description: "HMRC 64-8 Digital Authorization request submitted." });
    },
  });

  const addPeriodMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/accounting-periods`, payload);
      if (!res.ok) throw new Error("Failed to create accounting period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/accounting-periods`] });
      setIsAddPeriodModalOpen(false);
      toast({ title: "Period Created", description: "Accounting & compliance period added." });
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("DELETE", `/api/pm/clients/${clientId}/accounting-periods/${periodId}`);
      if (!res.ok) throw new Error("Failed to delete accounting period");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/accounting-periods`] });
      toast({ title: "Period Deleted", description: "Accounting period removed." });
    },
  });

  // Dynamic Onboarding Criteria Query & Mutations
  const { data: onboardingChecks = [], refetch: refetchOnboarding } = useQuery<any[]>({
    queryKey: [`/api/pm/onboarding-checks/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/onboarding-checks/${clientId}`);
      return res.ok ? await res.json() : [];
    },
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/pm/onboarding-checks/${id}`, data);
      if (!res.ok) throw new Error("Failed to update onboarding check");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/onboarding-checks/${clientId}`] });
    },
  });

  const addOnboardingCriteriaMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/onboarding-checks/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to add onboarding criteria");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/onboarding-checks/${clientId}`] });
      toast({ title: "Criteria Added", description: "New onboarding verification requirement added to database." });
      setIsOnboardingModalOpen(false);
      setOnboardingForm({ criteria: "", notes: "", status: "Yes", todo: "Completed" });
    },
  });

  // Dynamic AML Questions Query & Mutations
  const { data: amlQuestions = [], refetch: refetchAml } = useQuery<any[]>({
    queryKey: [`/api/pm/aml-questions/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/aml-questions/${clientId}`);
      return res.ok ? await res.json() : [];
    },
  });

  const addAmlQuestionMutation = useMutation({
    mutationFn: async (payload: { question: string; isChecked: boolean; notes: string }) => {
      const res = await apiRequest("POST", `/api/pm/aml-questions/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to add AML criteria");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/aml-questions/${clientId}`] });
      toast({ title: "Criteria Added", description: "New AML question added to checklist." });
      setIsNewAmlCriteriaModalOpen(false);
      setNewAmlCriteriaForm({ question: "", isChecked: true, notes: "-" });
    },
  });

  const updateAmlQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/pm/aml-questions/${id}`, data);
      if (!res.ok) throw new Error("Failed to update AML question");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/aml-questions/${clientId}`] });
    },
  });

  const deleteAmlQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/aml-questions/${id}`);
      if (!res.ok) throw new Error("Failed to delete AML criteria");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/aml-questions/${clientId}`] });
      toast({ title: "Criteria Removed", description: "AML question removed from checklist." });
    },
  });

  useEffect(() => {
    const handleAfterPrint = () => {
      setActivePrintDoc(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleExportAmlPdf = () => {
    setActivePrintDoc("aml");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportOnboardingPdf = () => {
    setActivePrintDoc("onboarding");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Dynamic KYC Documents Query & Mutations
  const { data: kycDocs = [], refetch: refetchDocs } = useQuery<any[]>({
    queryKey: [`/api/pm/kyc-docs/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/kyc-docs/${clientId}`);
      return res.ok ? await res.json() : [];
    },
  });

  const addKycDocMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/kyc-docs/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to add KYC document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/kyc-docs/${clientId}`] });
      toast({ title: "Document Uploaded", description: "KYC document record saved to repository." });
      setIsKycDocModalOpen(false);
      setKycDocForm({ title: "", documentType: "ID Proof", fileSize: "1.2 MB", folder: "Client-Shared-Docs", fileUrl: "" });
    },
  });

  const deleteKycDocMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/kyc-docs/${id}`);
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/kyc-docs/${clientId}`] });
      toast({ title: "Document Removed", description: "Document deleted from KYC vault." });
    },
  });

  const handleMediaSelect = (file: MediaFile) => {
    let docType = "ID Proof";
    const nameLower = file.name.toLowerCase();
    if (nameLower.includes("cert") || nameLower.includes("incorp")) docType = "Company Cert";
    else if (nameLower.includes("address") || nameLower.includes("bill") || nameLower.includes("bank")) docType = "Proof of Address";
    else if (nameLower.includes("engage") || nameLower.includes("loe")) docType = "Engagement";
    else if (nameLower.includes("article") || nameLower.includes("memo")) docType = "Articles";
    else if (nameLower.includes("clearance")) docType = "Clearance";
    else if (nameLower.includes("passport") || nameLower.includes("license") || nameLower.includes("id")) docType = "ID Proof";

    if (isAmlTrainingModalOpen) {
      setAmlTrainingForm((prev) => ({
        ...prev,
        certificateUrl: file.url || "",
        certificateRef: prev.certificateRef || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } else if (isKycDocModalOpen) {
      setKycDocForm((prev) => ({
        ...prev,
        title: file.name,
        documentType: prev.documentType || docType,
        fileSize: file.size || "1.0 MB",
        fileUrl: file.url || "",
      }));
    } else {
      addKycDocMutation.mutate({
        title: file.name,
        documentType: docType,
        fileSize: file.size || "1.0 MB",
        fileUrl: file.url || null,
        folder: targetFolderForMedia || (selectedKycFolder !== "All" ? selectedKycFolder : "Client-Shared-Docs"),
        uploadedBy: currentUserName,
      });
    }
    setIsMediaLibraryOpen(false);
  };

  // Dynamic AML Staff Training Query & Mutations
  const { data: amlTrainingList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/aml-training"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/aml-training");
      return res.ok ? await res.json() : [];
    },
  });

  const addAmlTrainingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/pm/aml-training", payload);
      if (!res.ok) throw new Error("Failed to save AML training record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/aml-training"] });
      toast({ title: "Training Recorded", description: "Staff AML training certification logged successfully." });
      setIsAmlTrainingModalOpen(false);
      setEditingAmlTrainingId(null);
    },
  });

  const updateAmlTrainingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/pm/aml-training/${id}`, data);
      if (!res.ok) throw new Error("Failed to update AML training record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/aml-training"] });
      toast({ title: "Training Updated", description: "AML training record updated successfully." });
      setIsAmlTrainingModalOpen(false);
      setEditingAmlTrainingId(null);
    },
  });

  const deleteAmlTrainingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/aml-training/${id}`);
      if (!res.ok) throw new Error("Failed to delete training record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/aml-training"] });
      toast({ title: "Record Deleted", description: "AML training record removed." });
    },
  });

  const renderKycDocumentsSection = (embeddedInDetails: boolean = false) => {
    const filteredKycDocs = kycDocs.filter((doc: any) => {
      const matchesFolder = selectedKycFolder === "All" || (doc.folder || "Client-Shared-Docs") === selectedKycFolder;
      const matchesSearch = !kycSearch.trim() ||
        doc.title?.toLowerCase().includes(kycSearch.toLowerCase()) ||
        doc.documentType?.toLowerCase().includes(kycSearch.toLowerCase()) ||
        doc.uploadedBy?.toLowerCase().includes(kycSearch.toLowerCase());
      return matchesFolder && matchesSearch;
    });

    const folderCounts: Record<string, number> = {
      All: kycDocs.length,
      "Client-Shared-Docs": kycDocs.filter((d: any) => (d.folder || "Client-Shared-Docs") === "Client-Shared-Docs").length,
      "Internal-Docs": kycDocs.filter((d: any) => d.folder === "Internal-Docs").length,
      "Accountant-Only": kycDocs.filter((d: any) => d.folder === "Accountant-Only").length,
    };
    kycFolders.forEach((f) => {
      if (!folderCounts[f]) {
        folderCounts[f] = kycDocs.filter((d: any) => d.folder === f).length;
      }
    });

    const getFolderLabel = (f: string) => {
      if (f === "Client-Shared-Docs") return "Client Shared";
      if (f === "Internal-Docs") return "Commercial Internal";
      if (f === "Accountant-Only") return "Accountant Only";
      return f;
    };

    return (
      <div className={`${embeddedInDetails ? "p-5" : "p-4"} space-y-4 text-xs`}>
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Documents Vault</span>
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Quick search by title, type, staff..."
                value={kycSearch}
                onChange={(e) => setKycSearch(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setTargetFolderForMedia(selectedKycFolder === "All" ? "Client-Shared-Docs" : selectedKycFolder);
                setIsMediaLibraryOpen(true);
              }}
              className="bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1.5 transition"
              title="Browse and select uploaded files from your firm's Media Library"
            >
              <FolderOpen size={13} /> Select from Media Library
            </button>

            <button
              onClick={() => {
                setKycDocForm({
                  title: "",
                  documentType: "ID Proof",
                  fileSize: "1.2 MB",
                  folder: selectedKycFolder === "All" ? "Client-Shared-Docs" : selectedKycFolder,
                  fileUrl: "",
                });
                setIsKycDocModalOpen(true);
              }}
              className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-3.5 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1 transition"
            >
              <Plus size={13} /> New Document
            </button>
          </div>
        </div>

        {/* Capium Standard Folder Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 dark:border-slate-800 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 px-3 rounded-md">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 font-medium text-[11px] mr-1">Folders:</span>
            {["All", ...kycFolders].map((folderId) => {
              const count = folderCounts[folderId] || 0;
              const isSelected = selectedKycFolder === folderId;
              return (
                <button
                  key={folderId}
                  onClick={() => setSelectedKycFolder(folderId)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Folder size={11} className={isSelected ? "text-white" : "text-purple-500"} />
                  <span>{getFolderLabel(folderId)}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-purple-700 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setNewFolderNameInput("");
              setIsNewFolderModalOpen(true);
            }}
            className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-semibold text-[11px] cursor-pointer flex items-center gap-1 whitespace-nowrap"
          >
            <Plus size={12} /> Add New Folder
          </button>
        </div>

        {/* Current Folder Info & Breadcrumb */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active View:</span>
            <span className="text-purple-600 font-mono">
              Vault &gt; {selectedKycFolder === "All" ? "All Documents" : getFolderLabel(selectedKycFolder)}
            </span>
          </div>
          <span className="text-slate-400">
            {filteredKycDocs.length} {filteredKycDocs.length === 1 ? "document" : "documents"} found
          </span>
        </div>

        {/* Documents Table */}
        {filteredKycDocs.length === 0 ? (
          <div className="py-10 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2.5">
            <FolderOpen size={28} className="mx-auto text-slate-400" />
            <p className="text-slate-500 font-medium">No documents in this folder yet.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setTargetFolderForMedia(selectedKycFolder === "All" ? "Client-Shared-Docs" : selectedKycFolder);
                  setIsMediaLibraryOpen(true);
                }}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded font-semibold text-[11px] cursor-pointer hover:bg-purple-200"
              >
                Choose from Media Library
              </button>
              <button
                onClick={() => {
                  setKycDocForm({
                    title: "",
                    documentType: "ID Proof",
                    fileSize: "1.2 MB",
                    folder: selectedKycFolder === "All" ? "Client-Shared-Docs" : selectedKycFolder,
                    fileUrl: "",
                  });
                  setIsKycDocModalOpen(true);
                }}
                className="px-3 py-1 bg-purple-600 text-white rounded font-semibold text-[11px] cursor-pointer hover:bg-purple-700"
              >
                Upload Document
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Folder</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Uploaded On</th>
                  <th className="py-2.5 px-3">Uploaded By</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredKycDocs.map((doc: any, idx: number) => (
                  <tr key={doc.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <FileText size={13} className="text-purple-600 shrink-0" />
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.title}
                            className="hover:text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Click to view/download file"
                          >
                            <span>{doc.title}</span>
                            <ExternalLink size={10} className="text-slate-400" />
                          </a>
                        ) : (
                          <span>{doc.title}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getFolderLabel(doc.folder || "Client-Shared-Docs")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                        {doc.documentType || "ID Proof"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{doc.uploadedBy || currentUserName}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{doc.fileSize || "1.2 MB"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.title}
                            className="p-1 rounded bg-purple-50 dark:bg-purple-900/40 text-purple-600 hover:text-purple-800 cursor-pointer"
                            title="Download File"
                          >
                            <Download size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => deleteKycDocMutation.mutate(doc.id)}
                          className="p-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Dynamic Risk Assessments History Query & Mutation
  const { data: riskHistory = [], refetch: refetchRisk } = useQuery<any[]>({
    queryKey: [`/api/pm/aml/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/aml/${clientId}`);
      return res.ok ? await res.json() : [];
    },
  });

  const runRiskAssessmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/risk-assessment/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to record risk assessment");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/aml/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      toast({
        title: "Risk Assessment Recorded",
        description: `Risk Level: ${data.riskLevel} Risk recorded into compliance database.`,
      });
      setIsRiskModalOpen(false);
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/contact`, payload);
      if (!res.ok) throw new Error("Failed to save contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      toast({ title: "Contact Saved", description: "New contact added successfully." });
      setIsAddContactModalOpen(false);
      setAddContactForm({ firstName: "", middleName: "", lastName: "", contactType: "Director", email: "", phone: "", idv: "", isPrimary: false });
    },
  });

  const assignUsersMutation = useMutation({
    mutationFn: async (assignedUsers: string[]) => {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/assign-users`, { assignedUsers });
      if (!res.ok) throw new Error("Failed to assign users");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      toast({ title: "Users Assigned", description: "Assigned staff updated for this client." });
      setIsAssignUsersModalOpen(false);
    },
  });

  // Fetch 360° Client Overview from backend
  const { data: overview, isLoading } = useQuery<any>({
    queryKey: [`/api/pm/clients/${clientId}/360`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/pm/clients/${clientId}/360`);
      if (!res.ok) {
        const clientRes = await apiRequest("GET", `/api/pm/clients`);
        if (clientRes.ok) {
          const list = await clientRes.json();
          const found = list.find((c: any) => c.id === clientId) || list[0];
          return {
            client: found || {
              id: clientId,
              clientName: `Client #${clientId}`,
              clientCode: `CLI${clientId}`,
              clientType: "Limited",
              registrationNumber: "",
              utrNumber: "",
              vatNumber: "",
              email: "",
              phone: "",
              addressLine1: "",
              townCity: "",
              postcode: "",
              country: "United Kingdom",
              tradingStatus: "Active",
              createdAt: new Date().toISOString(),
            },
            assignedServices: [],
            clientDeadlines: [],
            timeline: [],
            aml: [],
            customFields: []
          };
        }
        return null;
      }
      return res.json();
    }
  });

  const client = overview?.client || {
    id: clientId,
    clientName: `Client #${clientId}`,
    clientCode: `CLI${clientId}`,
    clientType: "Limited",
    registrationNumber: "",
    utrNumber: "",
    vatNumber: "",
    email: "",
    phone: "",
    addressLine1: "",
    townCity: "",
    postcode: "",
    country: "United Kingdom",
    tradingStatus: "Active",
    createdAt: new Date().toISOString(),
  };

  // Parse cached Companies House data from database (chDataJson)
  const chData = useMemo(() => {
    if (!client?.chDataJson) return null;
    try {
      return typeof client.chDataJson === "string" ? JSON.parse(client.chDataJson) : client.chDataJson;
    } catch {
      return null;
    }
  }, [client?.chDataJson]);

  // If client has registrationNumber but no cached chDataJson yet, automatically fetch it when on Companies House tab
  const { data: liveChData, isLoading: isLoadingLiveCh } = useQuery<any>({
    queryKey: ["/api/companies-house/company", client?.registrationNumber, "all"],
    queryFn: async () => {
      if (!client?.registrationNumber) return null;
      const res = await apiRequest("GET", `/api/companies-house/company/${encodeURIComponent(client.registrationNumber.trim())}/all`);
      return res.ok ? await res.json() : null;
    },
    enabled: !!client?.registrationNumber && activeTab === "details" && !chData
  });

  const effectiveChData = chData || liveChData;

  // Sync business/social/paye edit form states when client data loads from DB
  useEffect(() => {
    if (!overview?.client) return;
    const c = overview.client;
    setBusinessInfoForm({
      businessStartDate: c.businessStartDate || "",
      bookStartDate: c.bookStartDate || "",
      yearEnd: c.yearEnd || "",
      vatScheme: c.vatScheme || "",
      chAuthCode: c.chAuthCode || "",
      sicCode: c.sicCode || "",
    });
    setSocialInfoForm({
      facebook: c.socialFacebook || "",
      twitter: c.socialTwitter || "",
      linkedin: c.socialLinkedin || "",
      gplus: c.socialGplus || "",
    });
    setPayeInfoForm({
      payeEmployerName: c.payeEmployerName || "",
      payeReference: c.payeReference || "",
      payeAccountsOfficeRef: c.payeAccountsOfficeRef || "",
      payeHmrcOfficeNumber: c.payeHmrcOfficeNumber || "",
    });
    if (c.email) {
      setEmailForm((prev) => ({ ...prev, to: prev.to || c.email }));
    }
    if (c.phone) {
      setSmsForm((prev) => ({ ...prev, phone: prev.phone || c.phone }));
    }
  }, [overview]);

  // Subscribed Services Badges

  const subscribedServices = useMemo(() => {
    if (overview?.assignedServices && overview.assignedServices.length > 0) {
      return overview.assignedServices.map((s: any) => s.serviceName || s.serviceCode || s.title);
    }
    const isLimited = (client.clientType || "").toLowerCase() === "limited";
    if (isLimited) {
      return [
        "Company Accounts (FRS 102/105)",
        "Company Tax Return (CT600)",
        "Confirmation Statement (CS01)",
        "Bookkeeping & MTD VAT",
        "Payroll RTI"
      ];
    }
    return [
      "Sole Trader Accounts",
      "Self-Assessment (SA100)",
      "Bookkeeping & MTD VAT"
    ];
  }, [overview, client]);

  // Dynamic AML Staff Training Helpers
  const assignedStaffName = client?.clientManager || overview?.assignedUsers?.[0]?.name || currentUserName;
  const activeTrainingRecord = useMemo(() => {
    if (!amlTrainingList || amlTrainingList.length === 0) return null;
    const matched = amlTrainingList.find(
      (t: any) => t.staffName?.toLowerCase().trim() === assignedStaffName.toLowerCase().trim()
    );
    return matched || amlTrainingList[0];
  }, [amlTrainingList, assignedStaffName]);

  const getTrainingStatusInfo = (record: any) => {
    if (!record) {
      return {
        label: "No Record Found",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        isExpired: true,
        daysRemaining: 0,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = record.expiresAt ? new Date(record.expiresAt) : null;

    if (!expiry || isNaN(expiry.getTime())) {
      return {
        label: record.status || "Certified Compliant",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        isExpired: false,
        daysRemaining: 365,
      };
    }

    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Certification Expired (${Math.abs(diffDays)}d overdue)`,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        isExpired: true,
        daysRemaining: diffDays,
      };
    } else if (diffDays <= 30) {
      return {
        label: `Renewal Due Soon (${diffDays}d remaining)`,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        isExpired: false,
        daysRemaining: diffDays,
      };
    } else {
      const year = expiry.getFullYear();
      return {
        label: `Certified Compliant (${year})`,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        isExpired: false,
        daysRemaining: diffDays,
      };
    }
  };

  const handleOpenTrainingModal = (record?: any) => {
    if (record) {
      setEditingAmlTrainingId(record.id);
      setAmlTrainingForm({
        staffName: record.staffName || "",
        staffRole: record.staffRole || "Assigned Accountant / MLRO",
        courseTitle: record.courseTitle || "",
        trainingProvider: record.trainingProvider || "",
        certificateRef: record.certificateRef || "",
        certificateUrl: record.certificateUrl || "",
        completedAt: record.completedAt ? new Date(record.completedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        expiresAt: record.expiresAt ? new Date(record.expiresAt).toISOString().split("T")[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: record.status || "Certified Compliant",
        scorePercentage: record.scorePercentage !== undefined && record.scorePercentage !== null ? Number(record.scorePercentage) : 100,
        notes: record.notes || "",
      });
    } else {
      setEditingAmlTrainingId(null);
      setAmlTrainingForm({
        staffName: "",
        staffRole: "Assigned Accountant / MLRO",
        courseTitle: "",
        trainingProvider: "",
        certificateRef: "",
        certificateUrl: "",
        completedAt: new Date().toISOString().split("T")[0],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "Certified Compliant",
        scorePercentage: 100,
        notes: "",
      });
    }
    setIsAmlTrainingModalOpen(true);
  };

  // Combined Timeline Activity Stream - Fully Dynamic from DB
  const activityTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      author: string;
      timestamp: string;
      topic: string;
      status?: string;
    }> = [];

    // 1. Dynamic Database Timeline (Notes, Emails, SMS, Requests, Documents, Status, KYC)
    (overview?.timeline || []).forEach((t: any) => {
      let topic = "Notes";
      const actType = (t.activityType || "").toLowerCase();
      if (actType === "email") topic = "Conversations";
      else if (actType === "sms") topic = "SMS";
      else if (actType === "note") topic = "Notes";
      else if (actType.includes("request")) topic = "Conversations";
      else if (actType === "document" || actType === "upload") topic = "Documents";
      else if (actType === "task") topic = "Tasks";
      else if (actType === "service") topic = "Service";
      else if (actType === "invoice") topic = "Invoice";
      else if (actType === "user" || actType === "assigned") topic = "Users";
      else topic = "Events";

      items.push({
        id: `tl-${t.id}`,
        type: t.activityType || "Note",
        title: t.title || `${t.activityType || "Activity"} Logged`,
        content: t.content || "",
        author: t.userName || currentUserName,
        timestamp: t.createdAt || new Date().toISOString(),
        topic,
      });
    });

    // 2. Dynamic Statutory Deadlines (CT600, Accounts, CS01, VAT)
    const deadlinesList = overview?.deadlines || overview?.clientDeadlines || [];
    deadlinesList.forEach((d: any) => {
      items.push({
        id: `dl-${d.id}`,
        type: "Deadline",
        title: `Statutory Deadline: ${d.deadlineName}`,
        content: `Filing status: ${d.status || "Upcoming"} | Statutory Due Date: ${d.statutoryDeadlineDate ? new Date(d.statutoryDeadlineDate).toLocaleDateString("en-GB") : "Pending"}`,
        author: "Compliance Engine",
        timestamp: d.createdAt || d.updatedAt || new Date().toISOString(),
        topic: "Deadlines",
        status: d.status,
      });
    });

    // 3. Dynamic Subscribed Services
    (overview?.assignedServices || []).forEach((s: any) => {
      items.push({
        id: `svc-${s.id}`,
        type: "Service",
        title: `Subscribed Service: ${s.serviceName || s.serviceCode || "Accounting Service"}`,
        content: `Category: ${s.serviceCategory || "Statutory"} | Agreed Fee: £${parseFloat(s.agreedFee || 0).toLocaleString()} (${s.billingFrequency || "monthly"}) | Status: ${s.status || "Active"}`,
        author: "Account Manager",
        timestamp: s.createdAt || client.createdAt || new Date().toISOString(),
        topic: "Service",
        status: s.status,
      });
    });

    // 4. Client Account Established Record
    if (client && client.id) {
      items.push({
        id: `init-${client.id}`,
        type: "Client Details",
        title: `Client Account Established: ${client.clientName || "Client"}`,
        content: `Client ID: ${client.clientCode || "CL-" + client.id} | Type: ${client.companyType || "Limited"} | Reg No: ${client.registrationNumber || "N/A"} | Registered: ${client.address || "Main Office"}, ${client.postcode || ""}`,
        author: currentUserName,
        timestamp: client.createdAt || new Date().toISOString(),
        topic: "Client Details",
        status: client.tradingStatus || "Active",
      });
    }

    // Sort descending by timestamp (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [overview, client, currentUserName]);

  // Filtered Timeline for Activity tab
  const filteredTimeline = useMemo(() => {
    return activityTimeline.filter((item: any) => {
      // 1. Topic filter
      if (selectedTopics.length > 0 && item.topic && !selectedTopics.includes(item.topic)) {
        return false;
      }

      // 2. Timeframe filter
      if (timeframeFilter !== "all" && item.timestamp) {
        const itemDate = new Date(item.timestamp).getTime();
        const now = Date.now();
        if (timeframeFilter === "24h" && now - itemDate > 24 * 60 * 60 * 1000) return false;
        if (timeframeFilter === "7d" && now - itemDate > 7 * 24 * 60 * 60 * 1000) return false;
        if (timeframeFilter === "30d" && now - itemDate > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [activityTimeline, selectedTopics, timeframeFilter]);

  // Notes List derived from DB timeline
  const notesList = useMemo(() => {
    return (overview?.timeline || [])
      .filter((t: any) => t.activityType === "Note")
      .map((t: any) => ({
        id: t.id,
        content: t.content,
        author: t.userName || currentUserName,
        timestamp: t.createdAt,
      }));
  }, [overview?.timeline, currentUserName]);

  // Email History List derived from DB timeline
  const emailLogs = useMemo(() => {
    return (overview?.timeline || [])
      .filter((t: any) => t.activityType === "Email")
      .map((t: any) => ({
        id: t.id,
        to: client.email || "",
        subject: t.title || "Email to Client",
        sentAt: t.createdAt,
        status: "Delivered",
      }));
  }, [overview?.timeline, client.email]);

  // SMS History List derived from DB timeline
  const smsLogs = useMemo(() => {
    return (overview?.timeline || [])
      .filter((t: any) => t.activityType === "SMS")
      .map((t: any) => ({
        id: t.id,
        to: client.phone || "",
        senderId: "SanSuite",
        body: t.content || "",
        sentAt: t.createdAt,
        status: "Sent",
      }));
  }, [overview?.timeline, client.phone]);

  // Client Requests / Tickets List derived from DB timeline
  const ticketsList = useMemo(() => {
    return (overview?.timeline || [])
      .filter((t: any) => t.activityType === "Ticket")
      .map((t: any) => ({
        id: t.id,
        title: t.title || "Client Request",
        content: t.content || "",
        updatedAt: t.createdAt,
        status: "Open",
      }));
  }, [overview?.timeline]);

  // Post Note Action — Persists to MySQL DB
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast({ title: "Validation Error", description: "Please type in your note.", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", `/api/pm/clients/${clientId}/timeline`, {
        activityType: "Note",
        title: "Client Note",
        content: noteContent,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      setNoteContent("");
      toast({ title: "Note Saved", description: "Client note saved to history database." });
    } catch {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    }
  };

  // Media Library Attachment Selection Handler
  const handleAttachMediaFile = (file: MediaFile) => {
    if (emailAttachments.some((a) => a.id === file.id || a.name === file.name)) {
      toast({ title: "Already Attached", description: `${file.name} is already attached.` });
      return;
    }
    setEmailAttachments((prev) => [
      ...prev,
      {
        id: file.id || `media-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.mimeType || "application/octet-stream",
        url: file.url,
        source: "media_library",
      },
    ]);
    toast({ title: "File Attached", description: `${file.name} attached from Media Library.` });
  };

  // Device File Upload Handler
  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string)?.split(",")?.[1] || "";
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        setEmailAttachments((prev) => [
          ...prev,
          {
            id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: sizeStr,
            type: file.type || "application/octet-stream",
            source: "upload",
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    toast({ title: "File Attached", description: `${files.length} file(s) attached from device.` });
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setEmailAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Send Email Action — Dispatches REAL SMTP Email & logs to DB
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = emailForm.to || client.email;
    if (!recipient) {
      toast({ title: "Validation Error", description: "Recipient email is required.", variant: "destructive" });
      return;
    }
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast({ title: "Validation Error", description: "Subject and message are required.", variant: "destructive" });
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/send-email`, {
        to: recipient,
        cc: emailForm.cc,
        subject: emailForm.subject,
        message: emailForm.message,
        priority: emailForm.priority,
        attachments: emailAttachments.map((a) => ({
          fileName: a.name,
          contentType: a.type,
          content: a.base64,
          url: a.url,
        })),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch email via SMTP");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      setEmailForm({ to: client.email || "", cc: "", subject: "", priority: "Normal", message: "" });
      setEmailAttachments([]);
      toast({ title: "Email Sent Successfully", description: `Dispatched to ${recipient} via SMTP server.` });
    } catch (err: any) {
      toast({ title: "Failed to Send Email", description: err.message || "SMTP transmission error.", variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Send SMS Action — Dispatches real SMS / logs to DB
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPhone = smsForm.phone || client.phone;
    if (!targetPhone) {
      toast({ title: "Validation Error", description: "Recipient mobile phone number is required.", variant: "destructive" });
      return;
    }
    if (!smsForm.body.trim()) {
      toast({ title: "Validation Error", description: "SMS message body is required.", variant: "destructive" });
      return;
    }
    setIsSendingSms(true);
    try {
      const res = await apiRequest("POST", `/api/pm/clients/${clientId}/send-sms`, {
        phone: targetPhone,
        senderId: smsForm.senderId || "SanSuite",
        message: smsForm.body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to dispatch SMS");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      setIsSmsModalOpen(false);
      setSmsForm({ senderId: "SanSuite", to: "", phone: client.phone || "", template: "", body: "", queueOption: "send" });
      toast({ title: "SMS Dispatched", description: data.message || "Text message dispatched and saved to database." });
    } catch (err: any) {
      toast({ title: "Failed to Dispatch SMS", description: err.message || "SMS Gateway error.", variant: "destructive" });
    } finally {
      setIsSendingSms(false);
    }
  };

  // Ticket Media Library Attachment Handler
  const handleAttachTicketMediaFile = (file: MediaFile) => {
    if (ticketAttachments.some((a) => a.id === file.id || a.name === file.name)) {
      toast({ title: "Already Attached", description: `${file.name} is already attached.` });
      return;
    }
    setTicketAttachments((prev) => [
      ...prev,
      {
        id: file.id || `media-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.mimeType || "application/octet-stream",
        url: file.url,
        source: "media_library",
      },
    ]);
    toast({ title: "File Attached", description: `${file.name} attached from Media Library.` });
  };

  // Ticket Device File Upload Handler
  const handleTicketDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string)?.split(",")?.[1] || "";
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        setTicketAttachments((prev) => [
          ...prev,
          {
            id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            size: sizeStr,
            type: file.type || "application/octet-stream",
            source: "upload",
            base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    toast({ title: "File Attached", description: `${files.length} file(s) attached from device.` });
    e.target.value = "";
  };

  const removeTicketAttachment = (id: string) => {
    setTicketAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Create Ticket Action — Persists to MySQL DB
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title.trim()) {
      toast({ title: "Validation Error", description: "Ticket title is required.", variant: "destructive" });
      return;
    }
    try {
      const attachmentSummary = ticketAttachments.length > 0
        ? `\n\nAttachments (${ticketAttachments.length}): ${ticketAttachments.map(a => a.name).join(", ")}`
        : "";
      await apiRequest("POST", `/api/pm/clients/${clientId}/timeline`, {
        activityType: "Ticket",
        title: ticketForm.title,
        content: (ticketForm.description || "Client ticket logged.") + attachmentSummary,
        metadataJson: JSON.stringify({
          clientUser: ticketForm.clientUser,
          attachments: ticketAttachments,
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
      setIsTicketModalOpen(false);
      setTicketForm({ title: "", description: "", clientUser: "", file: null });
      setTicketAttachments([]);
      toast({ title: "Ticket Created", description: "Client request published and saved to database." });
    } catch {
      toast({ title: "Error", description: "Failed to create ticket.", variant: "destructive" });
    }
  };

  // Toggle Topic Filter
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const formatDate = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDateOnly = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        
        {/* Top Breadcrumb & Action Banner */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          
          {/* Left: Back Link & Client Header */}
          <div className="space-y-1">
            <Link href="/practice/clients">
              <button className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-900 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft size={13} /> Back to Clients List
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {client.clientName}
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {client.clientCode || `CLI172`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Created on: {formatDate(client.createdAt)}
            </p>
          </div>

          {/* Right: Client Status & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span>Client Status:</span>
              <select
                defaultValue={client.tradingStatus || "Active"}
                onChange={(e) => toast({ title: "Status Updated", description: `Client set to ${e.target.value}` })}
                className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-400"
              >
                <option value="Active">Active</option>
                <option value="Lead">Lead</option>
                <option value="Prospect">Prospect</option>
                <option value="Dormant">Dormant</option>
              </select>
            </div>
            
            <button
              onClick={() => refreshChDataMutation.mutate()}
              disabled={refreshChDataMutation.isPending || !client.registrationNumber}
              className="ml-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-950/50 p-1.5 rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync with Companies House"
            >
              <RefreshCw size={15} className={refreshChDataMutation.isPending ? "animate-spin" : ""} />
            </button>
            
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently delete this client? This cannot be undone.")) {
                  deleteClientMutation.mutate();
                }
              }}
              className="ml-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 p-1.5 rounded cursor-pointer transition-colors"
              title="Delete Client"
            >
              <Trash2 size={15} />
            </button>
          </div>

        </div>

        {/* 2-Column Responsive Layout matching Capium Screenshot */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: CLIENT KEY CONTACT & INFORMATION CARDS (4/12) */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Card 1: Client Key Contact */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <User size={14} className="text-purple-600" />
                  Client Key Contact
                </h3>
                <button
                  onClick={() => setIsAddContactModalOpen(true)}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  Add Contact
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Primary Contact</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {client.contactName || "Director / Lead"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Email</span>
                  <span className="font-mono text-purple-600">
                    {client.email || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Phone Number</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {client.phone || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Contact ID</span>
                  <span className="font-mono text-slate-600">CNT-{client.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Account Manager</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {client.clientManager || overview?.assignedUsers?.[0]?.name || currentUserName}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Assigned Users</span>
                  <button
                    type="button"
                    onClick={() => setIsAssignUsersModalOpen(true)}
                    className="font-semibold text-purple-600 hover:text-purple-800 cursor-pointer underline text-right"
                  >
                    {selectedAssignedUsers.length > 0
                      ? selectedAssignedUsers.join(", ")
                      : overview?.assignedUsers?.length
                        ? overview.assignedUsers.map((u: any) => u.name).join(", ")
                        : currentUserName}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Client Information */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Building2 size={14} className="text-purple-600" />
                  Client Information
                </h3>
                <button
                  onClick={() => openEditClientInfoModal()}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  <Edit2 size={13} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Client ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {client.clientCode || `CLI172`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Client Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                    {client.clientName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Company Type</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-right">
                    {getCompanyTypeLabel(client.clientType) || "Limited"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40 items-center">
                  <span className="text-slate-500 font-medium">Company Reg No</span>
                  {client.registrationNumber ? (
                    <a
                      href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(client.registrationNumber.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-purple-700 dark:text-purple-400 font-semibold hover:text-purple-900 dark:hover:text-purple-300 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="View on Companies House (Opens in new tab)"
                    >
                      <span>{client.registrationNumber}</span>
                      <ExternalLink size={12} className="text-purple-500" />
                    </a>
                  ) : (
                    <span className="font-mono text-slate-400 font-semibold">-</span>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">UTR Number</span>
                  <span className="font-mono text-slate-600">
                    {client.utrNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Registered Address</span>
                  <span className="text-right text-slate-700 dark:text-slate-300 max-w-[200px]">
                    {client.addressLine1 || client.address || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">City / Town</span>
                  <span className="text-slate-700 dark:text-slate-300">{client.city || client.townCity || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Postcode</span>
                  <span className="font-mono font-semibold">{client.postcode || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 font-medium">Country</span>
                  <span className="text-slate-700 dark:text-slate-300">{client.country || "United Kingdom"}</span>
                </div>

                {/* Subscribed Services Badges */}
                <div className="pt-2">
                  <span className="block text-slate-500 font-medium mb-1.5">Subscribed Services</span>
                  <div className="flex flex-wrap gap-1.5">
                    {subscribedServices.map((svc: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: MAIN INTERACTIVE TABS & TIMELINE (8/12)      */}
          {/* ========================================================= */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Primary Main Tab Strip */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 shadow-2xs flex flex-wrap items-center gap-1 text-xs font-semibold">
              {[
                { id: "timeline", label: "Timeline" },
                { id: "onboarding", label: "Onboarding" },
                { id: "workspace", label: "Workspace" },
                { id: "schedule", label: "Schedule" },
                { id: "details", label: "Details" },
                { id: "settings", label: "Settings" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: TIMELINE WITH ALL 5 SUB-TABS */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                
                {/* Secondary Sub-Tabs Strip */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 sm:px-4 sm:py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                    {[
                      { id: "all", label: "Activity" },
                      { id: "notes", label: "Notes" },
                      { id: "email", label: "Email" },
                      { id: "sms", label: "SMS" },
                      { id: "requests", label: "Client Request" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setTimelineSubTab(st.id)}
                        className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                          timelineSubTab === st.id
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold shadow-2xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end border-slate-100 dark:border-slate-800">
                    <Clock size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <select
                      value={timeframeFilter}
                      onChange={(e) => setTimeframeFilter(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded-md text-xs px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer shadow-2xs hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SUB-TAB 1: ACTIVITY TIMELINE STREAM                       */}
                {/* ========================================================= */}
                {timelineSubTab === "all" && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
                    
                    {/* Topic Filter Chips */}
                    <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                          Select your timeline:
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {selectedTopics.length === 0 ? "All topics shown" : `${selectedTopics.length} selected topics from ${ALL_TOPICS.length} available`} ({filteredTimeline.length} activities)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {ALL_TOPICS.map((topic) => {
                          const isSelected = selectedTopics.includes(topic);
                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => toggleTopic(topic)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? "bg-[#5c469c] text-white font-bold shadow-2xs"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400"
                              }`}
                            >
                              <span>{topic}</span>
                              {isSelected && <X size={11} className="opacity-80" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTopics([])}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                          >
                            Reset Filter (Show All)
                          </button>
                          <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTopics([...ALL_TOPICS])}
                            className="text-xs text-[#5c469c] dark:text-purple-400 hover:underline font-medium cursor-pointer"
                          >
                            Select All
                          </button>
                        </div>
                        {selectedTopics.length > 0 && (
                          <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800/40">
                            Filtering by {selectedTopics.length} topic{selectedTopics.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Activity Items Stream */}
                    <div className="space-y-3 pt-2">
                      {filteredTimeline.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                          <Clock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            No activities found for the selected topics and timeframe.
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Try selecting more topics above or click below to view all activities.
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedTopics([])}
                            className="mt-3 text-xs font-semibold text-[#5c469c] dark:text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw size={12} /> Show All Activities
                          </button>
                        </div>
                      ) : (
                        filteredTimeline.map((item: any) => {
                          const getTopicIcon = () => {
                            switch (item.topic) {
                              case "Deadlines": return <Calendar size={14} className="text-amber-600 dark:text-amber-400" />;
                              case "Notes": return <FileText size={14} className="text-purple-600 dark:text-purple-400" />;
                              case "Conversations": return <Mail size={14} className="text-blue-600 dark:text-blue-400" />;
                              case "SMS": return <Smartphone size={14} className="text-emerald-600 dark:text-emerald-400" />;
                              case "Service": return <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />;
                              case "Documents": return <FolderOpen size={14} className="text-cyan-600 dark:text-cyan-400" />;
                              case "Tasks": return <CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400" />;
                              case "Client Details": return <Building2 size={14} className="text-violet-600 dark:text-violet-400" />;
                              case "Invoice": return <DollarSign size={14} className="text-green-600 dark:text-green-400" />;
                              default: return <Clock size={14} className="text-slate-600 dark:text-slate-400" />;
                            }
                          };

                          const getBadgeColor = () => {
                            switch (item.topic) {
                              case "Deadlines": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
                              case "Notes": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40";
                              case "Conversations": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40";
                              case "SMS": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
                              case "Service": return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40";
                              case "Documents": return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40";
                              case "Tasks": return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40";
                              case "Client Details": return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40";
                              default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                            }
                          };

                          return (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 transition flex items-start gap-3"
                            >
                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 shrink-0 mt-0.5 border border-slate-100 dark:border-slate-700">
                                {getTopicIcon()}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.title}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{formatDate(item.timestamp)}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">{item.content}</p>
                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                                    {item.author}
                                  </span>
                                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getBadgeColor()}`}>
                                    {item.topic}
                                  </span>
                                  {item.status && (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                                      {item.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 2: NOTES COMPOSER & HISTORY (Screenshot 1)         */}
                {/* ========================================================= */}
                {timelineSubTab === "notes" && (
                  <div className="space-y-4">
                    
                    {/* Note Composer Box */}
                    <form onSubmit={handlePostNote} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
                      <textarea
                        rows={4}
                        placeholder="Type in your note here"
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                      
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400 hover:text-purple-900 font-semibold cursor-pointer">
                          <Upload size={14} />
                          <span>UPLOAD FILES</span>
                          <span className="text-[11px] text-slate-400 font-normal ml-1">Tip: Drag & Drop Files Here</span>
                          <input type="file" className="hidden" onChange={() => toast({ title: "Attachment added" })} />
                        </label>

                        <button
                          type="submit"
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-6 py-1.5 rounded transition shadow-xs cursor-pointer"
                        >
                          Post
                        </button>
                      </div>
                    </form>

                    {/* Notes List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                        Recorded Notes ({notesList.length})
                      </h4>
                      {notesList.map((n: any) => (
                        <div key={n.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-purple-700 dark:text-purple-400">{n.author}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{formatDate(n.timestamp)}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300">{n.content}</p>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 3: EMAIL COMPOSER & HISTORY (Screenshot 2)         */}
                {/* ========================================================= */}
                {timelineSubTab === "email" && (
                  <div className="space-y-4">
                    
                    {/* Notice Banner */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <Info size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <span>
                          All communication from SanSuite will be logged into timeline and conversations sections. You can log all your conversations with client into SanSuite. If you send any email from outside SanSuite all that you need to do is CC to the below email.
                        </span>
                      </div>
                    </div>

                    {/* Full Email Composer Form */}
                    <form onSubmit={handleSendEmail} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-3.5 text-xs">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2">
                        <label className="text-slate-600 font-medium sm:col-span-1">To</label>
                        <input
                          type="email"
                          placeholder="Select contact email"
                          value={emailForm.to || client.email || ""}
                          onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                          className="sm:col-span-5 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2">
                        <label className="text-slate-600 font-medium sm:col-span-1">CC</label>
                        <input
                          type="text"
                          placeholder="Type email and press Enter"
                          value={emailForm.cc}
                          onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                          className="sm:col-span-5 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2">
                        <label className="text-slate-600 font-medium sm:col-span-1">Subject</label>
                        <input
                          type="text"
                          placeholder="Type in Subject"
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          className="sm:col-span-5 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-6 items-center gap-2">
                        <label className="text-slate-600 font-medium sm:col-span-1">Priority</label>
                        <select
                          value={emailForm.priority}
                          onChange={(e) => setEmailForm({ ...emailForm, priority: e.target.value })}
                          className="sm:col-span-5 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>

                      {/* Formatting Toolbar */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-t p-1.5 bg-slate-50 dark:bg-slate-800 flex flex-wrap items-center gap-2 text-slate-600">
                        <span className="font-semibold text-[11px] px-2 py-0.5 border-r border-slate-300">Normal</span>
                        <span className="font-semibold text-[11px] px-2 py-0.5 border-r border-slate-300">Sans Serif</span>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><Bold size={13} /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><Italic size={13} /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><Underline size={13} /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><List size={13} /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><ListOrdered size={13} /></button>
                        <button type="button" className="p-1 hover:bg-slate-200 rounded"><Code size={13} /></button>
                      </div>

                      <textarea
                        rows={6}
                        placeholder="Type in your message here"
                        value={emailForm.message}
                        onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                        className="w-full border-x border-b border-slate-300 dark:border-slate-700 rounded-b p-3 bg-white dark:bg-slate-800 -mt-2 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Device Upload */}
                          <label className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400 font-semibold cursor-pointer hover:text-purple-900 dark:hover:text-purple-300 transition bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 px-2.5 py-1.5 rounded shadow-2xs">
                            <Upload size={14} className="text-purple-600 dark:text-purple-400" />
                            <span>Upload Files</span>
                            <span className="text-[11px] text-slate-400 font-normal ml-0.5">Tip: Drag & Drop Files Here</span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handleDeviceFileUpload}
                            />
                          </label>

                          <span className="text-slate-300 dark:text-slate-700 text-xs font-semibold">or</span>

                          {/* Media Library Button */}
                          <button
                            type="button"
                            onClick={() => setIsEmailMediaModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer shadow-2xs"
                          >
                            <FolderOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Media Library</span>
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingEmail}
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-6 py-1.5 rounded transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {isSendingEmail ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              <span>Sending via SMTP...</span>
                            </>
                          ) : (
                            <>
                              <Send size={13} />
                              <span>Send</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Attached Files List */}
                      {emailAttachments.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Paperclip size={12} className="text-purple-600" />
                              Attached Files ({emailAttachments.length}):
                            </span>
                            <button
                              type="button"
                              onClick={() => setEmailAttachments([])}
                              className="text-[10px] text-red-600 hover:underline cursor-pointer"
                            >
                              Remove All
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {emailAttachments.map((f) => (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 bg-purple-50/70 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                              >
                                <FileText size={13} className="text-purple-600 shrink-0" />
                                <span className="max-w-[200px] truncate font-medium">{f.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({f.size})</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {f.source === "media_library" ? "Media Vault" : "Device"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(f.id)}
                                  className="text-slate-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer ml-1"
                                  title="Remove attachment"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </form>

                    {/* Email Logs Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs space-y-3 text-xs">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 pb-2">
                        Email Logs ({emailLogs.length})
                      </h4>
                      {emailLogs.map((e: any) => (
                        <div key={e.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{e.subject}</span>
                            <p className="text-[11px] text-slate-500">To: {e.to}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              {e.status}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(e.sentAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 4: SMS SUB-TAB & SENDER (Screenshot 3)            */}
                {/* ========================================================= */}
                {timelineSubTab === "sms" && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4 text-xs">
                    
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200">SMS Communications</h4>
                        <p className="text-[11px] text-slate-400">Direct UK mobile SMS reminders & alerts.</p>
                      </div>

                      <button
                        onClick={() => setIsSmsModalOpen(true)}
                        className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-4 py-1.5 rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Smartphone size={13} /> Send SMS
                      </button>
                    </div>

                    {/* SMS History */}
                    {smsLogs.length === 0 ? (
                      <div className="text-center py-12 text-purple-600 font-medium">No SMS records found</div>
                    ) : (
                      <div className="space-y-2.5">
                        {smsLogs.map((s: any) => (
                          <div key={s.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 flex items-start justify-between">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">To: {s.to}</span>
                              <p className="text-slate-600 dark:text-slate-400">{s.body}</p>
                              <span className="text-[10px] text-slate-400">Sender ID: {s.senderId}</span>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                {s.status}
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">{formatDate(s.sentAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {/* ========================================================= */}
                {/* SUB-TAB 5: CLIENT REQUEST / TICKETS (Screenshot 4)        */}
                {/* ========================================================= */}
                {timelineSubTab === "requests" && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4 text-xs">
                    
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Client Requests & Tickets</span>
                        <select className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs bg-white dark:bg-slate-800">
                          <option value="All">Status - All</option>
                          <option value="Open">Open</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setIsTicketModalOpen(true)}
                        className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-4 py-1.5 rounded shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} /> New Ticket
                      </button>
                    </div>

                    {/* Tickets Table */}
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-3">Ticket Title</th>
                          <th className="py-2.5 px-3">Last Updated On</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketsList.map((t: any, idx: number) => (
                          <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{t.title}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(t.updatedAt)}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>
                )}

              </div>
            )}

            {/* TAB 2: ONBOARDING & AML/KYC ACCORDION HUB (Matching Capium 5 Screenshots) */}
            {activeTab === "onboarding" && (
              <div className="space-y-3">
                
                {/* 1. Onboarding and KYC Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "onboarding-kyc" ? null : "onboarding-kyc")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Onboarding and KYC</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "onboarding-kyc" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "onboarding-kyc" && (
                    <div className="p-4 space-y-3.5 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Onboarding and KYC</span>
                          <div className="relative flex-1">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search"
                              value={onboardingSearch}
                              onChange={(e) => setOnboardingSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExportOnboardingPdf}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1 transition"
                            title="Export KYC Onboarding Checklist as PDF"
                          >
                            <FileText size={13} /> Export as PDF
                          </button>
                          <button
                            onClick={() => setIsOnboardingModalOpen(true)}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={13} /> New Criteria
                          </button>
                        </div>
                      </div>

                      {/* Criteria Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-y border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 w-8"><input type="checkbox" defaultChecked /></th>
                            <th className="py-2.5 px-3">Criteria</th>
                            <th className="py-2.5 px-3">Notes</th>
                            <th className="py-2.5 px-3">Yes/No</th>
                            <th className="py-2.5 px-3">To do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {onboardingChecks.filter((r: any) => (r.criteria || "").toLowerCase().includes(onboardingSearch.toLowerCase())).map((row: any) => (
                            <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <input
                                  type="checkbox"
                                  checked={!!row.isCompleted}
                                  onChange={(e) => {
                                    const isDone = e.target.checked;
                                    updateOnboardingMutation.mutate({
                                      id: row.id,
                                      data: { isCompleted: isDone, status: isDone ? "Yes" : "No", todo: isDone ? "Completed" : "Pending" },
                                    });
                                  }}
                                  className="cursor-pointer"
                                />
                              </td>
                              <td
                                onClick={() => {
                                  setEditingCriteriaForm({
                                    id: row.id,
                                    type: "onboarding",
                                    criteria: row.criteria,
                                    notes: row.notes || "",
                                  });
                                  setIsEditCriteriaModalOpen(true);
                                }}
                                className="py-2.5 px-3 font-semibold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                              >
                                {row.criteria}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                <input
                                  type="text"
                                  defaultValue={row.notes || ""}
                                  onBlur={(e) => {
                                    if (e.target.value !== row.notes) {
                                      updateOnboardingMutation.mutate({ id: row.id, data: { notes: e.target.value } });
                                    }
                                  }}
                                  className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-hidden py-0.5"
                                  placeholder="Add notes..."
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={row.status || "Yes"}
                                  onChange={(e) => {
                                    const newStatus = e.target.value;
                                    updateOnboardingMutation.mutate({
                                      id: row.id,
                                      data: { status: newStatus, todo: newStatus === "Yes" ? "Completed" : "Pending", isCompleted: newStatus === "Yes" },
                                    });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                    row.status === "Yes"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                  }`}
                                >
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${row.todo === "Completed" ? "text-emerald-600" : "text-amber-600 font-semibold"}`}>
                                  {row.todo || (row.status === "Yes" ? "Completed" : "Pending")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. Risk Assessment Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "risk-assessment" ? null : "risk-assessment")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Risk Assessment</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "risk-assessment" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "risk-assessment" && (
                    <div className="p-4 space-y-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          onClick={() => setIsRiskModalOpen(true)}
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-4 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Shield size={13} /> Run Risk Assessment
                        </button>

                        <button
                          onClick={() => {
                            const csvContent = "data:text/csv;charset=utf-8," + ["Ref,Date,Next Review,Risk Level,Status"].concat(riskHistory.map((r: any) => `RSK-${r.id},${r.verifiedAt},${r.nextReviewDate},${r.riskLevel},Verified`)).join("\n");
                            const encodedUri = encodeURI(csvContent);
                            const link = document.createElement("a");
                            link.setAttribute("href", encodedUri);
                            link.setAttribute("download", `Risk_Assessments_${client.clientCode || "Client"}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            toast({ title: "CSV Exported", description: "Risk Assessment logs exported." });
                          }}
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer"
                        >
                          Export CSV
                        </button>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">Filter By</span>
                          <select className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800">
                            <option value="latest">Latest</option>
                            <option value="all">All</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">From</span>
                          <input type="date" defaultValue={new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]} className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">To</span>
                          <input type="date" defaultValue={new Date().toISOString().split("T")[0]} className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-600 font-medium">Risk Level</span>
                          <select className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800">
                            <option value="All">All</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      {/* Risk Assessment Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-y border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 w-8"><input type="checkbox" defaultChecked /></th>
                            <th className="py-2.5 px-3">Reference Id</th>
                            <th className="py-2.5 px-3">Risk Assessment Date</th>
                            <th className="py-2.5 px-3">Next Review Date</th>
                            <th className="py-2.5 px-3">Risk Level</th>
                            <th className="py-2.5 px-3">Evaluated By</th>
                            <th className="py-2.5 px-3">Document Notes</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riskHistory.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-6 text-center text-slate-400">
                                No risk assessments logged yet. Click "Run Risk Assessment" to evaluate this client.
                              </td>
                            </tr>
                          ) : (
                            riskHistory.map((r: any) => (
                              <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                <td className="py-2.5 px-3"><input type="checkbox" defaultChecked /></td>
                                <td className="py-2.5 px-3 font-mono font-semibold text-purple-700">RSK-{client.id}-{r.id}</td>
                                <td className="py-2.5 px-3 font-mono">{r.verifiedAt ? new Date(r.verifiedAt).toLocaleDateString("en-GB") : "01-09-2026"}</td>
                                <td className="py-2.5 px-3 font-mono">{r.nextReviewDate ? new Date(r.nextReviewDate).toLocaleDateString("en-GB") : "01-09-2027"}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    r.riskLevel === "Low"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : r.riskLevel === "Medium"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}>
                                    {r.riskLevel || "Low"} Risk
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                                  {r.verifiedBy || client.clientManager || currentUserName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{r.riskNotes || "Statutory review clean."}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Completed
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Compliance Checks Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "compliance-checks" ? null : "compliance-checks")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Compliance Checks</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "compliance-checks" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "compliance-checks" && (
                    <div className="p-5 space-y-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              Electronic Identity & AML Screening Gateway ({amlGatewayConfig.provider})
                            </span>
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> {amlGatewayConfig.isConfigured ? "Connected & Active (Live API)" : "Ready for Configuration"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAmlConfigModalOpen(true)}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <SlidersHorizontal size={13} /> Configure API Keys
                          </button>

                          <button
                            onClick={handleRunElectronicAmlCheck}
                            disabled={isScreeningRunning}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-4 py-1.5 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw size={13} className={isScreeningRunning ? "animate-spin" : ""} />
                            {isScreeningRunning ? "Screening Global Databases..." : "Run Live Electronic Check"}
                          </button>
                        </div>
                      </div>

                      {/* Electronic Check Verification Results Card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Card 1: Passport / Photo ID — dynamic from DB */}
                        {(() => {
                          const latest = riskHistory[0];
                          const idStatus = latest?.idVerificationStatus || "Pending";
                          const idDoc = latest?.idDocumentType || "Unknown";
                          const isVerified = idStatus === "Verified";
                          const isFailed = idStatus === "Failed";
                          return (
                            <div className={`p-3.5 rounded-lg border space-y-1 ${
                              isFailed
                                ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
                                : isVerified
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60"
                                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                            }`}>
                              <span className="text-slate-500 dark:text-slate-400 font-medium block">Passport / Photo ID Status</span>
                              <span className={`font-bold flex items-center gap-1 ${
                                isFailed ? "text-red-700 dark:text-red-400"
                                  : isVerified ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-amber-700 dark:text-amber-400"
                              }`}>
                                {isFailed ? <AlertCircle size={13} /> : isVerified ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                                {isVerified ? `Verified (${idDoc})` : isFailed ? `Failed (${idDoc})` : "Pending Verification"}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {latest?.idDocumentNumber
                                  ? `Doc #: ${latest.idDocumentNumber}${latest.idExpiryDate ? ` · Expires: ${new Date(latest.idExpiryDate).toLocaleDateString("en-GB")}` : ""}`
                                  : latest ? "No document number recorded" : "No AML check run yet"}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Card 2: PEP & Sanctions — dynamic Red / Yellow / Green */}
                        {riskHistory[0]?.riskLevel === "High" ? (
                          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 space-y-1">
                            <span className="text-slate-600 dark:text-slate-400 font-medium block">PEP & Sanctions Screening</span>
                            <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle size={13} /> Active Sanctions Match (High Risk)
                            </span>
                            <span className="text-[10px] text-red-600 dark:text-red-400">Flagged on OFSI/OFAC international lists</span>
                          </div>
                        ) : riskHistory[0]?.riskLevel === "Medium" ? (
                          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 space-y-1">
                            <span className="text-slate-600 dark:text-slate-400 font-medium block">PEP & Sanctions Screening</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={13} /> PEP / Watchlist Advisory (Medium Risk)
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Enhanced Due Diligence (EDD) advised</span>
                          </div>
                        ) : riskHistory.length === 0 ? (
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                            <span className="text-slate-600 dark:text-slate-400 font-medium block">PEP & Sanctions Screening</span>
                            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock size={13} /> Not Yet Screened
                            </span>
                            <span className="text-[10px] text-slate-400">Run Live Electronic Check to screen</span>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                            <span className="text-slate-600 dark:text-slate-400 font-medium block">PEP & Sanctions Screening</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Verified Clean (Low Risk)
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">0 Sanctions/PEP hits on OFSI, OFAC, UN & EU</span>
                          </div>
                        )}

                        {/* Card 3: Proof of Address — dynamic from DB */}
                        {(() => {
                          const latest = riskHistory[0];
                          const addrStatus = latest?.addressVerificationStatus || "Pending";
                          const isConfirmed = addrStatus === "Verified";
                          const isFailed = addrStatus === "Failed";
                          return (
                            <div className={`p-3.5 rounded-lg border space-y-1 ${
                              isFailed
                                ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
                                : isConfirmed
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60"
                                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                            }`}>
                              <span className="text-slate-500 dark:text-slate-400 font-medium block">Proof of Address (Credit Bureau)</span>
                              <span className={`font-bold flex items-center gap-1 ${
                                isFailed ? "text-red-700 dark:text-red-400"
                                  : isConfirmed ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}>
                                {isFailed ? <AlertCircle size={13} /> : isConfirmed ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                {isConfirmed ? "Address Confirmed" : isFailed ? "Address Failed" : "Not Yet Verified"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {client.postcode ? `Matched: ${client.postcode}` : "No postcode on record"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>


                      {/* Info hint */}
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-lg p-3 flex items-start gap-2 text-[11px] text-purple-900 dark:text-purple-300">
                        <Info size={14} className="shrink-0 mt-0.5 text-purple-600" />
                        <span>
                          Electronic Verification Gateway connects with <strong>{amlGatewayConfig.provider}</strong> to instantly authenticate directors, shareholders, and beneficial owners to satisfy UK MLR 2017 statutory compliance.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. AML Checklist Section (Statutory Questions & Capium CDD) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "aml-checklist" ? null : "aml-checklist")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">AML Checklist</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-semibold">
                        {amlQuestions.length} Questions
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        amlQuestions.filter((q: any) => !q.isChecked).length === 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {amlQuestions.filter((q: any) => !q.isChecked).length === 0 ? "100% Verified" : `${amlQuestions.filter((q: any) => q.isChecked).length}/${amlQuestions.length} Passed`}
                      </span>
                    </div>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "aml-checklist" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "aml-checklist" && (
                    <div className="p-4 space-y-3.5 text-xs">
                      {/* Compliance Stats Mini Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Total Criteria</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{amlQuestions.length}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Passed (Yes)</span>
                          <span className="font-bold text-emerald-600 text-sm">
                            {amlQuestions.filter((q: any) => q.isChecked).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">Pending / Flagged (No)</span>
                          <span className="font-bold text-rose-500 text-sm">
                            {amlQuestions.filter((q: any) => !q.isChecked).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-medium">MLR Compliance</span>
                          <span className={`font-bold text-xs inline-flex items-center gap-1 ${
                            amlQuestions.filter((q: any) => !q.isChecked).length === 0 ? "text-emerald-600" : "text-amber-600"
                          }`}>
                            <CheckCircle2 size={12} />
                            {amlQuestions.filter((q: any) => !q.isChecked).length === 0 ? "Low Risk / Compliant" : "Review Required"}
                          </span>
                        </div>
                      </div>

                      {/* Header controls: Search, Export as PDF, + New Criteria */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">AML Checklist</span>
                          <div className="relative flex-1">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search Criteria..."
                              value={amlSearch}
                              onChange={(e) => setAmlSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={handleExportAmlPdf}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1 transition"
                            title="Export formal UK Statutory AML Compliance Report as PDF"
                          >
                            <FileText size={13} /> Export as PDF
                          </button>
                          <button
                            onClick={() => {
                              setNewAmlCriteriaForm({ question: "", isChecked: true, notes: "-" });
                              setIsNewAmlCriteriaModalOpen(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded shadow-2xs cursor-pointer flex items-center gap-1 transition"
                          >
                            <Plus size={13} /> New Criteria
                          </button>
                        </div>
                      </div>

                      {/* AML Checklist Table (Capium Standard: Checkbox, Criteria, Notes, Yes/No, Actions) */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                              <th className="py-2.5 px-3 w-8 text-center">#</th>
                              <th className="py-2.5 px-3">Criteria</th>
                              <th className="py-2.5 px-3 w-56">Notes</th>
                              <th className="py-2.5 px-3 w-24 text-center">Yes/No</th>
                              <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {amlQuestions
                              .filter((q: any) => (q.question || "").toLowerCase().includes(amlSearch.toLowerCase()))
                              .map((q: any, idx: number) => {
                                const isYes = !!q.isChecked;
                                return (
                                  <tr key={q.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-2.5 px-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                                    <td
                                      onClick={() => {
                                        setEditingCriteriaForm({
                                          id: q.id,
                                          type: "aml",
                                          criteria: q.question,
                                          notes: q.notes || "",
                                        });
                                        setIsEditCriteriaModalOpen(true);
                                      }}
                                      className="py-2.5 px-3 text-purple-700 dark:text-purple-300 font-medium hover:underline cursor-pointer"
                                      title="Click to edit question text or notes"
                                    >
                                      {q.question}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                                      <input
                                        type="text"
                                        defaultValue={q.notes || "-"}
                                        onBlur={(e) => {
                                          if (e.target.value !== q.notes) {
                                            updateAmlQuestionMutation.mutate({
                                              id: q.id,
                                              data: { notes: e.target.value },
                                            });
                                          }
                                        }}
                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-hidden py-0.5 text-xs text-slate-700 dark:text-slate-300"
                                        placeholder="Add notes..."
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        onClick={() => {
                                          updateAmlQuestionMutation.mutate({
                                            id: q.id,
                                            data: { isChecked: !isYes },
                                          });
                                        }}
                                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 mx-auto ${
                                          isYes
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                        }`}
                                        title="Click to toggle Yes / No status"
                                      >
                                        {isYes ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                        <span>{isYes ? "Yes" : "No"}</span>
                                      </button>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => {
                                            setEditingCriteriaForm({
                                              id: q.id,
                                              type: "aml",
                                              criteria: q.question,
                                              notes: q.notes || "",
                                            });
                                            setIsEditCriteriaModalOpen(true);
                                          }}
                                          className="p-1 rounded text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                                          title="Edit criteria"
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (window.confirm("Are you sure you want to remove this AML criteria?")) {
                                              deleteAmlQuestionMutation.mutate(q.id);
                                            }
                                          }}
                                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                          title="Delete criteria"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. KYC Documents Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "kyc-documents" ? null : "kyc-documents")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>KYC Documents</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {kycDocs.length}
                      </span>
                    </span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "kyc-documents" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "kyc-documents" && renderKycDocumentsSection(false)}
                </div>

                {/* 6. AML Training Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "aml-training" ? null : "aml-training")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                      <GraduationCap size={15} className="text-purple-600 dark:text-purple-400" />
                      <span>AML Training</span>
                      {activeTrainingRecord ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getTrainingStatusInfo(activeTrainingRecord).badgeClass}`}>
                          {getTrainingStatusInfo(activeTrainingRecord).label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                          Pending
                        </span>
                      )}
                      {amlTrainingList.length > 1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                          {amlTrainingList.length} staff
                        </span>
                      )}
                    </span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "aml-training" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "aml-training" && (
                    <div className="p-4 space-y-4 text-xs">
                      {!activeTrainingRecord ? (
                        <div className="text-center py-8 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                            <GraduationCap size={24} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              No AML Staff Training Logged
                            </h4>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-xs">
                              Under Regulation 24 of the UK Money Laundering Regulations 2017, relevant staff must complete regular AML & CTF training. Log your first staff training certification below.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenTrainingModal()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#5c469c] text-white hover:bg-[#4b3882] transition cursor-pointer shadow-xs"
                          >
                            <Plus size={14} /> Log Staff AML Training
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Top Bar: Staff Info & Actions */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold shrink-0">
                                <User size={15} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>{activeTrainingRecord.staffName}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {activeTrainingRecord.staffRole || "Assigned Accountant / MLRO"}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Practice MLR Staff Training Record (Regulation 24, MLR 2017)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenTrainingModal(activeTrainingRecord)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
                              >
                                <Edit2 size={12} /> Edit Record
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenTrainingModal()}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#5c469c] text-white hover:bg-[#4b3882] transition cursor-pointer"
                              >
                                <Plus size={12} /> Add Staff Record
                              </button>
                            </div>
                          </div>

                          {/* Compliance Alert / Confirmation Banner */}
                          {getTrainingStatusInfo(activeTrainingRecord).isExpired ? (
                            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-900 dark:text-rose-200">
                              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <span className="font-bold">MLR 2017 Compliance Alert: </span>
                                Staff AML certification for <strong>{activeTrainingRecord.staffName}</strong> expired on {activeTrainingRecord.expiresAt ? new Date(activeTrainingRecord.expiresAt).toLocaleDateString("en-GB") : "N/A"}. Immediate refresher training is required under Regulation 24 of the Money Laundering Regulations 2017.
                              </div>
                            </div>
                          ) : getTrainingStatusInfo(activeTrainingRecord).daysRemaining <= 30 ? (
                            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/50 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                              <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <span className="font-bold">Refresher Due Soon: </span>
                                Staff AML certification for <strong>{activeTrainingRecord.staffName}</strong> is due for annual renewal on {activeTrainingRecord.expiresAt ? new Date(activeTrainingRecord.expiresAt).toLocaleDateString("en-GB") : "N/A"} ({getTrainingStatusInfo(activeTrainingRecord).daysRemaining} days remaining).
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
                              <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <span className="font-bold">Statutory Compliance Verified: </span>
                                Assigned Accountant ({activeTrainingRecord.staffName}) has completed the annual UK Anti-Money Laundering & Terrorist Financing training module adhering to CCAB AML Guidance and Regulation 24 of the Money Laundering Regulations 2017.
                              </div>
                            </div>
                          )}

                          {/* 4-Card Metrics Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* 1. Course Title & Provider */}
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Course & Provider</span>
                              <div className="font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                                {activeTrainingRecord.courseTitle || "—"}
                              </div>
                              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                {activeTrainingRecord.trainingProvider || "—"}
                              </div>
                            </div>

                            {/* 2. Completed Date */}
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed Date</span>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {activeTrainingRecord.completedAt
                                  ? new Date(activeTrainingRecord.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                  : "—"}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Pass Grade: <span className="font-semibold text-emerald-600">{activeTrainingRecord.scorePercentage ?? 100}%</span>
                              </div>
                            </div>

                            {/* 3. Next Renewal Date */}
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next Renewal Due</span>
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {activeTrainingRecord.expiresAt
                                  ? new Date(activeTrainingRecord.expiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                  : "—"}
                              </div>
                              <div className="text-[11px]">
                                <span className={getTrainingStatusInfo(activeTrainingRecord).isExpired ? "text-rose-600 font-semibold" : "text-slate-500 dark:text-slate-400"}>
                                  {getTrainingStatusInfo(activeTrainingRecord).daysRemaining > 0
                                    ? `${getTrainingStatusInfo(activeTrainingRecord).daysRemaining} days remaining`
                                    : `Expired ${Math.abs(getTrainingStatusInfo(activeTrainingRecord).daysRemaining)} days ago`}
                                </span>
                              </div>
                            </div>

                            {/* 4. Certificate Ref & File */}
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Certificate Reference</span>
                              <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={activeTrainingRecord.certificateRef || "—"}>
                                {activeTrainingRecord.certificateRef || "—"}
                              </div>
                              <div className="pt-0.5">
                                {activeTrainingRecord.certificateUrl ? (
                                  <a
                                    href={activeTrainingRecord.certificateUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-purple-600 hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <ExternalLink size={12} /> View Certificate
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenTrainingModal(activeTrainingRecord)}
                                    className="text-purple-600 hover:underline inline-flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                                  >
                                    <Upload size={12} /> Attach Proof
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes / Syllabus Details */}
                          {activeTrainingRecord.notes && (
                            <div className="p-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Training Syllabus & Compliance Scope:</span>
                              <p>{activeTrainingRecord.notes}</p>
                            </div>
                          )}

                          {/* Practice Staff Roster Table (if multiple staff records exist) */}
                          {amlTrainingList.length > 1 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">Firm Staff AML Certification Roster</span>
                                <span className="text-[11px] text-slate-500">All registered practice staff certifications</span>
                              </div>
                              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                      <th className="py-2 px-3">Staff Member</th>
                                      <th className="py-2 px-3">Role</th>
                                      <th className="py-2 px-3">Provider</th>
                                      <th className="py-2 px-3">Completed</th>
                                      <th className="py-2 px-3">Renewal Due</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {amlTrainingList.map((tr: any) => {
                                      const statusInfo = getTrainingStatusInfo(tr);
                                      return (
                                        <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{tr.staffName}</td>
                                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{tr.staffRole}</td>
                                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{tr.trainingProvider || "—"}</td>
                                          <td className="py-2 px-3 font-mono text-[11px]">
                                            {tr.completedAt ? new Date(tr.completedAt).toLocaleDateString("en-GB") : "—"}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-[11px]">
                                            {tr.expiresAt ? new Date(tr.expiresAt).toLocaleDateString("en-GB") : "—"}
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusInfo.badgeClass}`}>
                                              {statusInfo.label}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenTrainingModal(tr)}
                                                className="p-1 rounded text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                                                title="Edit certification"
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (window.confirm(`Delete AML training record for ${tr.staffName}?`)) {
                                                    deleteAmlTrainingMutation.mutate(tr.id);
                                                  }
                                                }}
                                                className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                                title="Delete certification"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. HMRC 64-8 Agent Authorisations Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => setOpenAccordion(openAccordion === "hmrc-648" ? null : "hmrc-648")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <div className="flex items-center gap-2">
                      <Landmark size={15} className="text-purple-700 dark:text-purple-300" />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        HMRC 64-8 Agent Authorisation (Authorising your Agent)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {agentAuthorizations.length} Regimes Registered
                      </span>
                    </div>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${openAccordion === "hmrc-648" ? "rotate-180" : ""}`} />
                  </div>

                  {openAccordion === "hmrc-648" && (
                    <div className="p-5 space-y-4 text-xs">
                      
                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                            HMRC Digital & Physical Agent Authority
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Empowers the practice to deal directly with HM Revenue & Customs for Corporation Tax, VAT, PAYE & Self Assessment.
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddAuthModalOpen(true)}
                            className="px-3 py-1.5 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus size={13} /> + Add Authorisation
                          </button>

                          <button
                            type="button"
                            onClick={() => setIs648ModalOpen(true)}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-4 py-1.5 rounded shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText size={13} /> Generate Official Form 64-8
                          </button>
                        </div>
                      </div>

                      {/* 4 Tax Regimes Overview Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          {
                            title: "Corporation Tax (CT)",
                            regime: "Corporation Tax",
                            desc: client.registrationNumber ? `CRN: ${client.registrationNumber}` : "Company Tax",
                          },
                          {
                            title: "Self Assessment (SA)",
                            regime: "Self Assessment",
                            desc: client.utrNumber ? `UTR: ${client.utrNumber}` : "Personal / Partner Tax",
                          },
                          {
                            title: "VAT (Value Added Tax)",
                            regime: "VAT",
                            desc: client.vatNumber ? `VAT: GB ${client.vatNumber}` : "MTD VAT Reporting",
                          },
                          {
                            title: "PAYE for Employers",
                            regime: "PAYE",
                            desc: "RTI Payroll & FPS/EPS",
                          },
                        ].map((reg) => {
                          const auth = agentAuthorizations.find((a: any) =>
                            (a.serviceType || "").toLowerCase().includes(reg.regime.toLowerCase())
                          );
                          const isAuthorized = auth && auth.status === "Authorized";
                          const isPending = auth && auth.status === "Pending";
                          return (
                            <div
                              key={reg.title}
                              className={`p-3.5 rounded-lg border space-y-1.5 ${
                                isAuthorized
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                  : isPending
                                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  {reg.title}
                                </span>
                                {isAuthorized ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    Authorized
                                  </span>
                                ) : isPending ? (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    Not Set
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {reg.desc}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {auth?.agentReference ? `Ref: ${auth.agentReference}` : auth?.codeStatus || "Ready to authorize"}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Authorisations Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Service Regime</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Auth Code / Step</th>
                              <th className="py-2.5 px-3">Agent Reference</th>
                              <th className="py-2.5 px-3">Submission Date</th>
                              <th className="py-2.5 px-3">Notes</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {agentAuthorizations.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                  No HMRC agent authorizations registered yet. Click &quot;Generate Official Form 64-8&quot; to authorize this client.
                                </td>
                              </tr>
                            ) : (
                              agentAuthorizations.map((auth: any) => (
                                <tr key={auth.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                    {auth.serviceType}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        auth.status === "Authorized"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                      }`}
                                    >
                                      {auth.status || "Pending"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                    {auth.codeStatus || "Auth Code Sent"}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                    {auth.agentReference || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                    {auth.submissionDate
                                      ? new Date(auth.submissionDate).toLocaleDateString("en-GB")
                                      : "—"}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                                    {auth.notes || "Official 64-8 mandate recorded."}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Delete ${auth.serviceType} authorization record?`)) {
                                          deleteAuthMutation.mutate(auth.id);
                                        }
                                      }}
                                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                      title="Remove authorization"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Statutory Advisory */}
                      <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 dark:border-purple-900/40 flex items-start gap-2.5 text-[11px] text-purple-900 dark:text-purple-300">
                        <Info size={15} className="text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>UK Statutory Compliance Notice: </strong>
                          HMRC Form 64-8 establishes direct statutory authority between your accounting practice and HM Revenue & Customs under Section 113 of the Taxes Management Act 1970. Authorisations remain in effect until formally revoked by the client or replaced by a new agent authority notice.
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: WORKSPACE */}
            {activeTab === "workspace" && (
              <div className="space-y-4">
                {/* Deadlines Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Statutory Deadlines</h3>
                    <Link href={`/practice/deadlines?client=${clientId}`} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">View All Deadlines</Link>
                  </div>
                  {deadlinesList.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No statutory deadlines recorded for this client.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {deadlinesList.slice(0, 6).map((dl: any) => (
                        <div key={dl.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col space-y-1.5 transition hover:border-purple-300">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{dl.deadlineName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${dl.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : dl.status === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{dl.status}</span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400">Service: {dl.serviceType || "General"}</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Due: {dl.statutoryDeadlineDate ? new Date(dl.statutoryDeadlineDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Assigned Practice Tasks</h3>
                    <Link href={`/practice/tasks?client=${clientId}`} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">View All Tasks</Link>
                  </div>
                  {tasksList.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No practice tasks assigned for this client.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {tasksList.slice(0, 6).map((task: any) => (
                        <div key={task.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col space-y-1.5 transition hover:border-purple-300">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{task.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>{task.status}</span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400">Priority: {task.priority || "Normal"} | Type: {task.taskType || "Ad-hoc"}</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'No Due Date'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SCHEDULE & MEETINGS (Matching Capium Screenshot 1) */}
            {activeTab === "schedule" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-2xs space-y-4 text-xs">
                
                {/* Search & Filter Controls Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Meetings</span>
                    
                    <div className="relative min-w-[180px]">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Quick Search"
                        value={meetingSearch}
                        onChange={(e) => setMeetingSearch(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <select
                      value={meetingGroupBy}
                      onChange={(e) => setMeetingGroupBy(e.target.value)}
                      className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs font-medium"
                    >
                      <option value="Group By Date">Group By Date</option>
                      <option value="Group By Host">Group By Host</option>
                      <option value="All">All Meetings</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={meetingDateFrom}
                        onChange={(e) => setMeetingDateFrom(e.target.value)}
                        className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-[11px] font-mono"
                      />
                      <span className="text-slate-400">to</span>
                      <input
                        type="date"
                        value={meetingDateTo}
                        onChange={(e) => setMeetingDateTo(e.target.value)}
                        className="border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewMeetingForm(f => ({ ...f, host: currentUserName, title: "", agenda: "", date: new Date().toISOString().split("T")[0] }));
                      setIsNewMeetingModalOpen(true);
                    }}

                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={13} /> New
                  </button>
                </div>

                {/* Meetings Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Title / Agenda</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Host Accountant</th>
                      <th className="py-2.5 px-3">Location / Link</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetingsList
                      .filter((m) => m.title.toLowerCase().includes(meetingSearch.toLowerCase()))
                      .map((m, idx) => (
                        <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{m.title}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs block">{m.agenda}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="font-semibold text-purple-700 dark:text-purple-300 block">{m.date}</span>
                            <span className="text-[10px] text-slate-400">{m.time}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{m.host}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{m.location}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  await apiRequest("DELETE", `/api/pm/meetings/${m.id}`);
                                  refetchMeetings();
                                  toast({ title: "Meeting Removed", description: "Meeting removed from schedule and database." });
                                } catch {
                                  toast({ title: "Error", description: "Failed to remove meeting.", variant: "destructive" });
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Cancel Meeting"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

              </div>
            )}

            {/* TAB 5: DETAILS — Unified Sub-Tabs including CH Live Data */}
            {activeTab === "details" && (
              <div className="space-y-4 text-xs">

                {/* Sub-tab Navigation Strip */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
                  {/* Header with sync button and CRN info */}
                  <div className="p-3.5 sm:px-4 sm:py-3 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-purple-50/25 to-slate-50 dark:from-slate-800/70 dark:via-purple-950/20 dark:to-slate-800/70">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                      {/* Left: Icon, Title, and CRN badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 shadow-2xs border border-purple-200/70 dark:border-purple-800/60">
                          <Building2 size={16} />
                        </div>
                        <div className="flex items-center flex-wrap gap-2 min-w-0">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            Client Details
                          </span>
                          {client.registrationNumber && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-700/80 shadow-2xs shrink-0">
                              <span className="text-[9px] uppercase font-bold text-purple-500 tracking-wider">CRN</span>
                              {client.registrationNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Companies House link + Sync from CH button */}
                      {client.registrationNumber && (
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t border-slate-200/60 sm:border-t-0 dark:border-slate-700/40">
                          <a
                            href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent((client.registrationNumber || "").trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 transition whitespace-nowrap"
                            title="Open Companies House Registry (New Tab)"
                          >
                            <ExternalLink size={12} className="opacity-75" />
                            <span>Companies House</span>
                          </a>

                          <button
                            onClick={() => refreshChDataMutation.mutate()}
                            disabled={refreshChDataMutation.isPending}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] active:bg-[#3f2e70] text-white rounded-md text-xs font-bold shadow-2xs hover:shadow-sm transition disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                            title="Synchronise fresh company status, officers, deadlines and filings from Companies House"
                          >
                            <RefreshCw size={12} className={refreshChDataMutation.isPending ? "animate-spin" : ""} />
                            <span>{refreshChDataMutation.isPending ? "Syncing..." : "Sync from CH"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-tab Navigation Bar */}
                  <div className="border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 px-2.5 pt-1.5 relative group/subtabs">
                    {canScrollLeft && (
                      <button
                        type="button"
                        onClick={() => scrollTabs("left")}
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-purple-600 hover:scale-105 transition cursor-pointer"
                        title="Scroll Left"
                      >
                        <ChevronLeft size={13} />
                      </button>
                    )}
                    <div
                      ref={clientDetailsTabsRef}
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                      className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
                    >
                      {[
                        { id: "overview", label: "Overview & Address", icon: MapPin },
                        { id: "statutory", label: "Statutory Deadlines", icon: Calendar },
                        { id: "officers", label: "Officers", count: directorsList.length, icon: Users },
                        { id: "psc", label: "PSC & Shareholders", count: shareholdersList.length, icon: Shield },
                        ...(client.registrationNumber ? [
                          { id: "filings", label: "Filing History", count: effectiveChData?.filingHistory?.length || 0, icon: FileText },
                          { id: "charges", label: "Charges", count: effectiveChData?.charges?.length || 0, icon: Landmark },
                        ] : []),
                        { id: "paye", label: "PAYE & Social", icon: Smartphone },
                      ].map((st) => {
                        const Icon = st.icon;
                        const isActive = detailsSubTab === st.id;
                        return (
                          <button
                            key={st.id}
                            onClick={() => setDetailsSubTab(st.id as any)}
                            className={`group relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border-t-2 -mb-[1px] ${
                              isActive
                                ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-t-purple-600 border-x border-slate-200/90 dark:border-slate-700 shadow-2xs font-bold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 border-t-transparent border-x border-transparent"
                            }`}
                          >
                            <Icon
                              size={13}
                              className={`shrink-0 transition-colors ${
                                isActive
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                              }`}
                            />
                            <span>{st.label}</span>
                            {st.count !== undefined && (
                              <span
                                className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                                  isActive
                                    ? "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300"
                                    : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-300/80"
                                }`}
                              >
                                {st.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {canScrollRight && (
                      <button
                        type="button"
                        onClick={() => scrollTabs("right")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:text-purple-600 hover:scale-105 transition cursor-pointer"
                        title="Scroll Right"
                      >
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>

                  {/* ── Sub-tab: OVERVIEW & ADDRESS ── */}
                  {detailsSubTab === "overview" && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Client Information</p>
                        <button
                          onClick={() => openEditClientInfoModal()}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 font-semibold cursor-pointer transition"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {[
                          { label: "Client ID", value: client.clientCode || `CLI${client.id}`, mono: true },
                          { label: "Client Name", value: client.clientName, bold: true },
                          { label: "Email", value: client.email || "—", mono: true },
                          { label: "Phone", value: client.phone || "—" },
                          { label: "Client Type", value: client.clientType || "Limited" },
                          { label: "Website", value: client.website || "—", mono: true },
                          { label: "Address Line 1", value: client.addressLine1 || client.address || "—" },
                          { label: "Address Line 2", value: client.addressLine2 || "—" },
                          { label: "City / Town", value: client.city || client.townCity || "—" },
                          { label: "Country", value: client.country || "United Kingdom" },
                          { label: "Postcode", value: client.postcode || "—", mono: true },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                            <span className="text-slate-500 font-medium">{row.label}</span>
                            <span className={`${row.mono ? "font-mono" : ""} ${row.bold ? "font-bold" : ""} text-slate-800 dark:text-slate-200`}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* CH registered address if available */}
                      {effectiveChData?.profile?.registered_office_address && (
                        <div className="mt-3 p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-purple-600" />
                            <span className="font-bold text-purple-700 dark:text-purple-300 text-[11px]">Registered Office (Companies House)</span>
                          </div>
                          {[
                            effectiveChData.profile.registered_office_address.address_line_1,
                            effectiveChData.profile.registered_office_address.address_line_2,
                            effectiveChData.profile.registered_office_address.locality,
                            effectiveChData.profile.registered_office_address.postal_code,
                            effectiveChData.profile.registered_office_address.country,
                          ].filter(Boolean).map((line: string, li: number) => (
                            <p key={li} className="text-slate-700 dark:text-slate-300">{line}</p>
                          ))}
                        </div>
                      )}

                      {/* SIC Codes */}
                      {effectiveChData?.profile?.sic_codes && effectiveChData.profile.sic_codes.length > 0 && (
                        <div className="mt-3">
                          <p className="font-bold text-slate-600 dark:text-slate-300 mb-2 text-[11px]">SIC Codes</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {parseSicCodes(effectiveChData.profile.sic_codes.join(",")).map(({ code, description }) => (
                              <div key={code} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <span className="font-mono font-bold text-purple-700 dark:text-purple-400 text-[11px] block">{code}</span>
                                <span className="text-slate-600 dark:text-slate-400">{description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-tab: STATUTORY DEADLINES ── */}
                  {detailsSubTab === "statutory" && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Business & Tax Information</p>
                        <button
                          onClick={() => { setActiveTab("details"); openEditClientInfoModal(); }}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 font-semibold cursor-pointer transition"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Accounts */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Calendar size={13} className="text-purple-600" /> Accounts Filing
                          </p>
                          {[
                            { label: "Financial Year End", value: client.yearEnd || "—" },
                            { label: "Next Accounts Due", value: effectiveChData?.profile?.accounts?.next_accounts?.due_on ? new Date(effectiveChData.profile.accounts.next_accounts.due_on).toLocaleDateString("en-GB") : client.nextAccountsDue ? new Date(client.nextAccountsDue).toLocaleDateString("en-GB") : "—", mono: true, highlight: true },
                            { label: "Period End Date", value: effectiveChData?.profile?.accounts?.next_accounts?.period_end_on || "—" },
                            { label: "Accounts Category", value: getAccountTypeLabel(effectiveChData?.profile?.accounts?.last_accounts?.type) },
                            { label: "ARD (Day/Month)", value: effectiveChData?.profile?.accounts?.accounting_reference_date ? `${effectiveChData.profile.accounts.accounting_reference_date.day}/${effectiveChData.profile.accounts.accounting_reference_date.month}` : client.yearEnd || "—" },
                          ].map((r, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                              <span className="text-slate-500">{r.label}</span>
                              <span className={`${r.mono ? "font-mono" : ""} ${r.highlight ? "font-bold text-purple-700 dark:text-purple-400" : "text-slate-800 dark:text-slate-200"}`}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                        {/* CS01 */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileCheck size={13} className="text-indigo-600" /> Confirmation Statement (CS01)
                          </p>
                          {[
                            { label: "Next CS01 Due", value: effectiveChData?.profile?.confirmation_statement?.next_due ? new Date(effectiveChData.profile.confirmation_statement.next_due).toLocaleDateString("en-GB") : client.nextCsDue ? new Date(client.nextCsDue).toLocaleDateString("en-GB") : "—", mono: true, highlight: true },
                            { label: "Next Made Up To", value: effectiveChData?.profile?.confirmation_statement?.next_made_up_to || "—" },
                            { label: "Last Made Up To", value: effectiveChData?.profile?.confirmation_statement?.last_made_up_to || "—" },
                          ].map((r, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                              <span className="text-slate-500">{r.label}</span>
                              <span className={`${r.mono ? "font-mono" : ""} ${r.highlight ? "font-bold text-indigo-700 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"}`}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                        {/* Tax / VAT */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <DollarSign size={13} className="text-emerald-600" /> Tax & VAT
                          </p>
                          {[
                            { label: "UTR Number", value: client.utrNumber || "—", mono: true },
                            { label: "VAT Registration No.", value: client.vatRegistrationNumber || "—", mono: true },
                            { label: "VAT Scheme", value: client.vatScheme || "—" },
                            { label: "Book Start Date", value: client.bookStartDate || "—" },
                            { label: "Business Start Date", value: client.businessStartDate || "—" },
                          ].map((r, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                              <span className="text-slate-500">{r.label}</span>
                              <span className={`${r.mono ? "font-mono text-emerald-700 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}`}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                        {/* CH Info */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 size={13} className="text-purple-600" /> Companies House
                          </p>
                          {[
                            { label: "Company Status", value: getCompanyStatusLabel(effectiveChData?.profile?.company_status) },
                            { label: "Company Type", value: getCompanyTypeLabel(effectiveChData?.profile?.type || client.clientType) },
                            { label: "Jurisdiction", value: getJurisdictionLabel(effectiveChData?.profile?.jurisdiction) },
                            { label: "Incorporated", value: effectiveChData?.profile?.date_of_creation ? new Date(effectiveChData.profile.date_of_creation).toLocaleDateString("en-GB") : "—" },
                            { label: "CH Auth Code", value: client.chAuthCode || "—", mono: true },
                            { label: "SIC Code", value: client.sicCode || "—", mono: true },
                          ].map((r, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/40 last:border-0">
                              <span className="text-slate-500">{r.label}</span>
                              <span className={`${r.mono ? "font-mono" : ""} text-slate-800 dark:text-slate-200`}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Sub-tab: OFFICERS & DIRECTORS ── */}
                  {detailsSubTab === "officers" && (
                    <div className="p-5 space-y-3">
                      {/* Live CH officers if available */}
                      {effectiveChData?.officers && effectiveChData.officers.length > 0 && (
                        <div className="mb-4">
                          <p className="font-bold text-slate-600 dark:text-slate-300 text-[11px] mb-2 flex items-center gap-1.5">
                            <Building2 size={12} className="text-purple-500" /> Companies House Official Register
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {effectiveChData.officers.map((officer: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-1.5">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{officer.name}</p>
                                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                                      {getOfficerRoleLabel(officer.officer_role)}
                                    </span>
                                  </div>
                                  {officer.resigned_on ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 shrink-0">
                                      Resigned {new Date(officer.resigned_on).toLocaleDateString("en-GB")}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">Active</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 space-y-0.5">
                                  <p>Appointed: <span className="text-slate-700 dark:text-slate-300 font-mono">{officer.appointed_on ? new Date(officer.appointed_on).toLocaleDateString("en-GB") : "—"}</span></p>
                                  <p>Nationality: <span className="text-slate-700 dark:text-slate-300">{officer.nationality || "—"}</span></p>
                                  <p>Occupation: <span className="text-slate-700 dark:text-slate-300">{officer.occupation || "—"}</span></p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual directors register */}
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Directors Register (Your Records)</p>
                        <button
                          onClick={() => { setEditingDirectorId(null); setDirectorForm({ name: "", email: "", mobile: "", status: "Active" }); setIsAddDirectorModalOpen(true); }}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer transition"
                        >
                          <Plus size={11} /> Add Director
                        </button>
                      </div>
                      {directorsList.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No directors recorded yet. Click "Add Director" or sync from Companies House.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="px-4 py-2.5">Name</th>
                                <th className="px-4 py-2.5">Email</th>
                                <th className="px-4 py-2.5">Mobile</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {directorsList.map((d: any) => (
                                <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{d.name}</td>
                                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">{d.email || "—"}</td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{d.mobile || "—"}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">{d.status}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => { setEditingDirectorId(d.id); setDirectorForm({ name: d.name, email: d.email, mobile: d.mobile, status: d.status }); setIsAddDirectorModalOpen(true); }}
                                        className="p-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 cursor-pointer"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await apiRequest("DELETE", `/api/pm/contacts/${d.id}`);
                                            refetchDirectors();
                                            toast({ title: "Director Removed", description: `${d.name} removed from directors register.` });
                                          } catch { toast({ title: "Error", description: "Failed to remove director.", variant: "destructive" }); }
                                        }}
                                        className="p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-tab: PSC / SHAREHOLDERS ── */}
                  {detailsSubTab === "psc" && (
                    <div className="p-5 space-y-3">
                      {/* Live CH PSC data */}
                      {effectiveChData?.psc && effectiveChData.psc.length > 0 && (
                        <div className="mb-4">
                          <p className="font-bold text-slate-600 dark:text-slate-300 text-[11px] mb-2 flex items-center gap-1.5">
                            <Building2 size={12} className="text-purple-500" /> Companies House — Persons with Significant Control
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {effectiveChData.psc.map((psc: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{psc.name}</p>
                                    <span className="text-[10px] text-slate-400 capitalize">{psc.kind?.replace(/-/g, " ")}</span>
                                  </div>
                                  {psc.notified_on && (
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                      {new Date(psc.notified_on).toLocaleDateString("en-GB")}
                                    </span>
                                  )}
                                </div>
                                {psc.natures_of_control && psc.natures_of_control.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {psc.natures_of_control.map((ctrl: string, ci: number) => (
                                      <span key={ci} className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                        {ctrl.replace(/-/g, " ")}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual shareholders register */}
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Shareholders Register (Your Records)</p>
                        <button
                          onClick={() => { setEditingShareholderId(null); setShareholderForm({ name: "", email: "", mobile: "", status: "Active" }); setIsAddShareholderModalOpen(true); }}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer transition"
                        >
                          <Plus size={11} /> Add Shareholder
                        </button>
                      </div>
                      {shareholdersList.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">No shareholders recorded yet. Click "Add Shareholder" or sync from Companies House.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="px-4 py-2.5">Name</th>
                                <th className="px-4 py-2.5">Email</th>
                                <th className="px-4 py-2.5">Mobile</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {shareholdersList.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                                  <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">{s.email || "—"}</td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{s.mobile || "—"}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">{s.status}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => { setEditingShareholderId(s.id); setShareholderForm({ name: s.name, email: s.email, mobile: s.mobile, status: s.status }); setIsAddShareholderModalOpen(true); }}
                                        className="p-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 cursor-pointer"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await apiRequest("DELETE", `/api/pm/contacts/${s.id}`);
                                            refetchShareholders();
                                            toast({ title: "Shareholder Removed", description: `${s.name} removed from shareholders register.` });
                                          } catch { toast({ title: "Error", description: "Failed to remove shareholder.", variant: "destructive" }); }
                                        }}
                                        className="p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-tab: FILING HISTORY ── */}
                  {detailsSubTab === "filings" && (
                    <div className="p-5">
                      {isLoadingLiveCh ? (
                        <div className="py-12 text-center text-slate-400">
                          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-purple-500" />
                          <p className="text-xs font-medium">Loading filing history from Companies House...</p>
                        </div>
                      ) : !effectiveChData?.filingHistory || effectiveChData.filingHistory.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No filing history available. Sync from Companies House first.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="px-4 py-2.5">Date</th>
                                <th className="px-4 py-2.5">Type</th>
                                <th className="px-4 py-2.5">Description</th>
                                <th className="px-4 py-2.5">Category</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {effectiveChData.filingHistory.map((f: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    {f.date ? new Date(f.date).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-4 py-2 font-bold font-mono text-purple-700 dark:text-purple-400 whitespace-nowrap">{f.type}</td>
                                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{f.description?.replace(/-/g, " ") || f.type}</td>
                                  <td className="px-4 py-2 text-slate-500 capitalize whitespace-nowrap">{f.category || "General"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-tab: CHARGES & MORTGAGES ── */}
                  {detailsSubTab === "charges" && (
                    <div className="p-5">
                      {isLoadingLiveCh ? (
                        <div className="py-12 text-center text-slate-400">
                          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-purple-500" />
                          <p className="text-xs font-medium">Loading charges from Companies House...</p>
                        </div>
                      ) : !effectiveChData?.charges || effectiveChData.charges.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No charges or mortgages registered. Sync from Companies House to check.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {effectiveChData.charges.map((chg: any, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 text-xs space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{chg.classification?.description || "Mortgage / Charge"}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${chg.status === "satisfied" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {chg.status}
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400">Created: {chg.created_on ? new Date(chg.created_on).toLocaleDateString("en-GB") : "—"}</p>
                              {chg.persons_entitled && chg.persons_entitled.length > 0 && (
                                <p className="text-slate-500">Entitled: {chg.persons_entitled.map((p: any) => p.name).join(", ")}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sub-tab: PAYE & SOCIAL ── */}
                  {detailsSubTab === "paye" && (
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">PAYE Information</p>
                        <button
                          onClick={() => openEditClientInfoModal()}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 font-semibold cursor-pointer transition"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {[
                          { label: "PAYE Employer Name", value: client.payeEmployerName || "—" },
                          { label: "PAYE Reference", value: client.payeReference || "—", mono: true },
                          { label: "Accounts Office Ref.", value: client.payeAccountsOfficeRef || "—", mono: true },
                          { label: "HMRC Office Number", value: client.payeHmrcOfficeNumber || "—", mono: true },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                            <span className="text-slate-500 font-medium">{row.label}</span>
                            <span className={`${row.mono ? "font-mono" : ""} text-slate-800 dark:text-slate-200`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs mb-2">Social Media</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                          {[
                            { label: "Facebook", value: client.socialFacebook || "—" },
                            { label: "Twitter / X", value: client.socialTwitter || "—" },
                            { label: "LinkedIn", value: client.socialLinkedin || "—" },
                            { label: "Google+", value: client.socialGplus || "—" },
                          ].map((row, i) => (
                            <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 font-medium">{row.label}</span>
                              <span className="font-mono text-purple-600 dark:text-purple-400 text-[11px]">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: SETTINGS (Matching Capium 4 Screenshots) */}
            {activeTab === "settings" && (
              <div className="space-y-3 text-xs">
                
                {/* 1. Contacts Accordion (Screenshot 1) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => toggleSettingsAccordion("contacts")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Contacts</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${settingsOpenAccordions.includes("contacts") ? "rotate-180" : ""}`} />
                  </div>

                  {settingsOpenAccordions.includes("contacts") && (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Client's Contacts</span>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative min-w-[200px]">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search"
                              value={contactsSearch}
                              onChange={(e) => setContactsSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Filter Contacts</span>
                            <select
                              value={contactsFilter}
                              onChange={(e) => setContactsFilter(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            >
                              <option value="Show All">Show All</option>
                              <option value="Director">Director</option>
                              <option value="Shareholder">Shareholder</option>
                              <option value="Primary Contact">Primary Contact</option>
                            </select>
                          </div>

                          <button
                            onClick={() => setIsAddContactModalOpen(true)}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer"
                          >
                            New Contact
                          </button>
                        </div>
                      </div>

                      {/* Contacts Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 w-8">#</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Default</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Created on</th>
                            <th className="py-2.5 px-3">Phone Number</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settingsContacts.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                                No Records found
                              </td>
                            </tr>
                          ) : (
                            settingsContacts
                              .filter((c) => c.name?.toLowerCase().includes(contactsSearch.toLowerCase()))
                              .map((c, idx) => (
                                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                                  <td className="py-2.5 px-3 text-slate-500">{c.isPrimary ? "Yes" : "No"}</td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{c.contactType || "Primary"}</td>
                                  <td className="py-2.5 px-3 text-slate-500 font-mono">{new Date(c.createdAt || Date.now()).toLocaleDateString("en-GB")}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{c.phone || "-"}</td>
                                  <td className="py-2.5 px-3 text-purple-600 font-mono">{c.email || "-"}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-emerald-600 font-bold">Active</span>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>

                      <div className="pt-2 text-[11px] text-slate-500 italic">
                        Tip: Go to Global Contacts page to view all contacts
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Services Accordion (Screenshot 2) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => toggleSettingsAccordion("services")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Services</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${settingsOpenAccordions.includes("services") ? "rotate-180" : ""}`} />
                  </div>

                  {settingsOpenAccordions.includes("services") && (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Services</span>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative min-w-[200px]">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search"
                              value={servicesSearch}
                              onChange={(e) => setServicesSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Filter Services</span>
                            <select
                              value={servicesFilter}
                              onChange={(e) => setServicesFilter(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            >
                              <option value="Show All">Show All</option>
                              <option value="Active">Active Only</option>
                              <option value="Inactive">Inactive Only</option>
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              const defaultStaff = teamMembers[0]?.name || "";
                              setNewServiceForm({
                                id: null,
                                serviceTitle: "",
                                frequency: "Yearly",
                                billable: true,
                                fee: "50.00",
                                estimatedHours: 2,
                                serviceManager: defaultStaff,
                                isActive: true,
                                addToCalendar: true,
                                clientTypes: ["Limited", "Sole Trader"],
                                steps: [
                                  { id: "s1", title: "Review trial balance & bank transactions", isMandatory: true },
                                  { id: "s2", title: "Reconcile VAT & payroll control accounts", isMandatory: true },
                                  { id: "s3", title: "Calculate statutory corporation tax / personal tax", isMandatory: true },
                                  { id: "s4", title: "Generate accounts pack & send for director signing", isMandatory: true },
                                  { id: "s5", title: "HMRC & Companies House gateway submission", isMandatory: true },
                                ],
                                reminders: [
                                  { id: "r1", timing: "1 Month prior to deadlines", staffUser: defaultStaff, clientUser: "All Client Contacts", cc: "" },
                                  { id: "r2", timing: "1 Week prior to deadlines", staffUser: defaultStaff, clientUser: "Primary Director", cc: "" },
                                ],
                                remindTeam: true,
                                assignAll: false,
                                customWorkflow: true,
                              });
                              setServiceModalTab("details");
                              setIsNewServiceModalOpen(true);
                            }}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer"
                          >
                            New Service
                          </button>
                        </div>
                      </div>

                      {/* Services Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3">Service Title</th>
                            <th className="py-2.5 px-3">Frequency</th>
                            <th className="py-2.5 px-3">Steps</th>
                            <th className="py-2.5 px-3">Estimated Hours</th>
                            <th className="py-2.5 px-3">Fee</th>
                            <th className="py-2.5 px-3">Service Type</th>
                            <th className="py-2.5 px-3">Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settingsServices
                            .filter((s) => s.serviceTitle?.toLowerCase().includes(servicesSearch.toLowerCase()))
                            .map((s) => {
                              const isActive = s.status === "Active" || s.status === "ON";
                              return (
                                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                  <td
                                    onClick={() => {
                                      const defaultStaff = teamMembers[0]?.name || "";
                                      setNewServiceForm({
                                        id: s.id,
                                        serviceTitle: s.serviceTitle,
                                        frequency: s.frequency || "Yearly",
                                        billable: true,
                                        fee: s.fee || "35.00",
                                        estimatedHours: parseFloat(s.estimatedHours) || 2,
                                        serviceManager: defaultStaff,
                                        isActive: s.status === "Active" || s.status === "ON",
                                        addToCalendar: true,
                                        clientTypes: ["Limited", "Sole Trader"],
                                        steps: [
                                          { id: "s1", title: "Review trial balance & bank transactions", isMandatory: true },
                                          { id: "s2", title: "Reconcile VAT & payroll control accounts", isMandatory: true },
                                          { id: "s3", title: "Calculate statutory corporation tax / personal tax", isMandatory: true },
                                          { id: "s4", title: "Generate accounts pack & send for director signing", isMandatory: true },
                                          { id: "s5", title: "HMRC & Companies House gateway submission", isMandatory: true },
                                        ],
                                        reminders: [
                                          { id: "r1", timing: "1 Month prior to deadlines", staffUser: defaultStaff, clientUser: "All Client Contacts", cc: "" },
                                          { id: "r2", timing: "1 Week prior to deadlines", staffUser: defaultStaff, clientUser: "Primary Director", cc: "" },
                                        ],
                                        remindTeam: true,
                                        assignAll: false,
                                        customWorkflow: true,
                                      });
                                      setServiceModalTab("details");
                                      setIsNewServiceModalOpen(true);
                                    }}
                                    className="py-2.5 px-3 font-semibold text-purple-600 dark:text-purple-400 cursor-pointer hover:underline"
                                  >
                                    {s.serviceTitle}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{s.frequency}</td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.steps || "5 Steps"}</td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">{s.estimatedHours || "4"}</td>
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="number"
                                      defaultValue={s.fee || "35"}
                                      onBlur={(e) => {
                                        toggleServiceMutation.mutate({ id: s.id, agreedFee: e.target.value });
                                      }}
                                      className="w-20 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-xs font-mono"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{s.serviceType || "Default"}</td>
                                  <td className="py-2.5 px-3">
                                    <button
                                      onClick={() => {
                                        toggleServiceMutation.mutate({ id: s.id, status: isActive ? "Inactive" : "Active" });
                                      }}
                                      className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider cursor-pointer transition ${
                                        isActive
                                          ? "bg-lime-500 hover:bg-lime-600 text-white"
                                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                      }`}
                                    >
                                      {isActive ? "ON" : "OFF"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Agent Authorization Accordion (Screenshot 3) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => toggleSettingsAccordion("authorizations")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Agent Authorization</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${settingsOpenAccordions.includes("authorizations") ? "rotate-180" : ""}`} />
                  </div>

                  {settingsOpenAccordions.includes("authorizations") && (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Agent Authorization</span>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative min-w-[200px]">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search"
                              value={authSearch}
                              onChange={(e) => setAuthSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Status</span>
                            <select
                              value={authStatusFilter}
                              onChange={(e) => setAuthStatusFilter(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            >
                              <option value="All">All</option>
                              <option value="Pending">Pending</option>
                              <option value="Authorized">Authorized</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Type</span>
                            <select
                              value={authTypeFilter}
                              onChange={(e) => setAuthTypeFilter(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            >
                              <option value="All">All</option>
                              <option value="Corporation Tax">Corporation Tax</option>
                              <option value="PAYE">PAYE</option>
                              <option value="VAT">VAT</option>
                              <option value="Self Assessment">Self Assessment</option>
                            </select>
                          </div>

                          <button
                            onClick={() => setIsNewAuthModalOpen(true)}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer"
                          >
                            New Request
                          </button>
                        </div>
                      </div>

                      {/* Agent Authorization Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3">Service Type</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Code Status</th>
                            <th className="py-2.5 px-3">Submission</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settingsAuthorizations.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                                No Records found
                              </td>
                            </tr>
                          ) : (
                            settingsAuthorizations
                              .filter((a) => a.serviceType?.toLowerCase().includes(authSearch.toLowerCase()))
                              .map((a) => (
                                <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{a.serviceType}</td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                      {a.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-medium">{a.codeStatus}</td>
                                  <td className="py-2.5 px-3 text-slate-500 font-mono">{a.submissionDate || "-"}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      onClick={() => toast({ title: "Authorization Resent", description: "HMRC 64-8 code verification request re-triggered." })}
                                      className="text-purple-600 hover:text-purple-800 font-semibold cursor-pointer text-xs"
                                    >
                                      Resend
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. Accounting Periods Accordion (Screenshot 4) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <div
                    onClick={() => toggleSettingsAccordion("periods")}
                    className="bg-[#f0edf9] dark:bg-purple-950/40 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#e7e1f5] transition"
                  >
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Accounting Periods</span>
                    <ChevronDown size={15} className={`text-slate-600 transition-transform ${settingsOpenAccordions.includes("periods") ? "rotate-180" : ""}`} />
                  </div>

                  {settingsOpenAccordions.includes("periods") && (
                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Accounting Periods</span>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative min-w-[200px]">
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Quick Search"
                              value={periodSearch}
                              onChange={(e) => setPeriodSearch(e.target.value)}
                              className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Filter Period</span>
                            <select
                              value={periodFilter}
                              onChange={(e) => setPeriodFilter(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                            >
                              <option value="Show All">Show All</option>
                              <option value="Open">Open Periods</option>
                              <option value="Closed">Closed Periods</option>
                            </select>
                          </div>

                          <button
                            onClick={() => setIsAddPeriodModalOpen(true)}
                            className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer"
                          >
                            Add Period
                          </button>
                        </div>
                      </div>

                      {/* Accounting Periods Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 w-8">#</th>
                            <th className="py-2.5 px-3">Account Period Type</th>
                            <th className="py-2.5 px-3">From Date</th>
                            <th className="py-2.5 px-3">To Date</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settingsPeriods.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                                No records found
                              </td>
                            </tr>
                          ) : (
                            settingsPeriods
                              .filter((p) => p.periodType?.toLowerCase().includes(periodSearch.toLowerCase()))
                              .map((p, idx) => (
                                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50">
                                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.periodType}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDateOnly(p.periodStart)}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{formatDateOnly(p.periodEnd)}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600">{formatDateOnly(p.statutoryDeadline)}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      onClick={() => deletePeriodMutation.mutate(p.id)}
                                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                      title="Delete Period"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SEND SMS (Exact Screenshot 3)                    */}
      {/* ========================================================= */}
      {isSmsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Send SMS</h3>
              <button onClick={() => setIsSmsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendSms} className="p-5 space-y-3.5">
              
              {/* Notice */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Please note that the default sender ID is "SanSuite". If you want to choose your own custom ID, please <a href="#" className="underline font-bold">click here</a> to set it up.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sender Id *</label>
                <input
                  type="text"
                  placeholder="type In your senderId"
                  value={smsForm.senderId}
                  onChange={(e) => setSmsForm({ ...smsForm, senderId: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Tip: Sender name should be max 11 alphanumeric characters (or) 15 digits only.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To *</label>
                <input
                  type="text"
                  placeholder="Add Contact Number (e.g. +4479460912)"
                  value={smsForm.phone || client.phone || "+44 20 7946 0912"}
                  onChange={(e) => setSmsForm({ ...smsForm, phone: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Tip: We currently support only UK Mobile numbers starting with '+44'.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Template</label>
                <select
                  value={smsForm.template}
                  onChange={(e) => {
                    setSmsForm({
                      ...smsForm,
                      template: e.target.value,
                      body: "Hello, this is a reminder from SanSuite regarding your upcoming statutory accounting deadline."
                    });
                  }}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                >
                  <option value="">Select Template</option>
                  <option value="vat">VAT Return Reminder</option>
                  <option value="accounts">Accounts Approval Notice</option>
                  <option value="tax">Corporation Tax CT600 Notice</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Body *</label>
                <textarea
                  rows={4}
                  placeholder="Type in SMS text"
                  value={smsForm.body}
                  onChange={(e) => setSmsForm({ ...smsForm, body: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-800"
                  maxLength={400}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">You have {400 - smsForm.body.length} characters left!</p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <span className="font-semibold text-slate-700">Add Queue:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="queue"
                    checked={smsForm.queueOption === "send"}
                    onChange={() => setSmsForm({ ...smsForm, queueOption: "send" })}
                  />
                  <span>Send Message</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="queue"
                    checked={smsForm.queueOption === "queue"}
                    onChange={() => setSmsForm({ ...smsForm, queueOption: "queue" })}
                  />
                  <span>Add to Queue</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSendingSms}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-6 py-2 rounded shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSendingSms ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Sending SMS...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RAISE A REQUEST TO CLIENT (Screenshot 4)         */}
      {/* ========================================================= */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Raise a Request to Client</h3>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-3.5">
              
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ticket Title *</label>
                <input
                  type="text"
                  placeholder="Type in Ticket Title"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ticket Description</label>
                <textarea
                  rows={4}
                  placeholder="Type in Ticket Desc"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client</label>
                <input
                  type="text"
                  value={client.clientName}
                  disabled
                  className="w-full border border-slate-200 dark:border-slate-800 rounded px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Users *</label>
                <select
                  value={ticketForm.clientUser}
                  onChange={(e) => setTicketForm({ ...ticketForm, clientUser: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                >
                  <option value="">Select Client Contact</option>
                  <option value="director">{client.contactName || "Primary Director"}</option>
                  <option value="accounts">Accounts Dept</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Attachment</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="border border-slate-300 dark:border-slate-700 rounded px-3.5 py-1.5 inline-flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition shadow-2xs">
                    <Upload size={14} className="text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Browse files on your computer</span>
                    <input type="file" multiple className="hidden" onChange={handleTicketDeviceFileUpload} />
                  </label>

                  <span className="text-slate-300 dark:text-slate-700 text-xs font-semibold">or</span>

                  <button
                    type="button"
                    onClick={() => setIsTicketMediaModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer shadow-2xs"
                  >
                    <FolderOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Media Library</span>
                  </button>
                </div>

                {/* Attached files preview chips */}
                {ticketAttachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {ticketAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs"
                      >
                        <Paperclip size={12} className="text-purple-600 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{att.name}</span>
                        <span className="text-[10px] text-slate-400">({att.size})</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          att.source === "media_library"
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}>
                          {att.source === "media_library" ? "Media Vault" : "Device"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeTicketAttachment(att.id)}
                          className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">No file Chosen</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-6 py-2 rounded shadow-xs cursor-pointer"
                >
                  Create
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CONFIGURE AML / VERIPHY API GATEWAY CREDENTIALS */}
      {/* ========================================================= */}
      {isAmlConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Electronic AML & ID Verification API Setup</h3>
              </div>
              <button onClick={() => setIsAmlConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSaveAmlGateway}
              className="p-5 space-y-3.5"
            >
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-lg p-3 text-[11px] text-purple-900 dark:text-purple-300">
                Connect your AML & Compliance screening accounts to run live international Sanctions, PEP, Adverse Media, and Biometric Identity Verification (eIDV) directly inside SanSuite.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Verification Provider *</label>
                <select
                  value={amlGatewayConfig.provider}
                  onChange={(e) => setAmlGatewayConfig({ ...amlGatewayConfig, provider: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value="OpenSanctions (Open Source & Free)">OpenSanctions (Free Open Source PEP & Sanctions Database)</option>
                  <option value="Dilisense (Sanctions & PEP Screening)">Dilisense API (100 Free/Mo, Global Sanctions & PEP)</option>
                  <option value="Xama Technologies (Practice AML & Biometric IDV)">Xama Technologies (Practice AML, Biometric IDV & Portal)</option>
                  <option value="Veriphy (Davies Group - UK)">Veriphy (Davies Group - UK Electronic IDV & SmartSearch)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {amlGatewayConfig.provider.includes("OpenSanctions")
                    ? "OpenSanctions API Key (Optional for Open Data)"
                    : amlGatewayConfig.provider.includes("Dilisense")
                    ? "Dilisense API Key (x-api-key) *"
                    : amlGatewayConfig.provider.includes("Xama")
                    ? "Xama Technologies API Key *"
                    : "Veriphy API Key / Token *"}
                </label>
                <input
                  type="password"
                  value={amlGatewayConfig.apiKey}
                  onChange={(e) => setAmlGatewayConfig({ ...amlGatewayConfig, apiKey: e.target.value })}
                  placeholder={
                    amlGatewayConfig.provider.includes("OpenSanctions")
                      ? "Leave blank for public open data or enter custom key"
                      : amlGatewayConfig.provider.includes("Dilisense")
                      ? "e.g. dls_live_key_..."
                      : amlGatewayConfig.provider.includes("Xama")
                      ? "e.g. xama_sec_key_..."
                      : "e.g. vp_live_key_..."
                  }
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Leave blank to use default key from practice settings or server environment.
                </span>
              </div>

              {(amlGatewayConfig.provider.includes("Xama") || amlGatewayConfig.provider.includes("Veriphy")) && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {amlGatewayConfig.provider.includes("Xama") ? "Xama Account ID / Practice Ref" : "Veriphy Account / Organization ID"}
                  </label>
                  <input
                    type="text"
                    value={amlGatewayConfig.accountId}
                    onChange={(e) => setAmlGatewayConfig({ ...amlGatewayConfig, accountId: e.target.value })}
                    placeholder="e.g. ACC-SANSUITE-UK"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={isTestingConnection}
                  onClick={handleTestAmlConnection}
                  className="text-purple-600 hover:text-purple-800 font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isTestingConnection ? "Pinging Gateway API..." : "Test Connection"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAmlConfigModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                  >
                    Save & Activate
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD ONBOARDING CRITERIA REQUIREMENT               */}
      {/* ========================================================= */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add Onboarding Criteria</h3>
              </div>
              <button onClick={() => setIsOnboardingModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOnboardingCriteriaMutation.mutate(onboardingForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Criteria / Requirement Title *</label>
                <input
                  type="text"
                  value={onboardingForm.criteria}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, criteria: e.target.value })}
                  placeholder="e.g. VAT Registration Certificate Received"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Verification Details</label>
                <input
                  type="text"
                  value={onboardingForm.notes}
                  onChange={(e) => setOnboardingForm({ ...onboardingForm, notes: e.target.value })}
                  placeholder="e.g. Certificate verified via HMRC online portal"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
                  <select
                    value={onboardingForm.status}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, status: e.target.value, todo: e.target.value === "Yes" ? "Completed" : "Pending" })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Yes">Yes (Satisfied)</option>
                    <option value="No">No (Outstanding)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Do Stage</label>
                  <select
                    value={onboardingForm.todo}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, todo: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending Review</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardingModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addOnboardingCriteriaMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addOnboardingCriteriaMutation.isPending ? "Saving..." : "Save Criteria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: RUN STATUTORY RISK ASSESSMENT                    */}
      {/* ========================================================= */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Run Statutory Risk Assessment (MLR 2017)</h3>
              </div>
              <button onClick={() => setIsRiskModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runRiskAssessmentMutation.mutate(riskForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-lg p-3 text-[11px] text-purple-900 dark:text-purple-300">
                Evaluating <strong>{client.clientName}</strong> against UK Money Laundering Regulations 2017 risk indicators (Jurisdiction, Business Activity, Structure, PEPs, Cash Volume).
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assessed Risk Level *</label>
                <select
                  value={riskForm.riskLevel}
                  onChange={(e) => setRiskForm({ ...riskForm, riskLevel: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="Low">Low Risk (Standard Simplified Due Diligence)</option>
                  <option value="Medium">Medium Risk (Standard Due Diligence Required)</option>
                  <option value="High">High Risk (Enhanced Due Diligence - EDD Mandatory)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Compliance Officer Assessment Notes *</label>
                <textarea
                  rows={3}
                  value={riskForm.notes}
                  onChange={(e) => setRiskForm({ ...riskForm, notes: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Next Statutory Review Date</label>
                <input
                  type="date"
                  value={riskForm.nextReviewDate}
                  onChange={(e) => setRiskForm({ ...riskForm, nextReviewDate: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={runRiskAssessmentMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {runRiskAssessmentMutation.isPending ? "Calculating & Saving..." : "Confirm & Save Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: UPLOAD / ATTACH KYC COMPLIANCE DOCUMENT          */}
      {/* ========================================================= */}
      {isKycDocModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Upload KYC Compliance Document</h3>
              </div>
              <button onClick={() => setIsKycDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addKycDocMutation.mutate(kycDocForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={kycDocForm.title}
                  onChange={(e) => setKycDocForm({ ...kycDocForm, title: e.target.value })}
                  placeholder="e.g. Director_Passport_Verified.pdf"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Type *</label>
                  <select
                    value={kycDocForm.documentType}
                    onChange={(e) => setKycDocForm({ ...kycDocForm, documentType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="ID Proof">Passport / Photo ID</option>
                    <option value="Proof of Address">Proof of Address</option>
                    <option value="Company Cert">Cert of Incorporation</option>
                    <option value="Articles">Memorandum & Articles</option>
                    <option value="Engagement">Letter of Engagement</option>
                    <option value="Clearance">Professional Clearance</option>
                    <option value="Other">Other Compliance Doc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Vault Folder *</label>
                  <select
                    value={kycDocForm.folder}
                    onChange={(e) => setKycDocForm({ ...kycDocForm, folder: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    {kycFolders.map((f) => (
                      <option key={f} value={f}>
                        {f === "Client-Shared-Docs" ? "Client Shared" : f === "Internal-Docs" ? "Commercial Internal" : f === "Accountant-Only" ? "Accountant Only" : f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select from Media Library */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">File Attachment</label>
                <button
                  type="button"
                  onClick={() => {
                    setTargetFolderForMedia(kycDocForm.folder);
                    setIsMediaLibraryOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-lg border border-purple-300 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-semibold flex items-center justify-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition cursor-pointer"
                >
                  <FolderOpen size={14} /> Browse Firm Media Library
                </button>
              </div>

              {/* Selected File Feedback */}
              {kycDocForm.title && (
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">{kycDocForm.title}</span>
                  </div>
                  <span className="text-emerald-700 font-mono text-[10px] shrink-0">{kycDocForm.fileSize}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKycDocModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addKycDocMutation.isPending || !kycDocForm.title}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addKycDocMutation.isPending ? "Saving..." : "Save to Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CUSTOM KYC FOLDER                              */}
      {/* ========================================================= */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Folder size={15} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add New Document Folder</h3>
              </div>
              <button onClick={() => setIsNewFolderModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newFolderNameInput.trim();
                if (!trimmed) return;
                if (!kycFolders.includes(trimmed)) {
                  setKycFolders([...kycFolders, trimmed]);
                }
                setSelectedKycFolder(trimmed);
                setIsNewFolderModalOpen(false);
                toast({ title: "Folder Created", description: `Folder "${trimmed}" added to vault.` });
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Folder Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tax Returns 2026, Identity Evidence"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                  autoFocus
                />
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LOG / EDIT AML STAFF TRAINING RECORD              */}
      {/* ========================================================= */}
      {isAmlTrainingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {editingAmlTrainingId ? "Edit Staff AML Training Record" : "Log AML Staff Training Certification"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAmlTrainingModalOpen(false);
                  setEditingAmlTrainingId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingAmlTrainingId) {
                  updateAmlTrainingMutation.mutate({
                    id: editingAmlTrainingId,
                    data: amlTrainingForm,
                  });
                } else {
                  addAmlTrainingMutation.mutate(amlTrainingForm);
                }
              }}
              className="p-5 space-y-3.5"
            >
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-lg p-3 text-[11px] text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <ShieldCheck size={16} className="text-purple-600 shrink-0" />
                <span>
                  Regulation 24 of the <strong>Money Laundering Regulations 2017</strong> requires all relevant firm employees to undergo annual AML & CTF training.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Member Name *</label>
                  <input
                    type="text"
                    value={amlTrainingForm.staffName}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, staffName: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    placeholder="Enter staff / accountant name"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Role / Designation</label>
                  <select
                    value={amlTrainingForm.staffRole}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, staffRole: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Assigned Accountant / MLRO">Assigned Accountant / MLRO</option>
                    <option value="Nominated Officer / Deputy MLRO">Nominated Officer / Deputy MLRO</option>
                    <option value="Practice Partner / Director">Practice Partner / Director</option>
                    <option value="Senior Accountant">Senior Accountant</option>
                    <option value="Bookkeeper / Payroll Specialist">Bookkeeper / Payroll Specialist</option>
                    <option value="Trainee Accountant">Trainee Accountant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Course Title *</label>
                  <input
                    type="text"
                    value={amlTrainingForm.courseTitle}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, courseTitle: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    placeholder="e.g. UK Anti-Money Laundering & Terrorist Financing"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Training Provider</label>
                  <input
                    type="text"
                    value={amlTrainingForm.trainingProvider}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, trainingProvider: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    placeholder="e.g. Veriphy Compliance, ICAEW, ACCA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date Completed *</label>
                  <input
                    type="date"
                    value={amlTrainingForm.completedAt}
                    onChange={(e) => {
                      const completedVal = e.target.value;
                      if (completedVal) {
                        const d = new Date(completedVal);
                        d.setFullYear(d.getFullYear() + 1);
                        setAmlTrainingForm({
                          ...amlTrainingForm,
                          completedAt: completedVal,
                          expiresAt: d.toISOString().split("T")[0],
                        });
                      } else {
                        setAmlTrainingForm({ ...amlTrainingForm, completedAt: completedVal });
                      }
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Refresher Renewal Date *</label>
                  <input
                    type="date"
                    value={amlTrainingForm.expiresAt}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, expiresAt: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Certificate Ref</label>
                  <input
                    type="text"
                    value={amlTrainingForm.certificateRef}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, certificateRef: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono text-[11px]"
                    placeholder="CERT-AML-2026-XXXX"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Score %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={amlTrainingForm.scorePercentage}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, scorePercentage: parseInt(e.target.value) || 0 })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Compliance Status</label>
                  <select
                    value={amlTrainingForm.status}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, status: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Certified Compliant">Certified Compliant</option>
                    <option value="Renewal Due Soon">Renewal Due Soon</option>
                    <option value="Certification Expired">Certification Expired</option>
                    <option value="Pending Assessment">Pending Assessment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Certificate Document / Proof URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={amlTrainingForm.certificateUrl}
                    onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, certificateUrl: e.target.value })}
                    className="flex-1 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    placeholder="https://... or select from firm files"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFolderForMedia("Accountant-Only");
                      setIsMediaLibraryOpen(true);
                    }}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded font-semibold flex items-center gap-1.5 hover:bg-purple-100 transition cursor-pointer shrink-0"
                  >
                    <FolderOpen size={13} /> Attach File
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Syllabus Covered / Audit Notes</label>
                <textarea
                  rows={2}
                  value={amlTrainingForm.notes}
                  onChange={(e) => setAmlTrainingForm({ ...amlTrainingForm, notes: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800"
                  placeholder="e.g. Covered UK MLR 2017 amendments, SAR submission to NCA, PEP & sanctions screening..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAmlTrainingModalOpen(false);
                    setEditingAmlTrainingId(null);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAmlTrainingMutation.isPending || updateAmlTrainingMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addAmlTrainingMutation.isPending || updateAmlTrainingMutation.isPending
                    ? "Saving Record..."
                    : editingAmlTrainingId
                    ? "Update Certification"
                    : "Save Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GLOBAL MEDIA LIBRARY MODAL FOR KYC ATTACHMENT             */}
      {/* ========================================================= */}
      <GlobalMediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelectFile={handleMediaSelect}
        title="Global Practice Media Library — KYC Vault"
      />

      {/* ========================================================= */}
      {/* MODAL 7: EDIT CRITERIA (Capium Screenshot 1)               */}
      {/* ========================================================= */}
      {isEditCriteriaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Edit Criteria</h3>
              <button onClick={() => setIsEditCriteriaModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="border-t border-dotted border-slate-300 dark:border-slate-700 mx-5" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingCriteriaForm.type === "onboarding" && editingCriteriaForm.id) {
                  updateOnboardingMutation.mutate({
                    id: editingCriteriaForm.id,
                    data: { criteria: editingCriteriaForm.criteria, notes: editingCriteriaForm.notes },
                  });
                } else if (editingCriteriaForm.type === "aml" && editingCriteriaForm.id) {
                  updateAmlQuestionMutation.mutate({
                    id: editingCriteriaForm.id,
                    data: { question: editingCriteriaForm.criteria, notes: editingCriteriaForm.notes },
                  });
                }
                setIsEditCriteriaModalOpen(false);
                toast({ title: "Criteria Updated", description: "Criteria and notes updated successfully." });
              }}
              className="p-5 space-y-4"
            >
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Criteria *</label>
                <input
                  type="text"
                  value={editingCriteriaForm.criteria}
                  onChange={(e) => setEditingCriteriaForm({ ...editingCriteriaForm, criteria: e.target.value })}
                  className="col-span-3 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300 font-semibold">Notes</label>
                <input
                  type="text"
                  placeholder="Type in notes here"
                  value={editingCriteriaForm.notes}
                  onChange={(e) => setEditingCriteriaForm({ ...editingCriteriaForm, notes: e.target.value })}
                  className="col-span-3 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditCriteriaModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW AML CRITERIA                               */}
      {/* ========================================================= */}
      {isNewAmlCriteriaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add New AML Criteria</h3>
              </div>
              <button onClick={() => setIsNewAmlCriteriaModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAmlQuestionMutation.mutate(newAmlCriteriaForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Criteria / Question Description *</label>
                <textarea
                  rows={3}
                  value={newAmlCriteriaForm.question}
                  onChange={(e) => setNewAmlCriteriaForm({ ...newAmlCriteriaForm, question: e.target.value })}
                  placeholder="e.g. Has the client provided proof of source of crypto wealth or foreign business justification?"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Status</label>
                  <select
                    value={newAmlCriteriaForm.isChecked ? "yes" : "no"}
                    onChange={(e) => setNewAmlCriteriaForm({ ...newAmlCriteriaForm, isChecked: e.target.value === "yes" })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="yes">Yes (Pass / Compliant)</option>
                    <option value="no">No (Pending / Flagged)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Notes</label>
                  <input
                    type="text"
                    value={newAmlCriteriaForm.notes}
                    onChange={(e) => setNewAmlCriteriaForm({ ...newAmlCriteriaForm, notes: e.target.value })}
                    placeholder="e.g. Verified on file"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAmlCriteriaModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAmlQuestionMutation.isPending || !newAmlCriteriaForm.question.trim()}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-4 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addAmlQuestionMutation.isPending ? "Adding..." : "Add Criteria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 8: ADD CONTACT (Capium Screenshot 2)                 */}
      {/* ========================================================= */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add Contact</h3>
              <button onClick={() => setIsAddContactModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="border-t border-dotted border-slate-300 dark:border-slate-700 mx-6" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addContactMutation.mutate(addContactForm);
              }}
              className="p-6 space-y-3.5"
            >
              <div className="text-center pb-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">New Contact for {client.clientName}</h4>
                <p className="text-[11px] text-slate-400">Active since {new Date().toLocaleDateString("en-GB")} 07:47 pm</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Contact Name *</label>
                <input
                  type="text"
                  placeholder="Type in your name"
                  value={addContactForm.firstName}
                  onChange={(e) => setAddContactForm({ ...addContactForm, firstName: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Middle Name</label>
                <input
                  type="text"
                  placeholder="Type in Middle Name"
                  value={addContactForm.middleName}
                  onChange={(e) => setAddContactForm({ ...addContactForm, middleName: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Type in Last Name"
                  value={addContactForm.lastName}
                  onChange={(e) => setAddContactForm({ ...addContactForm, lastName: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Contact Type *</label>
                <select
                  value={addContactForm.contactType}
                  onChange={(e) => setAddContactForm({ ...addContactForm, contactType: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value="Director">Director</option>
                  <option value="Shareholder">Shareholder</option>
                  <option value="Finance Contact">Finance Contact</option>
                  <option value="Company Secretary">Company Secretary</option>
                  <option value="Other">Other</option>
                </select>
                <a href="#" onClick={(e) => { e.preventDefault(); toast({ title: "Companies House Directors", description: "Loading directors from Companies House registry..." }); }} className="text-[11px] text-purple-600 underline font-semibold mt-1 block">
                  Select Director
                </a>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  placeholder="Type in contact email"
                  value={addContactForm.email}
                  onChange={(e) => setAddContactForm({ ...addContactForm, email: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Type in your phone number"
                  value={addContactForm.phone}
                  onChange={(e) => setAddContactForm({ ...addContactForm, phone: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">IDV</label>
                <input
                  type="text"
                  placeholder="Type in Valid IDV (e.g. A1B2C3D4E5F)"
                  value={addContactForm.idv}
                  onChange={(e) => setAddContactForm({ ...addContactForm, idv: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryContactCheck"
                  checked={addContactForm.isPrimary}
                  onChange={(e) => setAddContactForm({ ...addContactForm, isPrimary: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="primaryContactCheck" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  To make Primary Contact
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddContactModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addContactMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-6 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addContactMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 9: ASSIGN USERS (Capium Screenshot 3)                */}
      {/* ========================================================= */}
      {isAssignUsersModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Assign Users</h3>
              <button onClick={() => setIsAssignUsersModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="border-t border-dotted border-slate-300 dark:border-slate-700 mx-5" />

            <div className="p-5 space-y-3.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick Search"
                  value={assignUserSearch}
                  onChange={(e) => setAssignUserSearch(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded pl-7 pr-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={teamMembers.length > 0 && selectedAssignedUsers.length === teamMembers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAssignedUsers(teamMembers.map((u: any) => u.name));
                            } else {
                              setSelectedAssignedUsers([]);
                            }
                          }}
                        />
                      </th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">User Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {teamMembers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400">
                          No team members found in database.
                        </td>
                      </tr>
                    ) : (
                      teamMembers
                        .filter((u: any) => u.name.toLowerCase().includes(assignUserSearch.toLowerCase()))
                        .map((u: any) => {
                          const isSelected = selectedAssignedUsers.includes(u.name);
                          return (
                            <tr key={u.id || u.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAssignedUsers([...selectedAssignedUsers, u.name]);
                                    } else {
                                      setSelectedAssignedUsers(selectedAssignedUsers.filter((n: string) => n !== u.name));
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                              <td className="py-2 px-3 text-slate-500 capitalize">{u.role}</td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={assignUsersMutation.isPending}
                  onClick={() => assignUsersMutation.mutate(selectedAssignedUsers)}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold px-6 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {assignUsersMutation.isPending ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 10: NEW MEETING (Capium Screenshot 1)                */}
      {/* ========================================================= */}
      {isNewMeetingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Schedule New Client Meeting</h3>
              <button onClick={() => setIsNewMeetingModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest("POST", "/api/pm/meetings", {
                    title: newMeetingForm.title,
                    clientId,
                    clientName: client.clientName,
                    host: newMeetingForm.host || currentUserName,
                    date: newMeetingForm.date,
                    time: newMeetingForm.time,
                    location: newMeetingForm.location,
                    agenda: newMeetingForm.agenda,
                  });
                  refetchMeetings();
                  setIsNewMeetingModalOpen(false);
                  toast({ title: "Meeting Scheduled", description: "Meeting added to client calendar and saved to database." });
                } catch {
                  toast({ title: "Error", description: "Failed to schedule meeting.", variant: "destructive" });
                }
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Title / Topic *</label>
                <input
                  type="text"
                  value={newMeetingForm.title}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Host Accountant *</label>
                  <select
                    value={newMeetingForm.host || teamMembers[0]?.name || ""}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, host: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    {teamMembers.length === 0 ? (
                      <option value="Practice Staff">Practice Staff</option>
                    ) : (
                      teamMembers.map((u: any) => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    value={newMeetingForm.date}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, date: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                  <input
                    type="text"
                    value={newMeetingForm.time}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, time: e.target.value })}
                    placeholder="e.g. 10:30 AM"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Video Link</label>
                  <input
                    type="text"
                    value={newMeetingForm.location}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, location: e.target.value })}
                    placeholder="e.g. Zoom / Boardroom"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Agenda / Discussion Points</label>
                <textarea
                  rows={3}
                  value={newMeetingForm.agenda}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, agenda: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 11: EDIT CLIENT INFORMATION                          */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Edit Client Information</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest("PATCH", `/api/pm/clients/${clientId}`, clientInfoForm);
                  queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
                  queryClient.invalidateQueries({ queryKey: ["/api/pm/clients"] });
                  setIsEditModalOpen(false);
                  toast({ title: "Client Information Updated", description: "Client identity and address saved to database." });
                } catch {
                  toast({ title: "Error", description: "Failed to update client information.", variant: "destructive" });
                }
              }}
              className="p-5 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={clientInfoForm.clientName}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, clientName: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Code</label>
                  <input
                    type="text"
                    value={clientInfoForm.clientCode}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, clientCode: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientInfoForm.email}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, email: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={clientInfoForm.phone}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, phone: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Type</label>
                  <select
                    value={clientInfoForm.clientType}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, clientType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Limited">Limited Company</option>
                    <option value="Partnership">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="Sole Trader">Sole Trader</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Website</label>
                  <input
                    type="text"
                    value={clientInfoForm.website}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, website: e.target.value })}
                    placeholder="e.g. www.clientdomain.co.uk"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Address Line 1</label>
                <input
                  type="text"
                  value={clientInfoForm.addressLine1}
                  onChange={(e) => setClientInfoForm({ ...clientInfoForm, addressLine1: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Address Line 2</label>
                <input
                  type="text"
                  value={clientInfoForm.addressLine2}
                  onChange={(e) => setClientInfoForm({ ...clientInfoForm, addressLine2: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={clientInfoForm.townCity}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, townCity: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={clientInfoForm.postcode}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, postcode: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={clientInfoForm.country}
                    onChange={(e) => setClientInfoForm({ ...clientInfoForm, country: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 12: EDIT BUSINESS INFORMATION                        */}
      {/* ========================================================= */}
      {isEditBusinessInfoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Edit Business Information</h3>
              <button onClick={() => setIsEditBusinessInfoModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest("PATCH", `/api/pm/clients/${clientId}`, businessInfoForm);
                  queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
                  toast({ title: "Business Information Updated", description: "Saved to database." });
                } catch {
                  toast({ title: "Error", description: "Failed to save." });
                }
                setIsEditBusinessInfoModalOpen(false);
              }}
              className="p-5 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Start Date</label>
                  <input
                    type="text"
                    value={businessInfoForm.businessStartDate}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, businessStartDate: e.target.value })}
                    placeholder="DD-MM-YYYY"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Book Start Date</label>
                  <input
                    type="text"
                    value={businessInfoForm.bookStartDate}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, bookStartDate: e.target.value })}
                    placeholder="DD-MM-YYYY"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Year End (DD/MM)</label>
                  <input
                    type="text"
                    value={businessInfoForm.yearEnd}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, yearEnd: e.target.value })}
                    placeholder="30/6"
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">VAT Scheme</label>
                  <select
                    value={businessInfoForm.vatScheme}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, vatScheme: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  >
                    <option value="Non-VAT Registered">Non-VAT Registered</option>
                    <option value="Standard Accrual (20%)">Standard Accrual (20%)</option>
                    <option value="Cash Accounting Scheme">Cash Accounting Scheme</option>
                    <option value="Flat Rate Scheme">Flat Rate Scheme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Companies House Auth Code</label>
                  <input
                    type="text"
                    value={businessInfoForm.chAuthCode}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, chAuthCode: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SIC Code</label>
                  <input
                    type="text"
                    value={businessInfoForm.sicCode}
                    onChange={(e) => setBusinessInfoForm({ ...businessInfoForm, sicCode: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                    placeholder="e.g. 62012, 62020, 62090"
                  />
                  {businessInfoForm.sicCode && (
                    <div className="mt-2 space-y-1.5">
                      {parseSicCodes(businessInfoForm.sicCode).map((item, idx) => (
                        <div key={idx} className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded px-2.5 py-1 flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-purple-200">{item.code}</span>
                          <span className="font-medium">{item.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditBusinessInfoModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Save Business Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 12: EDIT SOCIAL LINKS (Screenshot 4)                */}
      {/* ========================================================= */}
      {isEditSocialModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Edit Social & Messaging Links</h3>
              <button onClick={() => setIsEditSocialModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest("PATCH", `/api/pm/clients/${clientId}`, {
                    socialFacebook: socialInfoForm.facebook,
                    socialTwitter: socialInfoForm.twitter,
                    socialLinkedin: socialInfoForm.linkedin,
                    socialGplus: socialInfoForm.gplus,
                  });
                  queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
                  toast({ title: "Social Links Saved", description: "Profile social handles updated." });
                } catch {
                  toast({ title: "Error", description: "Failed to save." });
                }
                setIsEditSocialModalOpen(false);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Facebook URL</label>
                <input
                  type="text"
                  value={socialInfoForm.facebook}
                  onChange={(e) => setSocialInfoForm({ ...socialInfoForm, facebook: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Twitter / X URL</label>
                <input
                  type="text"
                  value={socialInfoForm.twitter}
                  onChange={(e) => setSocialInfoForm({ ...socialInfoForm, twitter: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">LinkedIn URL</label>
                <input
                  type="text"
                  value={socialInfoForm.linkedin}
                  onChange={(e) => setSocialInfoForm({ ...socialInfoForm, linkedin: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">G+ / Hangouts / Teams ID</label>
                <input
                  type="text"
                  value={socialInfoForm.gplus}
                  onChange={(e) => setSocialInfoForm({ ...socialInfoForm, gplus: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditSocialModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Save Links
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 13: EDIT PAYE DETAILS (Screenshot 5)                */}
      {/* ========================================================= */}
      {isEditPayeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Edit PAYE Details</h3>
              <button onClick={() => setIsEditPayeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest("PATCH", `/api/pm/clients/${clientId}`, payeInfoForm);
                  queryClient.invalidateQueries({ queryKey: [`/api/pm/clients/${clientId}/360`] });
                  toast({ title: "PAYE Details Updated", description: "HMRC PAYE references saved to database." });
                } catch {
                  toast({ title: "Error", description: "Failed to save." });
                }
                setIsEditPayeModalOpen(false);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employer Name</label>
                <input
                  type="text"
                  value={payeInfoForm.payeEmployerName}
                  onChange={(e) => setPayeInfoForm({ ...payeInfoForm, payeEmployerName: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PAYE Reference</label>
                <input
                  type="text"
                  value={payeInfoForm.payeReference}
                  onChange={(e) => setPayeInfoForm({ ...payeInfoForm, payeReference: e.target.value })}
                  placeholder="120/AB12345"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Accounts Office Reference</label>
                <input
                  type="text"
                  value={payeInfoForm.payeAccountsOfficeRef}
                  onChange={(e) => setPayeInfoForm({ ...payeInfoForm, payeAccountsOfficeRef: e.target.value })}
                  placeholder="120PX00123456"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">HMRC Office Number</label>
                <input
                  type="text"
                  value={payeInfoForm.payeHmrcOfficeNumber}
                  onChange={(e) => setPayeInfoForm({ ...payeInfoForm, payeHmrcOfficeNumber: e.target.value })}
                  placeholder="120"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditPayeModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  Save PAYE Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 14: ADD / EDIT COMPANY DIRECTOR                     */}
      {/* ========================================================= */}
      {isAddDirectorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {editingDirectorId ? "Edit Company Director" : "Add Company Director"}
              </h3>
              <button onClick={() => { setIsAddDirectorModalOpen(false); setEditingDirectorId(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingDirectorId) {
                    await apiRequest("PATCH", `/api/pm/contacts/${editingDirectorId}`, {
                      name: directorForm.name,
                      email: directorForm.email,
                      phone: directorForm.mobile,
                    });
                    toast({ title: "Director Updated", description: `${directorForm.name} updated successfully.` });
                  } else {
                    await apiRequest("POST", `/api/pm/clients/${clientId}/contact`, {
                      name: directorForm.name,
                      email: directorForm.email,
                      phone: directorForm.mobile,
                      contactType: "Director",
                    });
                    toast({ title: "Director Saved", description: `${directorForm.name} saved to company directors record.` });
                  }
                  refetchDirectors();
                } catch {
                  toast({ title: "Error", description: "Failed to save director.", variant: "destructive" });
                }
                setIsAddDirectorModalOpen(false);
                setEditingDirectorId(null);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Director Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={directorForm.name}
                  onChange={(e) => setDirectorForm({ ...directorForm, name: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Director Email</label>
                <input
                  type="email"
                  placeholder="e.g. director@company.co.uk"
                  value={directorForm.email}
                  onChange={(e) => setDirectorForm({ ...directorForm, email: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +44 7700 900123"
                  value={directorForm.mobile}
                  onChange={(e) => setDirectorForm({ ...directorForm, mobile: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={directorForm.status}
                  onChange={(e) => setDirectorForm({ ...directorForm, status: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                >
                  <option value="Active">Active</option>
                  <option value="Resigned">Resigned</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddDirectorModalOpen(false); setEditingDirectorId(null); }}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  {editingDirectorId ? "Update Director" : "Save Director"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SHAREHOLDER                             */}
      {/* ========================================================= */}
      {isAddShareholderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {editingShareholderId ? "Edit Shareholder" : "Add Shareholder"}
              </h3>
              <button onClick={() => { setIsAddShareholderModalOpen(false); setEditingShareholderId(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingShareholderId) {
                    await apiRequest("PATCH", `/api/pm/contacts/${editingShareholderId}`, {
                      name: shareholderForm.name,
                      email: shareholderForm.email,
                      phone: shareholderForm.mobile,
                    });
                    toast({ title: "Shareholder Updated", description: `${shareholderForm.name} updated successfully.` });
                  } else {
                    await apiRequest("POST", `/api/pm/clients/${clientId}/contact`, {
                      name: shareholderForm.name,
                      email: shareholderForm.email,
                      phone: shareholderForm.mobile,
                      contactType: "Shareholder",
                    });
                    toast({ title: "Shareholder Saved", description: `${shareholderForm.name} saved to company shareholders record.` });
                  }
                  refetchShareholders();
                } catch {
                  toast({ title: "Error", description: "Failed to save shareholder.", variant: "destructive" });
                }
                setIsAddShareholderModalOpen(false);
                setEditingShareholderId(null);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shareholder Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={shareholderForm.name}
                  onChange={(e) => setShareholderForm({ ...shareholderForm, name: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shareholder Email</label>
                <input
                  type="email"
                  placeholder="e.g. shareholder@company.co.uk"
                  value={shareholderForm.email}
                  onChange={(e) => setShareholderForm({ ...shareholderForm, email: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +44 7700 900123"
                  value={shareholderForm.mobile}
                  onChange={(e) => setShareholderForm({ ...shareholderForm, mobile: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={shareholderForm.status}
                  onChange={(e) => setShareholderForm({ ...shareholderForm, status: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                >
                  <option value="Active">Active</option>
                  <option value="Former">Former</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddShareholderModalOpen(false); setEditingShareholderId(null); }}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer"
                >
                  {editingShareholderId ? "Update Shareholder" : "Save Shareholder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 15: CUSTOMISE SERVICE MODAL (Screenshot 2 Alignment) */}
      {/* ========================================================= */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in my-8 text-xs">
            
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Customise Service</span>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Large Centered Service Name Title Banner */}
            <div className="text-center pt-3 pb-2">
              <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100 tracking-wide font-sans">
                {newServiceForm.serviceTitle || "Custom Service"}
              </h2>
            </div>

            {/* Centered Modal Sub-Tabs (Service Details / Configure Steps / Configure Reminders) */}
            <div className="flex justify-center border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 gap-8">
              <button
                type="button"
                onClick={() => setServiceModalTab("details")}
                className={`pb-2.5 text-center transition cursor-pointer ${
                  serviceModalTab === "details"
                    ? "border-b-2 border-purple-600 text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Service Details
              </button>
              <button
                type="button"
                onClick={() => setServiceModalTab("steps")}
                className={`pb-2.5 text-center transition cursor-pointer ${
                  serviceModalTab === "steps"
                    ? "border-b-2 border-purple-600 text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Configure Steps
              </button>
              <button
                type="button"
                onClick={() => setServiceModalTab("reminders")}
                className={`pb-2.5 text-center transition cursor-pointer ${
                  serviceModalTab === "reminders"
                    ? "border-b-2 border-purple-600 text-purple-700 dark:text-purple-400 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Configure Reminders
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* SUB-TAB 1: SERVICE DETAILS (Screenshot 2) */}
              {serviceModalTab === "details" && (
                <div className="space-y-4 text-xs max-w-xl mx-auto">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Service Title</label>
                    <input
                      type="text"
                      value={newServiceForm.serviceTitle}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, serviceTitle: e.target.value })}
                      placeholder="e.g. MTD - IT"
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Frequency</label>
                    <select
                      value={newServiceForm.frequency}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, frequency: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
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
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Billable</label>
                    <select
                      value={newServiceForm.billable ? "Yes" : "No"}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, billable: e.target.value === "Yes" })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Fee</label>
                    <div className="col-span-2 relative">
                      <span className="absolute left-3 top-1.5 text-slate-500 font-mono">£</span>
                      <input
                        type="text"
                        value={newServiceForm.fee}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, fee: e.target.value })}
                        className="w-full pl-7 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-100 font-mono font-bold bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-start gap-4">
                    <label className="text-slate-600 dark:text-slate-400 font-medium pt-1.5">Estimated Hours</label>
                    <div className="col-span-2 space-y-1">
                      <input
                        type="number"
                        step="0.25"
                        value={newServiceForm.estimatedHours}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, estimatedHours: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono bg-white dark:bg-slate-800"
                      />
                      <div className="flex items-start gap-1 text-[11px] text-slate-400 leading-tight pt-0.5">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>Planned hours are generic guidelines at global level but can be overwritten at each client level and at services</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-4">
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Service Manager</label>
                    <select
                      value={newServiceForm.serviceManager || (teamMembers[0]?.name || "")}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, serviceManager: e.target.value })}
                      className="col-span-2 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
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
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Active</label>
                    <div className="col-span-2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setNewServiceForm({ ...newServiceForm, isActive: !newServiceForm.isActive })}
                        className={`w-11 h-5 flex items-center rounded-full p-0.5 transition duration-300 cursor-pointer ${
                          newServiceForm.isActive ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></span>
                      </button>
                      <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                        {newServiceForm.isActive ? "ON" : "OFF"}
                      </span>
                    </div>
                  </div>

                  {/* Add to Calendar Checkbox */}
                  <div className="grid grid-cols-3 items-center gap-4">
                    <div className="flex items-center gap-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">Add to Calendar</label>
                      <Info size={12} className="text-slate-400 cursor-help" />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        checked={!!newServiceForm.addToCalendar}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, addToCalendar: e.target.checked })}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Client Type Checkboxes */}
                  <div className="grid grid-cols-3 items-start gap-4 pt-1">
                    <label className="text-slate-600 dark:text-slate-400 font-medium pt-1">Client Type</label>
                    <div className="col-span-2 flex flex-wrap gap-4">
                      {["Limited", "Sole Trader", "Partnership", "Individual", "Trust", "Charity"].map((cType) => {
                        const isChecked = (newServiceForm.clientTypes || []).includes(cType);
                        return (
                          <label key={cType} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = newServiceForm.clientTypes || [];
                                const updated = e.target.checked
                                  ? [...current, cType]
                                  : current.filter((t: string) => t !== cType);
                                setNewServiceForm({ ...newServiceForm, clientTypes: updated });
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                            />
                            <span>{cType}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: CONFIGURE STEPS */}
              {serviceModalTab === "steps" && (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center text-[11px] font-bold">
                        1
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Task Checklist Steps</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newStep = {
                          id: `s_${Date.now()}`,
                          title: `New Task Step #${(newServiceForm.steps?.length || 0) + 1}`,
                          isMandatory: true,
                        };
                        setNewServiceForm({
                          ...newServiceForm,
                          steps: [...(newServiceForm.steps || []), newStep],
                        });
                      }}
                      className="px-3 py-1 bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(newServiceForm.steps || []).map((step: any, idx: number) => (
                      <div key={step.id || idx} className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400 font-bold">•</span>
                        <input
                          type="text"
                          value={step.title || step}
                          onChange={(e) => {
                            const updated = [...newServiceForm.steps];
                            if (typeof updated[idx] === "object" && updated[idx] !== null) {
                              updated[idx] = { ...updated[idx], title: e.target.value };
                            } else {
                              updated[idx] = { id: `s_${idx}`, title: e.target.value, isMandatory: true };
                            }
                            setNewServiceForm({ ...newServiceForm, steps: updated });
                          }}
                          className="flex-1 border border-slate-300 dark:border-slate-700 rounded px-3 py-1 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = newServiceForm.steps.filter((_: any, i: number) => i !== idx);
                            setNewServiceForm({ ...newServiceForm, steps: updated });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: CONFIGURE REMINDERS */}
              {serviceModalTab === "reminders" && (
                <div className="space-y-4 text-xs max-w-xl mx-auto">
                  {/* Global Reminder Toggles */}
                  <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Remind me and my team about upcoming deadlines
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewServiceForm({ ...newServiceForm, remindTeam: !newServiceForm.remindTeam })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                          newServiceForm.remindTeam ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Assign to all clients</span>
                      <button
                        type="button"
                        onClick={() => setNewServiceForm({ ...newServiceForm, assignAll: !newServiceForm.assignAll })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                          newServiceForm.assignAll ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Custom email workflow</span>
                      <button
                        type="button"
                        onClick={() => setNewServiceForm({ ...newServiceForm, customWorkflow: !newServiceForm.customWorkflow })}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                          newServiceForm.customWorkflow ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md"></span>
                      </button>
                    </div>
                  </div>

                  {/* Stacked Reminder Cards */}
                  <div className="space-y-3">
                    {(newServiceForm.reminders || []).map((rem: any, idx: number) => (
                      <div key={rem.id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Reminder #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newServiceForm.reminders.filter((_: any, i: number) => i !== idx);
                              setNewServiceForm({ ...newServiceForm, reminders: updated });
                            }}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <select
                            value={rem.timing}
                            onChange={(e) => {
                              const updated = [...newServiceForm.reminders];
                              updated[idx] = { ...updated[idx], timing: e.target.value };
                              setNewServiceForm({ ...newServiceForm, reminders: updated });
                            }}
                            className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          >
                            <option value="1 Month prior to deadlines">1 Month prior to deadlines</option>
                            <option value="2 Weeks prior to deadlines">2 Weeks prior to deadlines</option>
                            <option value="1 Week prior to deadlines">1 Week prior to deadlines</option>
                            <option value="5 Days prior to deadlines">5 Days prior to deadlines</option>
                            <option value="1 Day prior to deadlines">1 Day prior to deadlines</option>
                          </select>

                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 min-w-[70px]">Staff User:</span>
                            <select
                              value={rem.staffUser || newServiceForm.serviceManager || (teamMembers[0]?.name || "")}
                              onChange={(e) => {
                                const updated = [...newServiceForm.reminders];
                                updated[idx] = { ...updated[idx], staffUser: e.target.value };
                                setNewServiceForm({ ...newServiceForm, reminders: updated });
                              }}
                              className="flex-1 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
                            >
                              {teamMembers.map((m: any) => (
                                <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                              ))}
                              <option value="All Staff Members">All Staff Members</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 min-w-[70px]">Client:</span>
                            <select
                              value={rem.clientUser || "All Client Contacts"}
                              onChange={(e) => {
                                const updated = [...newServiceForm.reminders];
                                updated[idx] = { ...updated[idx], clientUser: e.target.value };
                                setNewServiceForm({ ...newServiceForm, reminders: updated });
                              }}
                              className="flex-1 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            >
                              <option value="All Client Contacts">All Client Contacts</option>
                              <option value="Primary Director">Primary Director</option>
                              <option value="Finance Contact">Finance Contact</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newReminder = {
                          id: `r_${Date.now()}`,
                          timing: "1 Week prior to deadlines",
                          staffUser: newServiceForm.serviceManager,
                          clientUser: "All Client Contacts",
                          cc: "",
                        };
                        setNewServiceForm({
                          ...newServiceForm,
                          reminders: [...(newServiceForm.reminders || []), newReminder],
                        });
                      }}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      + Add Reminder
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (serviceModalTab === "reminders") setServiceModalTab("steps");
                  else if (serviceModalTab === "steps") setServiceModalTab("details");
                  else setIsNewServiceModalOpen(false);
                }}
                className="px-4 py-1.5 border border-slate-300 dark:border-slate-700 rounded font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100"
              >
                {serviceModalTab === "details" ? "Cancel" : "Back"}
              </button>

              <div className="flex items-center gap-2">
                {serviceModalTab !== "reminders" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (serviceModalTab === "details") setServiceModalTab("steps");
                      else if (serviceModalTab === "steps") setServiceModalTab("reminders");
                    }}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-6 py-1.5 rounded shadow-xs cursor-pointer"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={addServiceMutation.isPending}
                    onClick={() => addServiceMutation.mutate(newServiceForm)}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-6 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {addServiceMutation.isPending ? "Saving..." : "Save Service"}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 16: NEW HMRC AGENT AUTHORIZATION REQUEST (Scr 3)    */}
      {/* ========================================================= */}
      {isNewAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Request HMRC 64-8 Digital Authorization</h3>
              <button onClick={() => setIsNewAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAuthMutation.mutate(newAuthForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Regime / Service Type *</label>
                <select
                  value={newAuthForm.serviceType}
                  onChange={(e) => setNewAuthForm({ ...newAuthForm, serviceType: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value="Corporation Tax">Corporation Tax (CT600)</option>
                  <option value="PAYE for Employers">PAYE for Employers</option>
                  <option value="VAT">MTD VAT</option>
                  <option value="Self Assessment">Self Assessment (SA100)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Agent Reference Code</label>
                <input
                  type="text"
                  placeholder="e.g. HMRC-648-9841"
                  value={newAuthForm.agentReference}
                  onChange={(e) => setNewAuthForm({ ...newAuthForm, agentReference: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={newAuthForm.notes}
                  onChange={(e) => setNewAuthForm({ ...newAuthForm, notes: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAuthModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAuthMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addAuthMutation.isPending ? "Submitting..." : "Send HMRC Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 17: ADD ACCOUNTING PERIOD (Screenshot 4)            */}
      {/* ========================================================= */}
      {isAddPeriodModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Add Accounting & Compliance Period</h3>
              <button onClick={() => setIsAddPeriodModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPeriodMutation.mutate(newPeriodForm);
              }}
              className="p-5 space-y-3.5"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Period Type *</label>
                <select
                  value={newPeriodForm.periodType}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, periodType: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800"
                >
                  <option value="Annual Accounts & CT600">Annual Accounts & CT600</option>
                  <option value="Quarterly VAT Period">Quarterly VAT Period</option>
                  <option value="Monthly Payroll Period">Monthly Payroll Period</option>
                  <option value="Confirmation Statement (CS01)">Confirmation Statement (CS01)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">From Date *</label>
                  <input
                    type="date"
                    value={newPeriodForm.periodStart}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, periodStart: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">To Date *</label>
                  <input
                    type="date"
                    value={newPeriodForm.periodEnd}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, periodEnd: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Statutory Due Date *</label>
                <input
                  type="date"
                  value={newPeriodForm.statutoryDeadline}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, statutoryDeadline: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 font-mono font-bold"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPeriodModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPeriodMutation.isPending}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white font-bold px-5 py-1.5 rounded shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {addPeriodMutation.isPending ? "Creating..." : "Add Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLEAN PRINTABLE STATUTORY AUDIT REPORT FOR PDF EXPORT     */}
      {/* ========================================================= */}
      <div id="san-printable-report" className={activePrintDoc ? "block" : "hidden"}>
        {activePrintDoc === "aml" && (
          <div className="p-8 max-w-4xl mx-auto bg-white text-slate-900 font-sans text-xs">
            {/* Firm Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  UK Statutory Anti-Money Laundering (AML) Compliance & Customer Due Diligence (CDD) Report
                </h1>
                <p className="text-slate-600 text-xs mt-1">
                  In accordance with The Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017 (MLR 2017)
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <p className="font-bold text-slate-800">CONFIDENTIAL / COMPLIANCE AUDIT FILE</p>
                <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
                <p>Doc Ref: AML-{client.id}-{new Date().getFullYear()}</p>
              </div>
            </div>

            {/* Client & Assessment Details Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 mb-6">
              <div>
                <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[11px] mb-2">Client Entity Information</h3>
                <table className="w-full text-xs">
                  <tbody>
                    <tr><td className="font-semibold text-slate-500 py-0.5 w-32">Client Name:</td><td className="font-bold text-slate-900">{client.name}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Company Reg No:</td><td className="font-mono">{client.registrationNumber || "N/A (Individual/Sole Trader)"}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">UTR Number:</td><td className="font-mono">{client.utrNumber || "N/A"}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Entity Type:</td><td>{client.entityType || "Limited Company"}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Registered Office:</td><td>{client.registeredOfficeAddress || client.addressLine1 || "United Kingdom"}</td></tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 uppercase tracking-wide text-[11px] mb-2">Statutory Risk & Review Summary</h3>
                <table className="w-full text-xs">
                  <tbody>
                    <tr><td className="font-semibold text-slate-500 py-0.5 w-36">Total Checks Performed:</td><td className="font-bold">{amlQuestions.length} Criteria</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Passed / Verified (Yes):</td><td className="font-bold text-emerald-700">{amlQuestions.filter((q: any) => q.isChecked).length}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Flagged / Pending (No):</td><td className="font-bold text-rose-700">{amlQuestions.filter((q: any) => !q.isChecked).length}</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Compliance Level:</td><td className="font-bold">{Math.round((amlQuestions.filter((q: any) => q.isChecked).length / (amlQuestions.length || 1)) * 100)}% ({amlQuestions.filter((q: any) => !q.isChecked).length === 0 ? "Fully Compliant / Low Risk" : "Requires Review"})</td></tr>
                    <tr><td className="font-semibold text-slate-500 py-0.5">Assessed By:</td><td>{currentUserName}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Criteria Table */}
            <div className="mb-6">
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-xs mb-2">
                Customer Due Diligence (CDD) Questionnaire & Findings
              </h3>
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-2 px-2.5 w-8 border-r border-slate-300 text-center">#</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">Statutory Criteria / Verification Check</th>
                    <th className="py-2 px-2.5 w-24 border-r border-slate-300 text-center">Result</th>
                    <th className="py-2 px-2.5 w-48">Auditor Notes & References</th>
                  </tr>
                </thead>
                <tbody>
                  {amlQuestions.map((q: any, idx: number) => (
                    <tr key={q.id || idx} className="border-b border-slate-200">
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-800 font-medium">{q.question}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${q.isChecked ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {q.isChecked ? "YES / PASS" : "NO / PENDING"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{q.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sign-off & Declaration Box */}
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 space-y-3">
              <p className="font-semibold text-slate-700 text-xs italic">
                "I confirm that Customer Due Diligence (CDD) and AML verification checks have been conducted for {client.name} in compliance with the UK Money Laundering Regulations 2017 (MLR 2017) and firm AML policies. Appropriate identity documentation, PSC/beneficial ownership structures, and risk factors have been inspected and archived."
              </p>
              <div className="grid grid-cols-3 gap-6 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Assessor / AML Officer:</p>
                  <p className="font-bold text-slate-900 mt-1">{currentUserName}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Signature:</p>
                  <div className="border-b border-slate-400 h-6 mt-1" />
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Date Completed:</p>
                  <p className="font-bold text-slate-900 mt-1">{new Date().toLocaleDateString("en-GB")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePrintDoc === "onboarding" && (
          <div className="p-8 max-w-4xl mx-auto bg-white text-slate-900 font-sans text-xs">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  Client Onboarding & KYC Compliance Audit Record
                </h1>
                <p className="text-slate-600 text-xs mt-1">
                  Practice Management Client Onboarding Verification
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <p className="font-bold text-slate-800">CONFIDENTIAL AUDIT FILE</p>
                <p>Client: {client.name}</p>
                <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
              </div>
            </div>

            <div className="mb-6">
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="py-2 px-2.5 w-8 border-r border-slate-300 text-center">#</th>
                    <th className="py-2 px-2.5 border-r border-slate-300">Onboarding Criteria</th>
                    <th className="py-2 px-2.5 w-24 border-r border-slate-300 text-center">Status</th>
                    <th className="py-2 px-2.5 w-48">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {onboardingChecks.map((row: any, idx: number) => (
                    <tr key={row.id || idx} className="border-b border-slate-200">
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-800 font-medium">{row.criteria}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${row.status === "Yes" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {row.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 font-mono text-[11px]">{row.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #san-printable-report, #san-printable-report * {
              visibility: visible !important;
            }
            #san-printable-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 16px !important;
              background: white !important;
              color: #0f172a !important;
              display: block !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>

        {/* Global Practice Media & Document Library Modal for Email */}
        <GlobalMediaLibraryModal
          isOpen={isEmailMediaModalOpen}
          onClose={() => setIsEmailMediaModalOpen(false)}
          onSelectFile={handleAttachMediaFile}
          title="Practice Media Library — Select Email Attachment"
          allowedTypes="All Supported Files"
        />

        {/* Global Practice Media & Document Library Modal for Ticket Request */}
        <GlobalMediaLibraryModal
          isOpen={isTicketMediaModalOpen}
          onClose={() => setIsTicketMediaModalOpen(false)}
          onSelectFile={handleAttachTicketMediaFile}
          title="Practice Media Library — Select Ticket Attachment"
          allowedTypes="All Supported Files"
        />

        {/* HMRC 64-8 Agent Authorisation Official Form Modal */}
        <Hmrc648Modal
          isOpen={is648ModalOpen}
          onClose={() => setIs648ModalOpen(false)}
          clientId={clientId}
          clientName={client.clientName}
        />

        {/* Add HMRC Agent Authorisation Modal */}
        {isAddAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Landmark size={15} className="text-purple-600" />
                  Add HMRC Agent Authorisation
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddAuthModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Service Regime *
                  </label>
                  <select
                    value={authForm.serviceType}
                    onChange={(e) => setAuthForm({ ...authForm, serviceType: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Corporation Tax">Corporation Tax (CT600)</option>
                    <option value="Self Assessment">Self Assessment (SA100 / SA800)</option>
                    <option value="PAYE for Employers">PAYE for Employers (RTI)</option>
                    <option value="VAT (Value Added Tax)">VAT (Value Added Tax MTD)</option>
                    <option value="Construction Industry Scheme (CIS)">Construction Industry Scheme (CIS)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Status
                    </label>
                    <select
                      value={authForm.status}
                      onChange={(e) => setAuthForm({ ...authForm, status: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="Authorized">Authorized</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Auth Code Step
                    </label>
                    <select
                      value={authForm.codeStatus}
                      onChange={(e) => setAuthForm({ ...authForm, codeStatus: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="Code Verified">Code Verified</option>
                      <option value="Auth Code Sent">Auth Code Sent</option>
                      <option value="Not Generated">Not Generated</option>
                      <option value="Code Requested">Code Requested</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Agent Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AGNT-UK-001 or SA-99482"
                    value={authForm.agentReference}
                    onChange={(e) => setAuthForm({ ...authForm, agentReference: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Authorised via online agent services portal"
                    value={authForm.notes}
                    onChange={(e) => setAuthForm({ ...authForm, notes: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAuthModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={createAuthMutation.isPending}
                  onClick={() => createAuthMutation.mutate(authForm)}
                  className="px-4 py-1.5 rounded bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} />
                  {createAuthMutation.isPending ? "Saving..." : "Save Authorisation"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </AppLayout>
  );
}
