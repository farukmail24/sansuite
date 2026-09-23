import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Users, UserPlus, Search, Filter, Download, UploadCloud,
  Edit3, Trash2, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet,
  Building2, Briefcase, Calendar, Shield, HelpCircle, X, Save, ArrowLeft,
  Check, Phone, Mail, MapPin, Hash, Sparkles, Globe, FileText, ChevronRight,
  PieChart, Award, UserCheck
} from "lucide-react";

interface PracticeContact {
  id: number;
  practiceId: number;
  clientId?: number | null;
  clientName?: string | null;
  clientCode?: string | null;
  contactType: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  vatNumber?: string | null;
  createdAt?: string;
  extra?: {
    prefix?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    jobTitle?: string;
    city?: string;
    postcode?: string;
    country?: string;
    sharePercent?: string;
    shareClass?: string;
    niNumber?: string;
    dob?: string;
  };
}

interface PracticeClientOption {
  id: number;
  clientCode?: string;
  clientName: string;
  clientType: string;
}

export default function ContactsManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Page View: "list" | "edit" | "import"
  const [view, setView] = useState<"list" | "edit" | "import">("list");
  const [selectedContact, setSelectedContact] = useState<PracticeContact | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // CSV Import Wizard State
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [csvText, setCsvText] = useState("");
  const [parsedCsvContacts, setParsedCsvContacts] = useState<any[]>([]);

  // Contact Form State
  const [contactForm, setContactForm] = useState<{
    id?: number;
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    contactType: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    country: string;
    clientId: string;
    extra: {
      jobTitle: string;
      sharePercent: string;
      shareClass: string;
      niNumber: string;
      dob: string;
    };
  }>({
    prefix: "Mr",
    firstName: "",
    middleName: "",
    lastName: "",
    contactType: "Director",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    clientId: "",
    extra: {
      jobTitle: "",
      sharePercent: "",
      shareClass: "Ordinary",
      niNumber: "",
      dob: "",
    },
  });

  // Queries
  const { data: contactsList = [], isLoading: isLoadingContacts } = useQuery<PracticeContact[]>({
    queryKey: ["/api/myadmin/contacts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/contacts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: clientsList = [] } = useQuery<PracticeClientOption[]>({
    queryKey: ["/api/myadmin/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/myadmin/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // KPI Metrics
  const totalContactsCount = contactsList.length;
  const directorsCount = contactsList.filter((c) => c.contactType?.toLowerCase().includes("director")).length;
  const shareholdersCount = contactsList.filter((c) => c.contactType?.toLowerCase().includes("shareholder") || (c.extra?.sharePercent && parseFloat(c.extra.sharePercent) > 0)).length;
  const linkedClientsCount = contactsList.filter((c) => c.clientId).length;

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contactsList.filter((c) => {
      if (typeFilter !== "all" && c.contactType?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (clientFilter !== "all") {
        if (clientFilter === "unassigned" && c.clientId) return false;
        if (clientFilter !== "unassigned" && String(c.clientId) !== clientFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchClient = c.clientName?.toLowerCase().includes(q) || c.clientCode?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchClient) return false;
      }
      return true;
    });
  }, [contactsList, typeFilter, clientFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const paginatedContacts = useMemo(() => {
    return filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Mutations
  const saveContactMutation = useMutation({
    mutationFn: async () => {
      const fullName = `${contactForm.prefix ? `${contactForm.prefix} ` : ""}${contactForm.firstName.trim()} ${contactForm.middleName.trim() ? `${contactForm.middleName.trim()} ` : ""}${contactForm.lastName.trim()}`.trim();
      if (!fullName) throw new Error("First Name and Last Name are required.");

      const payload = {
        ...contactForm,
        name: fullName,
        clientId: contactForm.clientId ? parseInt(contactForm.clientId) : null,
      };

      if (contactForm.id) {
        const res = await apiRequest("PATCH", `/api/myadmin/contacts/${contactForm.id}`, payload);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update contact");
        }
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/myadmin/contacts", payload);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create contact");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/contacts"] });
      toast({
        title: contactForm.id ? "Contact Updated" : "Contact Added",
        description: `Contact has been saved to your practice directory.`,
      });
      setView("list");
      setSelectedContact(null);
    },
    onError: (err: any) => {
      toast({ title: "Operation Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/myadmin/contacts/${id}`);
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/contacts"] });
      toast({ title: "Contact Deleted", description: "The contact record has been removed." });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (list: any[]) => {
      const res = await apiRequest("POST", "/api/myadmin/contacts/import-csv", { contactsList: list });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import contacts");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/myadmin/contacts"] });
      toast({ title: "Import Successful", description: data.message });
      setView("list");
      setImportStep(1);
      setCsvText("");
      setParsedCsvContacts([]);
    },
    onError: (err: any) => {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    },
  });

  // Open Full-Page Editor
  const handleOpenContactEdit = (c?: PracticeContact) => {
    if (c) {
      setSelectedContact(c);
      const nameParts = (c.name || "").split(" ");
      const prefix = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"].includes(nameParts[0]) ? nameParts[0] : (c.extra?.prefix || "Mr");
      const cleanParts = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"].includes(nameParts[0]) ? nameParts.slice(1) : nameParts;
      const firstName = c.extra?.firstName || cleanParts[0] || "";
      const lastName = c.extra?.lastName || cleanParts.slice(1).join(" ") || "";

      setContactForm({
        id: c.id,
        prefix,
        firstName,
        middleName: c.extra?.middleName || "",
        lastName,
        contactType: c.contactType || "Director",
        email: c.email || "",
        phone: c.phone || "",
        address: c.address || "",
        city: c.extra?.city || "",
        postcode: c.extra?.postcode || "",
        country: c.extra?.country || "United Kingdom",
        clientId: c.clientId ? String(c.clientId) : "",
        extra: {
          jobTitle: c.extra?.jobTitle || "",
          sharePercent: c.extra?.sharePercent || "",
          shareClass: c.extra?.shareClass || "Ordinary",
          niNumber: c.extra?.niNumber || "",
          dob: c.extra?.dob || "",
        },
      });
    } else {
      setSelectedContact(null);
      setContactForm({
        prefix: "Mr",
        firstName: "",
        middleName: "",
        lastName: "",
        contactType: "Director",
        email: "",
        phone: "",
        address: "",
        city: "",
        postcode: "",
        country: "United Kingdom",
        clientId: "",
        extra: {
          jobTitle: "",
          sharePercent: "",
          shareClass: "Ordinary",
          niNumber: "",
          dob: "",
        },
      });
    }
    setView("edit");
  };

  // CSV Parsing
  const handleParseCsv = (raw: string) => {
    setCsvText(raw);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParsedCsvContacts([]);
      return;
    }

    const parsed: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length >= 2) {
        parsed.push({
          type: cols[0] || "Director",
          prefix: cols[1] || "Mr",
          firstName: cols[2] || "Unnamed",
          middleName: cols[3] || "",
          lastName: cols[4] || "Contact",
          email: cols[5] || "",
          phoneNo: cols[6] || "",
          address: cols[7] || "",
          city: cols[8] || "",
          postCode: cols[9] || "",
          linkedClientCode: cols[10] || "",
          jobTitle: cols[11] || "",
          sharePercent: cols[12] || "",
        });
      }
    }
    setParsedCsvContacts(parsed);
  };

  const handleDownloadCsvTemplate = () => {
    const header = "Type,Prefix,First Name,Middle Name,Last Name,Email,Phone No,Address,City,Post Code,Linked Client Code,Job Title,Share Percent\n";
    const sample1 = "Director,Mr,David,,Miller,david@acmetech.co.uk,07700900123,100 London Wall,London,EC2M 5QQ,CL001,Managing Director,50\n";
    const sample2 = "Shareholder,Mrs,Sarah,Jane,Jenkins,sarah@acmetech.co.uk,07700900456,100 London Wall,London,EC2M 5QQ,CL001,Co-Founder,50\n";
    const sample3 = "Supplier,Mr,Robert,,Smith,orders@officesupplies.co.uk,02079460999,44 High Street,Manchester,M1 2BB,,Account Executive,\n";

    const blob = new Blob([header + sample1 + sample2 + sample3], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "SanSuite_Contacts_Import_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportContactsCsv = () => {
    const listToExport = selectedContactIds.length > 0
      ? contactsList.filter((c) => selectedContactIds.includes(c.id))
      : filteredContacts;

    let csvContent = "Contact Name,Type,Linked Client Company,Client Code,Email,Phone,Address,Job Title,Share Percent\n";
    listToExport.forEach((c) => {
      csvContent += `"${c.name || ""}","${c.contactType || ""}","${c.clientName || "Unassigned"}","${c.clientCode || ""}","${c.email || ""}","${c.phone || ""}","${c.address || ""}","${c.extra?.jobTitle || ""}","${c.extra?.sharePercent || ""}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SanSuite_Contacts_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Exported ${listToExport.length} contacts to CSV.` });
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================================= */}
      {/* VIEW 1: MASTER DIRECTORY (Full-Page)                     */}
      {/* ========================================================= */}
      {view === "list" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* 1. TOP KPI METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Practice Contacts</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{totalContactsCount}</div>
                <span className="text-[11px] text-purple-600">Total Registered Individuals</span>
              </div>
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                <Users size={22} />
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Directors & Officers</span>
                <div className="text-2xl font-black text-blue-600 mt-1">{directorsCount}</div>
                <span className="text-[11px] text-blue-600">Companies House Officers</span>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Award size={22} />
              </div>
            </div>

            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Shareholders & PSCs</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{shareholdersCount}</div>
                <span className="text-[11px] text-emerald-700">Equity Owners & Control</span>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <PieChart size={22} />
              </div>
            </div>

            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Linked to Clients</span>
                <div className="text-2xl font-black text-amber-700 mt-1">{linkedClientsCount}</div>
                <span className="text-[11px] text-amber-600">Active Company Links</span>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <Building2 size={22} />
              </div>
            </div>
          </div>

          {/* 2. FILTER & ACTION CONTROLS BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Quick Search */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search contact name, email, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Contact Types</option>
                <option value="director">Director</option>
                <option value="shareholder">Shareholder</option>
                <option value="client">Client</option>
                <option value="lead">Lead</option>
                <option value="supplier">Supplier</option>
                <option value="staff">Staff</option>
                <option value="accountant">Accountant</option>
                <option value="secretary">Company Secretary</option>
                <option value="psc">PSC (Person with Significant Control)</option>
                <option value="other">Other</option>
              </select>

              {/* Linked Client Filter */}
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:ring-2 focus:ring-purple-500 outline-none max-w-[220px]"
              >
                <option value="all">All Linked Companies</option>
                <option value="unassigned">Unassigned (Global Contact)</option>
                {clientsList.map((cl) => (
                  <option key={cl.id} value={String(cl.id)}>
                    {cl.clientName} ({cl.clientCode || `CL${cl.id}`})
                  </option>
                ))}
              </select>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportContactsCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition"
                  title="Export contacts to CSV"
                >
                  <Download size={14} /> Export CSV
                </button>

                <button
                  onClick={() => {
                    setView("import");
                    setImportStep(1);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <UploadCloud size={14} /> Import Contacts (CSV)
                </button>

                <button
                  onClick={() => handleOpenContactEdit()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <UserPlus size={14} /> + New Contact
                </button>
              </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedContactIds.length > 0 && (
              <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-indigo-900 font-semibold">
                  <CheckCircle2 size={16} className="text-indigo-600" />
                  <span>{selectedContactIds.length} contact(s) selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportContactsCsv}
                    className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-semibold transition"
                  >
                    Export Selected
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirm({
                        title: "Delete Contacts",
                        description: `Are you sure you want to delete ${selectedContactIds.length} selected contacts? This action cannot be undone.`,
                        confirmText: `Delete ${selectedContactIds.length} Contacts`,
                        variant: "danger"
                      })) {
                        selectedContactIds.forEach((id) => deleteContactMutation.mutate(id));
                        setSelectedContactIds([]);
                      }
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold transition cursor-pointer"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedContactIds([])}
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="Deselect All"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. MASTER DATA TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="SanSuite-table">
                <thead>
                  <tr>
                    <th className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContactIds(filteredContacts.map((c) => c.id));
                          } else {
                            setSelectedContactIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th>#</th>
                    <th>Contact Name</th>
                    <th>Type</th>
                    <th>Linked Client Company & Role</th>
                    <th>Email Address</th>
                    <th>Phone Number</th>
                    <th>Address & Postcode</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingContacts ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw size={16} className="animate-spin text-purple-600" />
                          <span>Loading practice contacts directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        <div className="max-w-md mx-auto space-y-2">
                          <Users size={32} className="mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-700 text-sm">No contacts found matching filters</p>
                          <p className="text-slate-400 text-xs">Click &quot;+ New Contact&quot; or &quot;Import Contacts (CSV)&quot; to add individuals.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((contact, idx) => (
                      <tr key={contact.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedContactIds((prev) => [...prev, contact.id]);
                              } else {
                                setSelectedContactIds((prev) => prev.filter((id) => id !== contact.id));
                              }
                            }}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="text-slate-400 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="font-semibold text-slate-900">
                          <button
                            onClick={() => handleOpenContactEdit(contact)}
                            className="hover:text-purple-600 text-left font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{contact.name}</span>
                          </button>
                          {contact.extra?.jobTitle && (
                            <span className="text-[11px] text-slate-400 block font-normal">{contact.extra.jobTitle}</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${contact.contactType?.toLowerCase().includes("director")
                                ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                                : contact.contactType?.toLowerCase().includes("shareholder")
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                          >
                            {contact.contactType}
                          </span>
                        </td>
                        <td className="text-xs">
                          {contact.clientName ? (
                            <div>
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <Building2 size={12} className="text-purple-600" />
                                {contact.clientName}
                              </span>
                              <span className="text-[11px] text-purple-600 font-mono">
                                ({contact.clientCode || `CL${contact.clientId}`})
                                {contact.extra?.sharePercent ? ` • ${contact.extra.sharePercent}% Shareholding` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned (Global Contact)</span>
                          )}
                        </td>
                        <td className="text-xs text-slate-600">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-purple-600 hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="text-xs font-mono text-slate-600">
                          {contact.phone || "—"}
                        </td>
                        <td className="text-xs text-slate-500">
                          <div>{contact.address || "—"}</div>
                          {contact.extra?.postcode && (
                            <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase">{contact.extra.postcode}</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenContactEdit(contact)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition cursor-pointer"
                              title="Edit Contact"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirm({
                                  title: "Delete Contact",
                                  description: `Are you sure you want to delete contact "${contact.name}"? This action cannot be undone.`,
                                  confirmText: "Delete Contact",
                                  variant: "danger"
                                })) {
                                  deleteContactMutation.mutate(contact.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Delete Contact"
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

            {/* Table Footer with Interactive Pagination */}
            <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Displaying <strong>{filteredContacts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(filteredContacts.length, currentPage * pageSize)}</strong> of{" "}
                <strong>{filteredContacts.length}</strong> Contacts
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

      {/* ========================================================= */}
      {/* VIEW 2: DEDICATED FULL-PAGE CONTACT EDITOR (No Modal!)    */}
      {/* ========================================================= */}
      {view === "edit" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* Top Sticky Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setView("list");
                  setSelectedContact(null);
                }}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back to Contacts Directory</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {contactForm.id ? `Edit Contact: ${contactForm.prefix} ${contactForm.firstName} ${contactForm.lastName}` : "Add New Practice Contact"}
                </h2>
                <p className="text-xs text-slate-500">
                  Manage individual particulars, corporate officer designation, and client company equity links.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  setSelectedContact(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => saveContactMutation.mutate()}
                disabled={saveContactMutation.isPending}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{saveContactMutation.isPending ? "Saving..." : contactForm.id ? "Save Changes" : "Create Contact"}</span>
              </button>
            </div>
          </div>

          {/* Form Content: 2 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: IDENTITY & CLASSIFICATION */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Users size={16} className="text-purple-600" /> 1. Contact Identity & Role
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Type * (Article 9000231556)</label>
                  <select
                    value={contactForm.contactType}
                    onChange={(e) => setContactForm({ ...contactForm, contactType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Director">Director</option>
                    <option value="Shareholder">Shareholder</option>
                    <option value="Client">Client</option>
                    <option value="Lead">Lead</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Staff">Staff</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Secretary">Company Secretary</option>
                    <option value="PSC">PSC (Person with Significant Control)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix / Title</label>
                  <select
                    value={contactForm.prefix}
                    onChange={(e) => setContactForm({ ...contactForm, prefix: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    placeholder="e.g. David"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={contactForm.middleName}
                    onChange={(e) => setContactForm({ ...contactForm, middleName: e.target.value })}
                    placeholder="e.g. John"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    placeholder="e.g. Miller"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Role Designation</label>
                <input
                  type="text"
                  value={contactForm.extra.jobTitle}
                  onChange={(e) => setContactForm({ ...contactForm, extra: { ...contactForm.extra, jobTitle: e.target.value } })}
                  placeholder="e.g. Managing Director / Principal Consultant"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">National Insurance No (NINO)</label>
                  <input
                    type="text"
                    value={contactForm.extra.niNumber}
                    onChange={(e) => setContactForm({ ...contactForm, extra: { ...contactForm.extra, niNumber: e.target.value } })}
                    placeholder="e.g. QQ 12 34 56 A"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={contactForm.extra.dob}
                    onChange={(e) => setContactForm({ ...contactForm, extra: { ...contactForm.extra, dob: e.target.value } })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: CLIENT COMPANY & SHAREHOLDER LINKING */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 size={16} className="text-indigo-600" /> 2. Client Company & Shareholder Link (Article 9000231133)
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Linked Client Company (Ltd, LLP, Partnership)
                </label>
                <select
                  value={contactForm.clientId}
                  onChange={(e) => setContactForm({ ...contactForm, clientId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  <option value="">— Unassigned (Standalone Global Contact) —</option>
                  {clientsList.map((cl) => (
                    <option key={cl.id} value={String(cl.id)}>
                      {cl.clientName} ({cl.clientCode || `CL${cl.id}`} - {cl.clientType})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select which client company this individual is an officer, shareholder, or primary contact for.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shareholding Percentage (%)</label>
                  <input
                    type="text"
                    value={contactForm.extra.sharePercent}
                    onChange={(e) => setContactForm({ ...contactForm, extra: { ...contactForm.extra, sharePercent: e.target.value } })}
                    placeholder="e.g. 50"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Share Class</label>
                  <select
                    value={contactForm.extra.shareClass}
                    onChange={(e) => setContactForm({ ...contactForm, extra: { ...contactForm.extra, shareClass: e.target.value } })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Ordinary">Ordinary Shares (£1)</option>
                    <option value="Ordinary A">Ordinary A Shares</option>
                    <option value="Ordinary B">Ordinary B Shares</option>
                    <option value="Preference">Preference Shares</option>
                    <option value="Non-Voting">Non-Voting Shares</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50/50 border border-purple-100 rounded-xl space-y-1 text-xs text-purple-900">
                <p className="font-bold flex items-center gap-1">
                  <Shield size={14} className="text-purple-600" /> Automatic Company Secretarial Sync
                </p>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Linked directors and shareholders are automatically synchronized with statutory accounts disclosures and confirmation statements.
                </p>
              </div>
            </div>

            {/* CARD 3: COMMUNICATION & CONTACT DETAILS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Mail size={16} className="text-emerald-600" /> 3. Communication Channels
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Email Address</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="contact@company.co.uk"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone / Mobile No</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="e.g. 07700 900123"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: ADDRESS PARTICULARS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin size={16} className="text-amber-600" /> 4. Residential / Service Address
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line</label>
                <input
                  type="text"
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  placeholder="e.g. 100 London Wall"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    value={contactForm.city}
                    onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                    placeholder="London"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={contactForm.postcode}
                    onChange={(e) => setContactForm({ ...contactForm, postcode: e.target.value })}
                    placeholder="EC2M 5QQ"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={contactForm.country}
                    onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setView("list");
                setSelectedContact(null);
              }}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Cancel & Return
            </button>

            <button
              type="button"
              onClick={() => saveContactMutation.mutate()}
              disabled={saveContactMutation.isPending}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>{saveContactMutation.isPending ? "Saving..." : contactForm.id ? "Save Changes" : "Create Contact"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: DEDICATED FULL-PAGE CSV IMPORTER (No Modal!)      */}
      {/* ========================================================= */}
      {view === "import" && (
        <div className="space-y-6 w-full animate-in fade-in">
          {/* Top Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("list")}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft size={16} />
                <span>Back to Contacts Directory</span>
              </button>

              <div className="h-6 w-px bg-slate-200" />

              <div>
                <h2 className="text-base font-bold text-slate-900">Bulk Contacts Import Wizard</h2>
                <p className="text-xs text-slate-500">Import your practice contacts & shareholder links from CSV or Excel file.</p>
              </div>
            </div>
          </div>

          {/* Stepper Progress Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 1 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                1. Download Template
              </div>
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 2 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                2. Upload / Paste CSV
              </div>
              <div className={`flex-1 py-3 px-4 text-center border-b-2 ${importStep === 3 ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-slate-400"}`}>
                3. Validation & Import
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* STEP 1: DOWNLOAD TEMPLATE */}
              {importStep === 1 && (
                <div className="space-y-6 max-w-3xl">
                  <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                    <h4 className="text-sm font-bold text-purple-950">Step 1: Download & Populate Contacts Template</h4>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Download the official SanSuite contacts CSV template. Fill out the officers, shareholders, and contact particulars before uploading.
                    </p>
                    <button
                      onClick={handleDownloadCsvTemplate}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Download size={15} /> Download Sample Contacts CSV Template
                    </button>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                    <h5 className="font-bold text-slate-800">CSV Import Requirements (Article 9000231556):</h5>
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                      <li>Ensure <strong>Prefix</strong> (e.g. Mr, Mrs, Dr) is included.</li>
                      <li>Ensure <strong>First Name</strong> and <strong>Last Name</strong> are provided.</li>
                      <li>Contact Type must be one of: <code>Director</code>, <code>Shareholder</code>, <code>Client</code>, <code>Lead</code>, <code>Supplier</code>, <code>Staff</code>, <code>Accountant</code>, <code>Other</code>.</li>
                      <li>Provide <strong>Linked Client Code</strong> (e.g. <code>CL001</code>) to link the contact to a client company automatically.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                    >
                      Continue to Step 2 &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: UPLOAD / PASTE CSV */}
              {importStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Paste CSV Content with Headers:
                    </label>
                    <textarea
                      rows={10}
                      value={csvText}
                      onChange={(e) => handleParseCsv(e.target.value)}
                      placeholder="Paste CSV lines here with headers..."
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setImportStep(1)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      &larr; Back
                    </button>

                    <button
                      onClick={() => {
                        if (parsedCsvContacts.length === 0) {
                          toast({ title: "No Contacts Parsed", description: "Please paste valid CSV data.", variant: "destructive" });
                          return;
                        }
                        setImportStep(3);
                      }}
                      disabled={parsedCsvContacts.length === 0}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                    >
                      Preview {parsedCsvContacts.length} Contacts &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: VALIDATION PREVIEW & IMPORT */}
              {importStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">
                      Validated Contacts Preview ({parsedCsvContacts.length} records ready to import):
                    </h4>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={15} /> All formats validated
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="SanSuite-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Type</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Linked Client</th><th>Share %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsvContacts.map((item, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{item.type}</td>
                            <td className="font-bold">{item.prefix} {item.firstName} {item.lastName}</td>
                            <td className="text-xs">{item.email || "—"}</td>
                            <td className="text-xs font-mono">{item.phoneNo || "—"}</td>
                            <td className="font-mono text-purple-700">{item.linkedClientCode || "Unassigned"}</td>
                            <td className="font-mono">{item.sharePercent ? `${item.sharePercent}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setImportStep(2)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      &larr; Back to Paste
                    </button>

                    <button
                      onClick={() => bulkImportMutation.mutate(parsedCsvContacts)}
                      disabled={bulkImportMutation.isPending}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      {bulkImportMutation.isPending ? "Importing..." : `Import ${parsedCsvContacts.length} Contacts Now`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
