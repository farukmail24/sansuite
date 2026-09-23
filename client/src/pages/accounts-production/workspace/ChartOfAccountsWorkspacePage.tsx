import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientWorkspaceLayout, { useClientWorkspace } from "./ClientWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  ListTree, Plus, Search, Download, Edit2, Trash2,
  Check, X, RefreshCw, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, FileText,
  Building2, Sparkles, Filter, Save
} from "lucide-react";

interface NominalAccount {
  id: number;
  code: string;
  name: string;
  category: string;
  group: string;
  status: "Normal" | "Archive" | string;
  vatCode?: string;
  isSystem?: boolean;
}

const UK_VAT_CODES = [
  "Standard (20%)",
  "No VAT",
  "Exempt",
  "Zero-Rated (0%)",
  "Reduced (5.0%)",
  "EU VAT (0.0%)",
  "Custom VAT",
  "No VAT registered",
  "EU Acquisitions (20%)",
  "Reverse Charge (20%)",
  "Import-RC(20%)",
  "VAT on Imports",
];

const DEFAULT_ACCOUNT_GROUPS = [
  "All Account Type",
  "Turnover",
  "Cost of Sales",
  "Selling and Distribution Costs",
  "Administrative Expenses",
  "Fixed Assets",
  "Fixed Assets – Leased",
  "Fixed Asset Investments",
  "Stocks",
  "Debtors Less than One Year",
  "Debtors More than One Year",
  "Current Asset Investments",
  "Cash at Bank & in Hand",
  "Creditors Less Than One Year",
  "Creditors More Than One Year",
  "Provisions for Liabilities",
  "Pension Asset/Liability",
  "Capital & Reserves",
  "Accruals & Deferred income",
  "Other Operating Income",
  "Other Operating Expenses",
  "Investment Income",
  "Interest Payable & Similar Charges",
  "Taxation",
  "FRS 3 Exceptional Items",
  "Suspense",
];

export default function ChartOfAccountsWorkspacePage() {
  return (
    <ClientWorkspaceLayout activeSection="Chart of Accounts">
      <ChartOfAccountsContent />
    </ClientWorkspaceLayout>
  );
}

