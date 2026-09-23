import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { bookkeepingSidebar } from "./sidebar";
import { Building2 } from "lucide-react";

export default function ClientGuard({ featureTitle }: { featureTitle?: string }) {
  const [, navigate] = useLocation();

  return (
    <AppLayout sidebar={bookkeepingSidebar} module="Bookkeeping">
      <div className="bg-gray-50 min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200 space-y-4 animate-in fade-in duration-150">
          <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Select a Client / Workspace</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {featureTitle ? `${featureTitle} features are` : "Bookkeeping features are"} managed within a specific client workspace. Please select a client company from the Bookkeeping Dashboard.
          </p>
          <button
            onClick={() => navigate("/bookkeeping")}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer"
          >
            Go to All Clients Dashboard
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
