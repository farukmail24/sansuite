import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { 
  ChevronRight, Save, ArrowLeft, Package, FileText, Tag, ShoppingBag, DollarSign
} from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";

// COA options are fetched dynamically via /api/bookkeeping/coa/:clientId

const VAT_OPTIONS = [
  { value: "20.00", label: "Standard 20%" },
  { value: "5.00", label: "Reduced 5%" },
  { value: "0.00", label: "Zero Rated 0%" },
  { value: "exempt", label: "Exempt" },
];

export default function ItemFormPage() {
  const [matchClientNew, paramsClientNew] = useRoute("/bookkeeping/:id/items/new");
  const [matchClientEdit, paramsClientEdit] = useRoute("/bookkeeping/:id/items/:itemId/edit");
  const [matchNew, paramsNew] = useRoute("/bookkeeping/items/new");
  const [matchEdit, paramsEdit] = useRoute("/bookkeeping/items/:itemId/edit");

  const clientId = paramsClientNew?.id || paramsClientEdit?.id || "";
  const itemId = paramsClientEdit?.itemId || paramsEdit?.itemId || "";
  const isEditMode = !!itemId;

  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState(clientId);
  const [name, setName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [type, setType] = useState("Product");
  const [description, setDescription] = useState("");

  const [salesPrice, setSalesPrice] = useState("0.00");
  const [salesVatRate, setSalesVatRate] = useState("20.00");
  const [salesNominalCode, setSalesNominalCode] = useState("4000");
  const [salesDescription, setSalesDescription] = useState("");

  const [purchasePrice, setPurchasePrice] = useState("0.00");
  const [purchaseVatRate, setPurchaseVatRate] = useState("20.00");
  const [purchaseNominalCode, setPurchaseNominalCode] = useState("5000");
  const [purchaseDescription, setPurchaseDescription] = useState("");

  // Opening Balance & Inventory Tracking (Capium Parity)
  const [openingBalanceQuantity, setOpeningBalanceQuantity] = useState("0");
  const [openingBalancePrice, setOpeningBalancePrice] = useState("0.00");
  const [isActive, setIsActive] = useState(true);

  const openingBalanceAmount = (
    (parseFloat(openingBalanceQuantity) || 0) * (parseFloat(openingBalancePrice) || 0)
  ).toFixed(2);

  // Practice Clients Query
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      return res.ok ? res.json() : [];
    },
  });

  const activeClientId = selectedClientId || clientId || (clients.length > 0 ? String(clients[0].id) : "");
  const client = clients.find((c: any) => String(c.id) === activeClientId);

  // Existing Item Query if in Edit mode
  const { data: existingItem } = useQuery({
    queryKey: ["/api/bookkeeping/items/single", itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const res = await apiRequest("GET", "/api/bookkeeping/items");
      if (res.ok) {
        const all = await res.json();
        return Array.isArray(all) ? all.find((i: any) => String(i.id) === itemId) : null;
      }
      return null;
    },
    enabled: isEditMode,
  });

  // Chart of Accounts Query
  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["/api/bookkeeping/coa", activeClientId],
    queryFn: async () => {
      if (!activeClientId) return [];
      const res = await apiRequest("GET", `/api/bookkeeping/coa/${activeClientId}`);
      return res.ok ? res.json() : [];
    },
    enabled: !!activeClientId,
  });

  const ACCOUNT_OPTIONS = chartOfAccounts
    .filter((a: any) => a.nominalCode.startsWith("4") || a.category.toLowerCase().includes("income") || a.category.toLowerCase().includes("revenue"))
    .map((a: any) => ({ value: a.nominalCode, label: `${a.nominalCode} - ${a.name}` }));

  const PURCHASE_ACCOUNT_OPTIONS = chartOfAccounts
    .filter((a: any) => (parseInt(a.nominalCode) >= 5000 && parseInt(a.nominalCode) <= 7999) || a.category.toLowerCase().includes("expense"))
    .map((a: any) => ({ value: a.nominalCode, label: `${a.nominalCode} - ${a.name}` }));

  useEffect(() => {
    if (existingItem) {
      setName(existingItem.name || "");
      setItemCode(existingItem.itemCode || "");
      setType(existingItem.type || "Product");
      setDescription(existingItem.description || "");
      setSalesPrice(existingItem.salesPrice || "0.00");
      setSalesVatRate(existingItem.salesVatRate || "20.00");
      setSalesNominalCode(existingItem.salesNominalCode || "4000");
      setSalesDescription(existingItem.salesDescription || existingItem.description || "");
      setPurchasePrice(existingItem.purchasePrice || "0.00");
      setPurchaseVatRate(existingItem.purchaseVatRate || "20.00");
      setPurchaseNominalCode(existingItem.purchaseNominalCode || "5000");
      setPurchaseDescription(existingItem.purchaseDescription || existingItem.description || "");
      setOpeningBalanceQuantity(existingItem.openingBalanceQuantity ? String(existingItem.openingBalanceQuantity) : "0");
      setOpeningBalancePrice(existingItem.openingBalancePrice ? String(existingItem.openingBalancePrice) : "0.00");
      setIsActive(existingItem.isActive !== undefined ? Boolean(existingItem.isActive) : true);
      if (existingItem.clientId) setSelectedClientId(String(existingItem.clientId));
    }
  }, [existingItem]);

  const saveMutation = useMutation({
    mutationFn: async (stayOnPage: boolean = false) => {
      if (!name.trim()) throw new Error("Item name is required.");

      const payload = {
        clientId: activeClientId ? Number(activeClientId) : 1,
        name: name.trim(),
        itemCode: itemCode.trim() || `ITM-${Math.floor(100 + Math.random() * 900)}`,
        type,
        description,
        salesPrice: String(salesPrice || "0.00"),
        salesVatRate: String(salesVatRate || "20.00"),
        salesNominalCode: String(salesNominalCode || "4000"),
        salesDescription,
        purchasePrice: String(purchasePrice || "0.00"),
        purchaseVatRate: String(purchaseVatRate || "20.00"),
        purchaseNominalCode: String(purchaseNominalCode || "5000"),
        purchaseDescription,
        openingBalanceQuantity: String(openingBalanceQuantity || "0"),
        openingBalancePrice: String(openingBalancePrice || "0.00"),
        openingBalanceAmount: String(openingBalanceAmount || "0.00"),
        isActive,
      };

      const url = isEditMode ? `/api/bookkeeping/items/${itemId}` : "/api/bookkeeping/items";
      const method = isEditMode ? "PUT" : "POST";

      const res = await apiRequest(method, url, payload);
      if (!res.ok) throw new Error("Failed to save item details.");
      return { data: await res.json(), stayOnPage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookkeeping/items/client", activeClientId] });
      toast({
        title: isEditMode ? "Item Updated" : "Item Created",
        description: `Successfully saved item "${name}".`,
      });

      if (result.stayOnPage) {
        resetForm();
      } else {
        navigate(backUrl);
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to Save Item", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setItemCode("");
    setType("Product");
    setDescription("");
    setSalesPrice("0.00");
    setSalesVatRate("20.00");
    setSalesNominalCode("4000");
    setSalesDescription("");
    setPurchasePrice("0.00");
    setPurchaseVatRate("20.00");
    setPurchaseNominalCode("5000");
    setPurchaseDescription("");
    setOpeningBalanceQuantity("0");
    setOpeningBalancePrice("0.00");
    setIsActive(true);
  };

  const backUrl = activeClientId ? `/bookkeeping/${activeClientId}/items` : "/bookkeeping/items";
  const sidebar = activeClientId ? getClientSidebar(activeClientId) : bookkeepingSidebar;

  return (
    <AppLayout sidebar={sidebar} module="Bookkeeping">
      <div className="bg-slate-100/70 min-h-screen pb-16">
        {/* Top Sticky Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-2xs sticky top-0 z-20">
          <div className="flex items-center text-xs font-medium text-slate-500 gap-1.5">
            <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600 transition-colors">Bookkeeping</button>
            <ChevronRight size={13} className="text-slate-400" />
            {activeClientId ? (
              <>
                <button onClick={() => navigate(`/bookkeeping/${activeClientId}`)} className="hover:text-purple-600 transition-colors">
                  {client?.clientName || `Client #${activeClientId}`}
                </button>
                <ChevronRight size={13} className="text-slate-400" />
              </>
            ) : null}
            <button onClick={() => navigate(backUrl)} className="hover:text-purple-600 transition-colors">Items & Products</button>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="text-slate-800 font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs border border-purple-200">
              {isEditMode ? "Edit Item" : "New Item"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(backUrl)}
              className="px-3 py-1 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft size={13} /> Cancel
            </button>
            {!isEditMode && (
              <button
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending || !name.trim()}
                className="px-3.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                Save & Add Another
              </button>
            )}
            <button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending || !name.trim()}
              className="px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Save size={13} /> {isEditMode ? "Update Item" : "Save & Close"}
            </button>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-5">
          {/* Header Title Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md">
                <Package size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  {isEditMode ? `Edit Item: ${name || "Item"}` : "Create New Product or Service Item"}
                </h1>
                <p className="text-xs text-slate-500">Define item details, sales prices, purchase costs, and descriptions.</p>
              </div>
            </div>
          </div>

          {/* CARD 1: GENERAL ITEM DETAILS */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                <Tag size={14} className="text-purple-600" />
                General Item Details
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item / Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Annual Audit & Advisory Service"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="e.g. ITM-101"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-mono font-semibold text-purple-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    <option value="Product">Product (Physical Good)</option>
                    <option value="Service">Service (Labor / Consulting)</option>
                  </select>
                </div>
              </div>

              {/* DEDICATED GENERAL DESCRIPTION TEXTAREA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>General Description & Specifications</span>
                  <span className="text-[11px] text-slate-400 font-normal">Visible internally and used for line auto-fill</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description, specifications, or internal notes for this item..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 resize-y leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: SALES INFORMATION & DESCRIPTION */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="bg-purple-50/50 border-b border-purple-100 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 tracking-wide uppercase flex items-center gap-2">
                <DollarSign size={14} className="text-purple-600" />
                Sales Information & Customer Description
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sales VAT Rate</label>
                  <select
                    value={salesVatRate}
                    onChange={(e) => setSalesVatRate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    {VAT_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Income Account</label>
                  <select
                    value={salesNominalCode}
                    onChange={(e) => setSalesNominalCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    {ACCOUNT_OPTIONS.map((a: any) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DEDICATED SALES DESCRIPTION TEXTAREA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Sales Line Description (Printed on Invoices & Quotes)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Text shown to customers when adding to sales invoices</span>
                </label>
                <textarea
                  rows={2}
                  value={salesDescription}
                  onChange={(e) => setSalesDescription(e.target.value)}
                  placeholder="Sales description to appear on customer invoices..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 resize-y"
                />
              </div>
            </div>
          </div>

          {/* CARD 3: PURCHASE INFORMATION & DESCRIPTION */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="bg-slate-50/80 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-2">
                <ShoppingBag size={14} className="text-purple-600" />
                Purchase Information & Supplier Description
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase VAT Rate</label>
                  <select
                    value={purchaseVatRate}
                    onChange={(e) => setPurchaseVatRate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    {VAT_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Account</label>
                  <select
                    value={purchaseNominalCode}
                    onChange={(e) => setPurchaseNominalCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 bg-white font-medium"
                  >
                    {PURCHASE_ACCOUNT_OPTIONS.map((a: any) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DEDICATED PURCHASE DESCRIPTION TEXTAREA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Purchase Line Description</span>
                  <span className="text-[11px] text-slate-400 font-normal">Text shown when adding to purchase bills</span>
                </label>
                <textarea
                  rows={2}
                  value={purchaseDescription}
                  onChange={(e) => setPurchaseDescription(e.target.value)}
                  placeholder="Purchase description for bills and purchase orders..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 resize-y"
                />
              </div>
            </div>
          </div>

          {/* CARD 4: INVENTORY & OPENING BALANCE (CAPIUM PARITY) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 tracking-wide uppercase flex items-center gap-2">
                <Package size={14} className="text-emerald-600" />
                Stock & Opening Balance Tracking
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                Initial Stock Valuation
              </span>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Set initial physical inventory units and unit cost to initialize stock and balance sheet valuation without a separate opening journal entry.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance Quantity</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={openingBalanceQuantity}
                    onChange={(e) => setOpeningBalanceQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Units in stock at start of bookkeeping</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Balance Price (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalancePrice}
                    onChange={(e) => setOpeningBalancePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-purple-600 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Cost valuation per unit at opening date</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Opening Amount (£)</label>
                  <div className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
                    <span>£{openingBalanceAmount}</span>
                    <span className="text-[10px] font-normal text-slate-400">Qty × Price</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Total asset valuation (Opening Stock)</span>
                </div>
              </div>

              {/* ACTIVE STATUS TOGGLE */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Item Status</span>
                  <span className="text-[11px] text-slate-400">Active items are selectable in sales invoices and purchase bills</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
