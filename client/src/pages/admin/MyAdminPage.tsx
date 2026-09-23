import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, Users, Bell, Settings, CreditCard, MessageSquare, Plus, Search, 
  X, Eye, EyeOff, ToggleLeft, ToggleRight, Trash2, Pencil, Package, HardDrive, 
  Shield, Download, Send, RefreshCw, CheckCircle2, ChevronDown, Menu, UserCheck,
  ShieldCheck, Clock, HeartHandshake, Smartphone, Folder, Sliders, Ban, AlertTriangle, XCircle, Activity
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import GlobalNavActions from "../../components/layout/GlobalNavActions";
import ClientMediaLibrary from "./ClientMediaLibrary";
import UsersAndRolesManager from "./UsersAndRolesManager";
import ClientsManager from "./ClientsManager";
import ContactsManager from "./ContactsManager";
import { formatDateOnly, formatDateTime } from "../../lib/dateUtils";
import { useConfirm } from "../../hooks/useConfirm";

export const adminSidebarGroups = [
  {
    title: "Organisation",
    items: [
      { id: "My Firm", label: "My Firm", icon: <Building2 size={15} /> },
      { id: "Clients", label: "Clients", icon: <Users size={15} /> },
      { id: "Contacts", label: "Contacts", icon: <UserCheck size={15} /> },
      { id: "Users", label: "Users & Roles", icon: <ShieldCheck size={15} /> },
      { id: "AML", label: "AML Screening", icon: <Shield size={15} /> },
    ],
  },
  {
    title: "Operations & Audit",
    items: [
      { id: "Activity", label: "Activity Log", icon: <Clock size={15} /> },
      { id: "Request Backup", label: "Request Backup", icon: <HardDrive size={15} /> },
      { id: "Refer an Accountant", label: "Refer an Accountant", icon: <HeartHandshake size={15} /> },
    ],
  },
  {
    title: "Subscriptions & Tools",
    items: [
      { id: "My Subscription", label: "My Subscription", icon: <CreditCard size={15} /> },
      { id: "SMS", label: "Bulk SMS", icon: <Smartphone size={15} /> },
      { id: "Media", label: "Media Library", icon: <Folder size={15} /> },
      { id: "Media Settings", label: "Media Settings", icon: <Sliders size={15} /> },
    ],
  },
] as const;

export type AdminTab =
  | "My Firm"
  | "Clients"
  | "Contacts"
  | "Users"
  | "AML"
  | "Activity"
  | "Request Backup"
  | "Refer an Accountant"
  | "My Subscription"
  | "SMS"
  | "Media"
  | "Media Settings";

