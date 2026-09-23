import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import {
  Building2, Users, FileText, Receipt, CreditCard, FolderOpen,
  LogOut, CheckCircle2, ChevronRight, Bell, Shield, ArrowUpRight
} from "lucide-react";

interface SmeLayoutProps {
  children: ReactNode;
  module?: string;
}

const SME_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Building2, path: "/sme/dashboard" },
  { id: "invoices", label: "Sales & Invoices", icon: FileText, path: "/sme/invoices" },
  { id: "purchases", label: "Bills & Expenses", icon: Receipt, path: "/sme/purchases" },
  { id: "bank", label: "Bank Accounts", icon: CreditCard, path: "/sme/bank" },
  { id: "payroll", label: "Payroll & RTI", icon: Users, path: "/sme/payroll" },
  { id: "documents", label: "Document Requests", icon: FolderOpen, path: "/sme/documents" },
];

export default function SmeLayout({ children, module = "SME Portal" }: SmeLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Branding & Client Badge */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => navigate("/sme/dashboard")}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition">
                <Users size={18} />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 tracking-tight">SanSuite</span>
                <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Client & SME
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-gray-200 hidden sm:block" />

            {/* Active Company Name */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {user?.clientName || "Your Company Workspace"}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span>Accountant Bridging Live</span>
              </div>
            </div>
          </div>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-500">{user?.email}</p>
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/login?portal=sme");
              }}
              title="Sign Out"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Menu */}
        <div className="px-4 sm:px-6 lg:px-8 flex items-center gap-1 border-t border-gray-100 overflow-x-auto py-1">
          {SME_NAV_ITEMS.map((item) => {
            const IconC = item.icon;
            const isActive = location === item.path || (item.path !== "/sme/dashboard" && location.startsWith(item.path));
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <IconC size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 text-center text-xs text-gray-400">
        SanSuite Client & SME Workspace | Powered by CA Practice Bridging Architecture
      </footer>
    </div>
  );
}
