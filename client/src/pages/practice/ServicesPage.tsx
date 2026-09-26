import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import {
  Layers, Plus, CheckCircle2, Settings,
  Clock, DollarSign, Edit3, Trash2,
  ChevronRight, AlertCircle, Search, Sparkles
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import QuickAddModal from "../../components/practice/QuickAddModal";

export default function ServicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Service Form State
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Advisory");
  const [newDefaultFee, setNewDefaultFee] = useState("250.00");
  const [newBillingFreq, setNewBillingFreq] = useState("Monthly");
  const [newDescription, setNewDescription] = useState("");

  // Fetch Services
  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/services"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/services");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Fetch Clients for Quick Add
  const { data: clientsList = [] } = useQuery<any[]>({
    queryKey: ["/api/pm/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/clients");
      if (!res.ok) return [];
      return res.json();
    }
  });

  // Create Service Mutation
  const createServiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/pm/services", {
        serviceName: newServiceName,
        serviceCategory: newServiceCategory,
        defaultFee: newDefaultFee,
        defaultBillingFrequency: newBillingFreq,
        description: newDescription,
        steps: [
          { stepName: "Initial Document Collation", stepOrder: 1, daysBeforeDeadline: 30 },
          { stepName: "Preparation & Review", stepOrder: 2, daysBeforeDeadline: 14 },
          { stepName: "Client Approval & Sign-off", stepOrder: 3, daysBeforeDeadline: 0 },
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/services"] });
      toast({ title: "Custom Service Created", description: newServiceName });
      setIsNewServiceModalOpen(false);
      setNewServiceName("");
      setNewDescription("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create service", description: err.message, variant: "destructive" });
    }
  });

  const filteredServices = services.filter((s) =>
    s.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="p-6 w-full mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="text-indigo-600 dark:text-indigo-400" size={24} />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Services & Workflows</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure statutory UK compliance workflows, bespoke advisory services, sub-steps & standard fee structures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Quick Add
            </button>
            <button
              onClick={() => setIsNewServiceModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus size={15} />
              Add Custom Service
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search services by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Services Grid & Workflow Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Services List */}
          <div className="lg:col-span-2 space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                Loading practice services catalog...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                No services found matching your criteria.
              </div>
            ) : (
              filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedService?.id === srv.id
                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs mt-0.5">
                      {srv.serviceCode.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{srv.serviceName}</h3>
                        {srv.isStatutory && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                            Statutory UK
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {srv.serviceCategory}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{srv.description || "No description provided."}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-200">
                          <DollarSign size={13} className="text-slate-400" />
                          £{srv.defaultFee} / {srv.defaultBillingFrequency}
                        </span>
                        <span>•</span>
                        <span>{srv.steps?.length || 0} Workflow Steps</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              ))
            )}
          </div>

          {/* Right Column: Workflow Steps Inspector */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
            {selectedService ? (
              <>
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{selectedService.serviceName}</h3>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">£{selectedService.defaultFee}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedService.description}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                    Configured Workflow Steps ({selectedService.steps?.length || 0})
                  </h4>

                  {selectedService.steps?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No sub-steps configured for this service.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedService.steps.map((st: any, idx: number) => (
                        <div key={st.id || idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs">
                          <div className="w-5 h-5 rounded-full bg-indigo-600/10 text-indigo-600 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{st.stepName}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {st.daysBeforeDeadline}d before deadline
                              </span>
                              <span>•</span>
                              <span>Role: {st.assignedRole || "Staff"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <Sparkles className="mx-auto text-indigo-400" size={24} />
                <p className="font-medium text-slate-700 dark:text-slate-300">Select a Service to Inspect Workflows</p>
                <p className="text-slate-400 text-[11px]">Click on any service card to view and manage its sub-steps and triggers.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: New Custom Service */}
        {isNewServiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Add New Bespoke Service</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. R&D Tax Relief Claim"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select
                      value={newServiceCategory}
                      onChange={(e) => setNewServiceCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Advisory">Advisory</option>
                      <option value="Compliance">Compliance</option>
                      <option value="Tax">Tax Specialist</option>
                      <option value="Bookkeeping">Bookkeeping</option>
                      <option value="Payroll">Payroll</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Fee (£)</label>
                    <input
                      type="number"
                      value={newDefaultFee}
                      onChange={(e) => setNewDefaultFee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Frequency</label>
                  <select
                    value={newBillingFreq}
                    onChange={(e) => setNewBillingFreq(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Monthly">Monthly Retainer</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                    <option value="One-Off">One-Off Project Fee</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide scope of work..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  disabled={!newServiceName || createServiceMutation.isPending}
                  onClick={() => createServiceMutation.mutate()}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {createServiceMutation.isPending ? "Creating..." : "Save Service"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Quick Add Modal */}
        <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} clientsList={clientsList} />
      </div>
    </AppLayout>
  );
}