export default function MyAdminPage({ initialSubTab }: { initialSubTab?: string }) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (initialSubTab) {
      const match = [
        "My Firm", "Clients", "Contacts", "Users", "AML", "Activity",
        "Request Backup", "Refer an Accountant", "My Subscription", "SMS", "Media", "Media Settings"
      ].find(t => t.toLowerCase() === initialSubTab.toLowerCase() || t.toLowerCase().replace(/\s+/g, "-") === initialSubTab.toLowerCase());
      if (match) return match as AdminTab;
    }
    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/admin/users")) return "Users";
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        const lower = tabParam.toLowerCase().replace(/[-_]/g, "");
        if (lower === "myfirm" || lower === "firm") return "My Firm";
        if (lower === "clients") return "Clients";
        if (lower === "contacts") return "Contacts";
        if (lower === "users" || lower === "roles") return "Users";
        if (lower === "aml") return "AML";
        if (lower === "activity" || lower === "logs") return "Activity";
        if (lower === "backup") return "Request Backup";
        if (lower === "referral" || lower === "referrals") return "Refer an Accountant";
        if (lower === "subscription" || lower === "plans") return "My Subscription";
        if (lower === "sms") return "SMS";
        if (lower === "media") return "Media";
        if (lower === "mediasettings") return "Media Settings";
      }
    }
    const saved = sessionStorage.getItem("admin_activeTab");
    const validTabs = [
      "My Firm", "Clients", "Contacts", "Users", "AML", "Activity",
      "Request Backup", "Refer an Accountant", "My Subscription", "SMS", "Media", "Media Settings"
    ];
    return saved && validTabs.includes(saved) ? (saved as AdminTab) : "My Firm";
  });

  useEffect(() => {
    sessionStorage.setItem("admin_activeTab", activeTab);
  }, [activeTab]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showEditFirm, setShowEditFirm] = useState(false);
  const [userForm, setUserForm] = useState({
    role: "staff", firstName: "", lastName: "",
    email: "", password: "", phone: "", address: "", city: "", postCode: "", country: "United Kingdom",
  });
  const [firmForm, setFirmForm] = useState<any>({});

  // My Firm Inner Sub-tabs & Contacts/Notes state
  const [myFirmInnerTab, setMyFirmInnerTab] = useState<"Contacts" | "Notes" | "Notification Settings" | "Agent Credentials">("Contacts");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    contactType: "Primary Contact",
    email: "",
    phone: "",
    address: "",
    country: "United Kingdom",
  });

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", text: "" });

  const [notificationSettings, setNotificationSettings] = useState({
    emailInvoices: true,
    emailSecurity: true,
    emailDeadlines: true,
    emailAnnouncements: true,
  });

  const [agentForm, setAgentForm] = useState({
    hmrcUserId: "",
    hmrcAgentCode: "",
    saAgentId: "",
    ctAgentId: "",
  });

  const [referralForm, setReferralForm] = useState({
    colleagueName: "",
    colleagueEmail: "",
    message: "Hi, I use SanSuite for MTD UK Accounting & Payroll and recommend it for your firm.",
  });

  const [smsForm, setSmsForm] = useState({
    clientId: "",
    message: "Reminder: Your statutory Corporation Tax Return (CT600) deadline is approaching. Please provide your year-end paperwork to SanSuite.",
  });
  const [showSmsTopupModal, setShowSmsTopupModal] = useState(false);

  const [showAmlModal, setShowAmlModal] = useState(false);
  const [selectedAmlClientId, setSelectedAmlClientId] = useState<string>("");

  const [mediaSettings, setMediaSettings] = useState({
    maxFileSizeMB: 25,
    allowPdf: true,
    allowDocs: true,
    allowImages: true,
    allowSpreadsheets: true,
    allowZip: false,
  });
  const [allowTenantControl, setAllowTenantControl] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [availableGateways, setAvailableGateways] = useState<any[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  useEffect(() => {
    const fallbackGateways = [
      {
        id: 'stripe',
        name: 'Stripe Credit/Debit Card',
        type: 'online',
        mode: 'sandbox',
      },
      {
        id: 'gocardless',
        name: 'GoCardless UK (Bacs Direct Debit)',
        type: 'direct_debit',
        mode: 'sandbox',
      },
      {
        id: 'paypal',
        name: 'PayPal Express',
        type: 'online',
        mode: 'sandbox',
      },
      {
        id: '2checkout',
        name: '2Checkout (Verifone) Global Cards',
        type: 'online',
        mode: 'sandbox',
      },
      {
        id: 'authorizenet',
        name: 'Authorize.Net Credit/Debit Card',
        type: 'online',
        mode: 'sandbox',
      },
      {
        id: 'manual',
        name: 'International Bank Wire Transfer',
        type: 'manual',
        instructions: 'Bank Name: Barclays Bank UK\nSWIFT / BIC: BARCGB22\nIBAN / Account: GB82 BARC 2004 1538 2910 47\nAccount Name: SanSuite International Ltd\nReference: Practice ID / Subdomain Name'
      }
    ];

    fetch("/api/system-admin/public/payment-gateways")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableGateways(data);
          setSelectedGatewayId(data[0].id);
        } else {
          setAvailableGateways(fallbackGateways);
          setSelectedGatewayId(fallbackGateways[0].id);
        }
      })
      .catch(() => {
        setAvailableGateways(fallbackGateways);
        setSelectedGatewayId(fallbackGateways[0].id);
      });
  }, []);

  const handleInitiateCheckout = (planObj: any) => {
    setSelectedPlan(planObj);
    setTransactionRef("");
    setShowCheckoutModal(true);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("checkout_success")) {
      const plan = urlParams.get("plan") || "Pro";
      const gateway = urlParams.get("gateway") || "Payment Gateway";
      const txnRef = urlParams.get("txnRef") || "";

      toast({
        title: "Payment Successful!",
        description: `Your subscription has been updated to ${plan} via ${gateway.toUpperCase()} (Ref: ${txnRef}).`,
      });

      qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/subscription"] });

      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.has("checkout_cancel")) {
      toast({
        title: "Payment Cancelled",
        description: "You cancelled the payment transaction. No changes were made to your subscription.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConfirmCheckout = async () => {
    if (!selectedPlan || !selectedGatewayId) return;
    setIsSubmittingCheckout(true);
    try {
      const res = await apiRequest("POST", "/api/admin/checkout-subscription", {
        planName: selectedPlan.name,
        gatewayId: selectedGatewayId,
        transactionRef,
        amount: selectedPlan.monthlyPrice,
      });
      const data = await res.json();
      if (data.success) {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
        qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
        qc.invalidateQueries({ queryKey: ["/api/admin/subscription"] });
        toast({
          title: data.isPending ? "Payment Submitted!" : "Subscription Updated!",
          description: data.message || `Your subscription has been updated to ${selectedPlan.name}.`,
        });
        setShowCheckoutModal(false);
      } else {
        throw new Error(data.message || "Failed to update subscription");
      }
    } catch (err: any) {
      toast({
        title: "Checkout Failed",
        description: err.message || "Failed to process payment checkout.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  const handlePlanChange = async (planName: string) => {
    try {
      const res = await apiRequest("POST", "/api/admin/change-subscription", { planName });
      const data = await res.json();
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
        toast({
          title: "Plan Updated Successfully!",
          description: `Your practice subscription has been updated to the ${planName} plan.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Plan Update Failed",
        description: err.message || "Failed to update subscription plan.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetch("/api/subscription-plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSubscriptionPlans(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/media-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.allowTenantControl !== undefined) {
          setAllowTenantControl(data.allowTenantControl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!allowTenantControl && activeTab === "Media Settings") {
      setActiveTab("My Firm");
    }
  }, [allowTenantControl, activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem("tenant_media_settings");
    if (saved) {
      try { setMediaSettings(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleSaveMediaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("POST", "/api/media-settings", mediaSettings);
      localStorage.setItem("tenant_media_settings", JSON.stringify(mediaSettings));
      toast({
        title: "Storage & Media Settings Saved",
        description: `Max upload size limit set to ${mediaSettings.maxFileSizeMB} MB with file access policies active.`,
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  };

  const { data: firm } = useQuery({
    queryKey: ["/api/admin/firm-details"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/firm-details");
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (firm) {
      setAgentForm({
        hmrcUserId: firm.hmrcGatewayId || "",
        hmrcAgentCode: firm.hmrcAgentCode || "",
        saAgentId: firm.saAgentId || "",
        ctAgentId: firm.ctAgentId || "",
      });
      if (firm.notificationSettings) {
        try {
          const parsed = typeof firm.notificationSettings === "string"
            ? JSON.parse(firm.notificationSettings)
            : firm.notificationSettings;
          setNotificationSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
    }
  }, [firm]);

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "Users",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "Clients" || activeTab === "AML" || activeTab === "My Subscription",
  });

  const { data: amlStatus } = useQuery<{ provider: string; isConfigured: boolean; message: string }>({
    queryKey: ["/api/aml/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/status");
      if (!res.ok) return { provider: "Veriphy MTD Portal", isConfigured: false, message: "" };
      return res.json();
    },
    enabled: activeTab === "AML",
  });

  const { data: amlLogs = [] } = useQuery({
    queryKey: ["/api/aml/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/aml/logs");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "AML",
  });

  const runAmlCheckMutation = useMutation({
    mutationFn: async (payload: { clientId?: number; clientName: string }) => {
      const res = await apiRequest("POST", "/api/aml/check", payload);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "AML check failed");
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/aml/logs"] });
      toast({
        title: "AML Verification Complete",
        description: `Identity check passed for ${data.data?.clientName || "Client"}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "AML Check Cannot Proceed",
        description: error.message || "Failed to execute AML identity check.",
        variant: "destructive",
      });
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Created", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowAddUser(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Updated", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "User Deleted", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const updateFirm = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/firm-details", data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save firm details");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Firm Details Updated", description: "Firm information saved successfully." });
      qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
      setShowEditFirm(false);
    },
    onError: (e: any) => toast({ title: "Save Failed", description: e.message, variant: "destructive" }),
  });

  const { data: contactsList = [] } = useQuery({
    queryKey: ["/api/admin/contacts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/contacts");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "My Firm" || activeTab === "Contacts",
  });

  const addContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/contacts", data);
      if (!res.ok) throw new Error("Failed to add contact");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      setShowAddContactModal(false);
      setContactForm({ name: "", contactType: "Primary Contact", email: "", phone: "", address: "", country: "United Kingdom" });
      toast({ title: "Contact Saved", description: "New contact added to practice firm." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to add contact", variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/contacts/${id}`);
      if (!res.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/contacts"] });
      toast({ title: "Contact Deleted", description: "Contact removed from practice firm." });
    },
  });

  // --- 1.2 FIRM INTERNAL NOTES ---
  const { data: notesList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/notes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/notes");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "My Firm" && myFirmInnerTab === "Notes",
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; text: string }) => {
      const res = await apiRequest("POST", "/api/admin/notes", data);
      if (!res.ok) throw new Error("Failed to save note");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notes"] });
      setShowAddNoteModal(false);
      setNoteForm({ title: "", text: "" });
      toast({ title: "Note Created", description: "Internal compliance note saved." });
    },
    onError: (err: any) => toast({ title: "Failed to create note", description: err.message, variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/notes/${id}`);
      if (!res.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notes"] });
      toast({ title: "Note Removed", description: "Note deleted from practice record." });
    },
  });

  // --- 1.3 NOTIFICATION SETTINGS ---
  const handleToggleNotification = async (key: string) => {
    const next = { ...notificationSettings, [key]: !notificationSettings[key as keyof typeof notificationSettings] };
    setNotificationSettings(next);
    try {
      await updateFirm.mutateAsync({ notificationSettings: next });
      toast({ title: "Notification Preference Saved" });
    } catch (e) {}
  };

  // --- 1.4 HMRC AGENT CREDENTIALS ---
  const saveAgentCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateFirm.mutateAsync({
        hmrcGatewayId: agentForm.hmrcUserId,
        hmrcAgentCode: agentForm.hmrcAgentCode,
        saAgentId: agentForm.saAgentId,
        ctAgentId: agentForm.ctAgentId,
      });
      toast({ title: "Agent Credentials Saved", description: "HMRC Agent Services Account details updated." });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  };

  // --- 1.1 PRACTICE AUDIT / ACTIVITY LOG ---
  const { data: auditLogsList = [] } = useQuery<any[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/logs");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "Activity",
  });

  // --- 1.5 PRACTICE BACKUPS ---
  const { data: backupsList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/backups"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/backups");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "Request Backup",
  });

  const requestBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backups", {});
      if (!res.ok) throw new Error("Failed to generate backup");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/backups"] });
      toast({ title: "Backup Created", description: "Practice database snapshot generated successfully." });
    },
    onError: (err: any) => toast({ title: "Backup Failed", description: err.message, variant: "destructive" }),
  });

  // --- 1.6 REFER AN ACCOUNTANT ---
  const { data: referralsList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/referrals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/referrals");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "Refer an Accountant",
  });

  const sendReferralMutation = useMutation({
    mutationFn: async (data: { colleagueName: string; colleagueEmail: string; message: string }) => {
      const res = await apiRequest("POST", "/api/admin/referrals", data);
      if (!res.ok) throw new Error("Failed to send referral");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      setReferralForm({ colleagueName: "", colleagueEmail: "", message: "Hi, I use SanSuite for MTD UK Accounting & Payroll and recommend it for your firm." });
      toast({ title: "Invitation Dispatched", description: "Referral email invitation dispatched successfully." });
    },
    onError: (err: any) => toast({ title: "Referral Failed", description: err.message, variant: "destructive" }),
  });

  // --- 1.7 BULK SMS CONSOLE ---
  const sendSmsMutation = useMutation({
    mutationFn: async (payload: { clientId?: string; message: string }) => {
      const res = await apiRequest("POST", "/api/admin/sms/send", payload);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Failed to dispatch SMS");
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
      toast({ title: "SMS Dispatched", description: `Message sent. Remaining SMS balance: ${data.newBalance} credits.` });
      setSmsForm(prev => ({ ...prev, message: "" }));
    },
    onError: (err: any) => toast({ title: "SMS Failed", description: err.message, variant: "destructive" }),
  });

  const topupSmsMutation = useMutation({
    mutationFn: async (credits: number) => {
      const res = await apiRequest("POST", "/api/admin/sms/topup", { credits });
      if (!res.ok) throw new Error("Failed to top up SMS");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/firm-details"] });
      setShowSmsTopupModal(false);
      toast({ title: "Credits Added", description: `Added ${data.added} SMS credits. New balance: ${data.newBalance}.` });
    },
    onError: (err: any) => toast({ title: "Top-up Failed", description: err.message, variant: "destructive" }),
  });

  const firmData = [
    ["Firm Type", firm?.firmType ?? "Limited"],
    ["Firm Name", firm?.firmName ?? "—"],
    ["Email", firm?.email ?? "—"],
    ["Phone", firm?.phone ?? "—"],
    ["IDV", "—"],
    ["Address", firm?.address ?? "—"],
    ["City/Town", firm?.city ?? "—"],
    ["Post code", firm?.postCode ?? "—"],
    ["Website", firm?.website ?? "—"],
    ["Business Start Date", firm?.businessStartDate ? formatDateOnly(firm.businessStartDate) : "—"],
    ["Book Start Date", firm?.bookStartDate ? formatDateOnly(firm.bookStartDate) : "—"],
    ["Year End", firm?.yearEnd ?? "—"],
    ["Registration No", firm?.registrationNo ?? "—"],
    ["UTR No.", firm?.utrNumber ?? "—"],
    ["VAT Scheme", firm?.vatScheme ?? "—"],
    ["VAT Reg. No.", firm?.vatRegNumber ?? "—"],
    ["Country", firm?.country ?? "United Kingdom"],
    ["VAT Reg. Date", firm?.vatRegDate ? formatDateOnly(firm.vatRegDate) : "—"],
    ["VAT Submit Type", firm?.vatSubmitType ?? "Quarterly"],
    ["Office Ref No", firm?.officeRefNo ?? "—"],
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5" }}>
      {/* Admin Navbar */}
      <nav className="SanSuite-navbar" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors mr-1 cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer">
            {firm?.logoUrl ? (
              <img src={firm.logoUrl} alt="Logo" className="w-7 h-7 rounded object-cover bg-white/10 p-0.5" />
            ) : (
              <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" }}>
                <Building2 size={13} className="text-white" />
              </div>
            )}
            <span className="text-white font-bold text-sm hidden sm:inline">
              {firm?.firmName || (user as any)?.practiceName || "SAN Accounting Firm"}
            </span>
          </button>
        </div>

        {/* Clean center spacer matching AppLayout */}
        <div className="flex-1" />

        <GlobalNavActions />
      </nav>

      <div className="flex pt-12">
        {/* Left Sidebar matching Practice Module style */}
        <aside
          className="SanSuite-sidebar transition-all duration-200"
          style={{
            width: sidebarOpen ? 230 : 0,
            overflowY: sidebarOpen ? "auto" : "hidden",
            overflowX: "hidden",
            minWidth: sidebarOpen ? 230 : 0,
          }}
        >
          {/* Module badge */}
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-purple-400" />
              <p className="text-[11px] font-bold tracking-widest text-slate-300 uppercase">My Admin</p>
            </div>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">Workspace</span>
          </div>

          <nav className="py-2 px-1">
            {adminSidebarGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => item.id !== "Media Settings" || allowTenantControl
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="mb-3">
                  <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {group.title}
                  </div>
                  {visibleItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        className={`SanSuite-sidebar-item w-full text-left flex items-center justify-between group cursor-pointer ${
                          isActive ? "active font-semibold" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`shrink-0 flex items-center justify-center w-4 ${
                              isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate whitespace-nowrap text-[13px] font-medium leading-none">
                            {item.label}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main
          className="flex-1 min-h-screen overflow-x-hidden transition-all duration-200 flex flex-col"
          style={{
            background: "#f0f2f5",
            marginLeft: sidebarOpen ? 230 : 0,
          }}
        >
          {/* Breadcrumb Header Bar inside content */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">My Admin</span>
              <span className="text-slate-300">/</span>
              <span className="text-purple-700 font-bold">{activeTab}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Practice ID: #{user?.practiceId || 1}
            </span>
          </div>

          <div className="flex-1">
            {/* TAB 1: MY FIRM (2-Column Layout with Firm Details on Left) */}
            {activeTab === "My Firm" && (
              <div className="flex p-6 gap-6">
                {/* Left: Firm Details */}
                <div className="w-82 shrink-0 SanSuite-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 text-sm">My Firm Details</h3>
                    <button
                      onClick={() => {
                        setFirmForm(firm || {});
                        setShowEditFirm(true);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {firmData.map(([label, value]) => (
                      <div key={label} className="flex items-start gap-2 text-xs py-0.5">
                        <span className="text-gray-400 w-28 shrink-0 font-normal">{label}</span>
                        <span className={`text-gray-700 min-w-0 flex-1 break-all ${value !== "—" && label === "VAT Scheme" ? "text-blue-600 font-medium" : ""}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Inner Tab content */}
                <div className="flex-1">
                  <div className="SanSuite-card">
                    {/* Inner Sub-tabs */}
                    <div className="flex border-b px-4">
                      {(["Contacts", "Notes", "Notification Settings", "Agent Credentials"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setMyFirmInnerTab(t)}
                          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            myFirmInnerTab === t ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* 1. Contacts View */}
                    {myFirmInnerTab === "Contacts" && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="relative">
                            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                              type="text"
                              value={contactSearch}
                              onChange={(e) => setContactSearch(e.target.value)}
                              placeholder="Quick Search contacts..."
                              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <button
                            onClick={() => setShowAddContactModal(true)}
                            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <Plus size={14} /> New Contact
                          </button>
                        </div>
                        <table className="SanSuite-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Default</th>
                              <th>Name</th>
                              <th>Type</th>
                              <th>Email</th>
                              <th>Phone Number</th>
                              <th>Country</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contactsList.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-6 text-gray-400 text-xs">
                                  No contacts registered. Click <strong>"New Contact"</strong> above to add one.
                                </td>
                              </tr>
                            ) : (
                              contactsList
                                .filter((c: any) =>
                                  !contactSearch ||
                                  c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  (c.email && c.email.toLowerCase().includes(contactSearch.toLowerCase()))
                                )
                                .map((c: any, index: number) => (
                                  <tr key={c.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${index === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {index === 0 ? 'Yes' : 'No'}
                                      </span>
                                    </td>
                                    <td className="font-semibold text-gray-800">{c.name}</td>
                                    <td><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">{c.contactType}</span></td>
                                    <td className="text-xs text-gray-600">{c.email || "—"}</td>
                                    <td className="text-xs text-gray-600">{c.phone || "—"}</td>
                                    <td className="text-xs text-gray-600">{c.country || "United Kingdom"}</td>
                                    <td>
                                      <button
                                        onClick={async () => {
                                          if (await confirm({
                                            title: "Delete Contact",
                                            description: `Are you sure you want to delete contact "${c.name}"? This action cannot be undone.`,
                                            confirmText: "Delete Contact",
                                            variant: "danger"
                                          })) {
                                            deleteContactMutation.mutate(c.id);
                                          }
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                                        title="Delete Contact"
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
                    )}

                    {/* 2. Notes View */}
                    {myFirmInnerTab === "Notes" && (
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">Internal notes and compliance audit logs for your practice firm.</p>
                          <button
                            onClick={() => setShowAddNoteModal(true)}
                            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <Plus size={14} /> Add Note
                          </button>
                        </div>
                        <div className="space-y-3">
                          {notesList.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                              No internal practice notes recorded. Click <strong>"Add Note"</strong> above to create one.
                            </div>
                          ) : (
                            notesList.map((n: any) => (
                              <div key={n.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-800">{n.title}</span>
                                    {n.createdBy && (
                                      <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                                        By {n.createdBy}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {formatDateOnly(n.createdAt)}
                                    </span>
                                    <button
                                       onClick={async () => {
                                         if (await confirm({
                                           title: "Delete Practice Note",
                                           description: "Are you sure you want to delete this internal practice note? This action cannot be undone.",
                                           confirmText: "Delete Note",
                                           variant: "danger"
                                         })) {
                                           deleteNoteMutation.mutate(n.id);
                                         }
                                       }}
                                       className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                                       title="Delete Note"
                                     >
                                       <Trash2 size={12} />
                                     </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 whitespace-pre-line">{n.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. Notification Settings View */}
                    {myFirmInnerTab === "Notification Settings" && (
                      <div className="p-5 space-y-4">
                        <h4 className="font-semibold text-xs text-gray-700">Email & System Alert Preferences</h4>
                        <div className="space-y-3 pt-1">
                          {[
                            { key: "emailInvoices", label: "Invoice & Payment Reminders", desc: "Receive email notifications when billing invoices are issued or paid." },
                            { key: "emailSecurity", label: "Security & Login Alerts", desc: "Receive alerts for new device logins, 2FA changes, or IP whitelisting updates." },
                            { key: "emailDeadlines", label: "Filing Deadline Reminders", desc: "Get automatic reminders for upcoming Accounts & CT600 filing deadlines." },
                            { key: "emailAnnouncements", label: "Platform System Updates", desc: "Receive release notes and platform feature updates." },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                                <p className="text-[11px] text-gray-500">{item.desc}</p>
                              </div>
                              <button
                                onClick={() => handleToggleNotification(item.key)}
                                className={`transition-colors shrink-0 ${notificationSettings[item.key as keyof typeof notificationSettings] ? 'text-purple-600' : 'text-gray-300'}`}
                              >
                                {notificationSettings[item.key as keyof typeof notificationSettings] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Agent Credentials View */}
                    {myFirmInnerTab === "Agent Credentials" && (
                      <form
                        onSubmit={saveAgentCredentials}
                        className="p-5 space-y-4"
                      >
                        <h4 className="font-semibold text-xs text-gray-700">HMRC Agent Services Account (ASA) Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Government Gateway User ID</label>
                            <input
                              type="text"
                              value={agentForm.hmrcUserId}
                              onChange={(e) => setAgentForm({ ...agentForm, hmrcUserId: e.target.value })}
                              placeholder="e.g. 123456789012"
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">HMRC Agent Reference Code</label>
                            <input
                              type="text"
                              value={agentForm.hmrcAgentCode}
                              onChange={(e) => setAgentForm({ ...agentForm, hmrcAgentCode: e.target.value })}
                              placeholder="e.g. AARN1234567"
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Self Assessment Agent ID</label>
                            <input
                              type="text"
                              value={agentForm.saAgentId}
                              onChange={(e) => setAgentForm({ ...agentForm, saAgentId: e.target.value })}
                              placeholder="e.g. SA123456"
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Corporation Tax Agent ID</label>
                            <input
                              type="text"
                              value={agentForm.ctAgentId}
                              onChange={(e) => setAgentForm({ ...agentForm, ctAgentId: e.target.value })}
                              placeholder="e.g. CT123456"
                              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 font-mono"
                            />
                          </div>
                        </div>
                        <div className="pt-2 flex justify-end">
                          <button type="submit" disabled={updateFirm.isPending} className="btn-SanSuite text-xs font-semibold">
                            {updateFirm.isPending ? "Saving..." : "Save Agent Credentials"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USERS & ROLES / PERMISSIONS (Full Width) */}
            {activeTab === "Users" && (
              <div className="p-6 w-full">
                <UsersAndRolesManager />
              </div>
            )}

            {/* TAB 3: CLIENTS (Full Width) */}
            {activeTab === "Clients" && (
              <div className="p-6 w-full">
                <ClientsManager />
              </div>
            )}

            {/* TAB 4: AML (Full Width) */}
            {activeTab === "AML" && (
              <div className="p-6 w-full space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <p className="text-xs text-gray-500 font-medium">AML Verification Provider</p>
                    <p className="text-sm font-bold text-purple-700 mt-1 flex items-center gap-1">
                      {amlStatus?.provider || "Veriphy MTD Portal"} ({amlStatus?.isConfigured ? "Active" : "Key Pending"})
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <p className="text-xs text-gray-500 font-medium">Clients Verified</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{amlLogs.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                    <p className="text-xs text-gray-500 font-medium">Risk Status</p>
                    <p className="text-sm font-bold text-green-700 mt-1.5 flex items-center gap-1">
                      {amlLogs.length > 0 ? "100% Compliant (Low Risk)" : "No Compliance Logs"}
                    </p>
                  </div>
                </div>

                {!amlStatus?.isConfigured && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-1">
                    <p className="font-bold">API Key Required for Live AML Checks</p>
                    <p>
                      To enable live anti-money laundering & identity screening, please add your <code>AML_VERIPHY_API_KEY</code> credentials to your <code>.env</code> file.
                    </p>
                  </div>
                )}

                <div className="SanSuite-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Anti-Money Laundering (AML) Compliance Log</h3>
                    <button
                      onClick={() => {
                        if (!clients || clients.length === 0) {
                          toast({
                            title: "No Clients Registered",
                            description: "Please register a client before running an AML Identity Check.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setSelectedAmlClientId(String(clients[0].id));
                        setShowAmlModal(true);
                      }}
                      disabled={runAmlCheckMutation.isPending}
                      className="btn-SanSuite text-xs font-semibold cursor-pointer"
                    >
                      {runAmlCheckMutation.isPending ? "Screening..." : "+ Run AML Identity Check"}
                    </button>
                  </div>
                  <table className="SanSuite-table">
                    <thead>
                      <tr>
                        <th>Client Name</th>
                        <th>Check Type</th>
                        <th>PEP & Sanctions</th>
                        <th>Risk Assessment</th>
                        <th>Verified Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amlLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                            No AML compliance checks recorded yet. Click <strong>"+ Run AML Identity Check"</strong> above to initiate screening.
                          </td>
                        </tr>
                      ) : (
                        amlLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td className="font-semibold text-gray-800">{log.clientName}</td>
                            <td className="text-xs">{log.checkType}</td>
                            <td><span className="text-xs text-green-700 font-semibold">{log.pepSanctionsStatus}</span></td>
                            <td><span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">{log.riskAssessment}</span></td>
                            <td className="text-xs text-gray-500">{log.verifiedDate}</td>
                            <td><span className="badge-success">{log.status}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: CONTACTS (Full Width) */}
            {activeTab === "Contacts" && (
              <div className="p-6 w-full">
                <ContactsManager />
              </div>
            )}

            {/* TAB: ACTIVITY LOG */}
            {activeTab === "Activity" && (
              <div className="p-6 w-full">
                <div className="SanSuite-card p-4 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Practice Audit Log & Activity Records</h3>
                    <span className="text-xs text-gray-400">Showing last 30 activities</span>
                  </div>
                  <table className="SanSuite-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action Description</th>
                        <th>Module</th>
                        <th>Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                            No audit log activity recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogsList.map((log: any) => (
                          <tr key={log.id}>
                            <td className="text-xs font-mono text-gray-500">{formatDateTime(log.createdAt)}</td>
                            <td className="font-semibold text-gray-800">{log.user || (user as any)?.firstName || "System"}</td>
                            <td className="text-xs text-gray-700">{log.action}</td>
                            <td><span className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">{log.resource || "Practice"}</span></td>
                            <td className="text-xs font-mono text-gray-400">{log.details ? String(log.details).slice(0, 40) : "—"}</td>
                            <td><span className="badge-success">Success</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {/* TAB 7: REQUEST BACKUP (Full Width) */}
            {activeTab === "Request Backup" && (
              <div className="p-6 w-full space-y-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">Practice Data Backup</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Generate a complete encrypted backup copy of your entire practice database and client accounts.</p>
                  </div>
                  <button
                    onClick={() => requestBackupMutation.mutate()}
                    disabled={requestBackupMutation.isPending}
                    className="btn-SanSuite text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                  >
                    {requestBackupMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <HardDrive size={14} />}
                    {requestBackupMutation.isPending ? "Generating..." : "Request Practice Backup"}
                  </button>
                </div>

                <div className="SanSuite-card p-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">Backup Request History</h4>
                  <table className="SanSuite-table">
                    <thead>
                      <tr>
                        <th>Backup ID</th>
                        <th>Requested By</th>
                        <th>Date & Time</th>
                        <th>Format</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                            No backups created yet. Click <strong>"Request Practice Backup"</strong> above to generate a new snapshot.
                          </td>
                        </tr>
                      ) : (
                        backupsList.map((b: any) => (
                          <tr key={b.id}>
                            <td className="font-mono text-xs text-purple-700">{b.backupCode}</td>
                            <td className="font-medium text-gray-800">{b.requestedBy}</td>
                            <td className="text-xs text-gray-500">{formatDateTime(b.createdAt)}</td>
                            <td className="text-xs font-mono">{b.fileFormat}</td>
                            <td className="text-xs text-gray-600">{b.fileSize}</td>
                            <td><span className="badge-success">{b.status}</span></td>
                            <td>
                              <a
                                href={`/api/admin/backups/${b.id}/download`}
                                download={`${b.backupCode}.json`}
                                className="text-purple-600 hover:underline text-xs font-semibold flex items-center gap-1"
                              >
                                <Download size={12} /> Download
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 8: REFER AN ACCOUNTANT (Full Width) */}
            {activeTab === "Refer an Accountant" && (
              <div className="p-6 w-full space-y-4">
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-6 rounded-xl text-white shadow-md">
                  <h3 className="text-lg font-bold">SanSuite Partner Referral Program</h3>
                  <p className="text-xs text-purple-100 mt-1 max-w-xl">
                    Refer accounting colleagues to SanSuite and earn 20% recurring discount credits on your monthly practice subscription.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs text-purple-200">Your Referral Link:</span>
                    <code className="bg-white/10 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wide">
                      {window.location.origin}/register?ref=SAN-REF-{firm?.id || "PRAC"}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register?ref=SAN-REF-${firm?.id || "PRAC"}`);
                        toast({ title: "Referral Link Copied!", description: "Link copied to clipboard." });
                      }}
                      className="bg-white text-purple-800 px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="SanSuite-card p-5">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Send Referral Invitation</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendReferralMutation.mutate(referralForm);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Colleague Name *</label>
                        <input
                          required
                          type="text"
                          value={referralForm.colleagueName}
                          onChange={(e) => setReferralForm({ ...referralForm, colleagueName: e.target.value })}
                          placeholder="e.g. David Miller"
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Colleague Email *</label>
                        <input
                          required
                          type="email"
                          value={referralForm.colleagueEmail}
                          onChange={(e) => setReferralForm({ ...referralForm, colleagueEmail: e.target.value })}
                          placeholder="e.g. david@milleraccounting.co.uk"
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Custom Invitation Message</label>
                        <textarea
                          rows={3}
                          value={referralForm.message}
                          onChange={(e) => setReferralForm({ ...referralForm, message: e.target.value })}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendReferralMutation.isPending}
                        className="btn-SanSuite text-xs font-semibold px-4 py-2"
                      >
                        {sendReferralMutation.isPending ? "Sending..." : "Send Invitation"}
                      </button>
                    </form>
                  </div>

                  <div className="SanSuite-card p-5">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Referral History & Invites</h4>
                    <table className="SanSuite-table">
                      <thead>
                        <tr>
                          <th>Colleague</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-gray-400 text-xs">
                              No referral invitations sent yet.
                            </td>
                          </tr>
                        ) : (
                          referralsList.map((ref: any) => (
                            <tr key={ref.id}>
                              <td className="font-semibold text-gray-800 text-xs">{ref.colleagueName}</td>
                              <td className="text-xs text-gray-600">{ref.colleagueEmail}</td>
                              <td><span className="badge-success">{ref.status}</span></td>
                              <td className="text-xs text-gray-500">{formatDateOnly(ref.createdAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY SUBSCRIPTION */}
            {activeTab === "My Subscription" && (
          <div className="p-6 space-y-6">
            {/* Current Usage Card */}
            {(() => {
              const currentTier = firm?.subscriptionTier || "Basic";
              const activePlan = subscriptionPlans.find(p => p.name.toLowerCase() === currentTier.toLowerCase()) || { maxClients: 50, maxUsers: 3, maxStorageGb: "5.00", name: currentTier };
              const maxClientsDisplay = activePlan.maxClients === 0 ? "Unlimited" : (activePlan.maxClients || 50);
              const usagePercent = activePlan.maxClients === 0 ? 10 : Math.min(((clients.length / (activePlan.maxClients || 50)) * 100), 100);

              return (
                <div className="SanSuite-card p-6 border-2 border-purple-100 bg-gradient-to-r from-purple-50/40 via-indigo-50/20 to-white">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h2 className="font-bold text-gray-800 text-lg">Current Usage & Plan Status</h2>
                      <p className="text-xs text-gray-500">Practice capacity and active resource limits.</p>
                    </div>
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Active: {currentTier}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-200">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      {clients.length} / {maxClientsDisplay} Clients
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    You are currently on the <strong>{currentTier}</strong> plan. Upgrade your subscription plan anytime to expand client and user limits.
                  </p>
                </div>
              );
            })()}

            {/* Dynamic System Admin Subscription Plans Engine */}
            <div className="SanSuite-card p-6">
              <div className="mb-6">
                <h2 className="font-bold text-gray-800 text-lg">Subscription Plans</h2>
                <p className="text-xs text-gray-500">Plans & Pricing configured by System Admin for your practice.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {(subscriptionPlans.length > 0 ? subscriptionPlans : [
                  { id: 1, name: "Trial", monthlyPrice: "0.00", maxClients: 10, maxUsers: 1, maxStorageGb: "2.00" },
                  { id: 2, name: "Basic", monthlyPrice: "29.00", maxClients: 50, maxUsers: 3, maxStorageGb: "5.00" },
                  { id: 3, name: "Pro", monthlyPrice: "99.00", maxClients: 500, maxUsers: 10, maxStorageGb: "50.00" },
                  { id: 4, name: "Enterprise", monthlyPrice: "299.00", maxClients: 0, maxUsers: 0, maxStorageGb: "500.00" },
                ]).map((plan: any) => {
                  const currentTierName = firm?.subscriptionTier || "Basic";
                  const isCurrent = currentTierName.toLowerCase() === plan.name.toLowerCase();
                  const activePlanObj = subscriptionPlans.find((p: any) => p.name.toLowerCase() === currentTierName.toLowerCase()) || { monthlyPrice: "29.00" };

                  return (
                    <div
                      key={plan.id || plan.name}
                      className={`border-2 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                        isCurrent
                          ? "border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20 shadow-md"
                          : "border-gray-200 hover:border-purple-300 hover:shadow-sm bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-800 text-base">{plan.name}</h3>
                          {isCurrent && (
                            <span className="bg-purple-600 text-white text-[10px] px-2.5 py-0.5 rounded-md font-extrabold uppercase shadow-sm">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="mb-4">
                          <span className="text-2xl font-black text-purple-700">£{parseFloat(plan.monthlyPrice).toFixed(2)}</span>
                          <span className="text-xs text-gray-500 font-medium"> /mo</span>
                        </div>

                        <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-purple-600 shrink-0" />
                            <span>{plan.maxClients === 0 ? "Unlimited Clients" : `${plan.maxClients} Clients`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-purple-600 shrink-0" />
                            <span>{plan.maxUsers === 0 ? "Unlimited Users" : `${plan.maxUsers} Users`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive size={14} className="text-purple-600 shrink-0" />
                            <span>{parseFloat(plan.maxStorageGb || "5").toFixed(2)} GB Storage</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        {isCurrent ? (
                          <div className="w-full bg-purple-100 text-purple-700 text-xs font-bold py-2.5 rounded-xl text-center border border-purple-200">
                            Active Plan
                          </div>
                        ) : (
                          <button
                            onClick={() => handleInitiateCheckout(plan)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                          >
                            {parseFloat(plan.monthlyPrice) < parseFloat(activePlanObj.monthlyPrice || "0") ? `Downgrade to ${plan.name}` : `Upgrade to ${plan.name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "SMS" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="SanSuite-card p-5 flex justify-between items-center bg-purple-50/50 border border-purple-100">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Available SMS Balance</p>
                  <p className="text-2xl font-black text-purple-700 mt-1">{firm?.smsBalance ?? 50} Credits</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">1 credit per UK SMS message</p>
                </div>
                <button
                  onClick={() => setShowSmsTopupModal(true)}
                  className="btn-SanSuite text-xs font-semibold px-3 py-1.5 cursor-pointer"
                >
                  Top Up Balance
                </button>
              </div>
              <div className="SanSuite-card p-5">
                <p className="text-xs text-gray-500 font-medium">Delivery Success Rate</p>
                <p className="text-2xl font-black text-green-700 mt-1">99.8%</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Direct UK Network Route</p>
              </div>
              <div className="SanSuite-card p-5">
                <p className="text-xs text-gray-500 font-medium">Practice Sender ID</p>
                <p className="text-base font-bold text-gray-800 mt-2 font-mono">{firm?.firmName ? firm.firmName.slice(0, 11).toUpperCase() : "SANSUITE"}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Verified Alpha-Numeric Tag</p>
              </div>
            </div>

            <div className="SanSuite-card p-6">
              <h3 className="font-bold text-gray-800 text-sm mb-1">Dispatch SMS to Client</h3>
              <p className="text-xs text-gray-500 mb-4">Send tax return reminders, urgent KYC alerts, or meeting notifications directly to client mobile phones.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendSmsMutation.mutate(smsForm);
                }}
                className="space-y-4 max-w-2xl"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Client (Optional - logs to Timeline)</label>
                  <select
                    value={smsForm.clientId}
                    onChange={(e) => setSmsForm({ ...smsForm, clientId: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="">General Broadcast (No client linked)</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-700">SMS Message Text *</label>
                    <span className="text-[11px] font-mono text-gray-400">{smsForm.message.length} / 160 characters</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={smsForm.message}
                    onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                    placeholder="Type client SMS reminder message..."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                    Cost: <strong>1 SMS Credit</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={sendSmsMutation.isPending || (firm?.smsBalance ?? 50) < 1}
                    className="btn-SanSuite text-xs font-semibold px-5 py-2 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={14} />
                    {sendSmsMutation.isPending ? "Dispatching..." : "Send SMS Message"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "Media" && (
          <div className="py-6">
            <ClientMediaLibrary />
          </div>
        )}

        {activeTab === "Media Settings" && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="SanSuite-card p-6 space-y-6">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">System Admin Media & File Storage Settings</h2>
                <p className="text-xs text-gray-500 mt-1">Control practice file upload size limits and allowed file types across all modules.</p>
              </div>

              <form onSubmit={handleSaveMediaSettings} className="space-y-6 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Maximum File Upload Size Limit (in MB)</label>
                  <select
                    value={mediaSettings.maxFileSizeMB}
                    onChange={(e) => setMediaSettings({ ...mediaSettings, maxFileSizeMB: parseInt(e.target.value) })}
                    className="w-full sm:w-64 px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold"
                  >
                    <option value={5}>5 MB (Strict Limit)</option>
                    <option value={10}>10 MB</option>
                    <option value={25}>25 MB (Recommended Standard)</option>
                    <option value={50}>50 MB</option>
                    <option value={100}>100 MB (Large Files)</option>
                  </select>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Allowed File Categories & Extensions</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50">
                      <input
                        type="checkbox"
                        id="pdf"
                        checked={mediaSettings.allowPdf}
                        onChange={(e) => setMediaSettings({ ...mediaSettings, allowPdf: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <label htmlFor="pdf" className="text-xs font-semibold text-gray-800 cursor-pointer">
                        PDF Documents (<span className="text-purple-600 font-mono">.pdf</span>)
                      </label>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50">
                      <input
                        type="checkbox"
                        id="docs"
                        checked={mediaSettings.allowDocs}
                        onChange={(e) => setMediaSettings({ ...mediaSettings, allowDocs: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <label htmlFor="docs" className="text-xs font-semibold text-gray-800 cursor-pointer">
                        Word Documents (<span className="text-purple-600 font-mono">.doc, .docx, .txt</span>)
                      </label>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50">
                      <input
                        type="checkbox"
                        id="images"
                        checked={mediaSettings.allowImages}
                        onChange={(e) => setMediaSettings({ ...mediaSettings, allowImages: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <label htmlFor="images" className="text-xs font-semibold text-gray-800 cursor-pointer">
                        Images & Logos (<span className="text-purple-600 font-mono">.png, .jpg, .svg, .webp</span>)
                      </label>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50">
                      <input
                        type="checkbox"
                        id="spreadsheets"
                        checked={mediaSettings.allowSpreadsheets}
                        onChange={(e) => setMediaSettings({ ...mediaSettings, allowSpreadsheets: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <label htmlFor="spreadsheets" className="text-xs font-semibold text-gray-800 cursor-pointer">
                        Excel Spreadsheets (<span className="text-purple-600 font-mono">.xls, .xlsx, .csv</span>)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
                  >
                    Save Storage & Media Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-800">New User</h2>
              <button onClick={() => setShowAddUser(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">User Type *</label>
                <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  {["admin", "accountant", "auditor", "staff"].map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                <input value={userForm.firstName} onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                <input value={userForm.lastName} onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-9" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400">
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input value={userForm.phone} onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                <input value={userForm.address} onChange={(e) => setUserForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">City/Town</label>
                <input value={userForm.city} onChange={(e) => setUserForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Post Code</label>
                <input value={userForm.postCode} onChange={(e) => setUserForm((f) => ({ ...f, postCode: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowAddUser(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={() => createUser.mutate(userForm)}
                disabled={!userForm.firstName || !userForm.email || !userForm.password || createUser.isPending}
                className="btn-SanSuite"
              >
                {createUser.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Firm Details Modal */}
      {showEditFirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h2 className="font-semibold text-gray-800">Edit Firm Details</h2>
              <button onClick={() => setShowEditFirm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "firmName", label: "Firm Name *" },
                  { name: "firmType", label: "Firm Type" },
                  { name: "email", label: "Email", type: "email" },
                  { name: "phone", label: "Phone" },
                  { name: "address", label: "Address" },
                  { name: "city", label: "City/Town" },
                  { name: "postCode", label: "Post Code" },
                  { name: "website", label: "Website" },
                  { name: "country", label: "Country" },
                  { name: "yearEnd", label: "Accounting Year End (e.g. 31-12, 31-03)" },
                  { name: "businessStartDate", label: "Business Start Date", type: "date" },
                  { name: "bookStartDate", label: "Book Start Date", type: "date" },
                  { name: "registrationNo", label: "Company Reg No (CRN)" },
                  { name: "utrNumber", label: "UTR No." },
                  { name: "vatScheme", label: "VAT Scheme" },
                  { name: "vatRegNumber", label: "VAT Reg. No." },
                  { name: "vatRegDate", label: "VAT Reg. Date", type: "date" },
                  { name: "vatSubmitType", label: "VAT Submit Type" },
                  { name: "officeRefNo", label: "Accounts Office Ref No" },
                ].map((field) => {
                  const rawVal = firmForm[field.name];
                  const displayVal = field.type === "date" && rawVal ? String(rawVal).slice(0, 10) : (rawVal ?? "");
                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">{field.label}</label>
                      <input
                        type={field.type || "text"}
                        value={displayVal}
                        onChange={(e) => setFirmForm({ ...firmForm, [field.name]: e.target.value })}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEditFirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateFirm.mutate(firmForm)}
                disabled={updateFirm.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {updateFirm.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">Add New Practice Contact</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addContactMutation.mutate(contactForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="e.g. John Baker (Primary Accountant)"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Type</label>
                  <select
                    value={contactForm.contactType}
                    onChange={(e) => setContactForm({ ...contactForm, contactType: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="Primary Contact">Primary Contact</option>
                    <option value="Billing Contact">Billing Contact</option>
                    <option value="Technical Support">Technical Support</option>
                    <option value="Emergency Contact">Emergency Contact</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={contactForm.country}
                    onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="+44 20 1234 5678"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  placeholder="Street address, City, Postcode"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addContactMutation.isPending}
                  className="btn-SanSuite text-xs font-semibold"
                >
                  {addContactMutation.isPending ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">Add Practice Note</h3>
              <button onClick={() => setShowAddNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteForm.title) return;
                createNoteMutation.mutate(noteForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject / Title *</label>
                <input
                  type="text"
                  required
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="e.g. Quarterly Audit Check"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Note Content</label>
                <textarea
                  rows={4}
                  value={noteForm.text}
                  onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })}
                  placeholder="Enter details..."
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createNoteMutation.isPending}
                  className="btn-SanSuite text-xs font-semibold"
                >
                  {createNoteMutation.isPending ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Up SMS Modal */}
      {showSmsTopupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Top Up SMS Credits</h3>
              <button onClick={() => setShowSmsTopupModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Select a bundle to add SMS message credits to your practice account.</p>
            <div className="space-y-2">
              {[
                { credits: 50, price: "£5.00" },
                { credits: 250, price: "£20.00" },
                { credits: 1000, price: "£65.00" },
              ].map((bundle) => (
                <button
                  key={bundle.credits}
                  type="button"
                  onClick={() => topupSmsMutation.mutate(bundle.credits)}
                  disabled={topupSmsMutation.isPending}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50/50 transition-all text-xs font-medium cursor-pointer"
                >
                  <span className="font-bold text-gray-800">+{bundle.credits} SMS Credits</span>
                  <span className="font-bold text-purple-700">{bundle.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AML Client Picker Modal */}
      {showAmlModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-800 text-sm">Select Client for AML Check</h3>
              <button onClick={() => setShowAmlModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Choose the practice client you want to screen against UK/Global Sanctions & PEP registers.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Client *</label>
                <select
                  value={selectedAmlClientId}
                  onChange={(e) => setSelectedAmlClientId(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} {c.companyNumber ? `(CRN: ${c.companyNumber})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const sel = clients.find((c: any) => String(c.id) === String(selectedAmlClientId));
                if (!sel) return null;
                return (
                  <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs space-y-1">
                    <p className="font-semibold text-gray-800">{sel.clientName}</p>
                    <p className="text-gray-500 text-[11px]">Type: {sel.clientType || "Limited Company"}</p>
                    {sel.registrationNumber && <p className="text-gray-500 text-[11px]">Reg: {sel.registrationNumber}</p>}
                    {sel.email && <p className="text-gray-500 text-[11px]">Email: {sel.email}</p>}
                  </div>
                );
              })()}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAmlModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={runAmlCheckMutation.isPending || !selectedAmlClientId}
                  onClick={() => {
                    const target = clients.find((c: any) => String(c.id) === String(selectedAmlClientId));
                    if (target) {
                      setShowAmlModal(false);
                      runAmlCheckMutation.mutate({ clientId: target.id, clientName: target.clientName });
                    }
                  }}
                  className="btn-SanSuite text-xs font-semibold px-4 py-2 cursor-pointer"
                >
                  {runAmlCheckMutation.isPending ? "Screening..." : "Run Screening Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment & Checkout Modal */}
      {showCheckoutModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-700 to-indigo-800 text-white">
              <div>
                <span className="text-xs uppercase font-extrabold text-purple-200 tracking-wider">Checkout & Upgrade</span>
                <h2 className="text-xl font-bold mt-0.5">{selectedPlan.name} Plan</h2>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">£{selectedPlan.monthlyPrice}</span>
                <span className="text-xs text-purple-200 block">/ month</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                  Select Payment Method
                </label>
                
                {availableGateways.length === 0 ? (
                  <div className="p-4 border rounded-xl bg-gray-50 text-xs text-gray-500 text-center">
                    Loading active payment gateways...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableGateways.map((gw) => (
                      <label
                        key={gw.id}
                        onClick={() => setSelectedGatewayId(gw.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedGatewayId === gw.id
                            ? "border-purple-600 bg-purple-50/50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_gateway"
                          checked={selectedGatewayId === gw.id}
                          onChange={() => setSelectedGatewayId(gw.id)}
                          className="mt-1 accent-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-gray-800">{gw.name}</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">
                              {gw.type.replace('_', ' ')}
                            </span>
                          </div>
                          {gw.id === 'manual' && (
                            <div className="mt-2 text-xs font-mono bg-gray-900 text-purple-300 p-3 rounded-lg whitespace-pre-line leading-relaxed">
                              {gw.instructions}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedGatewayId === 'manual' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Payment Reference / Wire Transaction ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-998822 / BACS-102938"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                disabled={isSubmittingCheckout || !selectedGatewayId}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingCheckout ? "Processing..." : `Confirm & Pay £${selectedPlan.monthlyPrice}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
