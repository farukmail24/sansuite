import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, FileText, Plus, X } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function MinutesOfMeetingsPage() {
  const [, navigate] = useLocation();
  const [match1, params1] = useRoute("/bookkeeping/:id/minutes");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientIdStr = match1 ? params1.id : (match2 ? params2.id : "");

  if (!clientIdStr) return <ClientGuard featureTitle="Minutes of Meetings" />;
  const clientId = clientIdStr ? parseInt(clientIdStr) : 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);
  const [meetingNotes, setMeetingNotes] = useState("");

  const { data: minutes = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/minutes/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/minutes/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/minutes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/minutes/${clientId}`] });
      setShowModal(false);
      setMeetingTitle("");
      setMeetingNotes("");
      toast({ title: "Meeting Minutes Recorded", description: "Resolution saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to record meeting minutes", variant: "destructive" });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;
    createMutation.mutate({
      clientId,
      meetingDate,
      title: meetingTitle,
      content: meetingNotes,
    });
  };

  return (
    <AppLayout sidebar={clientIdStr ? getClientSidebar(clientIdStr) : bookkeepingSidebar} module="Bookkeeping">

      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">Minutes</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Minutes of Meetings</h1>
              <p className="text-sm text-gray-500">Log shareholder and board meeting resolutions.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center shadow-sm"
            >
              <Plus size={16} className="mr-2" /> Add Meeting Minute
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading meeting minutes...</div>
            ) : minutes.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p>No meeting minutes recorded yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {minutes.map((m: any) => (
                  <li key={m.id} className="p-6 hover:bg-gray-50/50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-base">{m.title}</h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                        {new Date(m.meetingDate || m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{m.content || m.notes}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-gray-800">Add Board / Shareholder Meeting Minute</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Date</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Title / Topic</label>
                  <input
                    type="text"
                    required
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g. Annual General Board Meeting - Dividend Resolution"
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Resolution Details & Content</label>
                  <textarea
                    rows={5}
                    required
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    placeholder="Write detailed notes, attendee names, and resolutions passed during the meeting..."
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
                    {createMutation.isPending ? "Saving..." : "Save Minutes"}
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
