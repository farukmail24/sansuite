import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Building2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

interface CharityOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CharityOnboardingModal({ isOpen, onClose }: CharityOnboardingModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    regulator: "Charity Commission E&W",
    charityRegNumber: "",
    companyRegNumber: "",
    principalPurpose: "",
    charityType: "CIO",
  });

  const onboardMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/charity/onboard", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Charity Onboarded", description: "Successfully registered new charity.", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/practice/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/charity/my-charities"] });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Onboarding Failed", description: e.message, type: "error" });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">New Charity Client</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3 text-orange-800">
            <Building2 size={24} className="flex-shrink-0 mt-0.5 text-[#e17055]" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Charity Onboarding</p>
              <p className="text-orange-700">Enter the core details for this charity. This will configure the SORP compliance template automatically.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Charity Name *</label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                type="text" 
                placeholder="e.g. Action for Children"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055]" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Charity Reg. Number</label>
              <input 
                value={formData.charityRegNumber}
                onChange={e => setFormData({...formData, charityRegNumber: e.target.value})}
                type="text" 
                placeholder="e.g. 1122334"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055]" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company Reg. Number (if incorporated)</label>
              <input 
                value={formData.companyRegNumber}
                onChange={e => setFormData({...formData, companyRegNumber: e.target.value})}
                type="text" 
                placeholder="e.g. 09876543"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055]" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Regulator</label>
              <select 
                value={formData.regulator}
                onChange={e => setFormData({...formData, regulator: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055] bg-white"
              >
                <option>Charity Commission E&W</option>
                <option>OSCR (Scotland)</option>
                <option>CCNI (Northern Ireland)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Structure Type</label>
              <select 
                value={formData.charityType}
                onChange={e => setFormData({...formData, charityType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055] bg-white"
              >
                <option value="CIO">CIO (Charitable Incorporated Organisation)</option>
                <option value="Company">Charitable Company</option>
                <option value="Trust">Trust</option>
                <option value="Unincorporated">Unincorporated Association</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Principal Purpose / Activities</label>
              <textarea 
                value={formData.principalPurpose}
                onChange={e => setFormData({...formData, principalPurpose: e.target.value})}
                placeholder="Brief description of charitable objectives..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#e17055] focus:ring-1 focus:ring-[#e17055] min-h-[80px]" 
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button 
            disabled={!formData.name || onboardMutation.isPending}
            onClick={() => onboardMutation.mutate(formData)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#e17055] hover:bg-[#d66045] rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {onboardMutation.isPending ? "Saving..." : <><CheckCircle2 size={16} /> Save & Create</>}
          </button>
        </div>
      </div>
    </div>
  );
}
