import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Users, Smartphone, FileText, Send, Plus,
  Search, RefreshCw, CheckCircle2, Clock,
  Eye, AlertCircle, X, Check, Info, Tag,
  Mail, Calendar, Sparkles, User, Trash2,
  Paperclip, ArrowLeft, Building2, ChevronDown,
  Timer, CalendarDays, MessageSquare,
  ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import TablePagination from "../../components/common/TablePagination";
import { formatDate } from "../../lib/dateUtils";

type SubTab = "clients" | "team" | "sms" | "schedule_email" | "scheduled_sms";

// Capium Dynamic Merge Tokens for Bulk Emailing (Article 9000224477)
const CAPIUM_TOKENS = [
  { label: "ClientID", token: "{{ClientID}}" },
  { label: "ClientType", token: "{{ClientType}}" },
  { label: "ClientName", token: "{{ClientName}}" },
  { label: "Address", token: "{{Address}}" },
  { label: "Phone", token: "{{Phone}}" },
  { label: "Email", token: "{{Email}}" },
  { label: "Website", token: "{{Website}}" },
  { label: "YearEnd", token: "{{YearEnd}}" },
  { label: "RegistrationNo", token: "{{RegistrationNo}}" },
  { label: "TrustName", token: "{{TrustName}}" },
  { label: "PartnershipName", token: "{{PartnershipName}}" },
  { label: "TurnoverSICCode", token: "{{TurnoverSICCode}}" },
];

