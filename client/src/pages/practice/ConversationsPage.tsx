import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Mail, Send, Filter, Search, Plus, Sparkles, Building2,
  Users, Inbox, SendHorizontal, Archive, Trash2,
  Star, Clock, Paperclip, Reply, Forward,
  User, CheckSquare, Tag, Eye, ChevronRight,
  RefreshCw, SlidersHorizontal, ArrowLeft, X,
  Check, Info
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function ConversationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Folder state for Conversations: "inbox" | "sent" | "starred" | "archived"
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "starred" | "archived">("inbox");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("All");

  // Inline Reply state
  const [replyText, setReplyText] = useState("");
  const [selectedTemplateForReply, setSelectedTemplateForReply] = useState("");

  // Modals state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Compose Single Email Form
  const [composeClientId, setComposeClientId] = useState("");
  const [composeEmail, setComposeEmail] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");


  // Fetch Conversations (Inbox / Sent)
  const { data: conversations = [], isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Email Templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/conversations/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/conversations/templates");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Clients
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Send Direct Email Mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/pm/conversations/send", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/conversations"] });
      toast({ title: "Email Dispatched", description: "Message delivered successfully to recipient." });
      setIsComposeOpen(false);
      setComposeEmail("");
      setComposeSubject("");
      setComposeBody("");
      setComposeClientId("");
      setReplyText("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    }
  });



  // Create Task from Conversation Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("POST", "/api/practice/tasks", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice/tasks"] });
      toast({ title: "Task Created", description: "Follow-up task created and linked to this client thread." });
      setIsTaskModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    }
  });

  // Helper Date Formatter
  const formatDate = (dStr: string | null | undefined) => {
    if (!dStr) return "-";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Filtered Conversations List
  const filteredConversations = useMemo(() => {
    return conversations.filter((c: any) => {
      // Folder filtering
      if (activeFolder === "sent" && c.direction === "INCOMING") return false;
      if (activeFolder === "inbox" && c.direction === "OUTGOING" && !c.bodyText) return false;

      // Client Filter
      if (clientFilter !== "All" && String(c.clientId) !== clientFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSub = (c.subject || "").toLowerCase().includes(q);
        const matchSender = (c.senderEmail || "").toLowerCase().includes(q);
        const matchRec = (c.recipientEmails || "").toLowerCase().includes(q);
        const matchClient = (c.clientName || "").toLowerCase().includes(q);
        const matchBody = (c.bodyText || "").toLowerCase().includes(q);
        if (!matchSub && !matchSender && !matchRec && !matchClient && !matchBody) return false;
      }

      return true;
    });
  }, [conversations, activeFolder, clientFilter, searchQuery]);

  // Handle Template Selection in Inline Reply
  const handleSelectReplyTemplate = (templateId: string) => {
    setSelectedTemplateForReply(templateId);
    const tmpl = templates.find((t: any) => String(t.id) === templateId);
    if (tmpl && selectedConversation) {
      let body = tmpl.bodyTemplate || tmpl.bodyHtml || "";
      body = body.replace(/\{\{Client_Name\}\}/g, selectedConversation.clientName || "Valued Client");
      body = body.replace(/\{\{Subject\}\}/g, selectedConversation.subject || "");
      setReplyText(body.replace(/<[^>]*>?/gm, ""));
    }
  };

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-slate-800 dark:text-slate-200">
        
        {/* Top Controls Header Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Header: Email Conversations Inbox */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                <Inbox size={16} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Email Conversations
                </h1>
                <p className="text-[11px] text-slate-500">
                  Direct synchronized email inbox, thread tracking and client communications
                </p>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate("/practice/communication")}
                className="bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Users size={13} />
                Broadcasts &amp; SMS &rarr;
              </button>

              <button
                onClick={() => setIsComposeOpen(true)}
                className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-bold px-3.5 py-1.5 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                New Email
              </button>

              <button
                onClick={() => refetchConversations()}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                title="Refresh Inbox"
              >
                <RefreshCw size={13} className={isLoadingConversations ? "animate-spin" : ""} />
              </button>
            </div>

          </div>
        </div>

        <div className="p-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
              
              {/* Left Column 1: Folder Pane (2 cols) */}
              <div className="md:col-span-2 border-r border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-1 text-xs">
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold py-2 px-3 rounded-lg shadow-xs flex items-center justify-center gap-2 mb-3 cursor-pointer"
                >
                  <Send size={13} />
                  <span>New Message</span>
                </button>

                <button
                  onClick={() => setActiveFolder("inbox")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFolder === "inbox"
                      ? "bg-purple-100/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Inbox size={14} /> Inbox
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full font-bold">
                    {conversations.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFolder("sent")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFolder === "sent"
                      ? "bg-purple-100/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <SendHorizontal size={14} /> Sent
                  </span>
                </button>

                <button
                  onClick={() => setActiveFolder("starred")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFolder === "starred"
                      ? "bg-purple-100/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Star size={14} /> Flagged
                  </span>
                </button>

                <button
                  onClick={() => setActiveFolder("archived")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeFolder === "archived"
                      ? "bg-purple-100/80 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Archive size={14} /> Archive
                  </span>
                </button>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1">
                    Client Filter
                  </span>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-md p-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="All">All Clients</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Middle Column 2: Message Threads List (4 cols) */}
              <div className="md:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search messages, clients, subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Thread List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[600px]">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs px-4">
                      <Mail size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No messages found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Dispatched client emails and inbound requests will appear here.</p>
                    </div>
                  ) : (
                    filteredConversations.map((c: any) => {
                      const isSelected = selectedConversation?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedConversation(c)}
                          className={`p-3.5 cursor-pointer transition-colors text-xs space-y-1.5 ${
                            isSelected
                              ? "bg-purple-50/80 dark:bg-purple-950/40 border-l-3 border-purple-600"
                              : "hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                              {c.clientName || c.recipientEmails || "Unknown Client"}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {formatDate(c.sentAt || c.createdAt)}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {c.subject}
                          </div>

                          <div className="text-slate-500 text-[11px] line-clamp-1">
                            {c.bodyText || c.bodyHtml?.replace(/<[^>]*>?/gm, "") || "No text content preview..."}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {c.direction || "OUTGOING"}
                            </span>
                            {c.clientId && (
                              <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                                <Building2 size={10} /> Client #{c.clientId}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column 3: Thread Message Stream & Fast Reply (6 cols) */}
              <div className="md:col-span-6 flex flex-col bg-slate-50/30 dark:bg-slate-900/60">
                {selectedConversation ? (
                  <div className="flex flex-col h-full">
                    
                    {/* Thread Header */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {selectedConversation.subject}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span><strong>To:</strong> {selectedConversation.recipientEmails || selectedConversation.clientEmail}</span>
                          <span>&bull;</span>
                          <span><strong>From:</strong> {selectedConversation.senderEmail || "Practice Lead"}</span>
                          <span>&bull;</span>
                          <span className="font-mono">{formatDate(selectedConversation.sentAt || selectedConversation.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsTaskModalOpen(true)}
                          className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 hover:bg-purple-100 cursor-pointer"
                        >
                          <CheckSquare size={11} /> Create Task
                        </button>
                      </div>
                    </div>

                    {/* Message Body Content */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4">
                      <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                              {(selectedConversation.clientName || selectedConversation.recipientEmails || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                                {selectedConversation.clientName || selectedConversation.recipientEmails}
                              </span>
                              <span className="text-[10px] text-slate-400">{selectedConversation.recipientEmails}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{formatDate(selectedConversation.sentAt || selectedConversation.createdAt)}</span>
                        </div>

                        <div
                          className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2"
                          dangerouslySetInnerHTML={{
                            __html: selectedConversation.bodyHtml || `<p>${selectedConversation.bodyText || ""}</p>`
                          }}
                        />
                      </div>
                    </div>

                    {/* Fast Reply Box */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Reply size={13} className="text-purple-600" />
                          Send Follow-up Reply
                        </span>

                        {/* Template Dropdown */}
                        <select
                          value={selectedTemplateForReply}
                          onChange={(e) => handleSelectReplyTemplate(e.target.value)}
                          className="text-[11px] border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">Insert Email Template...</option>
                          {templates.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.templateName || t.title}</option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Type your message reply here..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-slate-400">
                          <button type="button" className="hover:text-slate-600 p-1 cursor-pointer" title="Attach Document">
                            <Paperclip size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            if (!replyText.trim()) return;
                            sendEmailMutation.mutate({
                              clientId: selectedConversation.clientId || null,
                              recipientEmails: selectedConversation.recipientEmails || selectedConversation.senderEmail,
                              subject: `Re: ${selectedConversation.subject}`,
                              bodyHtml: `<p>${replyText.replace(/\n/g, "<br/>")}</p>`,
                              bodyText: replyText,
                            });
                          }}
                          disabled={sendEmailMutation.isPending || !replyText.trim()}
                          className="bg-[#5c469c] hover:bg-[#4b3882] text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send size={12} />
                          {sendEmailMutation.isPending ? "Sending..." : "Send Reply"}
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="m-auto text-center py-24 text-slate-400 space-y-2">
                    <Mail size={36} className="mx-auto text-purple-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Select a Conversation Thread</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Choose any client message thread on the left to read correspondence, review replies, and dispatch follow-ups.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

        {/* ========================================================= */}
        {/* MODAL 1: COMPOSE DIRECT EMAIL */}
        {/* ========================================================= */}
        {isComposeOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Mail size={16} className="text-purple-600" />
                  Compose Client Email
                </h3>
                <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!composeEmail || !composeSubject) {
                    toast({ title: "Validation Error", description: "Recipient and Subject are required.", variant: "destructive" });
                    return;
                  }
                  sendEmailMutation.mutate({
                    clientId: composeClientId ? parseInt(composeClientId) : null,
                    recipientEmails: composeEmail,
                    subject: composeSubject,
                    bodyHtml: `<p>${composeBody.replace(/\n/g, "<br/>")}</p>`,
                    bodyText: composeBody,
                  });
                }}
                className="p-5 space-y-3"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Client (Optional)</label>
                  <select
                    value={composeClientId}
                    onChange={(e) => {
                      setComposeClientId(e.target.value);
                      const cl = clientsList.find((c: any) => String(c.id) === e.target.value);
                      if (cl?.email) setComposeEmail(cl.email);
                    }}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                  >
                    <option value="">-- Choose Client to Auto-Fill Email --</option>
                    {clientsList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.email || "No email"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recipient Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="client@company.co.uk"
                    value={composeEmail}
                    onChange={(e) => setComposeEmail(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accounts Production Year-End Query"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                  <textarea
                    rows={5}
                    placeholder="Dear Client, please find attached the details..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendEmailMutation.isPending}
                    className="px-5 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} />
                    {sendEmailMutation.isPending ? "Sending..." : "Dispatch Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* ========================================================= */}
        {/* MODAL 3: CREATE TASK FROM THREAD */}
        {/* ========================================================= */}
        {isTaskModalOpen && selectedConversation && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-xs">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckSquare size={16} className="text-purple-600" />
                  Create Task from Conversation
                </h3>
                <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-slate-600 dark:text-slate-400">
                  This will generate a practice task linked to <strong>{selectedConversation.clientName || selectedConversation.recipientEmails}</strong>.
                </p>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      createTaskMutation.mutate({
                        title: `Follow-up: ${selectedConversation.subject}`,
                        taskType: "Communication",
                        priority: "Normal",
                        clientId: selectedConversation.clientId || undefined,
                        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                      });
                    }}
                    className="px-4 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-bold shadow-xs cursor-pointer"
                  >
                    Confirm & Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
