import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { Search, BookOpen, ChevronRight, HelpCircle, FileText, ChevronDown, Sparkles } from "lucide-react";

interface Article {
  id: string;
  category: string;
  title: string;
  snippet: string;
  content: string;
}

const kbArticles: Article[] = [
  {
    id: "1",
    category: "Bookkeeping",
    title: "How to Create and Issue Sales Invoices",
    snippet: "Step-by-step guide to generating customer invoices, line items, and VAT rates.",
    content: "To create a sales invoice, navigate to Bookkeeping -> Invoices and click 'Create Invoice'. Select a customer contact, enter line items with nominal codes, and select the applicable VAT rate (20% Standard, 0% Zero-Rated, or Exempt). Once saved, click 'Issue' to generate a downloadable PDF or send directly to the customer email.",
  },
  {
    id: "2",
    category: "Bookkeeping",
    title: "Bank Account Reconciliation & Transaction Matching",
    snippet: "Reconcile your bank statements with recorded sales and purchases.",
    content: "Go to Bookkeeping -> Bank. Select your bank account and click 'Reconcile'. Import your CSV bank feed or view unmatched transactions. Match debits against purchase bills and credits against sales invoices. Once all items balance, click 'Finalize Reconciliation'.",
  },
  {
    id: "3",
    category: "Payroll",
    title: "Processing Monthly Pay Runs & PAYE Deductions",
    snippet: "Calculate gross pay, income tax, employee NI, and employer NI.",
    content: "In the Payroll module, click 'Pay Runs' -> 'New Pay Run'. Select the tax month and employees. SanSuite's 2025/26 HMRC calculation engine will automatically determine PAYE tax and National Insurance based on employee tax codes (e.g. 1257L). Click 'Approve Pay Run' to generate payslips.",
  },
  {
    id: "4",
    category: "HMRC MTD",
    title: "Submitting VAT Returns via Making Tax Digital (MTD)",
    snippet: "Authorize HMRC Government Gateway and submit VAT Box 1-9 calculations.",
    content: "Go to Bookkeeping -> VAT -> MTD Portal. Click 'Authorize with HMRC Gateway' to complete OAuth2 login. Once authorized, calculate your VAT return for the period and click 'Submit to HMRC'. A digital submission receipt ID will be saved.",
  },
  {
    id: "5",
    category: "eSign",
    title: "Sending Documents for Digital Signature (eSign)",
    snippet: "Request client e-signatures under UK/EU eIDAS standards.",
    content: "Open eSign from the module launcher. Click 'New Signature Request', upload your PDF or tax return, and enter the signer's email address. eSign generates a secure token-based signing link sent to the client.",
  },
  {
    id: "6",
    category: "Practice Management",
    title: "Managing CRM Clients and Filing Deadlines",
    snippet: "Track VAT, CT600, and Accounts submission deadlines.",
    content: "Under Practice Management, open 'Deadlines' to view auto-generated filing deadlines based on client year-end dates. Assign tasks to staff members via the interactive Kanban board.",
  },
];

export default function KnowledgeBasePage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  const categories = ["All", "Bookkeeping", "Payroll", "HMRC MTD", "eSign", "Practice Management"];

  const filteredArticles = kbArticles.filter((art) => {
    const matchesCategory = selectedCategory === "All" || art.category === selectedCategory;
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AppLayout module="Help & Documentation">
      <div className="bg-gray-50 min-h-screen">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white py-12 px-6 shadow-md">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-purple-200">
              <Sparkles size={14} /> Knowledge Base & FAQ Center
            </div>
            <h1 className="text-3xl font-bold">How can we help you today?</h1>
            <p className="text-purple-200 text-sm max-w-xl mx-auto">
              Search our comprehensive documentation, step-by-step guides, and HMRC filing instructions.
            </p>

            {/* Search Input */}
            <div className="relative max-w-2xl mx-auto pt-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles e.g. VAT return, payroll, eSign."
                className="w-full pl-12 pr-4 py-3.5 bg-white text-gray-800 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-300 text-sm"
              />
              <Search className="absolute left-4 top-6 text-gray-400" size={20} />
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Articles List Accordion */}
          <div className="space-y-4">
            {filteredArticles.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
                <HelpCircle size={40} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-bold text-gray-700">No matching articles found</h3>
                <p className="text-xs text-gray-400 mt-1">Try searching with different keywords or switch categories.</p>
              </div>
            ) : (
              filteredArticles.map((art) => {
                const isOpen = openArticleId === art.id;
                return (
                  <div
                    key={art.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenArticleId(isOpen ? null : art.id)}
                      className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded mb-1">
                            {art.category}
                          </span>
                          <h3 className="text-base font-bold text-gray-800">{art.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{art.snippet}</p>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-700 leading-relaxed space-y-3">
                        <p>{art.content}</p>
                        <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-200/60">
                          <span>Was this article helpful?</span>
                          <button className="text-purple-600 hover:underline font-semibold flex items-center gap-1">
                            Need more help? Contact Support <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
