import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, FileSearch, Filter, Globe2, FileText } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";

export function VatTransactionsPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">VAT Transactions</span>
        </div>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">VAT Transactions Detail</h1>
              <p className="text-sm text-gray-500">Detailed breakdown of transactions grouped by VAT box.</p>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 flex items-center bg-white text-gray-700">
              <Filter size={16} className="mr-2" /> Filter Period
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center text-gray-500">
            <FileSearch size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-2">Select a VAT Period</h2>
            <p className="max-w-md mx-auto">
              Please select a specific VAT return period from your history to view the detailed transactions associated with it.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function EcSalesListPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">EC Sales List</span>
        </div>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EC Sales List (ESL)</h1>
              <p className="text-sm text-gray-500">Report sales to VAT-registered customers in EU member states.</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center text-gray-500">
            <Globe2 size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-2">No EU Sales Found</h2>
            <p className="max-w-md mx-auto">
              There are no sales invoices recorded for EU customers in the current period. 
              Only B2B sales to EU VAT-registered customers appear here.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function CisReportsPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">CIS Reports</span>
        </div>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CIS Reports</h1>
              <p className="text-sm text-gray-500">Generate Statements of Payment and Deduction for subcontractors.</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center text-gray-500">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-700 mb-2">No Statements Generated</h2>
            <p className="max-w-md mx-auto">
              You can generate statements here after submitting your monthly CIS 300 returns.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

