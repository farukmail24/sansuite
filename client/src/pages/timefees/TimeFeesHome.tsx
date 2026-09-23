import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { Clock, Briefcase, Plus, CheckCircle2, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Dashboard", icon: <Clock size={15} />, route: "/practice/time-fees" },
  { label: "Jobs", icon: <Briefcase size={15} />, route: "/practice/time-fees/jobs" },
  { label: "Settings", icon: <Briefcase size={15} />, route: "/practice/time-fees/settings" },
];

export default function TimeFeesHome() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showLogTime, setShowLogTime] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Timesheets");

  const [genForm, setGenForm] = useState({ clientId: "", defaultRatePerHour: "50" });

  // Timesheet Form
  const [timeForm, setTimeForm] = useState({
    date: new Date().toISOString().split("T")[0],
    hours: "",
    jobId: "",
    description: "",
  });

  // Job Form
  const [jobForm, setJobForm] = useState({
    jobName: "",
    description: "",
    budget: "",
    clientId: "",
  });

  const { data: timesheets = [], isLoading: isLoadingTs } = useQuery({
    queryKey: ["/api/timefees/timesheets"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/timefees/timesheets"); return r.ok ? r.json() : []; },
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["/api/timefees/jobs"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/timefees/jobs"); return r.ok ? r.json() : []; },
  });

  const { data: invoices = [], isLoading: isLoadingInv } = useQuery({
    queryKey: ["/api/timefees/invoices"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/timefees/invoices"); return r.ok ? r.json() : []; },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/practice/clients"); return r.ok ? r.json() : []; },
  });

  const logTime = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/timefees/timesheets", timeForm);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Time Logged", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/timefees/timesheets"] });
      setShowLogTime(false);
      setTimeForm({ ...timeForm, hours: "", description: "" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const createJob = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/timefees/jobs", jobForm);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Job Created", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/timefees/jobs"] });
      setShowJobModal(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const generateInvoice = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/timefees/invoices/generate-from-time", genForm);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: "Invoice Generated", description: `Draft invoice ${data.invoiceNumber} created from ${data.timesheetsBilled} timesheets.`, type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/timefees/invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/timefees/timesheets"] });
      setShowGenerateModal(false);
      setActiveTab("Fees");
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, type: "error" }),
  });

  const totalHours = timesheets.reduce((sum: number, t: any) => sum + parseFloat(t.hours || "0"), 0);

  return (
    <AppLayout sidebar={sidebar} module="Practice Management">
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Practice / Time & Fees</p>
            <h1 className="text-lg font-bold text-gray-800">Time & Fees</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowJobModal(true)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Briefcase size={14} /> New Job
            </button>
            <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-2">
              Generate Invoice
            </button>
            <button onClick={() => setShowLogTime(true)} className="btn-SanSuite flex items-center gap-2">
              <Plus size={14} /> Log Time
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="SanSuite-card p-5 flex-1">
            <p className="text-sm font-semibold text-gray-500">Total Hours (All Time)</p>
            <p className="text-2xl font-bold mt-2" style={{ color: "#6c5ce7" }}>{totalHours.toFixed(2)} hrs</p>
          </div>
          <div className="SanSuite-card p-5 flex-1">
            <p className="text-sm font-semibold text-gray-500">Active Jobs</p>
            <p className="text-2xl font-bold mt-2 text-green-600">{jobs.filter((j: any) => j.status === "Active").length}</p>
          </div>
        </div>

        <div className="SanSuite-card">
          <div className="flex border-b px-4">
            {["Timesheets", "Jobs", "Fees"].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${t === activeTab ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="p-0">
            {activeTab === "Timesheets" && (
              <table className="SanSuite-table border-t-0">
                <thead><tr><th>Date</th><th>User</th><th>Job</th><th>Client</th><th>Hours</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  {isLoadingTs ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">Loading...</td></tr> :
                    timesheets.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-xs">No time logged yet.</td></tr> :
                      timesheets.map((t: any) => (
                        <tr key={t.id}>
                          <td>{new Date(t.date).toLocaleDateString("en-GB")}</td>
                          <td>{t.firstName} {t.lastName}</td>
                          <td className="font-medium">{t.jobName || "—"}</td>
                          <td>{t.clientName || "—"}</td>
                          <td className="font-bold text-purple-600">{t.hours}</td>
                          <td><span className="badge-info">{t.status}</span></td>
                          <td className="text-xs text-gray-500">{t.description || "—"}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}

            {activeTab === "Jobs" && (
              <table className="SanSuite-table border-t-0">
                <thead><tr><th>Job Name</th><th>Client</th><th>Budget</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {isLoadingJobs ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">Loading...</td></tr> :
                    jobs.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">No jobs created yet.</td></tr> :
                      jobs.map((j: any) => (
                        <tr key={j.id}>
                          <td className="font-medium">{j.jobName}</td>
                          <td>{j.clientName || "—"}</td>
                          <td>£{parseFloat(j.budget || "0").toFixed(2)}</td>
                          <td><span className="badge-success">{j.status}</span></td>
                          <td><button className="text-xs text-purple-600 hover:underline">Edit</button></td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}

            {activeTab === "Fees" && (
              <table className="SanSuite-table border-t-0">
                <thead><tr><th>Date</th><th>Invoice No</th><th>Client</th><th>Net</th><th>VAT</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>
                  {isLoadingInv ? <tr><td colSpan={7} className="text-center py-6 text-gray-400">Loading...</td></tr> :
                    invoices.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-xs">No invoices generated yet.</td></tr> :
                      invoices.map((i: any) => (
                        <tr key={i.id}>
                          <td>{new Date(i.date).toLocaleDateString("en-GB")}</td>
                          <td className="font-medium">{i.invoiceNumber}</td>
                          <td>{i.clientName || "—"}</td>
                          <td>£{parseFloat(i.netAmount || "0").toFixed(2)}</td>
                          <td>£{parseFloat(i.vatAmount || "0").toFixed(2)}</td>
                          <td className="font-bold">£{parseFloat(i.totalAmount || "0").toFixed(2)}</td>
                          <td><span className={i.status === 'Draft' ? 'badge-gray' : 'badge-success'}>{i.status}</span></td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Log Time Modal */}
      {showLogTime && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Log Time</h2>
              <button onClick={() => setShowLogTime(false)}><ChevronLeft size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                <input type="date" value={timeForm.date} onChange={e => setTimeForm({ ...timeForm, date: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Job</label>
                  <select value={timeForm.jobId} onChange={e => setTimeForm({ ...timeForm, jobId: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select a job...</option>
                    {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.jobName} ({j.clientName || 'No Client'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hours</label>
                  <input type="number" step="0.25" placeholder="e.g. 2.5" value={timeForm.hours} onChange={e => setTimeForm({ ...timeForm, hours: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Notes)</label>
                <textarea rows={3} value={timeForm.description} onChange={e => setTimeForm({ ...timeForm, description: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowLogTime(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => logTime.mutate()} disabled={!timeForm.date || !timeForm.hours || logTime.isPending}
                className="btn-SanSuite">
                {logTime.isPending ? "Saving..." : "Save Time"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Create New Job</h2>
              <button onClick={() => setShowJobModal(false)}><ChevronLeft size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Job Name *</label>
                <input value={jobForm.jobName} onChange={e => setJobForm({ ...jobForm, jobName: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client</label>
                <select value={jobForm.clientId} onChange={e => setJobForm({ ...jobForm, clientId: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Internal / No Client</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Budget (£)</label>
                <input type="number" value={jobForm.budget} onChange={e => setJobForm({ ...jobForm, budget: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea rows={3} value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowJobModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => createJob.mutate()} disabled={!jobForm.jobName || createJob.isPending}
                className="btn-SanSuite flex items-center gap-2">
                {createJob.isPending ? "Creating..." : <><CheckCircle2 size={14} /> Create Job</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Generate Invoice from Timesheets</h2>
              <button onClick={() => setShowGenerateModal(false)}><ChevronLeft size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 mb-4">
                This will find all 'Unbilled' timesheets for the selected client and convert them into a draft invoice.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Client *</label>
                <select value={genForm.clientId} onChange={e => setGenForm({ ...genForm, clientId: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">Select a client...</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Default Rate Per Hour (£) *</label>
                <input type="number" value={genForm.defaultRatePerHour} onChange={e => setGenForm({ ...genForm, defaultRatePerHour: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                <p className="text-[10px] text-gray-400 mt-1">Used if timesheet has no specific rate defined.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={() => generateInvoice.mutate()} disabled={!genForm.clientId || generateInvoice.isPending}
                className="btn-SanSuite flex items-center gap-2">
                {generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
