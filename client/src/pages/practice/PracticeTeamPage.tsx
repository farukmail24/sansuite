import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import UsersAndRolesManager from "../admin/UsersAndRolesManager";
import { usePermissions } from "../../hooks/usePermissions";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function PracticeTeamPage() {
  const [, navigate] = useLocation();
  const { canManageUsers, role } = usePermissions();

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full">
        <div className="p-6 w-full mx-auto">
          {!canManageUsers ? (
            <div className="max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Access Restricted: User & Role Permissions</h2>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                Practice User Management, Staff Roles, and Permission Matrix configuration require Super Admin, Practice Principal, or Partner authority.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500 inline-block">
                Your current account role: <span className="font-semibold text-slate-800 capitalize">{role.replace("_", " ")}</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/practice")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  <ArrowLeft size={16} /> Return to Practice Dashboard
                </button>
              </div>
            </div>
          ) : (
            <UsersAndRolesManager />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
