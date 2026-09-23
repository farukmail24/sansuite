import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ClientPayrollLayout, { useClientPayroll } from "./ClientPayrollLayout";
import { apiRequest } from "../../../lib/queryClient";
import {
  Car, Plus, Shield, FileText, Download,
  CheckCircle2, AlertCircle, X, Calculator
} from "lucide-react";

export default function P11dFormsPage() {
  return (
    <ClientPayrollLayout activeSection="P11D & Benefits">
      <P11dFormsContent />
    </ClientPayrollLayout>
  );
}

function P11dFormsContent() {
  const { clientId, taxYear } = useClientPayroll();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"p11d" | "p11db" | "p46">("p11d");
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);

  // Form for Benefit
  const [benefitForm, setBenefitForm] = useState({
    employeeId: "",
    taxYear: taxYear || "2024-25",
    benefitType: "car",
    description: "",
    costToEmployer: "4000.00",
    employeeContribution: "0.00",
    cashEquivalent: "4000.00",
    class1aPayable: "552.00",
  });

  // Form for P46 Car
  const [carForm, setCarForm] = useState({
    employeeId: "",
    makeAndModel: "",
    registrationNumber: "",
    dateAvailableFrom: new Date().toISOString().slice(0, 10),
    co2Emissions: 110,
    zeroEmissionMileage: 0,
    listPrice: "28000.00",
    fuelProvided: false,
  });

  // Fetch P11D benefits
  const { data: benefits = [], isLoading: loadingBenefits } = useQuery<any[]>({
    queryKey: [`/api/payroll/p11d/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/p11d/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch P46 Cars
  const { data: cars = [], isLoading: loadingCars } = useQuery<any[]>({
    queryKey: [`/api/payroll/p46-car/${clientId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/p46-car/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Employees
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/payroll/employees`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payroll/employees`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Calculate Benefit Class 1A NIC (13.8%)
  const handleCostChange = (cost: string, contrib: string) => {
    const c = parseFloat(cost) || 0;
    const con = parseFloat(contrib) || 0;
    const equiv = Math.max(0, c - con);
    const nic = equiv * 0.138;
    setBenefitForm({
      ...benefitForm,
      costToEmployer: cost,
      employeeContribution: contrib,
      cashEquivalent: equiv.toFixed(2),
      class1aPayable: nic.toFixed(2),
    });
  };

  const saveBenefitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/p11d/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save benefit");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/p11d/${clientId}`] });
      setShowBenefitModal(false);
    },
  });

  const saveCarMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/payroll/p46-car/${clientId}`, payload);
      if (!res.ok) throw new Error("Failed to save car");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/payroll/p46-car/${clientId}`] });
      setShowCarModal(false);
    },
  });

  // Totals for P11D(b)
  const totalCashEquivalent = benefits.reduce((acc, b) => acc + (parseFloat(b.cashEquivalent) || 0), 0);
  const totalClass1aNic = benefits.reduce((acc, b) => acc + (parseFloat(b.class1aPayable) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">P11D Expenses, Benefits & P46 (Car)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Report taxable benefits in kind, company cars, medical health plans, and calculate Class 1A NIC due under HMRC Form P11D(b).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCarModal(true)}
            className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Car size={13} /> + Company Car (P46)
          </button>
          <button
            onClick={() => setShowBenefitModal(true)}
            className="btn-SanSuite flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Plus size={14} /> Add Benefit (P11D)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white px-4 pt-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab("p11d")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p11d"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileText size={14} /> Form P11D Return ({benefits.length})
        </button>

        <button
          onClick={() => setActiveTab("p11db")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p11db"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Calculator size={14} /> Form P11D(b) Employer Declaration
        </button>

        <button
          onClick={() => setActiveTab("p46")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "p46"
              ? "border-purple-600 text-purple-700 bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Car size={14} /> P46 (Car) Registry ({cars.length})
        </button>
      </div>

      {/* Panels */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-xs">
        {/* P11D TAB */}
        {activeTab === "p11d" && (
          <div className="space-y-4">
            <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Benefit Category</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Cost to Employer</th>
                  <th className="px-4 py-2.5">Staff Contrib.</th>
                  <th className="px-4 py-2.5">Cash Equivalent</th>
                  <th className="px-4 py-2.5">Class 1A NIC (13.8%)</th>
                  <th className="px-4 py-2.5 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingBenefits ? (
                  <tr><td colSpan={8} className="py-6 text-center text-gray-400">Loading benefits...</td></tr>
                ) : benefits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      <FileText size={24} className="mx-auto text-gray-300 mb-1" />
                      No taxable benefits recorded. Click "+ Add Benefit (P11D)" to record company cars, private health, or loan benefits.
                    </td>
                  </tr>
                ) : (
                  benefits.map((b) => {
                    const emp = employees.find((e) => e.id === b.employeeId);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-semibold text-gray-800">
                          {emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : `Employee #${b.employeeId}`}
                        </td>
                        <td className="px-4 py-2.5 font-bold uppercase text-purple-700">{b.benefitType}</td>
                        <td className="px-4 py-2.5 text-gray-700">{b.description || "—"}</td>
                        <td className="px-4 py-2.5 font-mono">£{Number(b.costToEmployer).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500">£{Number(b.employeeContribution || 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-900">£{Number(b.cashEquivalent).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-indigo-700">£{Number(b.class1aPayable).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button className="text-purple-700 hover:underline font-medium cursor-pointer">
                            Download P11D
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* P11D(b) TAB */}
        {activeTab === "p11db" && (
          <div className="space-y-4 max-w-2xl">
            <h3 className="font-bold text-sm text-gray-800">Return of Class 1A National Insurance Contributions Due</h3>
            <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-purple-200 pb-3 text-xs">
                <span className="font-medium text-gray-700">Total benefits in kind provided (P11D box 1):</span>
                <span className="font-mono font-bold text-base text-gray-900">£{totalCashEquivalent.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-200 pb-3 text-xs">
                <span className="font-medium text-gray-700">Statutory Class 1A NIC Rate:</span>
                <span className="font-mono font-bold text-gray-900">13.80%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900 text-sm">Total Class 1A NIC Payable to HMRC:</span>
                <span className="font-mono font-bold text-lg text-purple-900">£{totalClass1aNic.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Payment deadline: 22 July (electronic) following the end of the tax year. Submit declaration directly to HMRC via RTI.
            </p>
          </div>
        )}

        {/* P46 CAR TAB */}
        {activeTab === "p46" && (
          <div className="space-y-4">
            <table className="w-full text-xs text-left border border-gray-100 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Make & Model</th>
                  <th className="px-4 py-2.5">Registration</th>
                  <th className="px-4 py-2.5">Date Available</th>
                  <th className="px-4 py-2.5">List Price</th>
                  <th className="px-4 py-2.5">CO2 (g/km)</th>
                  <th className="px-4 py-2.5">Private Fuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingCars ? (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">Loading cars...</td></tr>
                ) : cars.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      <Car size={24} className="mx-auto text-gray-300 mb-1" />
                      No company cars registered. Click "+ Company Car (P46)" to report car provision or change of vehicle.
                    </td>
                  </tr>
                ) : (
                  cars.map((c) => {
                    const emp = employees.find((e) => e.id === c.employeeId);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-semibold text-gray-800">
                          {emp ? (emp.name || `${emp.firstName} ${emp.lastName}`) : `Employee #${c.employeeId}`}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{c.makeAndModel}</td>
                        <td className="px-4 py-2.5 font-mono uppercase bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 inline-block font-bold">
                          {c.registrationNumber}
                        </td>
                        <td className="px-4 py-2.5">{c.dateAvailableFrom}</td>
                        <td className="px-4 py-2.5 font-mono font-bold">£{Number(c.listPrice).toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono">{c.co2Emissions} g/km</td>
                        <td className="px-4 py-2.5">{c.fuelProvided ? "Yes (Taxable Fuel)" : "No"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Benefit Modal */}
      {showBenefitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Add Taxable Benefit (P11D)</h3>
              <button onClick={() => setShowBenefitModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Employee *</label>
                <select
                  value={benefitForm.employeeId}
                  onChange={(e) => setBenefitForm({ ...benefitForm, employeeId: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || `${e.firstName} ${e.lastName}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Benefit Type *</label>
                <select
                  value={benefitForm.benefitType}
                  onChange={(e) => setBenefitForm({ ...benefitForm, benefitType: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="car">Company Car Benefit</option>
                  <option value="fuel">Company Car Fuel</option>
                  <option value="medical">Private Medical Treatment / Insurance</option>
                  <option value="van">Van Benefit & Van Fuel</option>
                  <option value="loan">Interest-Free / Low-Interest Loan</option>
                  <option value="assets">Assets Transferred / Placed at Disposal</option>
                  <option value="relocation">Relocation Expenses (&gt; £8,000)</option>
                  <option value="other">Other Benefits / Services</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  value={benefitForm.description}
                  onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })}
                  placeholder="e.g. Bupa Comprehensive Family Cover"
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Cost to Employer (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={benefitForm.costToEmployer}
                    onChange={(e) => handleCostChange(e.target.value, benefitForm.employeeContribution)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Staff Contrib. (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={benefitForm.employeeContribution}
                    onChange={(e) => handleCostChange(benefitForm.costToEmployer, e.target.value)}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-500 block">Class 1A NIC (13.8%):</span>
                  <span className="font-mono font-bold text-purple-900">£{benefitForm.class1aPayable}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-500 block">Taxable Cash Equiv:</span>
                  <span className="font-mono font-bold text-gray-900">£{benefitForm.cashEquivalent}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowBenefitModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveBenefitMutation.mutate(benefitForm)}
                disabled={!benefitForm.employeeId || saveBenefitMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save P11D Benefit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Car Modal */}
      {showCarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Register Company Car (P46)</h3>
              <button onClick={() => setShowCarModal(false)}><X size={16} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Employee *</label>
                <select
                  value={carForm.employeeId}
                  onChange={(e) => setCarForm({ ...carForm, employeeId: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || `${e.firstName} ${e.lastName}`}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Make & Model *</label>
                  <input
                    value={carForm.makeAndModel}
                    onChange={(e) => setCarForm({ ...carForm, makeAndModel: e.target.value })}
                    placeholder="e.g. BMW 330e M Sport"
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Registration *</label>
                  <input
                    value={carForm.registrationNumber}
                    onChange={(e) => setCarForm({ ...carForm, registrationNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. AB21 CDE"
                    className="w-full border rounded-lg p-2 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">List Price (P11D Value) *</label>
                  <input
                    type="number"
                    step="100"
                    value={carForm.listPrice}
                    onChange={(e) => setCarForm({ ...carForm, listPrice: e.target.value })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">CO2 Emissions (g/km)</label>
                  <input
                    type="number"
                    value={carForm.co2Emissions}
                    onChange={(e) => setCarForm({ ...carForm, co2Emissions: Number(e.target.value) })}
                    className="w-full border rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Date Available From</label>
                <input
                  type="date"
                  value={carForm.dateAvailableFrom}
                  onChange={(e) => setCarForm({ ...carForm, dateAvailableFrom: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={carForm.fuelProvided}
                  onChange={(e) => setCarForm({ ...carForm, fuelProvided: e.target.checked })}
                />
                <span>Free fuel provided for private mileage (Taxable fuel benefit)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowCarModal(false)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
              <button
                onClick={() => saveCarMutation.mutate(carForm)}
                disabled={!carForm.employeeId || !carForm.makeAndModel || saveCarMutation.isPending}
                className="btn-SanSuite text-xs"
              >
                Save P46 Car
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
