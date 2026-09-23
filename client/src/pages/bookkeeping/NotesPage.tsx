import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, StickyNote, Plus } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function NotesPage() {
  const [, navigate] = useLocation();
  const [match1, params1] = useRoute("/bookkeeping/:id/notes");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientIdStr = match1 ? params1.id : (match2 ? params2.id : "");

  if (!clientIdStr) return <ClientGuard featureTitle="Notes" />;
  const clientId = clientIdStr ? parseInt(clientIdStr) : 1;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState("");

  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/notes/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notes/${clientId}`] });
      setNoteContent("");
      toast({ title: "Note Added", description: "Internal client note saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save note", variant: "destructive" });
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    createMutation.mutate({
      clientId,
      note: noteContent,
      category: "General",
    });
  };

  return (
    <AppLayout sidebar={clientIdStr ? getClientSidebar(clientIdStr) : bookkeepingSidebar} module="Bookkeeping">

      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">Notes</span>
        </div>
        
        <div className="p-6 max-w-4xl mx-auto flex gap-6 flex-col md:flex-row">
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Client Notes</h1>
              <p className="text-sm text-gray-500">Internal practice notes and client communication records.</p>
            </div>

            <form onSubmit={handleAddNote} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
              <textarea 
                placeholder="Write a new internal note or practice memo..." 
                className="w-full mb-3 p-3 border border-gray-200 rounded-lg text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-purple-500" 
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={createMutation.isPending || !noteContent.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center disabled:opacity-50 transition-colors"
                >
                  <Plus size={16} className="mr-1.5" /> {createMutation.isPending ? "Saving..." : "Add Note"}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center p-8 text-gray-500 bg-white border border-gray-200 rounded-xl border-dashed">
                  <StickyNote size={32} className="mx-auto text-gray-300 mb-2" />
                  <p>No internal notes recorded yet.</p>
                </div>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3 font-normal leading-relaxed">{n.note}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500 border-t border-amber-200/50 pt-2 font-medium">
                      <span>By Practice Staff</span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
