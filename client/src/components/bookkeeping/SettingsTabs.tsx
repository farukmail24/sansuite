import { useLocation } from "wouter";
import {
  Building2,
  Calendar,
  ListTree,
  ImageIcon,
  FileText,
  Scale,
  Coins,
  Hash,
} from "lucide-react";

export type BookkeepingSettingsTabId =
  | "company_info"
  | "accounting_periods"
  | "chart_of_accounts"
  | "company_logo"
  | "templates"
  | "opening_balance"
  | "currency"
  | "sequence";

interface SettingsTabsProps {
  activeTab: BookkeepingSettingsTabId | "general";
  clientId?: string;
  onTabChange?: (tabId: BookkeepingSettingsTabId) => void;
}

export default function SettingsTabs({ activeTab, clientId, onTabChange }: SettingsTabsProps) {
  const [, navigate] = useLocation();

  // Normalize "general" to "company_info"
  const currentActive = activeTab === "general" ? "company_info" : activeTab;

  const tabs: { id: BookkeepingSettingsTabId; label: string; icon: React.ReactNode; route: string }[] = [
    {
      id: "company_info",
      label: "Company Info",
      icon: <Building2 size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/company-info` : "/bookkeeping/company-info",
    },
    {
      id: "accounting_periods",
      label: "Accounting Periods",
      icon: <Calendar size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/accounting-periods` : "/bookkeeping/accounting-periods",
    },
    {
      id: "chart_of_accounts",
      label: "Chart of Accounts",
      icon: <ListTree size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/chart-of-accounts` : "/bookkeeping/chart-of-accounts",
    },
    {
      id: "company_logo",
      label: "Company Logo",
      icon: <ImageIcon size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/company-logo` : "/bookkeeping/company-logo",
    },
    {
      id: "templates",
      label: "Invoice Templates (Doc/Pdf)",
      icon: <FileText size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/template-settings` : "/bookkeeping/template-settings",
    },
    {
      id: "opening_balance",
      label: "Opening Balance",
      icon: <Scale size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/opening-balance` : "/bookkeeping/opening-balance",
    },
    {
      id: "currency",
      label: "Currency",
      icon: <Coins size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/currency` : "/bookkeeping/currency",
    },
    {
      id: "sequence",
      label: "Customise Sequence",
      icon: <Hash size={14} />,
      route: clientId ? `/bookkeeping/${clientId}/customise-sequence` : "/bookkeeping/customise-sequence",
    },
  ];

  return (
    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = currentActive === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange?.(tab.id);
                navigate(tab.route);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
