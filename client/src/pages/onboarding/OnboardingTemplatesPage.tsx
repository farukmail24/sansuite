import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { onboardingSidebar } from "./onboardingCommon";
import {
  Download, Upload, FileSpreadsheet, FileText,
  CheckCircle2, Search, Check, X, ArrowDownToLine
} from "lucide-react";
import { useToast } from "../../hooks/useToast";

export default function OnboardingTemplatesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "coa", label: "Chart of Accounts" },
    { id: "tb", label: "Opening Balances & TB" },
    { id: "contacts", label: "Customers & Suppliers" },
    { id: "transactions", label: "Transactions & Banking" },
  ];

  const templates = [
    {
      id: "uk-frs102-coa",
      title: "UK Standard FRS 102 1A Chart of Accounts",
      category: "coa",
      format: "Excel (.XLSX) & CSV",
      desc: "Full standard 4-digit UK nominal code structure for small and medium limited companies.",
      fields: ["Account Code", "Account Name", "Category", "Sub-Category", "Standard UK VAT Rate"],
    },
    {
      id: "uk-frs105-coa",
      title: "UK Micro-Entity FRS 105 Chart of Accounts",
      category: "coa",
      format: "Excel (.XLSX) & CSV",
      desc: "Streamlined statutory chart of accounts specifically tailored for UK micro-entities.",
      fields: ["Nominal Code", "Account Description", "Statement Type (P&L / Balance Sheet)", "Tax Treatment"],
    },
    {
      id: "charity-sorp-coa",
      title: "Charity SORP Specialized Chart of Accounts",
      category: "coa",
      format: "CSV",
      desc: "Chart of accounts with SOFA fund classification (Restricted, Unrestricted, Endowment).",
      fields: ["Nominal Code", "Fund ID", "Fund Type", "Charitable Activity Category", "SORP Code"],
    },
    {
      id: "opening-tb",
      title: "Opening Trial Balance Migration Template",
      category: "tb",
      format: "CSV & Excel",
      desc: "Multi-column opening trial balance template with automatic zero-variance balancing.",
      fields: ["Nominal Code", "Account Name", "Debit Amount (£)", "Credit Amount (£)", "Cost Centre / Department"],
    },
    {
      id: "aged-debtors",
      title: "Customer Opening Balances (Aged Debtors)",
      category: "tb",
      format: "CSV",
      desc: "Batch import outstanding sales invoices and customer balances on conversion date.",
      fields: ["Customer Name", "Invoice Ref", "Invoice Date", "Due Date", "Gross Amount", "Outstanding Balance"],
    },
    {
      id: "aged-creditors",
      title: "Supplier Opening Balances (Aged Creditors)",
      category: "tb",
      format: "CSV",
      desc: "Batch import outstanding supplier bills and unpaid purchase ledger balances.",
      fields: ["Supplier Name", "Bill Ref", "Bill Date", "Payment Due Date", "Total Unpaid Amount"],
    },
    {
      id: "batch-customers",
      title: "Batch Customers Master Data Template",
      category: "contacts",
      format: "Excel (.XLSX) & CSV",
      desc: "Bulk customer directory import with contact details, VAT numbers, and credit terms.",
      fields: ["Customer Name", "Company Reg No", "VAT Reg No", "Email", "Billing Address", "Default Payment Terms"],
    },
    {
      id: "batch-suppliers",
      title: "Batch Suppliers & Vendors Template",
      category: "contacts",
      format: "Excel (.XLSX) & CSV",
      desc: "Bulk vendor list with bank details for BACS payments, CIS status, and expense categorization.",
      fields: ["Supplier Name", "Sort Code", "Account Number", "CIS Registered (Y/N)", "Default Expense Code"],
    },
    {
      id: "bank-statement-csv",
      title: "Bank Statement Standard CSV Format",
      category: "transactions",
      format: "CSV",
      desc: "Universal 4-column bank transaction statement format for automated reconciliation.",
      fields: ["Transaction Date (DD/MM/YYYY)", "Description / Payee", "Amount (Positive/Negative)", "Reference"],
    },
    {
      id: "sales-invoices-history",
      title: "Historical Sales Invoices Batch Template",
      category: "transactions",
      format: "CSV",
      desc: "Import multi-line sales invoices with line item descriptions, quantities, unit prices, and VAT.",
      fields: ["Invoice Number", "Customer Name", "Item Description", "Quantity", "Unit Price", "VAT Code", "Total"],
    },
  ];

  const handleDownload = (tmpl: any) => {
    toast({
      title: "Template Download Started",
      description: `Downloaded "${tmpl.title}" in certified ${tmpl.format} format.`,
    });
  };

  const filtered = templates.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.fields.some((f) => f.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout sidebar={onboardingSidebar} module="Onboarding & Migration">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-xs p-6 space-y-6 w-full mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Download size={18} className="text-indigo-600" />
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Accounting Data Import & Migration Templates Library
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Certified Excel (.XLSX) and CSV templates formatted with statutory UK nominal codes, trial balances, and batch contact registers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              10 Certified Templates Ready
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-72">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates or fields..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                        {tmpl.title}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">{tmpl.format}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Certified
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-500 leading-relaxed mt-2">{tmpl.desc}</p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Included Columns / Fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.fields.map((f, i) => (
                      <span key={i} className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> 100% Ready to Import
                </span>

                <button
                  onClick={() => handleDownload(tmpl)}
                  className="px-3 py-1.5 bg-[#5c469c] hover:bg-[#4b3882] text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowDownToLine size={13} /> Download Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
