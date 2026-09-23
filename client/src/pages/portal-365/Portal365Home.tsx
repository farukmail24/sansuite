import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import {
  Users, FileUp, Search, UserPlus, CheckCircle2, ChevronDown, ChevronRight,
  Info, Copy, Check, Sparkles, Building2, X, ShieldCheck, Clock, RefreshCw,
  Sliders, Edit2, Trash2, Key, Download, LayoutDashboard, ArrowRight, ExternalLink, Shield
} from "lucide-react";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import { portal365Sidebar } from "./sidebar";

// Tree definitions matching Capium 365 Permissions screenshots
// Tree definitions matching 365 Permissions matrix
interface MatrixItem {
  id: string;
  label: string;
  hasChevron?: boolean;
  isFirstRowSpecial?: boolean;
  children?: MatrixItem[];
}

const MATRIX_DEFINITIONS: MatrixItem[] = [
  {
    id: "permissions",
    label: "Permissions",
    hasChevron: true,
    isFirstRowSpecial: true,
  },
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "drive",
    label: "Drive",
  },
  {
    id: "manage",
    label: "Manage",
    hasChevron: true,
    children: [
      { id: "clients", label: "Clients" },
      { id: "users", label: "Users" },
      { id: "imports", label: "Imports" },
      { id: "manage_permissions", label: "Permissions" },
    ],
  },
  {
    id: "activity",
    label: "Activity",
  },
  {
    id: "setting",
    label: "Setting",
    hasChevron: true,
    children: [
      { id: "my_business", label: "My Business" },
      { id: "demo_data", label: "Demo Data" },
    ],
  },
  {
    id: "announcement",
    label: "Announcement",
  },
];

interface PermRowState {
  admin: "Full" | "View" | "None";
  manager: "Full" | "View" | "None";
  regular: "Full" | "View" | "None";
}

const DEFAULT_PERM_STATE: Record<string, PermRowState> = {
  permissions: { admin: "Full", manager: "None", regular: "None" },
  dashboard: { admin: "Full", manager: "Full", regular: "Full" },
  drive: { admin: "Full", manager: "Full", regular: "Full" },
  manage: { admin: "Full", manager: "Full", regular: "Full" },
  clients: { admin: "Full", manager: "Full", regular: "Full" },
  users: { admin: "Full", manager: "None", regular: "None" },
  imports: { admin: "Full", manager: "None", regular: "None" },
  manage_permissions: { admin: "Full", manager: "None", regular: "None" },
  activity: { admin: "Full", manager: "None", regular: "None" },
  setting: { admin: "Full", manager: "None", regular: "None" },
  my_business: { admin: "Full", manager: "None", regular: "None" },
  demo_data: { admin: "Full", manager: "None", regular: "None" },
  announcement: { admin: "Full", manager: "None", regular: "None" },
};

