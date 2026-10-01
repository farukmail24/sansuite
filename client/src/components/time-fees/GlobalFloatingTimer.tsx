import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStopwatch, formatTime } from "../../hooks/useStopwatch";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  Timer, Play, Pause, RotateCcw, Save, X, Maximize2, Minimize2,
  Building2, Briefcase, FileText, CheckCircle2, AlertCircle, ChevronDown
} from "lucide-react";

export default function GlobalFloatingTimer() {
  const { toast } = useToast();
  const {
    state,
    currentSeconds,
    start,
    pause,
    reset,
    updateDetails,
    setOpen,
    setMinimized,
    saveToTimesheet
  } = useStopwatch();

  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  // Queries for clients & jobs
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/practice/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/practice/clients");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["/api/time-fees/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/jobs");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  const clientJobs = jobs.filter((j: any) => j.clientId === state.clientId);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveToTimesheet(selectedDate);
      toast({
        title: "Time Logged Successfully",
        description: `Logged time for ${state.clientName || "General Practice"} to your timesheet.`,
      });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Failed to Log Time",
        description: err.message || "An error occurred while saving time.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientChange = (clientIdStr: string) => {
    const cid = clientIdStr ? parseInt(clientIdStr) : null;
    const cl = clients.find((c: any) => c.id === cid);
    updateDetails({
      clientId: cid,
      clientName: cl ? (cl.clientName || cl.companyName || cl.name) : "",
      jobId: null,
      jobName: "",
    });
  };

  const handleJobChange = (jobIdStr: string) => {
    const jid = jobIdStr ? parseInt(jobIdStr) : null;
    const jb = jobs.find((j: any) => j.id === jid);
    updateDetails({
      jobId: jid,
      jobName: jb ? jb.jobName : "",
    });
  };

  // Calculate billable preview
  const hoursDecimal = Math.max(currentSeconds / 3600, 0.10);
  const rate = parseFloat(state.ratePerHour || "85");
  const billableAmount = (hoursDecimal * rate).toFixed(2);

  // If closed completely and not running, render small trigger button at bottom-left
  if (!state.isOpen && !state.isRunning && currentSeconds === 0) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Open Live Floating Stopwatch"
        className="fixed bottom-6 left-6 z-40 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-full shadow-lg border border-slate-700/60 flex items-center gap-2 text-xs font-semibold hover:scale-105 transition-all cursor-pointer group"
      >
        <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
          <Timer size={14} />
        </span>
        <span className="hidden sm:inline">Live Stopwatch</span>
      </button>
    );
  }

  // If minimized or timer is running in background without full modal
  if (!state.isOpen || state.isMinimized) {
    return (
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2">
        <div className={`flex items-center gap-3 px-3.5 py-2 rounded-full shadow-2xl border backdrop-blur-md transition-all ${
          state.isRunning
            ? "bg-slate-900/95 text-white border-purple-500/50 ring-2 ring-purple-500/20 shadow-purple-950/40"
            : "bg-slate-900/90 text-slate-200 border-slate-700/70"
        }`}>
          {/* Pulsing indicator */}
          <div className="relative flex items-center justify-center">
            {state.isRunning && (
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
            <span className={`w-2.5 h-2.5 rounded-full ${
              state.isRunning ? "bg-emerald-500" : currentSeconds > 0 ? "bg-amber-400" : "bg-slate-500"
            }`} />
          </div>

          {/* Time display */}
          <button
            onClick={() => { setOpen(true); setMinimized(false); }}
            className="flex items-center gap-2 cursor-pointer text-left group"
          >
            <span className="font-mono text-sm font-bold tracking-wider text-purple-300 group-hover:text-white transition-colors">
              {formatTime(currentSeconds)}
            </span>
            <div className="hidden md:flex flex-col text-[10px] leading-tight max-w-[130px] truncate text-slate-400">
              <span className="font-semibold text-slate-200 truncate">
                {state.clientName || "General Practice"}
              </span>
              <span className="truncate text-slate-400">
                {state.taskName || "Accounting"}
              </span>
            </div>
          </button>

          {/* Inline Controls */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-700/60">
            {state.isRunning ? (
              <button
                onClick={pause}
                title="Pause Timer"
                className="p-1.5 rounded-full hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                onClick={start}
                title="Start / Resume Timer"
                className="p-1.5 rounded-full hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <Play size={14} />
              </button>
            )}

            <button
              onClick={() => { setOpen(true); setMinimized(false); }}
              title="Expand Details & Save"
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EXPANDED FLOATING MODAL
  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600/30 text-purple-400 border border-purple-500/30">
            <Timer size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">Live Floating Stopwatch</h3>
            <span className="text-[10px] text-slate-400">Capium Real-time Timer Parity</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            title="Minimize to Pill"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <Minimize2 size={15} />
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close Window (Timer continues running in background)"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Stopwatch Readout */}
      <div className="p-5 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center border-b border-slate-800">
        <div className="font-mono text-4xl font-extrabold tracking-wider text-purple-300 drop-shadow-md">
          {formatTime(currentSeconds)}
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
            {(currentSeconds / 3600).toFixed(2)}h
          </span>
          {state.billable && (
            <span className="text-emerald-400 font-semibold text-xs">
              ~ £{billableAmount} ({state.ratePerHour}/h)
            </span>
          )}
        </div>

        {/* Stopwatch Action Controls */}
        <div className="mt-4 flex items-center gap-3">
          {state.isRunning ? (
            <button
              onClick={pause}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
            >
              <Pause size={15} /> Pause Timer
            </button>
          ) : (
            <button
              onClick={start}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950/50 transition-all cursor-pointer"
            >
              <Play size={15} /> {currentSeconds > 0 ? "Resume Timer" : "Start Timer"}
            </button>
          )}

          <button
            onClick={reset}
            disabled={currentSeconds === 0}
            title="Reset to 00:00:00"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer border border-slate-700/60"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Task & Client Configuration */}
      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto text-xs bg-slate-900/60">
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Client
          </label>
          <select
            value={state.clientId || ""}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
          >
            <option value="">General Practice (No specific client)</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.clientName || c.companyName || c.name || `Client #${c.id}`}
              </option>
            ))}
          </select>
        </div>

        {state.clientId && clientJobs.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Associated Job (Optional)
            </label>
            <select
              value={state.jobId || ""}
              onChange={(e) => handleJobChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
            >
              <option value="">No specific job</option>
              {clientJobs.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.jobName} ({j.status})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Service / Activity
            </label>
            <select
              value={state.taskName}
              onChange={(e) => updateDetails({ taskName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
            >
              <option value="Annual Accounts Production">Annual Accounts Production</option>
              <option value="Bookkeeping & Reconciliation">Bookkeeping & Reconciliation</option>
              <option value="Corporation Tax CT600">Corporation Tax CT600</option>
              <option value="Payroll RTI & Pensions">Payroll RTI & Pensions</option>
              <option value="Self Assessment SA100">Self Assessment SA100</option>
              <option value="VAT Return Preparation">VAT Return Preparation</option>
              <option value="Advisory & Tax Planning">Advisory & Tax Planning</option>
              <option value="Administrative / Internal">Administrative / Internal</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Log Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Work Description / Notes
          </label>
          <input
            type="text"
            value={state.description}
            onChange={(e) => updateDetails({ description: e.target.value })}
            placeholder="e.g. Completed trial balance reconciliation"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={state.billable}
              onChange={(e) => updateDetails({ billable: e.target.checked })}
              className="rounded-sm border-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-xs text-slate-300 font-medium">Billable to Client</span>
          </label>

          {state.billable && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Rate: £</span>
              <input
                type="number"
                step="5"
                value={state.ratePerHour}
                onChange={(e) => updateDetails({ ratePerHour: e.target.value })}
                className="w-16 bg-slate-800 border border-slate-700 text-slate-100 rounded px-1.5 py-1 text-xs text-right font-mono"
              />
              <span className="text-[10px] text-slate-400">/h</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Log Button */}
      <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between">
        <button
          onClick={() => setMinimized(true)}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
        >
          Keep Ticking in Background
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || currentSeconds < 10}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <Save size={14} />
          {isSaving ? "Logging..." : "Log to Timesheet"}
        </button>
      </div>
    </div>
  );
}
