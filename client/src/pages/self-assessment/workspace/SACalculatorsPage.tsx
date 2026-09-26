import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SAWorkspaceLayout, { useSAWorkspace } from "./SAWorkspaceLayout";
import { apiRequest } from "../../../lib/queryClient";
import { useToast } from "../../../hooks/useToast";
import {
  Calculator, Save, RefreshCw, CheckCircle2, AlertCircle,
  HelpCircle, Shield, TrendingDown, ArrowRight, Layers
} from "lucide-react";

export default function SACalculatorsPage() {
  return (
    <SAWorkspaceLayout activeSection="Statutory Calculators">
      <SACalculatorsContent />
    </SAWorkspaceLayout>
  );
}

function SACalculatorsContent() {
  const { clientId, client, currentReturn, selectedTaxYear, refetchReturns } = useSAWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Capital Allowances State
  const [aiaClaimed, setAiaClaimed] = useState("0.00");
  const [fyaClaimed, setFyaClaimed] = useState("0.00");
  const [mainPoolWdvBf, setMainPoolWdvBf] = useState("0.00");
  const [mainPoolAdditions, setMainPoolAdditions] = useState("0.00");
  const [mainPoolDisposals, setMainPoolDisposals] = useState("0.00");
  const [mainPoolWdaClaimed, setMainPoolWdaClaimed] = useState("0.00");
  const [specialRateAdditions, setSpecialRateAdditions] = useState("0.00");
  const [specialRateWdaClaimed, setSpecialRateWdaClaimed] = useState("0.00");
  const [sbaClaimed, setSbaClaimed] = useState("0.00");

  // 2. Trading Losses State
  const [lossBroughtForward, setLossBroughtForward] = useState("0.00");
  const [lossCurrentYear, setLossCurrentYear] = useState("0.00");
  const [lossSetOffCurrent, setLossSetOffCurrent] = useState("0.00");
  const [lossCarriedBack, setLossCarriedBack] = useState("0.00");

  const [isImportingPrior, setIsImportingPrior] = useState(false);

  // Sync with currentReturn
  useEffect(() => {
    if (currentReturn) {
      if (currentReturn.capitalAllowancesClaimed) {
        setAiaClaimed(currentReturn.capitalAllowancesClaimed);
      }
      if (currentReturn.tradingLossesBroughtForward) {
        setLossBroughtForward(currentReturn.tradingLossesBroughtForward);
      }
      if (currentReturn.tradingLossesRelieved) {
        setLossSetOffCurrent(currentReturn.tradingLossesRelieved);
      }
      let sched: any = {};
      if (currentReturn.schedulesData) {
        try {
          sched = typeof currentReturn.schedulesData === "string" ? JSON.parse(currentReturn.schedulesData) : currentReturn.schedulesData;
        } catch {}
      }
      if (sched.mainPoolWdvBf !== undefined) setMainPoolWdvBf(sched.mainPoolWdvBf);
      if (sched.mainPoolAdditions !== undefined) setMainPoolAdditions(sched.mainPoolAdditions);
      if (sched.mainPoolDisposals !== undefined) setMainPoolDisposals(sched.mainPoolDisposals);
      if (sched.mainPoolWdaClaimed !== undefined) setMainPoolWdaClaimed(sched.mainPoolWdaClaimed);
      if (sched.specialRateAdditions !== undefined) setSpecialRateAdditions(sched.specialRateAdditions);
      if (sched.specialRateWdaClaimed !== undefined) setSpecialRateWdaClaimed(sched.specialRateWdaClaimed);
      if (sched.sbaClaimed !== undefined) setSbaClaimed(sched.sbaClaimed);
      if (sched.fyaClaimed !== undefined) setFyaClaimed(sched.fyaClaimed);
      if (sched.aiaClaimed !== undefined) setAiaClaimed(sched.aiaClaimed);
    }
  }, [currentReturn]);

  // 1-Click Prior Year Capital Allowances Import (Capium Art 14: 9000216928)
  const handleImportPriorYear = async () => {
    if (!clientId) return;
    try {
      setIsImportingPrior(true);
      const res = await apiRequest("GET", `/api/self-assessment/${clientId}/prior-capital-allowances/${encodeURIComponent(selectedTaxYear)}`);
      if (!res.ok) throw new Error("Failed to fetch prior year capital allowances");
      const data = await res.json();
      if (!data.found) {
        toast({
          title: "No Prior Return Found",
          description: data.message || "No earlier tax return exists for this taxpayer in the database.",
          type: "info",
        });
        return;
      }
      const bFwd = data.mainPoolWdvBf || "0.00";
      setMainPoolWdvBf(bFwd);
      const pool = parseFloat(bFwd || "0") + parseFloat(mainPoolAdditions || "0") - parseFloat(mainPoolDisposals || "0");
      setMainPoolWdaClaimed(Math.max(0, pool * 0.18).toFixed(2));
      toast({
        title: "Prior Year WDV Imported",
        description: `Imported £${bFwd} from ${data.priorTaxYear || "prior year"} closing WDV into Main Pool b/fwd.`,
        type: "success",
      });
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, type: "error" });
    } finally {
      setIsImportingPrior(false);
    }
  };

  // Derived Capital Allowances Total
  const totalCapitalAllowances = (
    parseFloat(aiaClaimed || "0") +
    parseFloat(fyaClaimed || "0") +
    parseFloat(mainPoolWdaClaimed || "0") +
    parseFloat(specialRateWdaClaimed || "0") +
    parseFloat(sbaClaimed || "0")
  );

  // Derived Losses Carried Forward
  const totalLossAvailable = parseFloat(lossBroughtForward || "0") + parseFloat(lossCurrentYear || "0");
  const totalLossUtilized = parseFloat(lossSetOffCurrent || "0") + parseFloat(lossCarriedBack || "0");
  const lossCarriedForward = Math.max(0, totalLossAvailable - totalLossUtilized);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        capitalAllowancesClaimed: totalCapitalAllowances.toFixed(2),
        tradingLossesBroughtForward: lossBroughtForward,
        tradingLossesRelieved: lossSetOffCurrent,
        mainPoolWdvBf,
        mainPoolAdditions,
        mainPoolDisposals,
        mainPoolWdaClaimed,
        specialRateAdditions,
        specialRateWdaClaimed,
        sbaClaimed,
        fyaClaimed,
        aiaClaimed,
      };

      const res = await apiRequest("POST", `/api/self-assessment/${clientId}/returns/${currentReturn?.id}/calculators`, payload);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save calculators" }));
        throw new Error(err.error || "Failed to save calculators");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Calculators Saved",
        description: "Capital allowances and loss relief updated and applied to tax return.",
        type: "success",
      });
      refetchReturns();
      queryClient.invalidateQueries({ queryKey: [`/api/self-assessment/${clientId}/returns`] });
    },
    onError: (err: any) => {
      toast({ title: "Save Error", description: err.message, type: "error" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header and Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calculator size={16} className="text-purple-600" />
            Statutory Calculators: Capital Allowances & Trading Losses
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Capital Allowances Act 2001 (AIA & WDA) and ITA 2007 Loss Relief (s83, s64).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleImportPriorYear}
            disabled={isImportingPrior}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isImportingPrior ? "animate-spin text-purple-600" : "text-purple-600"} />
            <span>Import B/Fwd from Prior Year</span>
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={13} />
                Save Schedules & Apply
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Capital Allowances Schedule */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-purple-600" />
              Capital Allowances Schedule
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImportPriorYear}
                disabled={isImportingPrior}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} className={isImportingPrior ? "animate-spin" : ""} />
                <span>Import Prior WDV</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                Total: £{totalCapitalAllowances.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Annual Investment Allowance (AIA @ 100% up to £1,000,000)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={aiaClaimed}
                  onChange={(e) => setAiaClaimed(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Year Allowance (FYA @ 50%)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={fyaClaimed}
                  onChange={(e) => setFyaClaimed(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block">
                Main Pool (18% Writing Down Allowance)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">WDV b/fwd</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolWdvBf}
                    onChange={(e) => {
                      setMainPoolWdvBf(e.target.value);
                      const pool = parseFloat(e.target.value || "0") + parseFloat(mainPoolAdditions || "0") - parseFloat(mainPoolDisposals || "0");
                      setMainPoolWdaClaimed(Math.max(0, pool * 0.18).toFixed(2));
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Additions</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolAdditions}
                    onChange={(e) => {
                      setMainPoolAdditions(e.target.value);
                      const pool = parseFloat(mainPoolWdvBf || "0") + parseFloat(e.target.value || "0") - parseFloat(mainPoolDisposals || "0");
                      setMainPoolWdaClaimed(Math.max(0, pool * 0.18).toFixed(2));
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Disposals</span>
                  <input
                    type="number"
                    step="0.01"
                    value={mainPoolDisposals}
                    onChange={(e) => {
                      setMainPoolDisposals(e.target.value);
                      const pool = parseFloat(mainPoolWdvBf || "0") + parseFloat(mainPoolAdditions || "0") - parseFloat(e.target.value || "0");
                      setMainPoolWdaClaimed(Math.max(0, pool * 0.18).toFixed(2));
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mt-2">
                  18% WDA Claimed
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={mainPoolWdaClaimed}
                  onChange={(e) => setMainPoolWdaClaimed(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-purple-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Special Rate Pool 6% WDA
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={specialRateWdaClaimed}
                  onChange={(e) => setSpecialRateWdaClaimed(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Structures & Buildings (SBA @ 3%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sbaClaimed}
                  onChange={(e) => setSbaClaimed(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Trading Loss Schedule */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingDown size={14} className="text-rose-600" />
              Trading Loss Relief Schedule (ITA 2007)
            </h3>
            <span className="text-[11px] font-mono font-bold text-rose-600">
              Carry Fwd: £{lossCarriedForward.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loss Brought Forward from Prior Tax Years (s83)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={lossBroughtForward}
                  onChange={(e) => setLossBroughtForward(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trading Loss Incurred in Current Tax Year
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={lossCurrentYear}
                  onChange={(e) => setLossCurrentYear(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loss Set Off Against Current Year General Income (s64)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={lossSetOffCurrent}
                  onChange={(e) => setLossSetOffCurrent(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">Deducted from total personal income in SA302</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loss Carried Back to Prior Tax Year (12 Months)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-semibold">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={lossCarriedBack}
                  onChange={(e) => setLossCarriedBack(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Unrelieved Losses Carried Forward
              </span>
              <span className="font-mono font-black text-sm text-purple-900 dark:text-purple-100">
                £{lossCarriedForward.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
