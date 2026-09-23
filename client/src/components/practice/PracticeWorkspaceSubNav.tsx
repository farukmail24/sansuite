import { useLocation, useSearch } from "wouter";

interface PracticeWorkspaceSubNavProps {
  activeTab?: string;
}

const WORKSPACE_TABS = [
  { id: "clients", label: "Clients", route: "/practice/clients" },
  { id: "tasks", label: "Tasks", route: "/practice/tasks" },
  { id: "deadlines", label: "Deadlines", route: "/practice/deadlines" },
  { id: "schedule", label: "Schedule", route: "/practice/calendar" },
  { id: "requests", label: "Client Requests", route: "/practice/documents" },
  { id: "communication", label: "Communication", route: "/practice/communication" },
  { id: "conversations", label: "Conversations", route: "/practice/conversations" },
  { id: "activity", label: "Activity", route: "/practice/activity" },
];

export default function PracticeWorkspaceSubNav({ activeTab }: PracticeWorkspaceSubNavProps) {
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const fullLocation = searchString ? `${location}?${searchString}` : location;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-center gap-8 shadow-xs select-none">
      {WORKSPACE_TABS.map((tab) => {
        const isActive = activeTab
          ? activeTab === tab.id
          : location === tab.route || fullLocation === tab.route;

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
