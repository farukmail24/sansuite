import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import UsersAndRolesManager from "../admin/UsersAndRolesManager";

export default function PracticeTeamPage() {
  const [, navigate] = useLocation();

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full">
        {/* Unified Users & Roles / Team Manager */}
        <div className="p-6 w-full w-full mx-auto">
          <UsersAndRolesManager />
        </div>
      </div>
    </AppLayout>
  );
}
