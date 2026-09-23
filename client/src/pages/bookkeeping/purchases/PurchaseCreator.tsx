import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import { getClientSidebar } from "../sidebar";
import { 
  FileText, LayoutDashboard, ShoppingCart, Wallet, BarChart2, Settings, 
  ChevronRight, Plus, Trash2, Save, X, Calendar as CalendarIcon, User, Hammer 
} from "lucide-react";

export default function PurchaseCreator() {
  const [match, params] = useRoute("/bookkeeping/:id/purchases/new");
  const [, navigate] = useLocation();
  const clientId = params?.id;
  const { toast } = useToast();

  

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
  });
  const client = clients.find((c: any) => String(c.id) === clientId);

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/contacts/client", clientId],
    queryFn: async () => {
      const url = clientId ? `/api/bookkeeping/contacts/client/${clientId}` : "/api/bookkeeping/contacts";
      const res = await apiRequest("GET", url);
      return res.ok ? res.json() : [];
    },
  });

  const supplierContacts = contacts.filter((c: any) => {
    if (clientId && c.clientId && String(c.clientId) !== String(clientId)) return false;
    const cType = (c.contactType || "").toLowerCase();
    return !cType || cType === "supplier" || cType === "both";
  });

  const allSuppliers = supplierContacts.map((c: any) => ({ id: String(c.id), name: c.name || c.contactName }));

  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [billNumber, setBillNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [supplierId, setSupplierId] = useState("");
  
  // CIS Support
  const [isCis, setIsCis] = useState(false);
  const [cisSubcontractorId, setCisSubcontractorId] = useState("");
  const [cisDeductionRate, setCisDeductionRate] = useState("20.00");

  const { data: subcontractors = [] } = useQuery({
    queryKey: [`/api/cis/subcontractors/${clientId}`],
    queryFn: async () => {
      if (!clientId) return [];
      const res = await apiRequest("GET", `/api/cis/subcontractors/${clientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!clientId
  });

  const [items, setItems] = useState([
    { id: Date.now(), description: "", quantity: 1, unitPrice: 0, vatRate: 20, nominalCode: "5000", itemType: "Standard" }
  ]);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", quantity: 1, unitPrice: 0, vatRate: 20, nominalCode: "5000", itemType: isCis ? "Labor" : "Standard" }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Calculations
  const totals = items.reduce((acc, item) => {
    const net = Number(item.quantity) * Number(item.unitPrice);
    const vat = net * (Number(item.vatRate) / 100);
    return {
      subTotal: acc.subTotal + net,
      vatTotal: acc.vatTotal + vat,
      grandTotal: acc.grandTotal + net + vat
    };
  }, { subTotal: 0, vatTotal: 0, grandTotal: 0 });

  let laborTotal = 0;
  let materialsTotal = 0;
  items.forEach(it => {
    const net = Number(it.quantity) * Number(it.unitPrice);
    if (it.itemType === "Labor") {
      laborTotal += net;
    } else {
      materialsTotal += net;
    }
  });

  const rateNum = parseFloat(cisDeductionRate || "20.00");
  const cisDeductionAmount = isCis ? (laborTotal * (rateNum / 100)) : 0;
  const netPayable = totals.grandTotal - cisDeductionAmount;

  const createPurchaseMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        clientId,
        supplierId: supplierId || undefined,
        billNumber,
        billDate,
        dueDate: dueDate || undefined,
        isCis,
        cisSubcontractorId: isCis && cisSubcontractorId ? parseInt(cisSubcontractorId) : undefined,
        cisDeductionRate: isCis ? rateNum : 0,
        laborTotal: laborTotal.toFixed(2),
        materialsTotal: materialsTotal.toFixed(2),
        cisDeductionAmount: cisDeductionAmount.toFixed(2),
        items: items.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          vatRate: Number(i.vatRate),
          itemType: isCis ? (i.itemType || "Labor") : "Standard",
        }))
      };
      
      const res = await apiRequest("POST", "/api/bookkeeping/purchases", payload);
      if (!res.ok) throw new Error("Failed to create bill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookkeeping/purchases/client/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cis/returns/${clientId}/calculate`] });
      toast({ title: "Bill Created", description: "The supplier bill was created successfully." });
      navigate(`/bookkeeping/${clientId}/purchases`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create bill." });
    }
  });

  return (
    <AppLayout sidebar={getClientSidebar(clientId || "")} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen pb-20">
        <div className="bg-white px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}`)} className="hover:text-purple-600 transition-colors">{client?.clientName || 'Client'}</button>
            <ChevronRight size={14} className="mx-1" />
            <button onClick={() => navigate(`/bookkeeping/${clientId}/purchases`)} className="hover:text-purple-600 transition-colors">Purchases</button>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-800 font-medium">New Bill</span>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Create Supplier Bill</h1>
              <p className="text-gray-500 text-sm mt-1">Log a new purchase or supplier bill.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate(`/bookkeeping/${clientId}/purchases`)}
                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={() => createPurchaseMutation.mutate()}
                disabled={createPurchaseMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {createPurchaseMutation.isPending ? "Saving..." : "Save Bill"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Supplier</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select 
                      value={supplierId} 
                      onChange={e => setSupplierId(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select Supplier...</option>
                      {allSuppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Bill Number</label>
                  <input 
                    type="text" 
                    value={billNumber}
                    onChange={e => setBillNumber(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-medium text-purple-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Bill Date</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date" 
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Due Date</label>
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CIS Subcontractor Banner & Options */}
            <div className="px-6 py-4 bg-purple-50/50 border-b border-purple-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCis}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsCis(checked);
                      if (checked && items.length > 0) {
                        setItems(items.map(it => ({ ...it, itemType: it.itemType === "Standard" ? "Labor" : it.itemType })));
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-1.5 font-medium text-purple-900 text-sm">
                    <Hammer size={16} className="text-purple-600" />
                    <span>CIS Subcontractor Bill (Construction Industry Scheme)</span>
                  </div>
                </label>

                {isCis && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-600">Subcontractor:</label>
                      <select
                        value={cisSubcontractorId}
                        onChange={(e) => {
                          const subId = e.target.value;
                          setCisSubcontractorId(subId);
                          const found = subcontractors.find((s: any) => String(s.id) === subId);
                          if (found && found.deductionRate) {
                            setCisDeductionRate(String(found.deductionRate));
                          }
                        }}
                        className="px-3 py-1.5 text-sm border border-purple-200 rounded-lg bg-white focus:border-purple-500 outline-none text-gray-800"
                      >
                        <option value="">Select Subcontractor...</option>
                        {subcontractors.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.verifyStatus || 'Standard'} - {s.deductionRate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-600">Deduction Rate:</label>
                      <select
                        value={cisDeductionRate}
                        onChange={(e) => setCisDeductionRate(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-purple-200 rounded-lg bg-white focus:border-purple-500 outline-none text-gray-800"
                      >
                        <option value="20.00">20% (Standard Rate)</option>
                        <option value="30.00">30% (Higher / Unverified)</option>
                        <option value="0.00">0% (Gross Payment)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-xs font-semibold text-gray-500 border-b border-gray-200">
                    <th className="px-5 py-3 w-8"></th>
                    <th className="px-5 py-3 uppercase tracking-wider">Description</th>
                    {isCis && <th className="px-5 py-3 uppercase tracking-wider w-36">CIS Type</th>}
                    <th className="px-5 py-3 uppercase tracking-wider w-24">Qty</th>
                    <th className="px-5 py-3 uppercase tracking-wider w-32">Unit Price</th>
                    <th className="px-5 py-3 uppercase tracking-wider w-28">VAT Rate</th>
                    <th className="px-5 py-3 uppercase tracking-wider w-32 text-right">Net Amount</th>
                    <th className="px-5 py-3 uppercase tracking-wider w-32 text-right">VAT Amount</th>
                    <th className="px-5 py-3 uppercase tracking-wider w-32 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {items.map((item, index) => {
                    const net = Number(item.quantity) * Number(item.unitPrice);
                    const vat = net * (Number(item.vatRate) / 100);
                    const total = net + vat;

                    return (
                      <tr key={item.id} className="border-b border-gray-100 group hover:bg-gray-50">
                        <td className="px-3 py-3 text-center align-top pt-5">
                          <button 
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <textarea 
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Description of goods/services..."
                            className="w-full p-2 text-sm border border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded outline-none resize-none bg-white transition-colors h-10 min-h-10"
                          />
                        </td>
                        {isCis && (
                          <td className="px-3 py-3 align-top">
                            <select
                              value={item.itemType || "Labor"}
                              onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}
                              className="w-full p-2 text-sm border border-purple-200 hover:border-purple-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded outline-none bg-white font-medium text-purple-900 transition-colors"
                            >
                              <option value="Labor">Labor (Subject to CIS)</option>
                              <option value="Materials">Materials (CIS Exempt)</option>
                            </select>
                          </td>
                        )}
                        <td className="px-3 py-3 align-top">
                          <input 
                            type="number" min="1" step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded outline-none bg-white transition-colors"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">£</span>
                            <input 
                              type="number" min="0" step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                              className="w-full pl-6 p-2 text-sm border border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded outline-none bg-white transition-colors"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <select
                            value={item.vatRate}
                            onChange={(e) => updateItem(item.id, 'vatRate', e.target.value)}
                            className="w-full p-2 text-sm border border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded outline-none bg-white transition-colors"
                          >
                            <option value="20">20% (Standard)</option>
                            <option value="5">5% (Reduced)</option>
                            <option value="0">0% (Zero)</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 align-top pt-5 text-right font-medium text-gray-600">
                          £{net.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 align-top pt-5 text-right text-gray-500">
                          £{vat.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 align-top pt-5 text-right font-semibold text-gray-800">
                          £{total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={addItem}
                  className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1 hover:bg-purple-50 px-3 py-1.5 rounded transition-colors"
                >
                  <Plus size={16} /> Add Line Item
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-6 flex justify-end border-t border-gray-200">
              <div className="w-80 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="text-gray-800 font-semibold">£{totals.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pb-2 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Total VAT</span>
                  <span className="text-gray-600 font-medium">£{totals.vatTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-800 font-bold text-base">Invoice Grand Total</span>
                  <span className="text-purple-700 font-bold text-lg">£{totals.grandTotal.toFixed(2)}</span>
                </div>

                {isCis && (
                  <div className="mt-3 pt-3 border-t border-purple-200 bg-purple-50/60 p-3 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Labor Component:</span>
                      <span className="font-semibold">£{laborTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Materials Component (Exempt):</span>
                      <span className="font-semibold">£{materialsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-600 font-semibold pt-1 border-t border-purple-200/60">
                      <span>Less CIS Tax ({cisDeductionRate}% on Labor):</span>
                      <span>-£{cisDeductionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-bold text-sm pt-1 border-t border-purple-200">
                      <span>Net Payable to Subcontractor:</span>
                      <span>£{netPayable.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
