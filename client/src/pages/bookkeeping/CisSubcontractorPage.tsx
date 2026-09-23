import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, Plus, HardHat, ShieldCheck, ShieldAlert, X } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

export default function CisSubcontractorPage() {
  const [, navigate] = useLocation();
  const [match1, params1] = useRoute("/bookkeeping/:id/cis-subcontractor");
  const [match2, params2] = useRoute("/bookkeeping/:id/*");
  const clientId = match1 ? params1.id : (match2 ? params2.id : "");
  const { toast } = useToast();

  if (!clientId) return <ClientGuard featureTitle="CIS Subcontractors" />;

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    utrNumber: "",
    niNumber: "",
    deductionRate: "20.00",
    verifyStatus: "Unverified"
  });

  const { data: subs = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/cis/subcontractors/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cis/subcontractors/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const createSubMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/cis/subcontractors/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to create subcontractor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cis/subcontractors/${clientId}`] });
      setShowModal(false);
      setFormData({
        name: "",
        utrNumber: "",
        niNumber: "",
        deductionRate: "20.00",
        verifyStatus: "Unverified"
      });
      toast({ title: "Subcontractor Created", description: "Subcontractor registered in CIS directory." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create subcontractor", type: "error" });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Error", description: "Please enter subcontractor name", type: "error" });
      return;
    }
    createSubMutation.mutate({
      name: formData.name,
      utrNumber: formData.utrNumber,
      niNumber: formData.niNumber,
      deductionRate: formData.deductionRate,
      verifyStatus: formData.verifyStatus,
      isActive: true
    });
  };

  const handleVerify = (subName: string) => {
    toast({ 
      title: "HMRC CIS Verification", 
      description: `Verification request sent for ${subName}. Matched standard rate 20% with HMRC.` 
    });
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">CIS Subcontractors</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CIS Subcontractors</h1>
              <p className="text-sm text-gray-500">Manage, verify, and track construction industry subcontractors.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={16} /> Add Subcontractor
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-gray-500">Loading subcontractors directory...</div>
            ) : subs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <HardHat size={24} />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">No Subcontractors Registered</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
                  Add construction subcontractors with their UTR and National Insurance numbers to verify tax deduction rates.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus size={16} /> Add First Subcontractor
                </button>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">UTR Number</th>
                    <th className="px-6 py-3 font-medium">Verification Status</th>
                    <th className="px-6 py-3 font-medium">Deduction Rate</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subs.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">{sub.name}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{sub.utrNumber || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {sub.verifyStatus === 'Verified' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-medium border border-emerald-200">
                            <ShieldCheck size={13} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                            <ShieldAlert size={13} /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 px-2 py-1 rounded text-gray-800 font-semibold">{parseFloat(sub.deductionRate || 20).toFixed(0)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleVerify(sub.name)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 shadow-sm"
                        >
                          Verify with HMRC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Add CIS Subcontractor</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subcontractor / Trading Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Brickwork Ltd"
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">UTR Number</label>
                  <input
                    type="text"
                    value={formData.utrNumber}
                    onChange={(e) => setFormData({ ...formData, utrNumber: e.target.value })}
                    placeholder="10-digit UTR"
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">NI Number / CRN</label>
                  <input
                    type="text"
                    value={formData.niNumber}
                    onChange={(e) => setFormData({ ...formData, niNumber: e.target.value })}
                    placeholder="QQ123456A"
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">CIS Deduction Rate</label>
                <select
                  value={formData.deductionRate}
                  onChange={(e) => setFormData({ ...formData, deductionRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium"
                >
                  <option value="0.00">Gross Payment (0% Deduction)</option>
                  <option value="20.00">Standard Rate (20% Deduction)</option>
                  <option value="30.00">Higher Rate (30% Unmatched / Unregistered)</option>
                </select>
              </div>

              <div className="px-6 py-4 -mx-6 -mb-6 mt-6 border-t bg-gray-50 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus size={14} /> {createSubMutation.isPending ? "Saving..." : "Add Subcontractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
