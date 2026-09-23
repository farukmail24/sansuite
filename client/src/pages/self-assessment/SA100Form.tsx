import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { LayoutDashboard, FileText, Settings, Send, Save, User, Briefcase, Home, TrendingUp, GraduationCap, Trash2 } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

const sidebar = [
  { label: "Dashboard", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA100 (Individuals)", icon: <FileText size={15} />, route: "/self-assessment/sa100" },
  { label: "SA800 (Partnerships)", icon: <FileText size={15} />, route: "/self-assessment/sa800" },
  { label: "SA900 (Trusts)", icon: <FileText size={15} />, route: "/self-assessment/sa900" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

const TAX_BANDS_2025_26 = [
  { label: "Personal Allowance", threshold: 12570, rate: 0 },
  { label: "Basic Rate", threshold: 50270, rate: 20 },
  { label: "Higher Rate", threshold: 125140, rate: 40 },
  { label: "Additional Rate", threshold: Infinity, rate: 45 },
];

function calculateIncomeTax(taxableIncome: number): number {
  let tax = 0;
  let remaining = Math.max(0, taxableIncome - 12570); // after personal allowance
  const bands = [
    { limit: 50270 - 12570, rate: 0.20 },
    { limit: 125140 - 50270, rate: 0.40 },
    { limit: Infinity, rate: 0.45 },
  ];
  for (const band of bands) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }
  return tax;
}

type Section = "employment" | "selfEmployment" | "property" | "savings" | "studentLoan";

export default function SA100Form() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [taxYear, setTaxYear] = useState("2025/2026");
  const [activeSection, setActiveSection] = useState<Section>("employment");

  const [income, setIncome] = useState({
    employment: "",
    selfEmploymentProfit: "",
    propertyIncome: "",
    savingsInterest: "",
    dividends: "",
  });

  const [allowances, setAllowances] = useState({
    pensionContributions: "",
    giftAid: "",
    studentLoan: false,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    select: (d: any[]) => d.filter((c) => ["SoleTrader", "Individual", "Partnership"].includes(c.clientType)),
  });

  const { data: savedReturns = [] } = useQuery({
    queryKey: ["/api/self-assessment/sa100", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/self-assessment/sa100/${clientId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!clientId,
  });

  const saveSA100 = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Please select a client first");
      const res = await apiRequest("POST", "/api/self-assessment/sa100", {
        clientId: parseInt(clientId),
        taxYear,
        netIncome: totalIncome,
        allowances: totalAllowances,
        taxableIncome,
        taxDue: totalTaxDue,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "SA100 Saved", description: "Return saved to database", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/self-assessment/sa100", clientId] });
      return data;
    },
    onError: (e: any) => toast({ title: "Save Failed", description: e.message, type: "error" }),
  });

  const calculateSA100 = useMutation({
    mutationFn: async (returnId: number) => {
      const res = await apiRequest("POST", `/api/self-assessment/sa100/${returnId}/calculate`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Computation Verified", description: "Backend engine successfully calculated tax liability.", type: "success" });
      qc.invalidateQueries({ queryKey: ["/api/self-assessment/sa100", clientId] });
    },
    onError: (e: any) => toast({ title: "Calculation Failed", description: e.message, type: "error" }),
  });

  const updateClientDetail = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string }) => {
      if (!clientId) return;
      const res = await apiRequest("PATCH", `/api/practice/clients/${clientId}`, {
        [field]: value
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practice/clients"] });
    },
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, type: "error" }),
  });

  const selectedClient = clients.find((c: any) => String(c.id) === clientId);

  // Tax calculation
  const totalIncome =
    parseFloat(income.employment || "0") +
    parseFloat(income.selfEmploymentProfit || "0") +
    parseFloat(income.propertyIncome || "0") +
    parseFloat(income.savingsInterest || "0") +
    parseFloat(income.dividends || "0");

  const totalAllowances =
    parseFloat(allowances.pensionContributions || "0") +
    parseFloat(allowances.giftAid || "0");

  const taxableIncome = Math.max(0, totalIncome - totalAllowances);
  const incomeTax = calculateIncomeTax(taxableIncome);
  const niContrib = Math.max(0, (Math.min(taxableIncome, 50270) - 12570) * 0.08);
  const studentLoanRepayment = allowances.studentLoan ? Math.max(0, (totalIncome - 27295) * 0.09) : 0;
  const totalTaxDue = incomeTax + niContrib + studentLoanRepayment;

  const setIncomeField = (k: keyof typeof income, v: string) =>
    setIncome((f) => ({ ...f, [k]: v }));

  const setAllowanceField = (k: keyof typeof allowances, v: any) =>
    setAllowances((f) => ({ ...f, [k]: v }));

  const sections = [
    { id: "employment", label: "Employment Income", icon: <Briefcase size={14} /> },
    { id: "selfEmployment", label: "Self-Employment", icon: <User size={14} /> },
    { id: "property", label: "Property Income", icon: <Home size={14} /> },
    { id: "savings", label: "Savings & Dividends", icon: <TrendingUp size={14} /> },
    { id: "studentLoan", label: "Student Loan", icon: <GraduationCap size={14} /> },
  ];

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-gray-400">Home / Self Assessment / SA100</p>
            <h1 className="text-lg font-bold text-gray-800 mt-0.5">SA100 — Individual Tax Return</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveSA100.mutate()}
              disabled={!clientId || saveSA100.isPending}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50">
              <Save size={14} /> {saveSA100.isPending ? "Saving..." : "Save Return"}
            </button>
            <button disabled={!clientId} className="btn-SanSuite flex items-center gap-2 disabled:opacity-50">
              <Send size={14} /> Submit to HMRC
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="col-span-2 space-y-4">
            {/* Client Selector */}
            <div className="SanSuite-card p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Client *</label>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    <option value="">Select client...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tax Year</label>
                  <select value={taxYear} onChange={(e) => setTaxYear(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
                    {["2025/2026", "2024/2025", "2023/2024"].map((y) => <option key={y}>{y}</option>)}
                  </select>
                </div>
                {selectedClient && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">UTR Number</label>
                      <input 
                        defaultValue={selectedClient.utrNumber || ""} 
                        onBlur={(e) => {
                          if (e.target.value !== selectedClient.utrNumber) {
                            updateClientDetail.mutate({ field: "utrNumber", value: e.target.value });
                          }
                        }}
                        placeholder="e.g. 1234567890"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">NI Number</label>
                      <input 
                        defaultValue={selectedClient.niNumber || ""} 
                        onBlur={(e) => {
                          if (e.target.value !== selectedClient.niNumber) {
                            updateClientDetail.mutate({ field: "niNumber", value: e.target.value });
                          }
                        }}
                        placeholder="e.g. QQ123456A"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Income Sections Tabs */}
            <div className="SanSuite-card overflow-hidden">
              <div className="flex border-b overflow-x-auto">
                {sections.map((s) => (
                  <button key={s.id} onClick={() => setActiveSection(s.id as Section)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeSection === s.id
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeSection === "employment" && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      Enter employment income from P60 / P11D forms. PAYE tax already deducted will be offset against the final liability.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Gross Employment Income (£)</label>
                      <input type="number" value={income.employment} onChange={(e) => setIncomeField("employment", e.target.value)}
                        placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                )}
                {activeSection === "selfEmployment" && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      Enter net profit from self-employment after deducting allowable business expenses.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Net Self-Employment Profit (£)</label>
                      <input type="number" value={income.selfEmploymentProfit} onChange={(e) => setIncomeField("selfEmploymentProfit", e.target.value)}
                        placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                )}
                {activeSection === "property" && (
                  <div className="space-y-4">
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      Enter net rental income after deducting allowable property expenses. Mortgage interest relief limited to basic rate.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Net Rental Income (£)</label>
                      <input type="number" value={income.propertyIncome} onChange={(e) => setIncomeField("propertyIncome", e.target.value)}
                        placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                    </div>
                  </div>
                )}
                {activeSection === "savings" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Interest from Savings (£)</label>
                        <input type="number" value={income.savingsInterest} onChange={(e) => setIncomeField("savingsInterest", e.target.value)}
                          placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Dividends (£)</label>
                        <input type="number" value={income.dividends} onChange={(e) => setIncomeField("dividends", e.target.value)}
                          placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                      </div>
                    </div>
                  </div>
                )}
                {activeSection === "studentLoan" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <input type="checkbox" id="sl" checked={allowances.studentLoan}
                        onChange={(e) => setAllowanceField("studentLoan", e.target.checked)}
                        className="w-4 h-4 rounded" />
                      <label htmlFor="sl" className="text-sm text-gray-700">
                        Student Loan repayments due (Plan 2: 9% above £27,295)
                      </label>
                    </div>
                    {allowances.studentLoan && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        Estimated repayment: <strong>£{studentLoanRepayment.toFixed(2)}</strong> based on total income of £{totalIncome.toFixed(2)}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Allowances */}
            <div className="SanSuite-card p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">Deductions & Allowances</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Pension Contributions (£)</label>
                  <input type="number" value={allowances.pensionContributions}
                    onChange={(e) => setAllowanceField("pensionContributions", e.target.value)}
                    placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gift Aid Donations (£)</label>
                  <input type="number" value={allowances.giftAid}
                    onChange={(e) => setAllowanceField("giftAid", e.target.value)}
                    placeholder="0.00" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Saved Returns */}
          {clientId && (
            <div className="SanSuite-card">
              <div className="px-5 py-4 border-b">
                <h3 className="font-semibold text-sm text-gray-700">Saved SA100 Returns</h3>
              </div>
              <table className="SanSuite-table">
                <thead><tr>
                  <th>Tax Year</th><th>Total Income</th><th>Taxable Income</th><th>Tax Due</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {savedReturns.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">No returns saved yet.</td></tr>
                  ) : savedReturns.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.taxYear}</td>
                      <td>£{parseFloat(r.netIncome || "0").toLocaleString()}</td>
                      <td>£{parseFloat(r.taxableIncome || "0").toLocaleString()}</td>
                      <td className="font-semibold text-purple-700">£{parseFloat(r.taxDue || "0").toLocaleString()}</td>
                      <td><span className="badge-info">{r.status}</span></td>
                      <td>
                        {r.status !== "Calculated" && (
                          <button 
                            onClick={() => calculateSA100.mutate(r.id)}
                            disabled={calculateSA100.isPending}
                            className="text-xs text-white bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded disabled:opacity-50"
                          >
                            Verify Compute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Right: Tax Summary */}
          <div>
            <div className="SanSuite-card p-5 sticky top-20">
              <h3 className="font-semibold text-sm text-gray-700 mb-4">Tax Summary 2025/26</h3>

              {/* Tax Bands Reference */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-gray-500 mb-2">INCOME TAX BANDS</p>
                {TAX_BANDS_2025_26.map((b) => (
                  <div key={b.label} className="flex justify-between text-xs text-gray-500">
                    <span>{b.label}</span>
                    <span className="font-medium">{b.rate}%</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-gray-500">Total Income</span>
                  <span className="font-medium">£{totalIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b text-green-600">
                  <span>(-) Allowances</span>
                  <span>(£{totalAllowances.toFixed(2)})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b font-medium">
                  <span>Taxable Income</span>
                  <span>£{taxableIncome.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-gray-500">Income Tax</span>
                  <span>£{incomeTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-gray-500">National Insurance (Class 4)</span>
                  <span>£{niContrib.toFixed(2)}</span>
                </div>
                {allowances.studentLoan && (
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-gray-500">Student Loan</span>
                    <span>£{studentLoanRepayment.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 px-3 mt-2 rounded-lg font-bold text-white"
                  style={{ background: "#6c5ce7" }}>
                  <span>Total Tax Due</span>
                  <span>£{totalTaxDue.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
