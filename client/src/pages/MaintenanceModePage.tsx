import { useState } from "react";
import { Wrench, ShieldAlert, RefreshCw, Activity, Building2 } from "lucide-react";

export default function MaintenanceModePage({ onRetry }: { onRetry?: () => void }) {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
    setTimeout(() => setChecking(false), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>
      <div className="w-full max-w-lg text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center gap-3 mb-8 bg-white/5 border border-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Building2 size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SanSuite Cloud</span>
        </div>

        {/* Maintenance Box */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Wrench size={36} className="animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-slate-900 animate-ping" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldAlert size={14} /> Scheduled Platform Maintenance
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Currently Offline
            </h1>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              System Administrators have enabled global maintenance mode to perform critical database upgrades and system optimizations. Access for practice firms is temporarily paused to ensure data safety.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Activity size={13} className="text-amber-400" /> Platform Status
              </div>
              <p className="text-xs font-bold text-amber-400">Maintenance Mode Active</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-indigo-400" /> Affected Workspaces
              </div>
              <p className="text-xs font-bold text-slate-200">All Tenant Practices</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
              {checking ? "Checking System Status..." : "Check Status & Reconnect"}
            </button>

            <p className="text-[11px] text-slate-500">
              System Admin? Access the <a href="http://localhost:5174" className="text-indigo-400 hover:underline">Control Panel</a> to manage system settings.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} SanSuite Cloud Accounting. Infrastructure Security Enforced.
        </p>
      </div>
    </div>
  );
}