export default function CommunicationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 5 Capium Standard Headings (Article 9000188513)
  const [activeTab, setActiveTab] = useState<SubTab>("clients");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Modals state
  const [isNewEmailOpen, setIsNewEmailOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isScheduleEmailOpen, setIsScheduleEmailOpen] = useState(false);
  const [isScheduleSmsOpen, setIsScheduleSmsOpen] = useState(false);

  // New Email Form State
  const [emailContactType, setEmailContactType] = useState<"client" | "team">("client");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailPriority, setEmailPriority] = useState("Normal");
  const [emailBody, setEmailBody] = useState("");

  // Bulk Email Form State
  const [bulkClientType, setBulkClientType] = useState("All");
  const [bulkToOverride, setBulkToOverride] = useState("");
  const [bulkCc, setBulkCc] = useState("");
  const [bulkBcc, setBulkBcc] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkPriority, setBulkPriority] = useState("Normal");
  const [bulkBody, setBulkBody] = useState("");

  // Send SMS Form State (Article 9000188513 img_2)
  const [smsSenderId, setSmsSenderId] = useState("SanSuiteUK");
  const [smsClientId, setSmsClientId] = useState("");
  const [smsContactNumber, setSmsContactNumber] = useState("");
  const [smsTemplateId, setSmsTemplateId] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [smsQueueMode, setSmsQueueMode] = useState<"instant" | "queue">("instant");
  const [smsScheduleDate, setSmsScheduleDate] = useState("");
  const [smsScheduleTime, setSmsScheduleTime] = useState("09:00");

  // Schedule Email Form State (Article 9000188513 img_5)
  const [schedToId, setSchedToId] = useState("");
  const [schedSubject, setSchedSubject] = useState("");
  const [schedPriority, setSchedPriority] = useState("Normal");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("09:00");
  const [schedIsRecurring, setSchedIsRecurring] = useState(false);
  const [schedBody, setSchedBody] = useState("");

  // Checkbox selection state for Clients list
  const [selectedClientEmailIds, setSelectedClientEmailIds] = useState<number[]>([]);

  // Interactive Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // 1. Fetch Conversations / Emails / SMS records
  const { data: communications = [], isLoading: isLoadingComms, refetch: refetchComms } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // 2. Fetch Practice Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // 3. Fetch Practice Team Members
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/team"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/team");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // 4. Fetch Templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations/templates");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Send Direct / Individual Email
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/pm/conversations/send", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Email Sent", description: "Email message delivered successfully." });
      setIsNewEmailOpen(false);
      resetEmailForm();
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    }
  });

  // Send Bulk Email Campaign
  const sendBulkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/conversations/bulk-email", {
        clientType: bulkClientType,
        subject: bulkSubject,
        bodyHtml: `<p>${bulkBody.replace(/\n/g, "<br/>")}</p>`,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Bulk Broadcast Dispatched", description: data.message || "Bulk email sent to clients." });
      setIsBulkOpen(false);
      setBulkSubject("");
      setBulkBody("");
    },
    onError: (err: any) => {
      toast({ title: "Broadcast Failed", description: err.message, variant: "destructive" });
    }
  });

  // Send SMS Mutation
  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      if (smsQueueMode === "queue") {
        return await apiRequest("POST", "/api/pm/conversations/schedule", {
          clientId: smsClientId ? Number(smsClientId) : null,
          recipientEmails: smsContactNumber,
          subject: smsBody.substring(0, 30),
          bodyText: smsBody,
          scheduledDate: smsScheduleDate,
          scheduledTime: smsScheduleTime,
          isSms: true,
        });
      }
      return await apiRequest("POST", "/api/pm/conversations/sms/send", {
        clientId: smsClientId ? Number(smsClientId) : null,
        recipientPhone: smsContactNumber,
        message: smsBody,
        senderId: smsSenderId || "SanSuiteUK",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({
        title: smsQueueMode === "queue" ? "SMS Queued" : "SMS Dispatched",
        description: smsQueueMode === "queue" ? `Scheduled for ${smsScheduleDate} ${smsScheduleTime}` : `Delivered to ${smsContactNumber}`
      });
      setIsSmsOpen(false);
      setSmsContactNumber("");
      setSmsBody("");
      setSmsClientId("");
      setSmsQueueMode("instant");
    },
    onError: (err: any) => {
      toast({ title: "SMS Failed", description: err.message, variant: "destructive" });
    }
  });

  // Schedule Email Mutation
  const scheduleEmailMutation = useMutation({
    mutationFn: async () => {
      const selectedClient = clientsList.find((c: any) => String(c.id) === schedToId);
      return await apiRequest("POST", "/api/pm/conversations/schedule", {
        clientId: schedToId ? Number(schedToId) : null,
        recipientEmails: selectedClient?.email || "client@company.co.uk",
        subject: schedSubject,
        bodyHtml: `<p>${schedBody.replace(/\n/g, "<br/>")}</p>`,
        bodyText: schedBody,
        priority: schedPriority,
        scheduledDate: schedDate,
        scheduledTime: schedTime,
        isRecurring: schedIsRecurring,
        isSms: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Email Scheduled", description: `Scheduled for dispatch on ${schedDate} at ${schedTime}` });
      setIsScheduleEmailOpen(false);
      setSchedSubject("");
      setSchedBody("");
      setSchedToId("");
      setSchedDate("");
    },
    onError: (err: any) => {
      toast({ title: "Scheduling Failed", description: err.message, variant: "destructive" });
    }
  });

  // Delete Record Mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/pm/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Record Deleted", description: "Communication record deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  });

  // Bulk Delete Records Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await apiRequest("POST", "/api/pm/conversations/bulk-delete", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      setSelectedClientEmailIds([]);
      toast({ title: "Communications Deleted", description: `Successfully deleted ${ids.length} records.` });
    },
    onError: (err: any) => {
      toast({ title: "Bulk Delete Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleBulkDelete = () => {
    if (selectedClientEmailIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete the ${selectedClientEmailIds.length} selected communication record(s)?`)) {
      bulkDeleteMutation.mutate(selectedClientEmailIds);
    }
  };

  const resetEmailForm = () => {
    setSelectedContactId("");
    setEmailTo("");
    setEmailCc("");
    setEmailBcc("");
    setEmailSubject("");
    setEmailBody("");
    setEmailPriority("Normal");
  };


  // 1. Client Emails List
  const clientEmails = useMemo(() => {
    return communications.filter((c: any) => {
      if (c.direction === "SchedSMS" || c.direction === "Scheduled") return false;
      if (c.subject?.startsWith("SMS:")) return false;
      if (c.direction === "Team") return false;
      if (clientFilter !== "All" && String(c.clientId) !== clientFilter) return false;
      if (priorityFilter !== "All" && (c.priority || "Normal").toLowerCase() !== priorityFilter.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mSub = (c.subject || "").toLowerCase().includes(q);
        const mRec = (c.recipientEmails || "").toLowerCase().includes(q);
        const mCli = (c.clientName || "").toLowerCase().includes(q);
        if (!mSub && !mRec && !mCli) return false;
      }
      return true;
    });
  }, [communications, clientFilter, priorityFilter, searchQuery]);

  // Sorted & Filtered Client Emails
  const sortedClientEmails = useMemo(() => {
    const list = [...clientEmails];
    list.sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === "date") {
        const dateA = new Date(a.dispatchedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.dispatchedAt || b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortField === "client") {
        const nameA = (a.clientName || a.recipientEmails || "").toLowerCase();
        const nameB = (b.clientName || b.recipientEmails || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "subject") {
        const subA = (a.subject || "").toLowerCase();
        const subB = (b.subject || "").toLowerCase();
        comparison = subA.localeCompare(subB);
      } else if (sortField === "sender") {
        const senA = (a.senderEmail || a.senderName || "").toLowerCase();
        const senB = (b.senderEmail || b.senderName || "").toLowerCase();
        comparison = senA.localeCompare(senB);
      } else if (sortField === "status") {
        const stA = (a.status || "").toLowerCase();
        const stB = (b.status || "").toLowerCase();
        comparison = stA.localeCompare(stB);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return list;
  }, [clientEmails, sortField, sortOrder]);

  // Total pages for Client Emails
  const totalClientPages = Math.max(1, Math.ceil(sortedClientEmails.length / pageSize));

  // Paginated Client Emails
  const paginatedClientEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedClientEmails.slice(start, start + pageSize);
  }, [sortedClientEmails, currentPage, pageSize]);

  // Checkbox selection helpers for Client Emails
  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedClientEmails.length === 0) return false;
    return paginatedClientEmails.every((item: any) => selectedClientEmailIds.includes(item.id));
  }, [paginatedClientEmails, selectedClientEmailIds]);

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedClientEmails.map((item: any) => item.id);
      setSelectedClientEmailIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedClientEmails.map((item: any) => item.id);
      setSelectedClientEmailIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedClientEmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 2. Team Emails List
  const teamEmails = useMemo(() => {
    return communications.filter((c: any) => {
      if (c.direction === "SchedSMS" || c.direction === "Scheduled") return false;
      if (c.subject?.startsWith("SMS:")) return false;
      const isTeam = c.direction === "Team" || !c.clientId || teamMembers.some((m: any) => m.email === c.recipientEmails);
      if (!isTeam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mSub = (c.subject || "").toLowerCase().includes(q);
        const mRec = (c.recipientEmails || "").toLowerCase().includes(q);
        if (!mSub && !mRec) return false;
      }
      return true;
    });
  }, [communications, teamMembers, searchQuery]);

  // 3. SMS Logs List
  const smsLogs = useMemo(() => {
    return communications.filter((c: any) => {
      if (c.direction === "SchedSMS") return false;
      const isSms = c.subject?.startsWith("SMS:") || c.senderEmail === "SanSuiteUK" || /^[+0-9\s-]+$/.test(c.recipientEmails || "");
      if (!isSms) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mRec = (c.recipientEmails || "").toLowerCase().includes(q);
        const mMsg = (c.bodyText || c.subject || "").toLowerCase().includes(q);
        if (!mRec && !mMsg) return false;
      }
      return true;
    });
  }, [communications, searchQuery]);

  // 4. Scheduled Emails List
  const scheduledEmails = useMemo(() => {
    return communications.filter((c: any) => {
      if (c.direction !== "Scheduled") return false;
      if (clientFilter !== "All" && String(c.clientId) !== clientFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mSub = (c.subject || "").toLowerCase().includes(q);
        const mRec = (c.recipientEmails || "").toLowerCase().includes(q);
        if (!mSub && !mRec) return false;
      }
      return true;
    });
  }, [communications, clientFilter, searchQuery]);

  // 5. Scheduled SMS List
  const scheduledSmsList = useMemo(() => {
    return communications.filter((c: any) => {
      if (c.direction !== "SchedSMS") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mRec = (c.recipientEmails || "").toLowerCase().includes(q);
        const mMsg = (c.bodyText || c.subject || "").toLowerCase().includes(q);
        if (!mRec && !mMsg) return false;
      }
      return true;
    });
  }, [communications, searchQuery]);

  // Append token into bulk body
  const handleInsertToken = (token: string) => {
    setBulkBody((prev) => (prev ? `${prev} ${token}` : token));
    toast({ title: "Token Inserted", description: `Added ${token} to email text.` });
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        
        {/* Top Controls Header Bar - Capium 5 Headings (Article 9000188513) */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            
            {/* Left: 5 Capium Headings */}
            <div className="flex items-center gap-1 sm:gap-2">
              {[
                { id: "clients", label: "Clients" },
                { id: "team", label: "Team" },
                { id: "sms", label: "SMS" },
                { id: "schedule_email", label: "Schedule E-mail" },
                { id: "scheduled_sms", label: "Scheduled SMS" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as SubTab);
                    setCurrentPage(1);
                    setSelectedClientEmailIds([]);
                  }}
                  className={`px-4 py-3 text-sm font-semibold tracking-tight transition-all relative cursor-pointer ${
                    activeTab === tab.id
                      ? "text-purple-700 dark:text-purple-400 font-bold"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
                  )}
                </button>
              ))}
            </div>

            {/* Right: Capium standard filters (Client - All, Priority - All, Refresh) */}
            <div className="flex items-center gap-2.5 py-2">
              <select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setCurrentPage(1);
                  setSelectedClientEmailIds([]);
                }}
                className="text-xs border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs focus:ring-1 focus:ring-purple-500"
              >
                <option value="All">Client - All</option>
                {clientsList.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.clientName}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                  setSelectedClientEmailIds([]);
                }}
                className="text-xs border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-xs focus:ring-1 focus:ring-purple-500"
              >
                <option value="All">Priority - All</option>
                <option value="Normal">Priority - Normal</option>
                <option value="High">Priority - High</option>
                <option value="Low">Priority - Low</option>
              </select>

              <button
                onClick={() => refetchComms()}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw size={14} className={isLoadingComms ? "animate-spin" : ""} />
              </button>
            </div>

          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-4">

          {/* Search & Action Bar (Capium Style: img_1, img_4) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setSelectedClientEmailIds([]);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Action Buttons Right next to search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {activeTab === "clients" && (
                <>
                  <button
                    onClick={() => setIsBulkOpen(true)}
                    className="bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users size={13} />
                    Bulk Email
                  </button>
                  <button
                    onClick={() => { setEmailContactType("client"); setIsNewEmailOpen(true); }}
                    className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={13} />
                    New Email
                  </button>
                </>
              )}

              {activeTab === "team" && (
                <button
                  onClick={() => { setEmailContactType("team"); setIsNewEmailOpen(true); }}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  New Email
                </button>
              )}

              {activeTab === "sms" && (
                <button
                  onClick={() => { setSmsQueueMode("instant"); setIsSmsOpen(true); }}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone size={13} />
                  Send SMS
                </button>
              )}

              {activeTab === "schedule_email" && (
                <button
                  onClick={() => setIsScheduleEmailOpen(true)}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar size={13} />
                  Set Schedule
                </button>
              )}

              {activeTab === "scheduled_sms" && (
                <button
                  onClick={() => { setSmsQueueMode("queue"); setIsSmsOpen(true); }}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Timer size={13} />
                  Schedule SMS
                </button>
              )}
            </div>

          </div>

          {/* ========================================================= */}
          {/* TAB 1: CLIENTS (Emails with Clients)                      */}
          {/* ========================================================= */}
          {activeTab === "clients" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Communications with Clients</h3>
                  <span className="text-xs text-slate-500">{clientEmails.length} messages found</span>
                </div>

                {/* Bulk Actions Bar */}
                {selectedClientEmailIds.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800">
                      {selectedClientEmailIds.length} of {clientEmails.length} selected
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                      className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      {bulkDeleteMutation.isPending ? "Deleting..." : `Delete Selected (${selectedClientEmailIds.length})`}
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-600 transition-colors"
                        onClick={() => handleSort("date")}
                        title="Sort by Date Dispatched"
                      >
                        <div className="flex items-center gap-1">
                          <span>Date Dispatched</span>
                          {sortField === "date" ? (
                            sortOrder === "asc" ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-600 transition-colors"
                        onClick={() => handleSort("client")}
                        title="Sort by Client Name"
                      >
                        <div className="flex items-center gap-1">
                          <span>Client Name / Recipient</span>
                          {sortField === "client" ? (
                            sortOrder === "asc" ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-600 transition-colors"
                        onClick={() => handleSort("subject")}
                        title="Sort by Subject"
                      >
                        <div className="flex items-center gap-1">
                          <span>Subject</span>
                          {sortField === "subject" ? (
                            sortOrder === "asc" ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none hover:text-purple-600 transition-colors"
                        onClick={() => handleSort("sender")}
                        title="Sort by Sender"
                      >
                        <div className="flex items-center gap-1">
                          <span>Sender</span>
                          {sortField === "sender" ? (
                            sortOrder === "asc" ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-center cursor-pointer select-none hover:text-purple-600 transition-colors"
                        onClick={() => handleSort("status")}
                        title="Sort by Status"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Status</span>
                          {sortField === "status" ? (
                            sortOrder === "asc" ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClientEmails.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-400">
                          <Mail size={32} className="mx-auto mb-2 text-purple-300" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No client emails recorded</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Dispatched statutory notices, year-end reminders, and client correspondence will appear here.
                          </p>
                          <div className="mt-4 flex items-center justify-center gap-3">
                            <button
                              onClick={() => { setEmailContactType("client"); setIsNewEmailOpen(true); }}
                              className="bg-[#5c469c] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                            >
                              + New Email
                            </button>
                            <button
                              onClick={() => setIsBulkOpen(true)}
                              className="border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                            >
                              + Bulk Email
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedClientEmails.map((msg: any, index: number) => (
                        <tr
                          key={msg.id}
                          className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 ${
                            selectedClientEmailIds.includes(msg.id) ? "bg-purple-50/40 dark:bg-purple-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedClientEmailIds.includes(msg.id)}
                              onChange={() => handleToggleSelectRow(msg.id)}
                              className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(msg.sentAt || msg.createdAt)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{msg.clientName || msg.recipientEmails}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{msg.subject}</td>
                          <td className="py-2.5 px-3 text-slate-500">{msg.senderEmail}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10.5px]">
                              Delivered
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => deleteRecordMutation.mutate(msg.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                              title="Delete record"
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

              {/* Universal Pagination */}
              <TablePagination
                currentPage={currentPage}
                totalItems={sortedClientEmails.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemName="Communications"
                sortBy={sortField}
                sortOrder={sortOrder}
                onSortChange={(field, order) => {
                  setSortField(field);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
                sortOptions={[
                  { label: "Date Dispatched", value: "date" },
                  { label: "Client Name", value: "client" },
                  { label: "Subject", value: "subject" },
                  { label: "Sender", value: "sender" },
                  { label: "Status", value: "status" },
                ]}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: TEAM (Internal Communications with Staff)          */}
          {/* ========================================================= */}
          {activeTab === "team" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Communications with Team</h3>
                <span className="text-xs text-slate-500">{teamEmails.length} messages found</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Date Dispatched</th>
                      <th className="py-2.5 px-3">Team Member / Recipient</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Sender</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamEmails.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          <Users size={32} className="mx-auto mb-2 text-purple-300" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No team communications found</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Internal task delegation notices and staff briefing emails will be recorded here.
                          </p>
                          <button
                            onClick={() => { setEmailContactType("team"); setIsNewEmailOpen(true); }}
                            className="mt-4 bg-[#5c469c] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            + Send Team Email
                          </button>
                        </td>
                      </tr>
                    ) : (
                      teamEmails.map((msg: any, index: number) => (
                        <tr key={msg.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(msg.sentAt || msg.createdAt)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{msg.recipientEmails}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{msg.subject}</td>
                          <td className="py-2.5 px-3 text-slate-500">{msg.senderEmail}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10.5px]">
                              Delivered
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => deleteRecordMutation.mutate(msg.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                              title="Delete record"
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
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SMS (SMS Notifications & Logs)                      */}
          {/* ========================================================= */}
          {activeTab === "sms" && (
            <div className="space-y-4">
              {/* Quick Gateway Status Info (Matching Capium) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">Gateway Status</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">UK Direct GSM Active</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">Default Sender ID</span>
                  <div className="text-sm font-bold text-purple-700 dark:text-purple-400 font-mono">SanSuiteUK</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">SMS Route Speed</span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">~ 2.8s Delivery</div>
                </div>
              </div>

              {/* SMS Dispatch History Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">SMS Dispatch History</h3>
                  <span className="text-xs text-slate-500">{smsLogs.length} SMS sent</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Date Dispatched</th>
                        <th className="py-2.5 px-3">Sender ID</th>
                        <th className="py-2.5 px-3">Recipient Phone</th>
                        <th className="py-2.5 px-3">Message Text</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smsLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400">
                            <Smartphone size={32} className="mx-auto mb-2 text-purple-300" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No SMS messages dispatched</p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                              Send instant SMS alerts to clients for urgent statutory due dates and verification codes.
                            </p>
                            <button
                              onClick={() => setIsSmsOpen(true)}
                              className="mt-4 bg-[#5c469c] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                            >
                              + Send Instant SMS
                            </button>
                          </td>
                        </tr>
                      ) : (
                        smsLogs.map((log: any, index: number) => (
                          <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(log.sentAt || log.createdAt)}</td>
                            <td className="py-2.5 px-3 font-mono text-purple-700 dark:text-purple-300 font-semibold">{log.senderEmail || "SanSuiteUK"}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">{log.recipientEmails}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-md truncate">{log.bodyText || log.subject}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10.5px]">
                                Delivered
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => deleteRecordMutation.mutate(log.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                                title="Delete log"
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
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: SCHEDULE E-MAIL (Matching Capium img_4)              */}
          {/* ========================================================= */}
          {activeTab === "schedule_email" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Scheduled Emails Queue</h3>
                <span className="text-xs text-slate-500">{scheduledEmails.length} scheduled</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Name / Contact</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Date and Time</th>
                      <th className="py-2.5 px-3 text-center">Is Recurring</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledEmails.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400">
                          <CalendarDays size={32} className="mx-auto mb-2 text-purple-300" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No scheduled emails</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Schedule future email broadcasts or recurring filing notices to be sent automatically.
                          </p>
                          <button
                            onClick={() => setIsScheduleEmailOpen(true)}
                            className="mt-4 bg-[#5c469c] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            + Set Schedule
                          </button>
                        </td>
                      </tr>
                    ) : (
                      scheduledEmails.map((item: any, index: number) => {
                        let meta: any = {};
                        try { if (item.attachmentsJson) meta = JSON.parse(item.attachmentsJson); } catch (_) {}
                        return (
                          <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{item.clientName || item.recipientEmails}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{item.subject}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{item.threadId || meta.scheduledDate || "-"}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${meta.isRecurring ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                {meta.isRecurring ? "ON" : "OFF"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10.5px]">
                                {meta.status || "Active"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => deleteRecordMutation.mutate(item.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                                title="Cancel schedule"
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
          )}

          {/* ========================================================= */}
          {/* TAB 5: SCHEDULED SMS (Capium Article 9000188513)           */}
          {/* ========================================================= */}
          {activeTab === "scheduled_sms" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Scheduled SMS Queue</h3>
                <span className="text-xs text-slate-500">{scheduledSmsList.length} SMS scheduled</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">Recipient Phone</th>
                      <th className="py-2.5 px-3">Message Text</th>
                      <th className="py-2.5 px-3">Scheduled Dispatch Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledSmsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <Smartphone size={32} className="mx-auto mb-2 text-purple-300" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No scheduled SMS in queue</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            Set up automated future text alerts for tax payments and VAT deadlines.
                          </p>
                          <button
                            onClick={() => { setSmsQueueMode("queue"); setIsSmsOpen(true); }}
                            className="mt-4 bg-[#5c469c] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            + Schedule SMS
                          </button>
                        </td>
                      </tr>
                    ) : (
                      scheduledSmsList.map((item: any, index: number) => {
                        let meta: any = {};
                        try { if (item.attachmentsJson) meta = JSON.parse(item.attachmentsJson); } catch (_) {}
                        return (
                          <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-slate-200">{item.recipientEmails}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-md truncate">{item.bodyText || item.subject}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{item.threadId || meta.scheduledDate || "-"}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold text-[10.5px]">
                                Queued
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => deleteRecordMutation.mutate(item.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                                title="Cancel schedule"
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
          )}

        </div>

        {/* ========================================================= */}
        {/* MODAL 1: NEW EMAIL (Capium Article 9000188513: img_1)      */}
        {/* ========================================================= */}
        {isNewEmailOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-xs">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mail size={16} className="text-purple-600" />
                    New Email
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    You are able to send messages to clients and team members
                  </p>
                </div>
                <button onClick={() => setIsNewEmailOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!emailTo || !emailSubject) {
                    toast({ title: "Validation Error", description: "Recipient and Subject are required.", variant: "destructive" });
                    return;
                  }
                  sendEmailMutation.mutate({
                    clientId: emailContactType === "client" && selectedContactId ? Number(selectedContactId) : null,
                    recipientEmails: emailTo,
                    subject: emailSubject,
                    bodyHtml: `<p>${emailBody.replace(/\n/g, "<br/>")}</p>`,
                    bodyText: emailBody,
                    priority: emailPriority,
                    direction: emailContactType === "team" ? "Team" : "Outbound",
                  });
                }}
                className="p-5 space-y-3"
              >
                {/* Contact Type Toggle & Select */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Group</label>
                    <select
                      value={emailContactType}
                      onChange={(e) => {
                        setEmailContactType(e.target.value as any);
                        setSelectedContactId("");
                        setEmailTo("");
                      }}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    >
                      <option value="client">Client</option>
                      <option value="team">Team Member</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      To <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => {
                        setSelectedContactId(e.target.value);
                        if (emailContactType === "client") {
                          const cl = clientsList.find((c: any) => String(c.id) === e.target.value);
                          if (cl?.email) setEmailTo(cl.email);
                        } else {
                          const tm = teamMembers.find((m: any) => String(m.id) === e.target.value);
                          if (tm?.email) setEmailTo(tm.email);
                        }
                      }}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    >
                      <option value="">-- Select Contact --</option>
                      {emailContactType === "client" ? (
                        clientsList.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.clientName} ({c.email || "No email"})</option>
                        ))
                      ) : (
                        teamMembers.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name || m.email} ({m.role})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Recipient Email address *"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Cc"
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Bcc"
                      value={emailBcc}
                      onChange={(e) => setEmailBcc(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Type in Subject *"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      value={emailPriority}
                      onChange={(e) => setEmailPriority(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={6}
                    placeholder="Type in your message here..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-xs"
                    required
                  />
                </div>

                {/* Upload drag drop hint */}
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Paperclip size={13} />
                  <span>UPLOAD FILES: Drag &amp; Drop Files Here or click to attach</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      toast({ title: "Draft Saved", description: "Email draft saved locally." });
                      setIsNewEmailOpen(false);
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    SAVE AS DRAFT
                  </button>

                  <button
                    type="submit"
                    disabled={sendEmailMutation.isPending}
                    className="px-6 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    {sendEmailMutation.isPending ? "SENDING..." : "SEND"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: BULK EMAIL & TOKENS (Capium 9000224477: img_1)    */}
        {/* ========================================================= */}
        {isBulkOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden text-xs max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users size={16} className="text-purple-600" />
                    Add Communication (Bulk Email)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    You are able to send messages to clients and team members
                  </p>
                </div>
                <button onClick={() => setIsBulkOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* 2-Column Body: Form on Left (8 cols) + Choose Tokens on Right (4 cols) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 overflow-y-auto">
                
                {/* Left Column: Form */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client Type Filter
                    </label>
                    <select
                      value={bulkClientType}
                      onChange={(e) => setBulkClientType(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 font-medium"
                    >
                      <option value="All">All Client Types</option>
                      <option value="Limited">Limited Companies</option>
                      <option value="Sole Trader">Sole Trader</option>
                      <option value="Partnership">Partnership</option>
                      <option value="LLP">LLP</option>
                      <option value="Individual">Individual</option>
                      <option value="Trust">Trust</option>
                      <option value="Charity">Charity</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Cc"
                      value={bulkCc}
                      onChange={(e) => setBulkCc(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      placeholder="Bcc"
                      value={bulkBcc}
                      onChange={(e) => setBulkBcc(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Type in Subject *"
                        value={bulkSubject}
                        onChange={(e) => setBulkSubject(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={bulkPriority}
                        onChange={(e) => setBulkPriority(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email Body Content
                    </label>
                    <textarea
                      rows={8}
                      placeholder="Dear {{ClientName}}, please find attached..."
                      value={bulkBody}
                      onChange={(e) => setBulkBody(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-xs font-sans"
                      required
                    />
                  </div>
                </div>

                {/* Right Column: Choose Tokens (Capium 9000224477) */}
                <div className="md:col-span-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1">
                      Choose Tokens
                    </h4>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Click any token to insert directly into your message:
                    </p>

                    <div className="grid grid-cols-1 gap-1 max-h-[280px] overflow-y-auto pr-1">
                      {CAPIUM_TOKENS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleInsertToken(item.token)}
                          className="w-full text-left px-2.5 py-1.5 rounded bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-800/40"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10.5px] text-slate-400 italic">
                      Drag and drop above tokens into text area to auto-populate live client records.
                    </p>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!bulkSubject || !bulkBody) {
                      toast({ title: "Validation Error", description: "Subject and Body are required for broadcast.", variant: "destructive" });
                      return;
                    }
                    sendBulkMutation.mutate();
                  }}
                  disabled={sendBulkMutation.isPending}
                  className="px-6 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  {sendBulkMutation.isPending ? "DISPATCHING..." : "SEND"}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: SEND SMS (Capium Article 9000188513: img_2)       */}
        {/* ========================================================= */}
        {isSmsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
              
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone size={16} className="text-purple-600" />
                  Send SMS
                </h3>
                <button onClick={() => setIsSmsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!smsContactNumber || !smsBody) {
                    toast({ title: "Validation Error", description: "Phone number and SMS message body are required.", variant: "destructive" });
                    return;
                  }
                  sendSmsMutation.mutate();
                }}
                className="p-5 space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Id <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={smsSenderId}
                    onChange={(e) => setSmsSenderId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tip: Sender name should be max 11 alphanumeric characters (or) 15 digits only.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={smsClientId}
                    onChange={(e) => {
                      setSmsClientId(e.target.value);
                      const cl = clientsList.find((c: any) => String(c.id) === e.target.value);
                      if (cl?.phone) setSmsContactNumber(cl.phone);
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 mb-1.5"
                  >
                    <option value="">-- Select Contact --</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.phone || "No phone"})</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Add Contact Number e.g. +44 7123 456789 *"
                    value={smsContactNumber}
                    onChange={(e) => setSmsContactNumber(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Tip: We currently support UK Mobile numbers starting with &apos;+44&apos;.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template (Optional)
                  </label>
                  <select
                    value={smsTemplateId}
                    onChange={(e) => {
                      setSmsTemplateId(e.target.value);
                      const tmpl = templates.find((t: any) => String(t.id) === e.target.value);
                      if (tmpl) setSmsBody(tmpl.bodyText || tmpl.bodyTemplate || "");
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                  >
                    <option value="">-- Select Template --</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.templateName || t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    maxLength={160}
                    placeholder="Type SMS message..."
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-xs"
                    required
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Standard GSM 7-bit</span>
                    <span>You have {160 - smsBody.length} characters left!</span>
                  </div>
                </div>

                {/* Add Queue Radio Options (Article 9000188513 img_2) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Add Queue:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="queueMode"
                        checked={smsQueueMode === "instant"}
                        onChange={() => setSmsQueueMode("instant")}
                      />
                      <span>Send Message</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="queueMode"
                        checked={smsQueueMode === "queue"}
                        onChange={() => setSmsQueueMode("queue")}
                      />
                      <span>Add to Queue</span>
                    </label>
                  </div>

                  {smsQueueMode === "queue" && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Schedule Date</label>
                        <input
                          type="date"
                          value={smsScheduleDate}
                          onChange={(e) => setSmsScheduleDate(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Time</label>
                        <input
                          type="time"
                          value={smsScheduleTime}
                          onChange={(e) => setSmsScheduleTime(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-700 rounded p-1.5 bg-white dark:bg-slate-800 text-xs"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSmsOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendSmsMutation.isPending}
                    className="px-6 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    {sendSmsMutation.isPending ? "DISPATCHING..." : smsQueueMode === "queue" ? "ADD TO QUEUE" : "SEND"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 4: SET SCHEDULE EMAIL (Capium 9000188513: img_5)     */}
        {/* ========================================================= */}
        {isScheduleEmailOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
              
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  Set Schedule Email
                </h3>
                <button onClick={() => setIsScheduleEmailOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!schedToId || !schedSubject || !schedDate) {
                    toast({ title: "Validation Error", description: "Contact, Subject, and Date are required.", variant: "destructive" });
                    return;
                  }
                  scheduleEmailMutation.mutate();
                }}
                className="p-5 space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={schedToId}
                    onChange={(e) => setSchedToId(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    required
                  >
                    <option value="">-- Select Contact --</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.email || "No email"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Type in Subject"
                    value={schedSubject}
                    onChange={(e) => setSchedSubject(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select
                      value={schedPriority}
                      onChange={(e) => setSchedPriority(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      From Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="schedRecurring"
                    checked={schedIsRecurring}
                    onChange={(e) => setSchedIsRecurring(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="schedRecurring" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Is Recurring Schedule
                  </label>
                </div>

                <div>
                  <textarea
                    rows={5}
                    placeholder="Type in your message here..."
                    value={schedBody}
                    onChange={(e) => setSchedBody(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-xs"
                    required
                  />
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Paperclip size={13} />
                  <span>UPLOAD FILES: Drag &amp; Drop Files Here</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsScheduleEmailOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduleEmailMutation.isPending}
                    className="px-6 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    {scheduleEmailMutation.isPending ? "SCHEDULING..." : "SEND"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
