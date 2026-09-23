import { useState, useEffect } from "react";
import GlobalNavActions from "../../components/layout/GlobalNavActions";
import { Ticket, Plus, Search, Send, Clock, CheckCircle2, AlertCircle, MessageSquare, X } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";

export default function SupportTicketsPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [replyText, setReplyText] = useState("");

  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    category: "General Query",
    priority: "normal",
    message: ""
  });

  // Check URL for ?new=true to auto-open modal
  useEffect(() => {
    if (window.location.search.includes("new=true")) {
      setShowNewTicket(true);
      // Clean up URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Fetch all tickets — polls every 15s
  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["/api/support/tickets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/support/tickets");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch selected ticket conversation — polls every 8s for near-real-time
  const { data: selectedTicketData, isLoading: loadingMessages, dataUpdatedAt } = useQuery({
    queryKey: ["/api/support/tickets", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await apiRequest("GET", `/api/support/tickets/${selectedTicketId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedTicketId,
    refetchInterval: selectedTicketId ? 8000 : false,
  });

  // Create new ticket mutation
  const createTicket = useMutation({
    mutationFn: async (data: typeof newTicketForm) => {
      const res = await apiRequest("POST", "/api/support/tickets", data);
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json();
    },
    onSuccess: (res) => {
      toast({ title: "Ticket Created", description: "Your support ticket has been submitted.", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      setShowNewTicket(false);
      setNewTicketForm({ subject: "", category: "General Query", priority: "normal", message: "" });
      setSelectedTicketId(res.ticketId);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  // Reply to ticket mutation
  const replyTicket = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number, message: string }) => {
      const res = await apiRequest("POST", `/api/support/tickets/${ticketId}/messages`, { message });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/tickets", selectedTicketId] });
      setReplyText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" })
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.subject || !newTicketForm.message) {
      toast({ title: "Validation Error", description: "Subject and Message are required.", type: "error" });
      return;
    }
    createTicket.mutate(newTicketForm);
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;
    replyTicket.mutate({ ticketId: selectedTicketId, message: replyText });
  };

  const filteredTickets = tickets.filter((t: any) =>
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toString().includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase flex items-center gap-1"><Clock size={10} /> Open</span>;
      case 'in_progress': 
      case 'in progress': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase flex items-center gap-1"><AlertCircle size={10} /> In Progress</span>;
      case 'resolved': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Resolved</span>;
      case 'closed': return <span className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded uppercase flex items-center gap-1"><CheckCircle2 size={10} /> Closed</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded uppercase">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col overflow-hidden h-screen">
      {/* Admin Navbar */}
      <nav className="bg-[#1a2035] px-6 flex items-center justify-between shadow-sm shrink-0" style={{ height: "48px", zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded flex items-center justify-center bg-purple-600 shrink-0">
            <Ticket size={13} className="text-white" />
          </div>
          <button onClick={() => navigate("/")} className="text-white font-semibold text-sm hover:text-gray-200 transition-colors">
            Support Center
          </button>
        </div>
        <GlobalNavActions />
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Ticket List */}
        <div className="w-1/3 min-w-[320px] max-w-[400px] bg-white border-r border-gray-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">My Tickets</h2>
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full" title="Auto-refreshing every 15 seconds">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span>
                  Live
                </span>
              </div>
              <button
                onClick={() => setShowNewTicket(true)}
                className="shrink-0 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg shadow-sm transition-all hover:shadow-md"
                title="Create New Ticket"
              >
                <Plus size={18} /> Create New Ticket
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by ID or Subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingTickets ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                  <Ticket size={24} />
                </div>
                <p className="text-sm font-medium text-gray-600">No tickets found</p>
                <p className="text-xs mt-1">Create a new ticket if you need help.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${selectedTicketId === ticket.id
                      ? "bg-purple-50/50 border-purple-500"
                      : "border-transparent hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-400">#{ticket.id}</span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 line-clamp-1 ${selectedTicketId === ticket.id ? "text-purple-900" : "text-gray-800"}`}>
                      {ticket.subject}
                    </h3>
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                      <span className="truncate max-w-[150px]">{ticket.category}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Ticket Detail / Conversation */}
        <div className="flex-1 flex flex-col bg-white">
          {!selectedTicketId ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] text-center p-8">
              <div className="w-24 h-24 bg-white shadow-sm rounded-full flex items-center justify-center mb-6 text-gray-300 border border-gray-100">
                <MessageSquare size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Support Center</h2>
              <p className="text-gray-500 max-w-sm">Select a ticket from the list to view the conversation or create a new one to get help.</p>
            </div>
          ) : loadingMessages || !selectedTicketData ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Loading conversation...</div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-6 border-b border-gray-100 bg-white shrink-0 shadow-sm z-10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-400">Ticket #{selectedTicketData.ticket.id}</span>
                    {getStatusBadge(selectedTicketData.ticket.status)}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-200">
                      Priority: {selectedTicketData.ticket.priority}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{selectedTicketData.ticket.subject}</h1>
                  <p className="text-xs text-gray-500 mt-1">Category: {selectedTicketData.ticket.category}</p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
                <div className="max-w-3xl mx-auto space-y-6">
                  {selectedTicketData.messages.map((msg: any) => {
                    const isClient = msg.senderType === 'tenant';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1.5 px-1">
                          <span className="text-[11px] font-semibold text-gray-500">
                            {isClient ? 'You' : 'SanSuite Support'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm ${isClient
                          ? 'bg-purple-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                          }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              {selectedTicketData.ticket.status !== 'Closed' && selectedTicketData.ticket.status !== 'Resolved' ? (
                <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                  <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleReplySubmit} className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply here..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-14 py-3 text-sm focus:outline-none focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none min-h-[60px] max-h-[200px]"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReplySubmit(e);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={replyTicket.isPending || !replyText.trim()}
                        className="absolute right-3 bottom-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors shadow-sm"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                    <p className="text-[10px] text-gray-400 mt-2 ml-2">Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 font-mono">Shift + Enter</kbd> for new line.</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border-t border-gray-200 shrink-0 text-center">
                  <p className="text-sm font-medium text-gray-500 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    This ticket has been closed. You cannot reply to it.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Ticket size={18} className="text-purple-600" /> Create New Ticket
              </h2>
              <button onClick={() => setShowNewTicket(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
                <input
                  required
                  type="text"
                  autoFocus
                  placeholder="e.g., Cannot access billing page"
                  value={newTicketForm.subject}
                  onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={newTicketForm.category}
                    onChange={e => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none bg-white"
                  >
                    <option>General Query</option>
                    <option>Technical Support</option>
                    <option>Billing & Subscriptions</option>
                    <option>Feature Request</option>
                    <option>Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
                <textarea
                  required
                  placeholder="Please describe your issue in detail..."
                  value={newTicketForm.message}
                  onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[120px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTicket.isPending}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(108,92,231,0.39)] hover:shadow-[0_6px_20px_rgba(108,92,231,0.23)] disabled:opacity-50 flex items-center gap-2"
                >
                  {createTicket.isPending ? 'Submitting...' : <><Send size={16} /> Submit Ticket</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
