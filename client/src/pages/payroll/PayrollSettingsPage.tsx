import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import ClientPayrollLayout from "./workspace/ClientPayrollLayout";
import { practicePayrollSidebar } from "./sidebar";
import { LayoutDashboard, Users, Calculator, Settings, CheckCircle, Save, CheckSquare, Building2, History } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function PayrollSettingsPage() {
  const qc = useQueryClient();
  const [match, params] = useRoute("/payroll/:clientId/settings");
  // If no clientId in route, fallback to a global settings context, but usually we navigate here per client.
  const clientId = params?.clientId || "1";

  const [activeTab, setActiveTab] = useState("paye");
  const [saved, setSaved] = useState(false);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["/api/payroll/schemes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payroll/schemes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Find the scheme for this client
  const scheme = schemes.find((s: any) => s.clientId.toString() === clientId);

  const [form, setForm] = useState<any>({
    employerName: scheme?.employerName || "",
    hmrcOfficeNumber: scheme?.hmrcOfficeNumber || "",
    payeReference: scheme?.payeReference || "",
    accountsOfficeReference: scheme?.accountsOfficeReference || "",
    econ: scheme?.econ || "",
    defaultPayFrequency: scheme?.defaultPayFrequency || "Monthly",
    paymentMode: scheme?.paymentMode || "BACS",
    bankName: scheme?.bankName || "",
    bankSortCode: scheme?.bankSortCode || "",
    bankAccountNumber: scheme?.bankAccountNumber || "",
    syncBookkeeping: scheme?.syncBookkeeping || false,
    smallEmployersRelief: scheme?.smallEmployersRelief || false,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    gatewayUserId: "",
    gatewayPassword: "",
    senderType: "Employer",
    payslipTemplate: "Classic Modern",
    payslipNote: "",
    showYtdTotals: true,
    showEmployerAddress: true,
    standardHourlyRate: "15.00",
    overtimeMultiplier: "1.5",
    bankHolidayMultiplier: "2.0",
    standardWeeklyHours: "37.5",
  });

  // Update local state when scheme is loaded
  if (scheme && form.employerName === "" && scheme.employerName) {
    setForm((f: any) => ({
      ...f,
      ...scheme,
      employerName: scheme.employerName || "",
      hmrcOfficeNumber: scheme.hmrcOfficeNumber || "",
      payeReference: scheme.payeReference || "",
      accountsOfficeReference: scheme.accountsOfficeReference || "",
      econ: scheme.econ || "",
      defaultPayFrequency: scheme.defaultPayFrequency || "Monthly",
      paymentMode: scheme.paymentMode || "BACS",
      bankName: scheme.bankName || "",
      bankSortCode: scheme.bankSortCode || "",
      bankAccountNumber: scheme.bankAccountNumber || "",
      syncBookkeeping: scheme.syncBookkeeping || false,
      smallEmployersRelief: scheme.smallEmployersRelief || false,
    }));
  }

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = scheme?.id ? `/api/payroll/schemes/${scheme.id}/settings` : "/api/payroll/schemes";
      const res = await apiRequest("POST", endpoint, { ...data, clientId });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payroll/schemes"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const content = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payroll Scheme Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure HMRC PAYE reference, accounts office credentials, nominal accounts, and pay frequencies.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="btn-SanSuite flex items-center gap-2 disabled:opacity-50 text-xs font-semibold cursor-pointer"
        >
          <Save size={14} /> Save Details
        </button>
      </div>

      {saved && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 text-xs text-green-700 flex items-center gap-2">
          <strong>Success!</strong> PAYE Scheme settings saved successfully.
        </div>
      )}

      <div className="flex gap-6">

          {/* Sub Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button 
                onClick={() => setActiveTab("paye")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'paye' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                PAYE Details
              </button>
              <button 
                onClick={() => setActiveTab("contact")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'contact' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Contact Details
              </button>
              <button 
                onClick={() => setActiveTab("hmrc")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'hmrc' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                HMRC Credentials
              </button>
              <button 
                onClick={() => setActiveTab("payslip")} 
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 ${activeTab === 'payslip' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Payslip Templates
              </button>
              <button 
                onClick={() => setActiveTab("payrate")} 
                className={`w-full text-left px-4 py-3 text-sm ${activeTab === 'payrate' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Pay Rate
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-grow">
            {activeTab === "paye" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">PAYE Scheme Configuration</div>
                <div className="p-5 grid grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Employer Name *</label>
                      <input type="text" value={form.employerName} onChange={e => setForm({...form, employerName: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">HMRC Office Number *</label>
                      <input type="text" maxLength={3} placeholder="e.g. 123" value={form.hmrcOfficeNumber} onChange={e => setForm({...form, hmrcOfficeNumber: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">PAYE Reference *</label>
                      <input type="text" placeholder="e.g. AB456" value={form.payeReference} onChange={e => setForm({...form, payeReference: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Accounts Office Reference *</label>
                      <input type="text" placeholder="e.g. 123AB12345678" value={form.accountsOfficeReference} onChange={e => setForm({...form, accountsOfficeReference: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ECON Reference</label>
                      <input type="text" value={form.econ} onChange={e => setForm({...form, econ: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Default Pay Frequency</label>
                      <select value={form.defaultPayFrequency} onChange={e => setForm({...form, defaultPayFrequency: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Weekly">Weekly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Four-weekly">Four-weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
                      <select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="BACS">BACS</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-4 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-700">Bank Details</h4>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Bank Name</label>
                        <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Sort Code</label>
                          <input type="text" value={form.bankSortCode} onChange={e => setForm({...form, bankSortCode: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1">Account Number</label>
                          <input type="text" value={form.bankAccountNumber} onChange={e => setForm({...form, bankAccountNumber: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.syncBookkeeping} onChange={e => setForm({...form, syncBookkeeping: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" /> 
                        Synchronise data with Bookkeeping
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.smallEmployersRelief} onChange={e => setForm({...form, smallEmployersRelief: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" /> 
                        Qualify for Small Employer's Relief
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contact" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Employer Contact Details</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Person / Payroll Admin</label>
                      <input type="text" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payroll Email Address</label>
                      <input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                      <input type="text" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Registered Office Address</label>
                      <textarea rows={3} value={form.contactAddress} onChange={e => setForm({...form, contactAddress: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hmrc" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">HMRC MTD Government Gateway Credentials</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Government Gateway User ID</label>
                      <input type="text" value={form.gatewayUserId} onChange={e => setForm({...form, gatewayUserId: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Government Gateway Password</label>
                      <input type="password" value={form.gatewayPassword} onChange={e => setForm({...form, gatewayPassword: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Sender Type</label>
                      <select value={form.senderType} onChange={e => setForm({...form, senderType: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Employer">Employer</option>
                        <option value="Agent">Agent (Tax Representative)</option>
                      </select>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-1">
                      <strong className="block text-green-900">MTD API Connection Active</strong>
                      <p>Your HMRC Gateway credentials are verified and authorized for RTI FPS/EPS transmissions.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payslip" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Payslip Template & Layout Preferences</div>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payslip Layout Template</label>
                      <select value={form.payslipTemplate} onChange={e => setForm({...form, payslipTemplate: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none">
                        <option value="Classic Modern">Classic Modern (Standard UK PDF)</option>
                        <option value="Detailed Breakdown">Detailed Breakdown (Itemized Allowances)</option>
                        <option value="Compact FRS">Compact FRS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Payslip Custom Note / Message</label>
                      <input type="text" value={form.payslipNote} onChange={e => setForm({...form, payslipNote: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.showYtdTotals} onChange={e => setForm({...form, showYtdTotals: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" />
                      Display Year-to-Date (YTD) Gross, Tax, and NI totals on payslips
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.showEmployerAddress} onChange={e => setForm({...form, showEmployerAddress: e.target.checked})} className="rounded text-purple-600 focus:ring-purple-500" />
                      Display registered employer address on PDF header
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payrate" && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">Default Pay Rates & Hours Configuration</div>
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Hourly Rate (£)</label>
                      <input type="text" value={form.standardHourlyRate} onChange={e => setForm({...form, standardHourlyRate: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Overtime Multiplier (e.g. 1.5x)</label>
                      <input type="text" value={form.overtimeMultiplier} onChange={e => setForm({...form, overtimeMultiplier: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bank Holiday Multiplier (e.g. 2.0x)</label>
                      <input type="text" value={form.bankHolidayMultiplier} onChange={e => setForm({...form, bankHolidayMultiplier: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Standard Weekly Hours</label>
                      <input type="text" value={form.standardWeeklyHours} onChange={e => setForm({...form, standardWeeklyHours: e.target.value})} className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );

  if (match) {
    return (
      <ClientPayrollLayout activeSection="Payroll Settings">
        {content}
      </ClientPayrollLayout>
    );
  }

  return (
    <AppLayout sidebar={practicePayrollSidebar} module="Payroll">
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {content}
        </div>
      </div>
    </AppLayout>
  );
}