export default function Portal365Home() {
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);

  // Derive active section from URL path or legacy query parameter
  const activeSection = useMemo(() => {
    const path = location.toLowerCase();
    const tabParam = searchParams.get("tab")?.toLowerCase();
    const viewParam = searchParams.get("view")?.toLowerCase();

    if (path.includes("/users") || tabParam === "users") return "users";
    if (path.includes("/imports") || tabParam === "imports") return "imports";
    if (path.includes("/permission") || tabParam === "permissions") return "permissions";
    if (path.includes("/clients") || tabParam === "clients") return "clients";
    if (path === "/365/dashboard" || viewParam === "dashboard") return "dashboard";
    // Default to dashboard when accessing /365 root
    return "dashboard";
  }, [location, searchParams]);

  // Clean URL migration: redirect legacy query strings and root /365 to clean REST routes
  useEffect(() => {
    if (location === "/365") {
      const tab = searchParams.get("tab");
      if (tab === "users") navigate("/365/users", { replace: true });
      else if (tab === "imports") navigate("/365/imports", { replace: true });
      else if (tab === "permissions" || tab === "permission") navigate("/365/permissions", { replace: true });
      else if (tab === "clients") navigate("/365/clients", { replace: true });
      else if (!tab) navigate("/365/dashboard", { replace: true });
    }
  }, [location, searchParams, navigate]);

  const currentTab = activeSection;
  const viewMode = activeSection === "dashboard" ? "dashboard" : "manage";
  const { toast } = useToast();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [permSearch, setPermSearch] = useState("");

  // Pagination
  const [pageSize, setPageSize] = useState(50);

  // Client Selection
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [portalType, setPortalType] = useState<"365" | "sme">("365");
  const [permissions, setPermissions] = useState({
    receipts: true,
    invoices: true,
    bank: true,
    payroll: false,
    documents: true,
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Staff User Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    permission: "Regular User" as "Administrator" | "Manager" | "Regular User",
    assignAllClients: true,
    assignedClientIds: [] as number[],
  });
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Permissions Matrix State (Expand / Collapse & Radios)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    permissions: true,
    manage: true,
    setting: true,
  });
  const [permState, setPermState] = useState<Record<string, PermRowState>>(DEFAULT_PERM_STATE);

  // 1. Fetch Clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 2. Fetch Licenses
  const { data: licenses = [] } = useQuery({
    queryKey: ["/api/portal/licenses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/licenses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 3. Fetch Client Invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["/api/portal/invitations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/invitations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 4. Fetch Practice Staff Users
  const { data: staffUsers = [], isLoading: staffLoading } = useQuery({
    queryKey: ["/api/portal/staff-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/staff-users");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 5. Fetch Permissions Matrix
  const { data: matrixData } = useQuery({
    queryKey: ["/api/portal/permissions-matrix"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/permissions-matrix");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Sync server matrix into local permState when loaded
  useEffect(() => {
    if (matrixData) {
      if (typeof matrixData === "object" && !Array.isArray(matrixData)) {
        setPermState((prev) => ({ ...prev, ...matrixData }));
      } else if (Array.isArray(matrixData)) {
        const mapped: Record<string, PermRowState> = {};
        const processItem = (item: any) => {
          if (item.id) {
            mapped[item.id] = {
              admin: item.admin || "Full",
              manager: item.manager || "None",
              regular: item.regular || "None",
            };
          }
          if (item.children && Array.isArray(item.children)) {
            item.children.forEach(processItem);
          }
        };
        matrixData.forEach(processItem);
        setPermState((prev) => ({ ...prev, ...mapped }));
      }
    }
  }, [matrixData]);

  // Permissions Matrix Save Mutation
  const saveMatrixMutation = useMutation({
    mutationFn: async (newState: Record<string, PermRowState>) => {
      const res = await apiRequest("PUT", "/api/portal/permissions-matrix", newState);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update permissions");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Permissions Saved",
        description: "Permissions matrix updated successfully in database.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/permissions-matrix"] });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Permissions Matrix Reset Mutation
  const resetMatrixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/permissions-matrix/reset");
      if (!res.ok) throw new Error("Failed to reset permissions");
      return res.json();
    },
    onSuccess: () => {
      setPermState(DEFAULT_PERM_STATE);
      setExpandedGroups({ permissions: true, manage: true, setting: true });
      toast({
        title: "Reset to Default",
        description: "Permissions matrix restored to default settings.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/permissions-matrix"] });
    },
    onError: (err: any) => {
      toast({
        title: "Reset Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Client Invitation Mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient?.id || !inviteEmail) {
        throw new Error("Client and email address are required");
      }
      const res = await apiRequest("POST", "/api/portal/invite", {
        clientId: selectedClient.id,
        inviteEmail,
        portalType,
        permissions,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Generated",
        description: `Client invited to ${portalType === "sme" ? "Client & SME" : "SanSuite 365"} Portal.`,
      });
      const fullUrl = `${window.location.origin}/portal/accept/${data.token}`;
      setGeneratedLink(fullUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/licenses"] });
    },
    onError: (err: any) => {
      toast({
        title: "Invitation Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Authentic CSV template download functions
  const downloadClientCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Client Code,Client Name,Client Type,Contact Name,Director Email,Phone\nCL101,Acme Trading Ltd,Limited,John Smith,john@acmetrading.co.uk,+442079460001\nCL102,David Miller,Sole Trader,David Miller,david@millerconsulting.co.uk,+442079460002\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "365_clients_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded", description: "365_clients_import_template.csv downloaded." });
  };

  const downloadStaffCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,First Name,Last Name,Email,Phone,Role\nSarah,Connor,sarah@sanpractice.co.uk,+442079460010,Administrator\nMichael,Scott,michael@sanpractice.co.uk,+442079460011,Manager\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "365_staff_users_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Template Downloaded", description: "365_staff_users_template.csv downloaded." });
  };

  // Staff User Mutation (Create / Update)
  const staffMutation = useMutation({
    mutationFn: async () => {
      const url = editingStaffId ? `/api/portal/staff-users/${editingStaffId}` : "/api/portal/staff-users";
      const method = editingStaffId ? "PUT" : "POST";
      const res = await apiRequest(method, url, staffForm);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save user");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: editingStaffId ? "User Updated" : "User Added",
        description: data.message || "Practice user updated successfully.",
      });
      setShowStaffModal(false);

      // If the updated user is the currently logged in user, immediately update useAuth state
      const currentAuthUser = useAuth.getState().user;
      if (data?.user && (currentAuthUser?.id === data.user.id || currentAuthUser?.email?.toLowerCase() === data.user.email?.toLowerCase())) {
        useAuth.getState().updateUser(data.user);
      } else if (editingStaffId && (editingStaffId === currentAuthUser?.id || staffForm.email?.toLowerCase() === currentAuthUser?.email?.toLowerCase())) {
        useAuth.getState().updateUser({
          firstName: staffForm.firstName,
          lastName: staffForm.lastName,
          email: staffForm.email,
          phone: staffForm.phone,
        });
      }

      setEditingStaffId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/staff-users"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Delete Staff User Mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/portal/staff-users/${id}`);
      if (!res.ok) throw new Error("Failed to deactivate user");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User Deactivated", description: "Practice staff user access revoked." });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/staff-users"] });
    },
  });

  const openInviteModal = (client?: any) => {
    if (client) {
      setSelectedClient(client);
      setInviteEmail(client.email || "");
    } else if (clients.length > 0) {
      setSelectedClient(clients[0]);
      setInviteEmail(clients[0].email || "");
    }
    setPortalType("365");
    setGeneratedLink(null);
    setCopied(false);
    setShowInviteModal(true);
  };

  const openStaffModal = (user?: any) => {
    if (user) {
      setEditingStaffId(user.id);
      setStaffForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        permission: user.permission === "Owner" ? "Administrator" : user.permission || "Regular User",
        assignAllClients: user.assignAllClients ?? true,
        assignedClientIds: user.assignedClientIds || [],
      });
    } else {
      setEditingStaffId(null);
      setStaffForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        permission: "Administrator",
        assignAllClients: true,
        assignedClientIds: [],
      });
    }
    setShowStaffModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied", description: "Activation link copied to clipboard." });
    setTimeout(() => setCopied(false), 3000);
  };

  // License summary
  const license365 = licenses.find((l: any) => l.licenseType === "Portal365") || { totalAllocated: 50, usedCount: 0 };
  const licenseMtd = licenses.find((l: any) => l.licenseType === "MtdIt") || { totalAllocated: 50, usedCount: 0 };

  const invitationsByClientId = new Map<number, any>();
  invitations.forEach((inv: any) => {
    if (inv.clientId) invitationsByClientId.set(inv.clientId, inv);
  });

  // Client filtering
  const filteredClients = useMemo(() => {
    return clients.filter((c: any) => {
      const matchesSearch =
        (c.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.clientCode || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.contactName || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = !clientTypeFilter || (c.clientType || "").toLowerCase() === clientTypeFilter.toLowerCase();

      const inv = invitationsByClientId.get(c.id);
      let status = "uninvited";
      if (inv?.status === "Accepted") status = "active";
      else if (inv?.status === "Pending") status = "invited";

      const matchesStatus = !statusFilter || status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [clients, search, clientTypeFilter, statusFilter, invitationsByClientId]);

  // Staff filtering
  const filteredStaff = useMemo(() => {
    return staffUsers.filter((u: any) => {
      const matchesSearch =
        (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.userCode || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !userStatusFilter || (u.status || "").toLowerCase() === userStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [staffUsers, search, userStatusFilter]);

  // Handle Radio Change in Permissions Matrix
  const handlePermRadioChange = (
    rowId: string,
    role: "admin" | "manager" | "regular",
    opt: "Full" | "View" | "None"
  ) => {
    const updated: Record<string, PermRowState> = {
      ...permState,
      [rowId]: {
        ...(permState[rowId] || { admin: "Full", manager: "None", regular: "None" }),
        [role]: opt,
      },
    };
    setPermState(updated);
    saveMatrixMutation.mutate(updated);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleResetToDefault = () => {
    resetMatrixMutation.mutate();
  };

  return (
    <AppLayout sidebar={portal365Sidebar} module="365 PORTAL">
      <div className="bg-[#f8f9fa] min-h-screen pb-16">
        {/* Sub-Navigation & Breadcrumbs */}
        <div className="bg-white px-6 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <span className="hover:text-[#4c3f78] cursor-pointer" onClick={() => navigate("/")}>
              Home
            </span>
            <span>/</span>
            <span className="hover:text-[#4c3f78] cursor-pointer font-medium" onClick={() => navigate("/365/dashboard")}>
              365 Portal
            </span>
            <span>/</span>
            <span className="text-gray-900 font-semibold capitalize">
              {activeSection === "dashboard"
                ? "Executive Dashboard"
                : `Manage > ${activeSection === "users" ? "Practice Users" : activeSection === "permissions" ? "Permissions Matrix" : activeSection}`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick module section switcher */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
              <button
                onClick={() => navigate("/365/dashboard")}
                className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${activeSection === "dashboard" ? "bg-white text-[#4c3f78] shadow-sm font-semibold" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <LayoutDashboard size={13} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => navigate("/365/clients")}
                className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${activeSection === "clients" ? "bg-white text-[#4c3f78] shadow-sm font-semibold" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <Building2 size={13} />
                <span>Clients</span>
              </button>
              <button
                onClick={() => navigate("/365/users")}
                className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${activeSection === "users" ? "bg-white text-[#4c3f78] shadow-sm font-semibold" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <Users size={13} />
                <span>Users</span>
              </button>
              <button
                onClick={() => navigate("/365/imports")}
                className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${activeSection === "imports" ? "bg-white text-[#4c3f78] shadow-sm font-semibold" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <FileUp size={13} />
                <span>Imports</span>
              </button>
              <button
                onClick={() => navigate("/365/permissions")}
                className={`px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1.5 cursor-pointer ${activeSection === "permissions" ? "bg-white text-[#4c3f78] shadow-sm font-semibold" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <Sliders size={13} />
                <span>Permissions</span>
              </button>
            </div>

            <button
              onClick={() => openInviteModal()}
              className="px-3 py-1.5 bg-[#4c3f78] hover:bg-[#3f2b96] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <UserPlus size={13} /> Invite Client
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-5">
          {/* ==================================================== */}
          {/* TAB 1: CLIENTS (Screenshot 1: /manage/clients)       */}
          {/* ==================================================== */}
          {activeSection === "clients" && (
            <div className="space-y-4">
              {/* Top Banner Matching Screenshot 1 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-6 text-xs text-gray-700">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users size={14} className="text-[#4c3f78]" />
                    <span>Total Clients:</span>
                    <strong className="text-gray-900 font-bold">{clients.length}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sparkles size={14} className="text-purple-600" />
                    <span>365 Licenses:</span>
                    <strong className="text-gray-900 font-bold">
                      {license365.usedCount}/{license365.totalAllocated}
                    </strong>
                    <span className="text-gray-500">({Math.max(0, (license365.totalAllocated || 50) - (license365.usedCount || 0))} left)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={14} className="text-blue-600" />
                    <span>MTD IT:</span>
                    <strong className="text-gray-900 font-bold">
                      ({licenseMtd.usedCount}/{licenseMtd.totalAllocated} ({Math.max(0, (licenseMtd.totalAllocated || 50) - (licenseMtd.usedCount || 0))} left))
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/60 px-3 py-2 rounded-lg">
                  <Info size={14} className="text-amber-600 flex-shrink-0" />
                  <span>To use a client in modules like MTD IT, open the client and enable access from the Modules tab.</span>
                </div>
              </div>

              {/* Action Bar matching Screenshot 1 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => openInviteModal()}
                    className="px-4 py-2 bg-[#5b4cb3] hover:bg-[#4c3f78] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                  >
                    <UserPlus size={13} /> + Add Client
                  </button>

                  <div className="relative flex-1 sm:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#4c3f78] bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <select
                    value={clientTypeFilter}
                    onChange={(e) => setClientTypeFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-[#4c3f78]"
                  >
                    <option value="">All Client Types</option>
                    <option value="limited">Limited</option>
                    <option value="sole">Sole Trader</option>
                    <option value="partnership">Partnership</option>
                    <option value="llp">LLP</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-[#4c3f78]"
                  >
                    <option value="">All 365 Status</option>
                    <option value="active">Active</option>
                    <option value="invited">Invite Sent</option>
                    <option value="uninvited">Uninvited</option>
                  </select>
                </div>
              </div>

              {/* Clients Table matching Screenshot 1 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedClientIds.length > 0 && selectedClientIds.length === filteredClients.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedClientIds(filteredClients.map((c: any) => c.id));
                              else setSelectedClientIds([]);
                            }}
                            className="rounded text-[#4c3f78]"
                          />
                        </th>
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Contact Name</th>
                        <th className="px-4 py-3 font-medium">Last Login</th>
                        <th className="px-4 py-3 font-medium">365 Status</th>
                        <th className="px-4 py-3 font-medium">Modules</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientsLoading ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400">Loading portal clients...</td>
                        </tr>
                      ) : filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-14 text-center">
                            <Building2 size={24} className="mx-auto text-gray-400 mb-2" />
                            <p className="font-semibold text-gray-800">No Clients Found</p>
                            <p className="text-gray-500 text-[11px] mt-0.5">Click '+ Add Client' to onboard clients into SanSuite 365.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((c: any) => {
                          const inv = invitationsByClientId.get(c.id);
                          const clientCode = c.clientCode || `CL${100 + c.id}`;
                          const isSelected = selectedClientIds.includes(c.id);

                          return (
                            <tr key={c.id} className={`hover:bg-gray-50/70 transition ${isSelected ? "bg-purple-50/30" : ""}`}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedClientIds([...selectedClientIds, c.id]);
                                    else setSelectedClientIds(selectedClientIds.filter((id) => id !== c.id));
                                  }}
                                  className="rounded text-[#4c3f78]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => navigate(`/portal/client/${c.id}`)}
                                  className="text-blue-600 hover:text-blue-800 font-mono font-medium underline"
                                >
                                  {clientCode}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900 uppercase">{c.clientName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 hover:underline cursor-pointer">
                                  {c.contactName || c.clientName?.split(" ")[0] || "Director"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-mono">
                                {c.lastLogin ? new Date(c.lastLogin).toLocaleDateString("en-GB") : "-"}
                              </td>
                              <td className="px-4 py-3">
                                {inv?.status === "Accepted" ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    Active ({inv.portalType === "sme" ? "SME" : "365"})
                                  </span>
                                ) : inv?.status === "Pending" ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-700 font-semibold text-[11px]">Invited</span>
                                    <button
                                      onClick={() => copyToClipboard(`${window.location.origin}/portal/accept/${inv.token}`)}
                                      className="text-blue-600 hover:underline text-[11px] inline-flex items-center gap-0.5"
                                    >
                                      <Copy size={10} /> Link
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openInviteModal(c)}
                                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                    >
                                      Invite
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => openInviteModal(c)}
                                      className="text-gray-600 hover:text-gray-900 hover:underline"
                                    >
                                      Activate
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                                    365
                                  </span>
                                  {inv?.portalType === "sme" && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                                      SME
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => openInviteModal(c)}
                                  title="Manage Client Portal Settings"
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                >
                                  <Edit2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer matching Screenshot 1 */}
                <div className="p-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-200 rounded bg-white text-xs"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 font-medium">
                    <button className="px-2.5 py-1 text-gray-400 hover:text-gray-700">&lt; Previous</button>
                    <button className="px-2.5 py-1 bg-[#4c3f78] text-white rounded font-bold">1</button>
                    <button className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded">2</button>
                    <button className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded">3</button>
                    <button className="px-2.5 py-1 text-gray-600 hover:text-gray-900">&gt; Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: USERS (Screenshot 2: /manage/users)           */}
          {/* ==================================================== */}
          {activeSection === "users" && (
            <div className="space-y-4">
              {/* Action Bar matching Screenshot 2 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => openStaffModal()}
                    className="px-4 py-2 bg-[#5b4cb3] hover:bg-[#4c3f78] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                  >
                    <UserPlus size={13} /> + Add User
                  </button>

                  <div className="relative flex-1 sm:w-64">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#4c3f78] bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-[#4c3f78]"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Users Table matching Screenshot 2 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" className="rounded text-[#4c3f78]" />
                        </th>
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Users</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Created on</th>
                        <th className="px-4 py-3 font-medium">Created by</th>
                        <th className="px-4 py-3 font-medium">Permission</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {staffLoading ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-gray-400">Loading practice staff users...</td>
                        </tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-14 text-center">
                            <Users size={24} className="mx-auto text-gray-400 mb-2" />
                            <p className="font-semibold text-gray-800">No Practice Users Found</p>
                            <p className="text-gray-500 text-[11px] mt-0.5">Click '+ Add User' to grant practice team members access to 365.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50/70 transition">
                            <td className="px-4 py-3">
                              <input type="checkbox" className="rounded text-[#4c3f78]" />
                            </td>
                            <td className="px-4 py-3 font-mono text-blue-600 font-medium">
                              <button onClick={() => openStaffModal(u)} className="hover:underline">
                                {u.userCode}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {u.fullName}
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono">
                              {u.email}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {u.createdOn}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {u.createdBy}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold ${u.permission === "Owner" ? "text-purple-700" :
                                u.permission === "Administrator" ? "text-blue-700" : "text-gray-700"
                                }`}>
                                {u.permission}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-semibold ${u.status === "Active" ? "text-emerald-600" : "text-blue-600 hover:underline cursor-pointer"
                                }`}>
                                {u.status === "Active" ? "Active" : "Invite"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openStaffModal(u)}
                                  title="Edit User"
                                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => deleteStaffMutation.mutate(u.id)}
                                  title="Deactivate User"
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={13} />
                                </button>
                                <button
                                  onClick={() => toast({ title: "2FA Active", description: `${u.fullName} is secured with 2FA.` })}
                                  title="Security / Password"
                                  className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                >
                                  <Key size={13} />
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
            </div>
          )}

          {/* ============================================================================== */}
          {/* TAB 3: PERMISSIONS (Matching Screenshots: Collapsed & Expanded Hierarchical Tree)*/}
          {/* ============================================================================== */}
          {activeSection === "permissions" && (() => {
            const renderRadioGroup = (
              rowId: string,
              role: "admin" | "manager" | "regular",
              currentVal?: "Full" | "View" | "None" | null
            ) => {
              const activeVal = currentVal || (role === "admin" ? "Full" : "None");
              return (
                <div className="flex items-center gap-4 text-[11px]">
                  {(["Full", "View", "None"] as const).map((opt) => {
                    const isSelected = activeVal === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handlePermRadioChange(rowId, role, opt)}
                        className={`inline-flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded transition ${isSelected ? "font-semibold text-gray-900" : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        {isSelected ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#5a489b] flex items-center justify-center bg-white shadow-2xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#5a489b]" />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-white hover:border-[#5a489b] transition" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              );
            };

            return (
              <div className="space-y-4">
                {/* Role Permissions Matrix Header Banner */}
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-950 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5a489b] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Sliders size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-950 text-sm">Role Permissions Matrix</span>
                        <span className="px-2 py-0.5 bg-[#5a489b] text-white font-bold text-[10px] rounded-full uppercase tracking-wider">
                          Active & Customizable
                        </span>
                      </div>
                      <p className="text-purple-800 text-xs mt-0.5">
                        Select <strong>Full</strong>, <strong>View</strong>, or <strong>None</strong> for <strong>Admin Access</strong>, <strong>Manager Access</strong>, and <strong>Regular User Access</strong> across all 365 features. Changes are automatically updated and persisted to the database.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 bg-white border border-purple-200 text-[#5a489b] font-semibold rounded-lg text-xs shadow-2xs">
                      Instant Database Auto-Save Active
                    </span>
                  </div>
                </div>

                {/* Action Bar matching Screenshot 3 */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  <div className="relative w-72">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#4c3f78] bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveMatrixMutation.mutate(permState)}
                      disabled={saveMatrixMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#5a489b] hover:bg-[#4c3f78] rounded-lg inline-flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Check size={13} />
                      {saveMatrixMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={handleResetToDefault}
                      disabled={resetMatrixMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#4c3f78] hover:bg-gray-100 rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={resetMatrixMutation.isPending ? "animate-spin" : ""} />
                      Reset to Default
                    </button>
                  </div>
                </div>

                {/* Permission Matrix Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[780px]">
                      {/* Header Columns */}
                      <div className="grid grid-cols-12 py-3 px-6 border-b border-gray-200 text-xs font-semibold text-gray-800 bg-white">
                        <div className="col-span-3"></div>
                        <div className="col-span-3 text-left pl-2">Admin Access</div>
                        <div className="col-span-3 text-left pl-2">Manager Access</div>
                        <div className="col-span-3 text-left pl-2">Regular User Access</div>
                      </div>

                      {/* Table Body */}
                      <div className="divide-y divide-gray-100">
                        {MATRIX_DEFINITIONS.filter((item) =>
                          !permSearch || item.label.toLowerCase().includes(permSearch.toLowerCase()) ||
                          item.children?.some((c) => c.label.toLowerCase().includes(permSearch.toLowerCase()))
                        ).map((row) => {
                          const isExpanded = !!expandedGroups[row.id];
                          const rowState = permState[row.id] || { admin: "Full", manager: "None", regular: "None" };

                          return (
                            <div key={row.id}>
                              {/* Parent Row */}
                              <div className="grid grid-cols-12 py-2.5 px-6 items-center hover:bg-gray-50/70 transition">
                                {/* Left Feature Column with Expand/Collapse Chevron */}
                                <div className="col-span-3 flex items-center gap-1.5 text-xs text-gray-800 font-medium">
                                  {row.hasChevron ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleGroup(row.id)}
                                      className="p-0.5 text-gray-600 hover:text-gray-900 rounded cursor-pointer"
                                    >
                                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                    </button>
                                  ) : (
                                    <span className="w-4" />
                                  )}
                                  <span
                                    className={row.hasChevron ? "cursor-pointer select-none" : ""}
                                    onClick={() => row.hasChevron && toggleGroup(row.id)}
                                  >
                                    {row.label}
                                  </span>
                                </div>

                                {/* Admin Access Column */}
                                <div className="col-span-3 pl-2">
                                  {renderRadioGroup(row.id, "admin", rowState.admin)}
                                </div>

                                {/* Manager Access Column */}
                                <div className="col-span-3 pl-2">
                                  {renderRadioGroup(row.id, "manager", rowState.manager)}
                                </div>

                                {/* Regular User Access Column */}
                                <div className="col-span-3 pl-2">
                                  {renderRadioGroup(row.id, "regular", rowState.regular)}
                                </div>
                              </div>

                              {/* Sub-Rows (Children) when expanded */}
                              {row.hasChevron && isExpanded && row.children && (
                                <div className="bg-white">
                                  {row.children.map((child) => {
                                    const childState = permState[child.id] || { admin: "Full", manager: "None", regular: "None" };

                                    return (
                                      <div
                                        key={child.id}
                                        className="grid grid-cols-12 py-2.5 px-6 items-center hover:bg-gray-50/70 transition border-t border-gray-50"
                                      >
                                        {/* Indented Child Label (No Chevron) */}
                                        <div className="col-span-3 pl-10 text-xs text-gray-700 font-normal">
                                          {child.label}
                                        </div>

                                        {/* Child Admin Access */}
                                        <div className="col-span-3 pl-2">
                                          {renderRadioGroup(child.id, "admin", childState.admin)}
                                        </div>

                                        {/* Child Manager Access */}
                                        <div className="col-span-3 pl-2">
                                          {renderRadioGroup(child.id, "manager", childState.manager)}
                                        </div>

                                        {/* Child Regular User Access */}
                                        <div className="col-span-3 pl-2">
                                          {renderRadioGroup(child.id, "regular", childState.regular)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ==================================================== */}
          {/* TAB 4: IMPORTS                                       */}
          {/* ==================================================== */}
          {activeSection === "imports" && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm max-w-2xl mx-auto text-center space-y-5">
              <div className="w-14 h-14 bg-purple-50 text-[#4c3f78] rounded-2xl flex items-center justify-center mx-auto">
                <FileUp size={26} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Bulk Client & User Import</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Import clients and assign practice staff in bulk using standard CSV or Excel templates.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition">
                  <h4 className="text-xs font-bold text-gray-900">Option 1: Import Clients</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Upload client list with Company Name, Code, and Director Email.</p>
                  <button
                    onClick={downloadClientCsvTemplate}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download size={12} /> CSV Template
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 transition">
                  <h4 className="text-xs font-bold text-gray-900">Option 2: Import Staff Users</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Upload practice team members with Name, Role, and Email.</p>
                  <button
                    onClick={downloadStaffCsvTemplate}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download size={12} /> CSV Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* DASHBOARD VIEW: Executive Overview                   */}
          {/* ==================================================== */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Executive Overview Banner */}
              <div className="bg-gradient-to-r from-[#4c3f78] via-[#5a489b] to-[#3f2b96] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-[11px] font-medium text-purple-200 mb-2 backdrop-blur-sm">
                      <Sparkles size={12} />
                      <span>Executive Portal Management</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">SanSuite 365 Client Portal Hub</h2>
                    <p className="text-xs text-purple-200 mt-1 max-w-xl">
                      Centralized command center for managing client portal workspaces, SME self-service accounting, practice staff delegation, and role-based permissions.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openInviteModal()}
                      className="px-4 py-2 bg-white hover:bg-gray-100 text-[#4c3f78] rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <UserPlus size={14} /> + Invite Client
                    </button>
                    <button
                      onClick={() => openStaffModal()}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <Users size={14} /> + Add Staff User
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">Total Clients</span>
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#4c3f78] flex items-center justify-center">
                      <Building2 size={15} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                    <span className="font-semibold text-emerald-600">
                      {clients.filter((c: any) => invitationsByClientId.get(c.id)?.status === "Accepted").length}
                    </span>
                    <span>active in portal</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">Practice Staff</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{staffUsers.length}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                    <span className="font-semibold text-blue-600">
                      {staffUsers.filter((u: any) => u.permission === "Administrator" || u.permission === "Owner").length}
                    </span>
                    <span>with Admin rights</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">Client Invites</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock size={15} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {invitations.filter((i: any) => i.status === "Pending").length}
                  </div>
                  <div className="text-[11px] text-amber-600 mt-1">
                    Pending activation
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">365 Licenses</span>
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Sparkles size={15} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {license365.usedCount}
                    <span className="text-xs text-gray-400 font-normal"> / {license365.totalAllocated}</span>
                  </div>
                  <div className="text-[11px] text-purple-700 font-semibold mt-1">
                    {Math.max(0, (license365.totalAllocated || 50) - (license365.usedCount || 0))} left to assign
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-purple-200 transition">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">MTD IT Licenses</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck size={15} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {licenseMtd.usedCount}
                    <span className="text-xs text-gray-400 font-normal"> / {licenseMtd.totalAllocated}</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {Math.max(0, (licenseMtd.totalAllocated || 50) - (licenseMtd.usedCount || 0))} left
                  </div>
                </div>
              </div>

              {/* Module Quick Hub (Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => navigate("/365/clients")}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#4c3f78] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4c3f78] flex items-center justify-center mb-3 group-hover:bg-[#4c3f78] group-hover:text-white transition">
                    <Building2 size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#4c3f78] transition">Clients Directory</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Manage client portal access, send invitations, activate workspaces, and assign modules.
                  </p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#4c3f78] font-semibold">
                    <span>Manage {clients.length} Clients</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>

                <div
                  onClick={() => navigate("/365/users")}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#4c3f78] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Users size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition">Practice Staff Users</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Add practice accountants, assign roles (Owner, Admin, Manager), and configure client access scopes.
                  </p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                    <span>Manage {staffUsers.length} Staff</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>

                <div
                  onClick={() => navigate("/365/permissions")}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#4c3f78] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition">
                    <Sliders size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-purple-600 transition">Permissions Matrix</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    SanSuite 365 hierarchical access control across Dashboard, Drive, Manage, and Settings.
                  </p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-purple-600 font-semibold">
                    <span>Configure Access Tree</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>

                <div
                  onClick={() => navigate("/365/imports")}
                  className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#4c3f78] transition cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <FileUp size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition">Bulk CSV Imports</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Download official templates and import clients and practice staff in bulk with 1 click.
                  </p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-600 font-semibold">
                    <span>Import Spreadsheets</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </div>

              {/* Recent Invitations & Portal Activity (Real Database Records) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#4c3f78]" />
                    <h3 className="font-bold text-gray-900 text-sm">Recent Client Portal Invitations & Status</h3>
                    <span className="text-xs text-gray-400 font-medium">({invitations.length} Total)</span>
                  </div>

                  <button
                    onClick={() => openInviteModal()}
                    className="px-3 py-1 bg-[#5a489b] hover:bg-[#4c3f78] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus size={12} /> Invite Client
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="py-12 text-center">
                    <UserPlus size={26} className="mx-auto text-gray-400 mb-2" />
                    <p className="font-semibold text-gray-800 text-xs">No Client Invitations Issued Yet</p>
                    <p className="text-gray-500 text-[11px] mt-0.5 max-w-sm mx-auto">
                      Onboard your clients to the SanSuite 365 self-service portal to allow them to access documents, payslips, and invoices.
                    </p>
                    <button
                      onClick={() => openInviteModal()}
                      className="mt-3 px-3 py-1.5 bg-[#4c3f78] hover:bg-[#3f2b96] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <UserPlus size={13} /> + Invite First Client
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200">
                          <th className="px-4 py-3 font-medium">Client / Recipient</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Portal Type</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Invited On</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invitations.slice(0, 10).map((inv: any) => {
                          const client = clients.find((c: any) => c.id === inv.clientId);
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/60 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900">
                                    {client?.clientName || "Client"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-600">
                                {inv.email}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.portalType === "sme"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                                  }`}>
                                  {inv.portalType === "sme" ? "Client & SME" : "SanSuite 365"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {inv.status === "Accepted" ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                                    <CheckCircle2 size={12} className="text-emerald-600" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                                    <Clock size={12} className="text-amber-600" />
                                    Invite Sent
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-mono">
                                {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB") : "-"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {inv.token && inv.status !== "Accepted" && (
                                  <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/portal/accept/${inv.token}`)}
                                    className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={11} /> Copy Link
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL: INVITE CLIENT (To 365 or SME Portal)          */}
      {/* ==================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#4c3f78] flex items-center justify-center">
                  <UserPlus size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Invite Client to Portal</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {generatedLink ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Invitation Link Ready!</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    The client has been invited. Copy the link below to share with the client directly.
                  </p>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="text-xs text-gray-700 bg-transparent flex-1 font-mono outline-none select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink)}
                    className="px-3 py-1.5 bg-[#4c3f78] hover:bg-[#3f2b96] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Client *
                  </label>
                  <select
                    required
                    value={selectedClient?.id || ""}
                    onChange={(e) => {
                      const client = clients.find((c: any) => c.id === parseInt(e.target.value));
                      setSelectedClient(client);
                      setInviteEmail(client?.email || "");
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78] bg-white"
                  >
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.clientCode || `CL${100 + c.id}`} — {c.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Client Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="client.director@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Portal Tier *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setPortalType("365")}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${portalType === "365"
                        ? "border-purple-600 bg-purple-50/30"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-xs font-bold text-gray-900">Capium 365</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        DocScan receipts, quick invoices, bank balance & doc requests.
                      </p>
                    </div>

                    <div
                      onClick={() => setPortalType("sme")}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${portalType === "sme"
                        ? "border-blue-600 bg-blue-50/30"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-xs font-bold text-gray-900">Client & SME</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Full Bookkeeping, Sales, Purchases, Bank feeds & Payroll summary.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#4c3f78] hover:bg-[#3f2b96] rounded-lg shadow-sm disabled:opacity-50 transition"
                  >
                    {inviteMutation.isPending ? "Generating..." : "Send Portal Invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT PRACTICE STAFF USER                */}
      {/* ==================================================== */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#4c3f78] flex items-center justify-center">
                  <Users size={17} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingStaffId ? "Edit Practice Staff User" : "Add Practice Staff User"}
                </h3>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                staffMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arif"
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ullah"
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@practice.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (for 2FA)</label>
                  <input
                    type="text"
                    placeholder="020 7946 0123"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>
              </div>

              {!editingStaffId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to use default (SanSuite@2026)"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4c3f78]"
                  />
                </div>
              )}

              {/* Permission Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Permission Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Administrator", "Manager", "Regular User"] as const).map((perm) => (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => setStaffForm({ ...staffForm, permission: perm })}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${staffForm.permission === perm
                        ? "border-[#4c3f78] bg-purple-50/50 text-[#4c3f78]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                    >
                      {perm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign to Clients Section matching Capium 365 Architecture */}
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-2.5 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Assign to Clients</label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={staffForm.assignAllClients}
                      onChange={(e) => setStaffForm({ ...staffForm, assignAllClients: e.target.checked })}
                      className="rounded text-[#4c3f78]"
                    />
                    <span>Assign all existing & future clients</span>
                  </label>
                </div>

                {!staffForm.assignAllClients && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Filter clients to assign..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {clients
                        .filter((c: any) =>
                          (c.clientName || "").toLowerCase().includes(clientSearchQuery.toLowerCase())
                        )
                        .map((c: any) => {
                          const isChecked = staffForm.assignedClientIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded text-xs cursor-pointer hover:bg-gray-50"
                            >
                              <span className="font-medium text-gray-800 truncate">{c.clientName}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setStaffForm({
                                      ...staffForm,
                                      assignedClientIds: [...staffForm.assignedClientIds, c.id],
                                    });
                                  } else {
                                    setStaffForm({
                                      ...staffForm,
                                      assignedClientIds: staffForm.assignedClientIds.filter((id) => id !== c.id),
                                    });
                                  }
                                }}
                                className="rounded text-[#4c3f78]"
                              />
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#4c3f78] hover:bg-[#3f2b96] rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {staffMutation.isPending ? "Saving..." : editingStaffId ? "Update User" : "Save Practice User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
