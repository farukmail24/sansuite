import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Users, UserPlus, Shield, CheckCircle2, AlertCircle, Search,
  ArrowLeft, Download, UploadCloud, Lock, Key, Trash2, Edit3,
  Building2, Briefcase, FileText, Check, X, RefreshCw, Layers,
  Sliders, Info, UserCheck, UserX, ExternalLink, SlidersHorizontal,
  ChevronRight, Save, FileSpreadsheet, Eye, HelpCircle, AlertTriangle
} from "lucide-react";

export interface UserPermissions {
  autoAssign: boolean;
  hubAccess: boolean;
  bankFeedsAccess: boolean;
  amlOfficer: boolean;
  assignedClientIds: number[];
  clientManagerClientIds: number[];
  modulePermissions: Record<string, boolean>;
}

export interface PracticeUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  prefix?: string;
  middleName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postCode?: string;
  permissions?: UserPermissions;
}

export interface PracticeClient {
  id: number;
  clientName: string;
  clientCode?: string;
  clientType: string;
  registrationNumber?: string;
  vatNumber?: string;
  isActive?: boolean;
}

const DEFAULT_MODULE_PERMS: Record<string, boolean> = {
  bookkeeping: true,
  bk_sales: true,
  bk_purchase: true,
  bk_assets: true,
  bk_tasks: true,
  bk_bank: true,
  bk_contacts: true,
  bk_schedule: true,
  bk_reports: true,
  bk_settings: true,
  bk_quick_entry: true,
  bk_vat: true,
  bk_cis: true,
  bk_inventory: true,
  payroll: true,
  pay_employees: true,
  pay_runs: true,
  pay_hmrc: true,
  pay_p60_p45: true,
  mtd_vat: true,
  accounts_production: true,
  corporation_tax: true,
  self_assessment: true,
  practice_management: true,
  pm_tasks: true,
  pm_deadlines: true,
  pm_billing: true,
  pm_aml: true,
  company_secretarial: true,
  time_fees: true,
  tf_timesheets: true,
  tf_invoices: true,
  tf_rates: true,
  tf_expenses: true,
  charity_accounts: false,
};

