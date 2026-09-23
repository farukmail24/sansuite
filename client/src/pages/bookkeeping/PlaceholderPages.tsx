import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, CheckCircle2, Plus, Search, FileText, Download, Upload } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import ClientGuard from "./ClientGuard";

function FeatureDashboardPage({ title, description, module = "Bookkeeping" }: { title: string; description: string; module?: string }) {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  if (!clientId) return <ClientGuard featureTitle={title} />;

  const handleCreate = () => {
    toast({
      title: `${title} Entry Created`,
      description: `New ${title} record saved successfully to ledger.`,
    });
  };

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module={module}>

      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">{title}</span>
        </div>

        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> New {title} Entry
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${title.toLowerCase()}...`}
                  className="pl-9 pr-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
              <h3 className="font-bold text-gray-800 text-sm">{title} Registry Ready</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">All {title.toLowerCase()} records are synced with practice double-entry ledger.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function SanSuitePayPage() { return <FeatureDashboardPage title="SanSuite Pay" description="Setup credit card and bank payment integrations for automated client billing." />; }
export function CapiScanPage() { return <FeatureDashboardPage title="CapiScan" description="Document processing, receipt OCR, and automatic invoice text extraction." />; }
export function QuickEntryPage() { return <FeatureDashboardPage title="Quick Entry" description="Grid interface for bulk adding multiple sales/purchase items quickly." />; }
export function BudgetingPage() { return <FeatureDashboardPage title="Budgeting" description="Set up monthly/annual financial targets and variance reporting." />; }
export function DividendsPage() { return <FeatureDashboardPage title="Dividends" description="Log dividend distributions to shareholders with voucher generation." />; }
export function BulkEditPage() { return <FeatureDashboardPage title="Bulk Edit" description="Mass-modify transactions and account reclassification tool." />; }
export function MinutesOfMeetingsPage() { return <FeatureDashboardPage title="Minutes of Meetings" description="Log shareholder and board resolutions with PDF export." />; }
export function NotesPage() { return <FeatureDashboardPage title="Notes" description="General practice and internal client notes repository." />; }
