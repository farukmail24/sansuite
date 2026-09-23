import { useLocation, useRoute } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { ChevronRight, TrendingUp } from "lucide-react";
import { bookkeepingSidebar, getClientSidebar } from "./sidebar";

export default function BudgetingPage() {
  const [match, params] = useRoute("/bookkeeping/:id/*");
  const clientId = match ? params?.id : "";
  const [, navigate] = useLocation();

  return (
    <AppLayout sidebar={clientId ? getClientSidebar(clientId) : bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center text-sm text-gray-500 gap-2">
          <button onClick={() => navigate("/bookkeeping")} className="hover:text-purple-600">Bookkeeping</button>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">Budgeting</span>
        </div>
        
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Budgets</h1>
              <p className="text-sm text-gray-500">Set and track monthly/annual financial targets.</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm">
              Create Budget
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-purple-200 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Active Budgets</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Create a budget to compare your actual income and expenses against your planned financial targets.
            </p>
            <button className="px-4 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded font-medium text-sm">
              Setup First Budget
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