function ChartOfAccountsContent() {
  const { clientId, client } = useClientWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Normal");
  const [categoryFilter, setCategoryFilter] = useState("All Account Type");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Sorting
  const [sortField, setSortField] = useState<"code" | "name" | "category" | "group">("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Turnover",
    group: "Turnover",
    status: "Normal",
    vatCode: "Standard (20%)",
    active: true,
  });

  // Fetch Accounts
  const { data: accounts = [], isLoading, isFetching, refetch } = useQuery<NominalAccount[]>({
    queryKey: [`/api/accounts-production/${clientId}/coa`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts-production/${clientId}/coa`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  // Save (Create / Update) Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: formData.code,
        name: formData.name,
        category: formData.group || formData.category || "Turnover",
        group: formData.group || formData.category || "Turnover",
        status: formData.active ? "Normal" : "Archive",
        vatCode: formData.vatCode || "Standard (20%)",
        ...(isEditing ? { id: editingId } : {}),
      };
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/coa`, payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save nominal account.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/coa`] });
      toast({ title: isEditing ? "Account Updated" : "Account Added", description: data.message });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error Saving Account", description: err.message, variant: "destructive" });
    },
  });

  // Delete / Archive Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/accounts-production/${clientId}/coa/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete account.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/coa`] });
      toast({ title: "Account Deleted", description: "Nominal account removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Seed / Sync Standard Capium Accounts Mutation
  const seedStandardMutation = useMutation({
    mutationFn: async (reset: boolean = false) => {
      const res = await apiRequest("POST", `/api/accounts-production/${clientId}/coa/seed-standard`, { reset });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load standard accounts.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounts-production/${clientId}/coa`] });
      toast({ title: "Standard COA Loaded", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const availableGroups = useMemo(() => {
    const set = new Set<string>(DEFAULT_ACCOUNT_GROUPS.slice(1));
    accounts.forEach((a) => {
      if (a.group) set.add(a.group);
    });
    return ["All Account Type", ...Array.from(set).sort()];
  }, [accounts]);

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      category: "Turnover",
      group: "Turnover",
      status: "Normal",
      vatCode: "Standard (20%)",
      active: true,
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: NominalAccount) => {
    const isActive = acc.status !== "Archive";
    setFormData({
      code: acc.code,
      name: acc.name,
      category: acc.category || acc.group || "Turnover",
      group: acc.group || acc.category || "Turnover",
      status: acc.status || "Normal",
      vatCode: acc.vatCode || "Standard (20%)",
      active: isActive,
    });
    setEditingId(acc.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Filter & Sort Logic
  const filteredAccounts = useMemo(() => {
    return accounts
      .filter((acc) => {
        // Status filter
        if (statusFilter !== "All" && acc.status !== statusFilter) return false;
        // Group / Category filter
        if (categoryFilter !== "All Account Type" && acc.group !== categoryFilter && acc.category !== categoryFilter) return false;
        // Search term
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchCode = acc.code.toLowerCase().includes(s);
          const matchName = acc.name.toLowerCase().includes(s);
          const matchCat = acc.category.toLowerCase().includes(s);
          const matchGrp = acc.group.toLowerCase().includes(s);
          if (!matchCode && !matchName && !matchCat && !matchGrp) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || "";
        let valB = b[sortField] || "";
        if (sortField === "code") {
          // Numerical or string comparison
          const numA = parseInt(valA, 10);
          const numB = parseInt(valB, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortDir === "asc" ? numA - numB : numB - numA;
          }
        }
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [accounts, searchTerm, statusFilter, categoryFilter, sortField, sortDir]);

  // Pagination Slice
  const totalEntries = filteredAccounts.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedAccounts.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // CSV Export (Capium feature)
  const handleExportCsv = () => {
    if (filteredAccounts.length === 0) {
      toast({ title: "No Accounts", description: "No accounts available to export." });
      return;
    }
    const headers = ["Nominal Code", "Account Name", "Category", "Group", "Status"];
    const rows = filteredAccounts.map((a) => [
      `"${a.code}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      `"${a.group}"`,
      `"${a.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chart_of_Accounts_${client?.clientName || "Client"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exported", description: `Exported ${filteredAccounts.length} accounts to CSV.` });
  };

  return (
    <div className="space-y-4">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListTree size={18} className="text-sky-600" />
            Chart of Accounts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Maintain nominal codes, categories, statutory groups, and active status for {client?.clientName || "client"}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {accounts.length < 643 && (
            <button
              type="button"
              onClick={() => seedStandardMutation.mutate(false)}
              disabled={seedStandardMutation.isPending}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Load / Sync default UK standard chart of accounts (643 accounts)"
            >
              <Sparkles size={13} className={seedStandardMutation.isPending ? "animate-spin" : ""} />
              {seedStandardMutation.isPending ? "Loading..." : accounts.length === 0 ? "Load Standard COA (643)" : "Sync Standard Accounts (643)"}
            </button>
          )}

          

          {accounts.length >= 643 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Reset to default UK standard Chart of Accounts (643 accounts)? Any custom accounts will be preserved.")) {
                  seedStandardMutation.mutate(true);
                }
              }}
              disabled={seedStandardMutation.isPending}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset to fresh default standard UK chart of accounts"
            >
              <RefreshCw size={12} className={seedStandardMutation.isPending ? "animate-spin" : ""} />
              Reset to Standard COA
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> Account
          </button>
        </div>
      </div>

      {/* Capium-style Filter Bar (Search, Status, Account Type, Search Button, Export) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or account name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer focus:outline-hidden"
            >
              <option value="Normal">Normal</option>
              <option value="Archive">Archive</option>
              <option value="All">All Statuses</option>
            </select>
          </div>

          {/* Account Type / Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Account Type:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer focus:outline-hidden max-w-xs"
            >
              {availableGroups.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons: Refresh, Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh accounts"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export filtered Chart of Accounts to CSV"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Capium Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedAccounts.length > 0 &&
                      paginatedAccounts.every((a) => selectedIds.includes(a.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-sky-600 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => {
                    if (sortField === "name") setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSortField("name");
                      setSortDir("asc");
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-sky-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Account Name</span>
                    {sortField === "name" && (
                      <span className="text-[10px] text-sky-600">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === "category") setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSortField("category");
                      setSortDir("asc");
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-sky-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {sortField === "category" && (
                      <span className="text-[10px] text-sky-600">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === "group") setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSortField("group");
                      setSortDir("asc");
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-sky-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Group</span>
                    {sortField === "group" && (
                      <span className="text-[10px] text-sky-600">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === "code") setSortDir(sortDir === "asc" ? "desc" : "asc");
                    else {
                      setSortField("code");
                      setSortDir("asc");
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-sky-600 select-none w-24"
                >
                  <div className="flex items-center gap-1">
                    <span>Code</span>
                    {sortField === "code" && (
                      <span className="text-[10px] text-sky-600">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-sky-500" />
                    <span>Loading Chart of Accounts...</span>
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-3">
                    <ListTree size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                      No nominal accounts found matching your filters.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={handleOpenAdd}
                        className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        + Add Custom Account
                      </button>
                      {accounts.length === 0 && (
                        <button
                          onClick={() => seedStandardMutation.mutate(true)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles size={12} /> Load Standard Accounts (643)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedIds.includes(item.id) ? "bg-sky-50/40 dark:bg-sky-950/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        className="rounded border-slate-300 text-sky-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.status === "Archive" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {item.group}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                          title="Edit nominal account"
                        >
                          <Edit2 size={11} /> Edit
                        </button>
                        {!item.isSystem && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete account ${item.code} - ${item.name}?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete custom account"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Capium-style Pagination Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs cursor-pointer focus:outline-hidden"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>
              records per page. Showing {totalEntries > 0 ? startIndex + 1 : 0} to {endIndex} of {totalEntries} entries
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Page indicator pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let pageNum = idx + 1;
              if (totalPages > 5 && safeCurrentPage > 3) {
                pageNum = safeCurrentPage - 3 + idx;
                if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    safeCurrentPage === pageNum
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Account (SanSuite Native Theme) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 text-xs animate-in zoom-in-95 duration-150">
            {/* SanSuite Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
                  <ListTree size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isEditing ? "Edit Nominal Account" : "Add Nominal Account"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isEditing
                      ? "Update nominal code, group classification, and UK VAT rate"
                      : "Create a new nominal code for bookkeeping and financial statements"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body: SanSuite Layout */}
            <div className="p-6 space-y-4">
              {/* Account Type / Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Type / Statutory Group <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.group}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      group: e.target.value,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors cursor-pointer"
                >
                  {availableGroups
                    .filter((g) => g !== "All Account Type")
                    .map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                </select>
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sales, Professional Fees, Director Remuneration"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Account Code & VAT Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Account Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. 1000"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    UK VAT Classification
                  </label>
                  <select
                    value={formData.vatCode}
                    onChange={(e) => setFormData({ ...formData, vatCode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors cursor-pointer"
                  >
                    {UK_VAT_CODES.map((vc) => (
                      <option key={vc} value={vc}>
                        {vc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Toggle Card */}
              <div className="pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Account Status</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Enable this nominal account for transactions and reports</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !formData.code || !formData.name}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                <span>{saveMutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