export default function UsersAndRolesManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Navigation Views: "list" | "edit" | "import"
  const [view, setView] = useState<"list" | "edit" | "import">("list");
  const [selectedUser, setSelectedUser] = useState<PracticeUser | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Split-Screen Editor Tab: "companies" | "modules" (From Capium info Article 9000149683 & img_4 / img_5 / img_6)
  const [editorPermTab, setEditorPermTab] = useState<"companies" | "modules">("companies");
  const [companySearch, setCompanySearch] = useState("");

  // Split-Screen Form State
  const [userForm, setUserForm] = useState<{
    id?: number;
    email: string;
    role: string;
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postCode: string;
    password?: string;
    permissions: UserPermissions;
  }>({
    email: "",
    role: "staff",
    prefix: "Mr",
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    password: "",
    permissions: {
      autoAssign: false,
      hubAccess: true,
      bankFeedsAccess: false,
      amlOfficer: false,
      assignedClientIds: [],
      clientManagerClientIds: [],
      modulePermissions: { ...DEFAULT_MODULE_PERMS },
    },
  });

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // CSV Import State (Matching img_3.png)
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [parsedCsvUsers, setParsedCsvUsers] = useState<any[]>([]);

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<PracticeUser[]>({
    queryKey: ["/api/myadmin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/users");
      return res.json();
    },
  });

  const { data: clientsList = [], isLoading: isLoadingClients } = useQuery<PracticeClient[]>({
    queryKey: ["/api/myadmin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/clients");
      return res.json();
    },
  });

  // Mutations
  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (!userForm.email || !userForm.firstName) {
        throw new Error("First name and email are mandatory.");
      }

      if (userForm.id) {
        // Update existing user
        const res = await apiRequest("PATCH", `/api/myadmin/users/${userForm.id}`, {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          phone: userForm.phone,
          role: userForm.role,
          permissions: userForm.permissions,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update user");
        }
        return res.json();
      } else {
        // Create new user
        const res = await apiRequest("POST", "/api/myadmin/users", {
          ...userForm,
          password: userForm.password || "SanSuite@2026",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create user");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({
        title: userForm.id ? "User Permissions Updated" : "User Created Successfully",
        description: `Access profile and module allocations for ${userForm.firstName} ${userForm.lastName} have been saved.`,
      });
      setView("list");
      setSelectedUser(null);
    },
    onError: (e: any) => {
      toast({ title: "Operation Failed", description: e.message, type: "error" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/myadmin/users/${id}`, { isActive });
      if (!res.ok) throw new Error("Failed to change user status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({ title: "Status Changed", description: "User login authorization updated." });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/myadmin/users/${id}`);
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({ title: "User Removed", description: "The staff account has been deleted from practice." });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (usersToImport: any[]) => {
      const res = await apiRequest("POST", "/api/myadmin/users/import-csv", { usersList: usersToImport });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import users");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
      toast({
        title: "Bulk Import Complete",
        description: data.message || `Imported ${data.importedCount} users.`,
      });
      setView("list");
      setImportStep(1);
      setCsvText("");
      setParsedCsvUsers([]);
    },
    onError: (e: any) => {
      toast({ title: "Import Error", description: e.message, type: "error" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, pass }: { id: number; pass: string }) => {
      if (!pass || pass.length < 6) throw new Error("Password must be at least 6 characters.");
      const res = await apiRequest("PATCH", `/api/myadmin/users/${id}`, { password: pass });
      if (!res.ok) throw new Error("Failed to update password");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Changed", description: "User password has been updated securely." });
      setShowPasswordModal(false);
      setNewPassword("");
    },
    onError: (e: any) => {
      toast({ title: "Password Error", description: e.message, type: "error" });
    },
  });

  // Open Edit User & Permissions View
  const handleOpenEdit = (user?: PracticeUser) => {
    if (user) {
      setSelectedUser(user);
      setUserForm({
        id: user.id,
        email: user.email,
        role: user.role || "staff",
        prefix: user.prefix || "Mr",
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        addressLine1: user.addressLine1 || "",
        addressLine2: user.addressLine2 || "",
        city: user.city || "",
        postCode: user.postCode || "",
        permissions: {
          autoAssign: user.permissions?.autoAssign ?? (user.role === "admin" || user.role === "accountant"),
          hubAccess: user.permissions?.hubAccess ?? true,
          bankFeedsAccess: user.permissions?.bankFeedsAccess ?? (user.role === "admin" || user.role === "accountant"),
          amlOfficer: user.permissions?.amlOfficer ?? (user.role === "admin"),
          assignedClientIds: Array.isArray(user.permissions?.assignedClientIds) ? user.permissions.assignedClientIds : [],
          clientManagerClientIds: Array.isArray(user.permissions?.clientManagerClientIds) ? user.permissions.clientManagerClientIds : [],
          modulePermissions: {
            ...DEFAULT_MODULE_PERMS,
            ...(user.permissions?.modulePermissions || {}),
          },
        },
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        email: "",
        role: "staff",
        prefix: "Mr",
        firstName: "",
        middleName: "",
        lastName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        postCode: "",
        password: "SanSuite@2026",
        permissions: {
          autoAssign: false,
          hubAccess: true,
          bankFeedsAccess: false,
          amlOfficer: false,
          assignedClientIds: [],
          clientManagerClientIds: [],
          modulePermissions: { ...DEFAULT_MODULE_PERMS },
        },
      });
    }
    setView("edit");
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchQuery ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && (u.role === "admin" || u.role === "super_accountant")) ||
        u.role === roleFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Filtered Clients in Split Screen Editor
  const filteredCompanies = useMemo(() => {
    return clientsList.filter((c) => {
      if (!companySearch) return true;
      return (
        c.clientName.toLowerCase().includes(companySearch.toLowerCase()) ||
        (c.clientCode && c.clientCode.toLowerCase().includes(companySearch.toLowerCase())) ||
        (c.registrationNumber && c.registrationNumber.toLowerCase().includes(companySearch.toLowerCase()))
      );
    });
  }, [clientsList, companySearch]);

  // Parse CSV for bulk user import
  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsedCsvUsers([]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const parsed: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length >= 3) {
        parsed.push({
          userType: cols[0] || "Staff",
          prefix: cols[1] || "Mr",
          firstName: cols[2] || "",
          middleName: cols[3] || "",
          lastName: cols[4] || "",
          email: cols[5] || "",
          phone: cols[6] || "",
          address: cols[7] || "",
          city: cols[8] || "",
          postCode: cols[9] || "",
          role: (cols[0] || "staff").toLowerCase().replace(" ", "_"),
        });
      }
    }
    setParsedCsvUsers(parsed);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "User Type,Prefix,First Name,Middle Name,Last Name,Email,Phone No,Address,City/Town,Post Code\n" +
      "Accountant,Mr,Kwasi,,Kwarteng,kwasi@example.co.uk,07700900123,10 Downing St,London,SW1A 2AA\n" +
      "Staff,Mr,Rishi,,Sunak,rishi@example.co.uk,07700900456,11 Downing St,London,SW1A 2AA\n" +
      "Client,Ms,Victoria,,Starmer,client@example.co.uk,07700900789,1 High Street,Manchester,M1 1AA";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "SanSuite_Users_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Action & Title Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Users & Permissions Control Center
            </h2>
            <p className="text-xs text-slate-500">
              Manage practice user types, module privileges, and client company allocations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view !== "list" ? (
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              <ArrowLeft size={15} /> Back to Users List
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setView("import");
                  setImportStep(1);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <UploadCloud size={15} className="text-slate-600" /> Import Users (CSV)
              </button>

              <button
                onClick={() => handleOpenEdit()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <UserPlus size={15} /> + New User
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: MASTER USERS LISTING & ROLE DIRECTORY (img_1.png) */}
      {/* ========================================================= */}
      {view === "list" && (
        <div className="space-y-6">
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Practice Users</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Staff members & clients</div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Super Admins / Accountants</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">
                  {users.filter((u) => u.role === "admin" || u.role === "super_accountant" || u.role === "accountant").length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Full firm managers</div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Shield size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff Members</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {users.filter((u) => u.role === "staff").length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Assigned portfolios</div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Briefcase size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Login Status</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {users.filter((u) => u.isActive).length} / {users.length}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">Authorized for login</div>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <UserCheck size={22} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Quick Search user name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All User Types</option>
                <option value="admin">Super Accountant / Admin</option>
                <option value="accountant">Accountant</option>
                <option value="staff">Staff</option>
                <option value="client">Client</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/myadmin/users"] });
                }}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm transition"
                title="Refresh user list"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Master Users Table (Matching img_1.png) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="py-3.5 px-3 w-12 text-slate-400">#</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Email</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Created On</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">User Type</th>
                    <th className="py-3.5 px-4 font-semibold text-slate-800">Status</th>
                    <th className="py-3.5 px-4 text-right font-semibold text-slate-800">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={18} className="animate-spin text-indigo-600" />
                          <span>Loading practice staff and permission registries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <Users size={32} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700">No users found matching your filters</p>
                          <p className="text-xs text-slate-400">
                            Click &quot;+ New User&quot; to invite practice accountants, staff, or clients.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, user.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="hover:text-indigo-600 text-left font-semibold flex items-center gap-2 group"
                          >
                            <span>
                              {user.prefix ? `${user.prefix} ` : ""}
                              {user.firstName} {user.lastName}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{user.email}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${user.role === "admin" || user.role === "super_accountant"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : user.role === "accountant"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : user.role === "client"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                              }`}
                          >
                            {user.role === "super_accountant" ? "Super Accountant" : user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${user.isActive ? "text-emerald-600" : "text-rose-600"
                              }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                            />
                            {user.isActive ? "Active" : "In Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                              title="Edit Contact & Permissions"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                              title="Change User Password"
                            >
                              <Key size={15} />
                            </button>

                            <button
                              onClick={() => {
                                toggleStatusMutation.mutate({ id: user.id, isActive: !user.isActive });
                              }}
                              className={`p-1.5 rounded-md transition ${user.isActive
                                  ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                              title={user.isActive ? "Deactivate User" : "Activate User"}
                            >
                              {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>

                            <button
                              onClick={async () => {
                                if (await confirm({
                                  title: "Delete User",
                                  description: `Are you sure you want to delete user "${user.firstName} ${user.lastName || ""}"? This action cannot be undone.`,
                                  confirmText: "Delete User",
                                  variant: "danger"
                                })) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Interactive Pagination */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Displaying <strong>{filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(filteredUsers.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{filteredUsers.length}</strong> Users
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 rounded px-2 py-1 bg-white text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SPLIT-SCREEN USER CONTACT DETAILS & PERMISSIONS (img_4, 5, 6)     */}
      {/* ========================================================================= */}
      {view === "edit" && (
        <div className="space-y-6">
          {/* Back / Title / Save Header */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {userForm.id ? `Edit Profile & Permissions: ${userForm.firstName} ${userForm.lastName}` : "Create New User & Allocate Permissions"}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure personal contact information, module accessibility, and client assignments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("list")}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>

              <button
                onClick={() => saveUserMutation.mutate()}
                disabled={saveUserMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                {saveUserMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Two-Column Split Screen Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: USER CONTACT DETAILS (img_4.png left panel) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" /> User Contact Details
                </h3>
                {userForm.id && (
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-sm transition"
                  >
                    Change Password
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    User Name (Official Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. user@practice.co.uk"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    User Type / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setUserForm((p) => ({
                        ...p,
                        role: newRole,
                        permissions: {
                          ...p.permissions,
                          autoAssign: newRole === "admin" || newRole === "accountant",
                          bankFeedsAccess: newRole === "admin" || newRole === "accountant",
                          amlOfficer: newRole === "admin",
                        },
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="super_accountant">Super Accountant (Full Master Firm Access)</option>
                    <option value="accountant">Accountant (Client Manager & All Modules)</option>
                    <option value="staff">Staff (Assigned Client Portfolios & Selected Modules)</option>
                    <option value="client">Client (Client Portal 365 / Bookkeeping / Payroll / Charity)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                    <select
                      value={userForm.prefix}
                      onChange={(e) => setUserForm((p) => ({ ...p, prefix: e.target.value }))}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Sir">Sir</option>
                      <option value="Lord">Lord</option>
                      <option value="Lady">Lady</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="First Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={userForm.middleName}
                      onChange={(e) => setUserForm((p) => ({ ...p, middleName: e.target.value }))}
                      placeholder="Middle Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Last Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 07700 900123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {!userForm.id && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Temporary password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={userForm.addressLine1}
                    onChange={(e) => setUserForm((p) => ({ ...p, addressLine1: e.target.value }))}
                    placeholder="Type in Address Line 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={userForm.addressLine2}
                    onChange={(e) => setUserForm((p) => ({ ...p, addressLine2: e.target.value }))}
                    placeholder="Type in Address Line 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      value={userForm.city}
                      onChange={(e) => setUserForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Type in City / Town"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Post Code</label>
                    <input
                      type="text"
                      value={userForm.postCode}
                      onChange={(e) => setUserForm((p) => ({ ...p, postCode: e.target.value }))}
                      placeholder="e.g. RM13 8LH"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: USER PERMISSIONS (img_4.png & img_6.png right panel) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield size={18} className="text-indigo-600" /> User Permissions
                </h3>

                {/* Top Global Authority Toggles (Auto Assign, Hub, Bank Feeds, AML Officer) */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.autoAssign}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, autoAssign: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Auto Assign</span>
                    <span title="Automatically assign all future clients created in practice to this user">
                      <Info size={13} className="text-slate-400" />
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.hubAccess}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, hubAccess: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hub</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.bankFeedsAccess}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, bankFeedsAccess: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Bank feeds</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.permissions.amlOfficer}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          permissions: { ...p.permissions, amlOfficer: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>AML Officer</span>
                    <span title="Authorized to approve Money Laundering risk assessments">
                      <Info size={13} className="text-slate-400" />
                    </span>
                  </label>
                </div>
              </div>

              {/* Sub-Tabs: Companies vs Modules */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setEditorPermTab("companies")}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition ${editorPermTab === "companies"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Companies ({(userForm.permissions?.assignedClientIds || []).length} Assigned)
                </button>
                <button
                  onClick={() => setEditorPermTab("modules")}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition ${editorPermTab === "modules"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  Modules & Granular Features
                </button>
              </div>

              {/* SUB-TAB 1: COMPANIES CLIENT ALLOCATION (img_4 & img_5) */}
              {editorPermTab === "companies" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                      <input
                        type="text"
                        placeholder="Quick Search company name or client code..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = clientsList.map((c) => c.id);
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              assignedClientIds: allIds,
                            },
                          }));
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              assignedClientIds: [],
                              clientManagerClientIds: [],
                            },
                          }));
                        }}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Companies Allocation Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[480px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Company Name</th>
                          <th className="py-2.5 px-3 text-center w-32">Assigned Clients</th>
                          <th className="py-2.5 px-3 text-center w-32">Client Manager</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCompanies.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400">
                              No companies found
                            </td>
                          </tr>
                        ) : (
                          filteredCompanies.map((comp) => {
                            const isAssigned = (userForm.permissions?.assignedClientIds || []).includes(comp.id);
                            const isManager = (userForm.permissions?.clientManagerClientIds || []).includes(comp.id);

                            return (
                              <tr key={comp.id} className="hover:bg-slate-50 transition">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-slate-800">{comp.clientName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {comp.clientCode ? `Code: ${comp.clientCode} | ` : ""}
                                    {comp.clientType}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setUserForm((p) => {
                                        const cur = p.permissions?.assignedClientIds || [];
                                        const updated = checked
                                          ? [...cur, comp.id]
                                          : cur.filter((id) => id !== comp.id);

                                        // If unassigning, also remove client manager
                                        const curMgr = p.permissions?.clientManagerClientIds || [];
                                        const updatedMgr = checked
                                          ? curMgr
                                          : curMgr.filter((id) => id !== comp.id);

                                        return {
                                          ...p,
                                          permissions: {
                                            ...p.permissions,
                                            assignedClientIds: updated,
                                            clientManagerClientIds: updatedMgr,
                                          },
                                        };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isManager}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setUserForm((p) => {
                                        const curMgr = p.permissions?.clientManagerClientIds || [];
                                        const updatedMgr = checked
                                          ? [...curMgr, comp.id]
                                          : curMgr.filter((id) => id !== comp.id);

                                        // If making manager, ensure also assigned
                                        const cur = p.permissions?.assignedClientIds || [];
                                        const updated = checked && !cur.includes(comp.id)
                                          ? [...cur, comp.id]
                                          : cur;

                                        return {
                                          ...p,
                                          permissions: {
                                            ...p.permissions,
                                            assignedClientIds: updated,
                                            clientManagerClientIds: updatedMgr,
                                          },
                                        };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: GRANULAR MODULES & FEATURE PERMISSIONS (img_6.png) */}
              {editorPermTab === "modules" && (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">

                  {/* BOOKKEEPING MODULE & SUB-FEATURES (img_6.png) */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!userForm.permissions.modulePermissions.bookkeeping}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              modulePermissions: {
                                ...p.permissions.modulePermissions,
                                bookkeeping: v,
                                bk_sales: v,
                                bk_purchase: v,
                                bk_assets: v,
                                bk_tasks: v,
                                bk_bank: v,
                                bk_contacts: v,
                                bk_schedule: v,
                                bk_reports: v,
                                bk_settings: v,
                                bk_quick_entry: v,
                                bk_vat: v,
                                bk_cis: v,
                                bk_inventory: v,
                              },
                            },
                          }));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Bookkeeping</span>
                    </label>

                    {/* Sub-features grid matching img_6.png */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 pl-6 border-t border-slate-200/80">
                      {[
                        { id: "bk_sales", label: "sales" },
                        { id: "bk_purchase", label: "purchase" },
                        { id: "bk_assets", label: "assets" },
                        { id: "bk_tasks", label: "tasks" },
                        { id: "bk_bank", label: "bank" },
                        { id: "bk_contacts", label: "contacts" },
                        { id: "bk_schedule", label: "schedule" },
                        { id: "bk_reports", label: "reports" },
                        { id: "bk_settings", label: "settings" },
                        { id: "bk_quick_entry", label: "quick entry" },
                        { id: "bk_vat", label: "VAT" },
                        { id: "bk_cis", label: "CIS" },
                        { id: "bk_inventory", label: "inventory" },
                      ].map((sub) => (
                        <label key={sub.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!userForm.permissions.modulePermissions[sub.id]}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setUserForm((p) => ({
                                ...p,
                                permissions: {
                                  ...p.permissions,
                                  modulePermissions: {
                                    ...p.permissions.modulePermissions,
                                    [sub.id]: val,
                                    bookkeeping: val ? true : p.permissions.modulePermissions.bookkeeping,
                                  },
                                },
                              }));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="capitalize">{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* PAYROLL RTI MODULE */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                    <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!userForm.permissions.modulePermissions.payroll}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setUserForm((p) => ({
                            ...p,
                            permissions: {
                              ...p.permissions,
                              modulePermissions: {
                                ...p.permissions.modulePermissions,
                                payroll: v,
                                pay_employees: v,
                                pay_runs: v,
                                pay_hmrc: v,
                                pay_p60_p45: v,
                              },
                            },
                          }));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Payroll (RTI & Auto-Enrolment)</span>
                    </label>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 pl-6 border-t border-slate-200/80">
                      {[
                        { id: "pay_employees", label: "Employees & CIS" },
                        { id: "pay_runs", label: "Execute Pay Runs" },
                        { id: "pay_hmrc", label: "HMRC FPS/EPS Filings" },
                        { id: "pay_p60_p45", label: "P60 / P45 Distribution" },
                      ].map((sub) => (
                        <label key={sub.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!userForm.permissions.modulePermissions[sub.id]}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setUserForm((p) => ({
                                ...p,
                                permissions: {
                                  ...p.permissions,
                                  modulePermissions: {
                                    ...p.permissions.modulePermissions,
                                    [sub.id]: val,
                                    payroll: val ? true : p.permissions.modulePermissions.payroll,
                                  },
                                },
                              }));
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span>{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* OTHER STATUTORY MODULES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MTD VAT */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.mtd_vat}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, mtd_vat: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Making Tax Digital for VAT</span>
                      </label>
                    </div>

                    {/* Accounts Production */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.accounts_production}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, accounts_production: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Accounts Production (FRS 102/105)</span>
                      </label>
                    </div>

                    {/* Corporation Tax */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.corporation_tax}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, corporation_tax: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Corporation Tax (CT600)</span>
                      </label>
                    </div>

                    {/* Self Assessment */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.self_assessment}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, self_assessment: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Self Assessment (SA100 / SA800)</span>
                      </label>
                    </div>

                    {/* Time & Fees */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.time_fees}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, time_fees: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Time & Fees (Timesheets & Invoicing)</span>
                      </label>
                    </div>

                    {/* Company Secretarial */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.company_secretarial}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, company_secretarial: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Company Secretarial & Formations</span>
                      </label>
                    </div>

                    {/* Charity Accounts */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                      <label className="flex items-center gap-2 font-bold text-slate-900 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!userForm.permissions.modulePermissions.charity_accounts}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setUserForm((p) => ({
                              ...p,
                              permissions: {
                                ...p.permissions,
                                modulePermissions: { ...p.permissions.modulePermissions, charity_accounts: val },
                              },
                            }));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Charity Accounts (SORP)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: 3-STEP CSV USER BULK IMPORTER (img_3.png)                        */}
      {/* ========================================================================= */}
      {view === "import" && (
        <div className="space-y-6">
          {/* Stepper Header (1 -> 2 -> 3) matching img_3.png */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-center gap-4 max-w-xl mx-auto mb-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 1
                      ? "bg-indigo-600 text-white"
                      : importStep > 1
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {importStep > 1 ? <Check size={16} /> : "1"}
                </div>
                <span className="text-xs font-semibold text-slate-700">Download Template</span>
              </div>

              <div className="w-16 h-0.5 bg-slate-200" />

              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 2
                      ? "bg-indigo-600 text-white"
                      : importStep > 2
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {importStep > 2 ? <Check size={16} /> : "2"}
                </div>
                <span className="text-xs font-semibold text-slate-700">Upload CSV</span>
              </div>

              <div className="w-16 h-0.5 bg-slate-200" />

              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${importStep === 3 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                >
                  3
                </div>
                <span className="text-xs font-semibold text-slate-700">Confirm & Import</span>
              </div>
            </div>

            {/* STEP 1: DOWNLOAD TEMPLATE & FIELD SPECS (img_3.png) */}
            {importStep === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 border border-slate-200 rounded-xl p-6 space-y-4 bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900">Import Users</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Step 1: Download CSV template</strong>
                    <br />
                    Start by downloading our users CSV (Comma Separated Values) template file. This file has the correct column headings required to import user access seamlessly into SanSuite.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>Note: Please don&apos;t include any commas inside cell fields as it is a Comma Separated Value (CSV) file.</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleDownloadCsvTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      <Download size={15} /> Download CSV Template
                    </button>
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      Next Step
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 border border-slate-200 rounded-xl p-6 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">Available Fields & Formats</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2.5 px-3">Field Name</th>
                          <th className="py-2.5 px-3">Required</th>
                          <th className="py-2.5 px-3">Notes</th>
                          <th className="py-2.5 px-3">Supported Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">User Type</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Role level</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Accountant, Staff, Client</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Prefix</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Salutation</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Mr, Mrs, Miss, Ms, Dr, Sir</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">First Name</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">First Name of User</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Last Name</td>
                          <td className="py-2 px-3 text-slate-400">No</td>
                          <td className="py-2 px-3 text-slate-500">Surname</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Email</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Official Login ID</td>
                          <td className="py-2 px-3 font-mono text-[11px]">e.g. user@domain.com</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-medium text-slate-900">Phone No</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold">Yes</td>
                          <td className="py-2 px-3 text-slate-500">Contact Number</td>
                          <td className="py-2 px-3 font-mono text-[11px]">Any Characters</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: UPLOAD CSV FILE OR PASTE */}
            {importStep === 2 && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Step 2: Upload or Paste CSV Data</h3>
                  <p className="text-xs text-slate-500">
                    Upload your completed CSV file or paste the comma-separated contents below.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center space-y-3 bg-slate-50 hover:bg-slate-100/50 transition">
                  <UploadCloud size={36} className="mx-auto text-indigo-600" />
                  <div>
                    <label className="cursor-pointer text-sm font-semibold text-indigo-600 hover:underline">
                      <span>Click to browse CSV file</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              handleParseCsv(text);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">Supported format: .CSV</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Or Paste CSV Raw Text</label>
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => handleParseCsv(e.target.value)}
                    placeholder="User Type,Prefix,First Name,Middle Name,Last Name,Email,Phone No,Address,City/Town,Post Code&#10;Accountant,Mr,John,,Doe,john@example.com,07700900123,1 High St,London,EC1A 1BB"
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (parsedCsvUsers.length === 0) {
                        toast({ title: "No Users Found", description: "Please upload or paste valid CSV data with users.", type: "error" });
                        return;
                      }
                      setImportStep(3);
                    }}
                    disabled={parsedCsvUsers.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Preview & Verify ({parsedCsvUsers.length} Users)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW AND CONFIRM IMPORT */}
            {importStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Step 3: Confirm & Import Users</h3>
                    <p className="text-xs text-slate-500">
                      Review the parsed staff and client profiles below before completing import.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => bulkImportMutation.mutate(parsedCsvUsers)}
                      disabled={bulkImportMutation.isPending}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      {bulkImportMutation.isPending ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                      Confirm & Import ({parsedCsvUsers.length} Users)
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">User Type</th>
                        <th className="py-2.5 px-3">City & Postcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedCsvUsers.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {u.prefix} {u.firstName} {u.lastName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                          <td className="py-2.5 px-3 text-slate-600">{u.phone}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {u.userType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {u.city} {u.postCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <Key size={18} />
                <span>Change Password</span>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Reset login password for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email}).
              </p>
              <p className="text-slate-400">The user will be required to use this new password on next login.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  changePasswordMutation.mutate({ id: selectedUser.id, pass: newPassword });
                }}
                disabled={changePasswordMutation.isPending || !newPassword}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
