import { useLocation } from "wouter";

interface PracticeCrmSubNavProps {
  activeTab: "dashboard" | "connections" | "communications";
}

const CRM_TABS = [
  { id: "dashboard", label: "Dashboard", route: "/practice/crm" },
  { id: "connections", label: "Connections", route: "/practice/crm/connections" },
  { id: "communications", label: "Communications", route: "/practice/crm/communications" },
];

export default function PracticeCrmSubNav({ activeTab }: PracticeCrmSubNavProps) {
  const [, navigate] = useLocation();

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-center gap-8 shadow-xs select-none">
      {CRM_TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.route)}
            className={`py-3 px-2 text-xs font-semibold tracking-tight transition-all relative cursor-pointer ${
              isActive
                ? "text-purple-700 dark:text-purple-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-purple-600 dark:bg-purple-500 rounded-t-full shadow-xs" />
            )}
          </button>
        );
      })}
    </div>
  );
}
