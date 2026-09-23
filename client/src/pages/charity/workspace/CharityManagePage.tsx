import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CharityWorkspaceLayout, { useCharityWorkspace } from "./CharityWorkspaceLayout";
import {
  Settings, Building2, Shield, Save, CheckCircle2,
  Calendar, FileText, AlertCircle
} from "lucide-react";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";

export default function CharityManagePage() {
  return (
    <CharityWorkspaceLayout activeTab="manage">
      <CharityManageContent />
    </CharityWorkspaceLayout>
  );
}

function CharityManageContent() {
  const { charityId, charity, refetchDetails } = useCharityWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    regulator: "Charity Commission for England and Wales",
    charityRegNumber: "",
    companyRegNumber: "",
    commencementDate: "",
    principalPurpose: "",
    charityType: "Charitable Incorporated Organisation (CIO)",
    reportingType: "Independent Examination",
    isAudited: false,
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    townCity: "",
    country: "United Kingdom",
    postcode: "",
    accountingMethod: "Accrual",
    currency: "GBP",
    isVatRegistered: false,
    isRoundingEnabled: false,
    isFundWiseBalanceSheet: false,
  });

  useEffect(() => {
    if (charity) {
      setForm({
        name: charity.name || "",
        regulator: charity.regulator || "Charity Commission for England and Wales",
        charityRegNumber: charity.charityRegNumber || "",
        companyRegNumber: charity.companyRegNumber || "",
        commencementDate: charity.commencementDate || "",
        principalPurpose: charity.principalPurpose || "",
        charityType: charity.charityType || "Charitable Incorporated Organisation (CIO)",
        reportingType: charity.reportingType || "Independent Examination",
        isAudited: charity.isAudited ?? false,
        addressLine1: charity.addressLine1 || "",
        addressLine2: charity.addressLine2 || "",
        addressLine3: charity.addressLine3 || "",
        townCity: charity.townCity || "",
        country: charity.country || "United Kingdom",
        postcode: charity.postcode || "",
        accountingMethod: charity.accountingMethod || "Accrual",
        currency: charity.currency || "GBP",
        isVatRegistered: charity.isVatRegistered ?? false,
        isRoundingEnabled: charity.isRoundingEnabled ?? false,
        isFundWiseBalanceSheet: charity.isFundWiseBalanceSheet ?? false,
      });
    }
  }, [charity]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/charity/${charityId}/details`, form);
      if (!res.ok) throw new Error("Failed to update charity profile");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile Saved", description: "Charity profile and accounting options updated." });
      refetchDetails();
      queryClient.invalidateQueries({ queryKey: [`/api/charity/list`] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Charity Profile & Preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure legal structure, regulator information, accounting methods, and registered office.
          </p>
        </div>
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          <span>{updateMutation.isPending ? "Saving Changes..." : "Save Profile"}</span>
        </button>
      </div>

      <div className="space-y-5">
        {/* Basic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Legal Name *</label>
            <input
              type="text"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Regulator *</label>
            <select
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              value={form.regulator}
              onChange={(e) => setForm({ ...form, regulator: e.target.value })}
            >
              <option value="Charity Commission for England and Wales">Charity Commission for England and Wales</option>
              <option value="OSCR (Scottish Charity Regulator)">OSCR (Scottish Charity Regulator)</option>
              <option value="Charity Commission for Northern Ireland">Charity Commission for Northern Ireland</option>
            </select>
          </div>
        </div>

        {/* Legal Form & Reg Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Type</label>
            <select
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              value={form.charityType}
              onChange={(e) => setForm({ ...form, charityType: e.target.value })}
            >
              <option value="Charitable Incorporated Organisation (CIO)">Charitable Incorporated Organisation (CIO)</option>
              <option value="Charitable Company (Limited by Guarantee)">Charitable Company (Limited by Guarantee)</option>
              <option value="Charitable Un-incorporated Association">Charitable Un-incorporated Association</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Charity Commission Number</label>
            <input
              type="text"
              placeholder="e.g. 1122334"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
              value={form.charityRegNumber}
              onChange={(e) => setForm({ ...form, charityRegNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Companies House Number</label>
            <input
              type="text"
              placeholder="e.g. 04321876 (if company)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
              value={form.companyRegNumber}
              onChange={(e) => setForm({ ...form, companyRegNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Accounting Framework */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Statutory Accounting Framework</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Accounting Basis</label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                value={form.accountingMethod}
                onChange={(e) => setForm({ ...form, accountingMethod: e.target.value })}
              >
                <option value="Accrual">Accruals Basis (Charities SORP FRS 102)</option>
                <option value="Cash">Cash Basis (Receipts and Payments Account)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Charities with gross income exceeding £250,000 must prepare accounts on the accruals basis.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">External Scrutiny</label>
              <select
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                value={form.reportingType}
                onChange={(e) => setForm({ ...form, reportingType: e.target.value })}
              >
                <option value="Independent Examination">Independent Examination (CC31/CC32)</option>
                <option value="Audited">Statutory Audit (ISA UK)</option>
                <option value="Exempt">Exempt from scrutiny</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isVatRegistered}
                onChange={(e) => setForm({ ...form, isVatRegistered: e.target.checked })}
                className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span>Charity is VAT Registered</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isRoundingEnabled}
                onChange={(e) => setForm({ ...form, isRoundingEnabled: e.target.checked })}
                className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span>Round up to nearest whole pound (£) in reports</span>
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isFundWiseBalanceSheet}
                disabled={form.charityType?.includes("Charitable Company")}
                onChange={(e) => setForm({ ...form, isFundWiseBalanceSheet: e.target.checked })}
                className="mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-50"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Fund-Wise Balance Sheet</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">
                    July 2025 Update
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Displays balance sheet assets, liabilities, and net assets categorized across Unrestricted, Restricted, and Endowment funds.
                  Available for Charitable Incorporated Organisations (CIO) and Un-incorporated Charities.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Registered Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Office Address</label>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Address Line 1"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Town / City"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500"
                value={form.townCity}
                onChange={(e) => setForm({ ...form, townCity: e.target.value })}
              />
              <input
                type="text"
                placeholder="Postcode"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Principal Purpose */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Charitable Purpose</label>
          <textarea
            rows={3}
            placeholder="State the charity's principal aim (e.g. Wildlife conservation and public education in biodiversity)..."
            className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 leading-relaxed"
            value={form.principalPurpose}
            onChange={(e) => setForm({ ...form, principalPurpose: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
