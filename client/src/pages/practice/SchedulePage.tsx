import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Calendar, Search, Plus, Filter, Users,
  Clock, MapPin, Video, CheckCircle2,
  AlertCircle, X, ChevronDown, Trash2
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function SchedulePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter States (Capium Exact Alignment - Screenshot 1)
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState("Group By Date");
  const [selectedClient, setSelectedClient] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Modal State
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    title: "",
    clientId: "",
    host: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:30 AM",
    location: "Zoom Video Meeting",
    agenda: "",
  });

  // Fetch Practice Clients for Filter and Modal
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      return res.ok ? await res.json() : [];
    },
  });

  // Fetch Real Team Members for Host selection
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/team"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/team");
      return res.ok ? await res.json() : [];
    },
  });

  // Fetch Meetings List from Database
  const { data: meetingsList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/meetings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/meetings");
      return res.ok ? await res.json() : [];
    },
  });

  // Create Meeting Mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/pm/meetings", payload);
      if (!res.ok) throw new Error("Failed to schedule meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/meetings"] });
      toast({ title: "Meeting Scheduled", description: "Meeting added to practice schedule and client calendar." });
      setIsNewMeetingModalOpen(false);
      setNewMeetingForm({
        title: "",
        clientId: "",
        host: teamMembers[0]?.name || "",
        date: new Date().toISOString().split("T")[0],
        time: "10:30 AM",
        location: "Zoom Video Meeting",
        agenda: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "Scheduling Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete Meeting Mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/meetings/${id}`);
      if (!res.ok) throw new Error("Failed to delete meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/meetings"] });
      toast({ title: "Meeting Removed", description: "Meeting has been deleted." });
    },
  });

  // Filtered Meetings
  const filteredMeetings = meetingsList.filter((m: any) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (m.title || "").toLowerCase().includes(q);
      const matchClient = (m.clientName || "").toLowerCase().includes(q);
      const matchHost = (m.host || "").toLowerCase().includes(q);
      if (!matchTitle && !matchClient && !matchHost) return false;
    }
    if (selectedClient !== "all") {
      if (String(m.clientId) !== String(selectedClient)) return false;
    }
    if (fromDate) {
      if (m.date < fromDate) return false;
    }
    if (toDate) {
      if (m.date > toDate) return false;
    }
    return true;
  });

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-xs">
        {/* Content Container */}
        <div className="p-8 w-full mx-auto space-y-6">

          {/* Header & Filter Bar (Matching Capium Screenshot 1) */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Meetings
              </h1>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Search */}
              <div className="relative min-w-[200px]">
                <input
                  type="text"
                  placeholder="Quick Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 pl-8 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>

              {/* Group By Date */}
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="Group By Date">Group By Date</option>
                <option value="Group By Client">Group By Client</option>
                <option value="Group By Host">Group By Host</option>
              </select>

              {/* Client - All */}
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium max-w-[180px]"
              >
                <option value="all">Client - All</option>
                {clientsList.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.clientName}</option>
                ))}
              </select>

              {/* From Date */}
              <input
                type="date"
                placeholder="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              />

              {/* To Date */}
              <input
                type="date"
                placeholder="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              />

              {/* New Meeting Button */}
              <button
                type="button"
                onClick={() => {
                  setNewMeetingForm({
                    title: "",
                    clientId: clientsList[0]?.id ? String(clientsList[0].id) : "",
                    host: teamMembers[0]?.name || "",
                    date: new Date().toISOString().split("T")[0],
                    time: "10:30 AM",
                    location: "Zoom Video Meeting",
                    agenda: "",
                  });
                  setIsNewMeetingModalOpen(true);
                }}
                className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-4 py-1.5 rounded font-semibold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Plus size={13} />
                New
              </button>
            </div>
          </div>

          {/* Meetings Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Meeting Title / Topic</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Host Accountant</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading scheduled meetings...
                    </td>
                  </tr>
                ) : filteredMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No Records found
                    </td>
                  </tr>
                ) : (
                  filteredMeetings.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {m.title}
                        {m.agenda && <p className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{m.agenda}</p>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {m.clientName || "General Practice"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {m.host || "Practice Staff"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {m.date}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {m.time}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          {m.location?.toLowerCase().includes("zoom") ? <Video size={13} className="text-blue-500" /> : <MapPin size={13} className="text-slate-400" />}
                          {m.location || "Office"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {m.status || "Scheduled"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMeetingMutation.mutate(m.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="Delete Meeting"
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

        {/* Modal: Schedule New Meeting */}
        {isNewMeetingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in text-xs overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  Schedule New Client Meeting
                </h3>
                <button onClick={() => setIsNewMeetingModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const selectedC = clientsList.find((c: any) => String(c.id) === String(newMeetingForm.clientId));
                  createMeetingMutation.mutate({
                    ...newMeetingForm,
                    clientName: selectedC?.clientName || "General Practice",
                  });
                }}
                className="p-5 space-y-3.5"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Title / Topic <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Year-End Accounts & Tax Planning Review"
                    value={newMeetingForm.title}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client</label>
                    <select
                      value={newMeetingForm.clientId}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, clientId: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">General Practice</option>
                      {clientsList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.clientName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Host Accountant <span className="text-rose-500">*</span></label>
                    <select
                      value={newMeetingForm.host || (teamMembers[0]?.name || "")}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, host: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Date <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={newMeetingForm.date}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, date: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10:30 AM"
                      value={newMeetingForm.time}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, time: e.target.value })}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Meeting Link</label>
                  <input
                    type="text"
                    placeholder="e.g. Zoom Video Meeting / Office Boardroom"
                    value={newMeetingForm.location}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, location: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Agenda / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Add brief agenda for attendees..."
                    value={newMeetingForm.agenda}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, agenda: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewMeetingModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMeetingMutation.isPending}
                    className="px-5 py-2 bg-[#5c469c] hover:bg-[#4b3882] text-white font-semibold rounded shadow-xs transition disabled:opacity-50"
                  >
                    {createMeetingMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
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
