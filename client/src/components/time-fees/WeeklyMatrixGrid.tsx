import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Copy, Save, Send,
  Clock, CheckCircle2, MessageSquare, AlertCircle, Sparkles,
  RotateCcw, DollarSign, Calendar
} from "lucide-react";

interface MatrixDayEntry {
  hours: string;
  description: string;
  id?: number;
  status?: string;
}

interface MatrixRow {
  rowId: string;
  clientId: number | null;
  jobId: number | null;
  taskName: string;
  subtaskName?: string;
  billable: boolean;
  ratePerHour: string;
  costRate: string;
  description: string;
  days: { [dayIndex: number]: MatrixDayEntry };
}

interface WeeklyMatrixGridProps {
  currentWeekStart: Date;
  onWeekChange: (date: Date) => void;
  clients: any[];
  jobs: any[];
}

export default function WeeklyMatrixGrid({
  currentWeekStart,
  onWeekChange,
  clients,
  jobs
}: WeeklyMatrixGridProps) {
  const { toast } = useToast();

  // Active note popover state
  const [activeNoteCell, setActiveNoteCell] = useState<{
    rowId: string;
    dayIndex: number;
    dayDateStr: string;
  } | null>(null);

  // Calculate the 7 days of the week (Mon to Sun)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const weekStartStr = weekDays[0].toISOString().split("T")[0];
  const weekEndStr = weekDays[6].toISOString().split("T")[0];

  // Fetch week matrix data from backend
  const { data: matrixData, isLoading, refetch } = useQuery<{
    weekStart: string;
    weekEnd: string;
    entries: any[];
    previousWeekTasks: any[];
  }>({
    queryKey: ["/api/time-fees/timesheets/matrix-week", weekStartStr],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/time-fees/timesheets/matrix-week?weekStart=${weekStartStr}`);
      if (!res.ok) throw new Error("Failed to load week matrix");
      return res.json();
    },
  });

  const [rows, setRows] = useState<MatrixRow[]>([]);

  // When matrixData arrives, transform entries into MatrixRows
  useEffect(() => {
    if (!matrixData) return;

    const entries = matrixData.entries || [];
    if (entries.length === 0) {
      // If no entries, start with one empty draft row
      setRows([
        {
          rowId: "row_init_1",
          clientId: clients[0]?.id || null,
          jobId: null,
          taskName: "Annual Accounts Production",
          billable: true,
          ratePerHour: "85.00",
          costRate: "40.00",
          description: "Weekly accounting time",
          days: { 0: { hours: "", description: "" }, 1: { hours: "", description: "" }, 2: { hours: "", description: "" }, 3: { hours: "", description: "" }, 4: { hours: "", description: "" }, 5: { hours: "", description: "" }, 6: { hours: "", description: "" } },
        }
      ]);
      return;
    }

    // Group entries by unique combination of (clientId, jobId, taskName, billable)
    const rowMap = new Map<string, MatrixRow>();

    entries.forEach((entry: any) => {
      const key = `${entry.clientId || 0}_${entry.jobId || 0}_${entry.taskName || 'General'}_${entry.billable ? '1' : '0'}`;
      let row = rowMap.get(key);

      if (!row) {
        row = {
          rowId: `row_${entry.id || Math.random().toString(36).substring(7)}`,
          clientId: entry.clientId || null,
          jobId: entry.jobId || null,
          taskName: entry.taskName || "General Accounting",
          subtaskName: entry.subtaskName || "",
          billable: entry.billable !== undefined ? !!entry.billable : true,
          ratePerHour: entry.ratePerHour || "85.00",
          costRate: entry.costRate || "40.00",
          description: entry.description || "",
          days: {
            0: { hours: "", description: "" },
            1: { hours: "", description: "" },
            2: { hours: "", description: "" },
            3: { hours: "", description: "" },
            4: { hours: "", description: "" },
            5: { hours: "", description: "" },
            6: { hours: "", description: "" },
          },
        };
        rowMap.set(key, row);
      }

      // Determine day index (0..6)
      const entryDateStr = new Date(entry.date).toISOString().split("T")[0];
      const dayIdx = weekDays.findIndex(d => d.toISOString().split("T")[0] === entryDateStr);
      if (dayIdx >= 0) {
        row.days[dayIdx] = {
          hours: parseFloat(entry.hours || "0") > 0 ? parseFloat(entry.hours).toString() : "",
          description: entry.description || "",
          id: entry.id,
          status: entry.status,
        };
      }
    });

    setRows(Array.from(rowMap.values()));
  }, [matrixData, clients]);

  // Handle cell hours change
  const handleHoursChange = (rowId: string, dayIndex: number, val: string) => {
    setRows(prev => prev.map(row => {
      if (row.rowId !== rowId) return row;
      return {
        ...row,
        days: {
          ...row.days,
          [dayIndex]: {
            ...row.days[dayIndex],
            hours: val,
          }
        }
      };
    }));
  };

  // Handle cell description change
  const handleDescriptionChange = (rowId: string, dayIndex: number, desc: string) => {
    setRows(prev => prev.map(row => {
      if (row.rowId !== rowId) return row;
      return {
        ...row,
        days: {
          ...row.days,
          [dayIndex]: {
            ...row.days[dayIndex],
            description: desc,
          }
        }
      };
    }));
  };

  // Update row details (client, task, billable, rate)
  const updateRowField = (rowId: string, patch: Partial<MatrixRow>) => {
    setRows(prev => prev.map(row => {
      if (row.rowId !== rowId) return row;
      return { ...row, ...patch };
    }));
  };

  // Add new task row
  const handleAddRow = () => {
    const newRow: MatrixRow = {
      rowId: `row_${Date.now()}`,
      clientId: clients[0]?.id || null,
      jobId: null,
      taskName: "Annual Accounts Production",
      billable: true,
      ratePerHour: "85.00",
      costRate: "40.00",
      description: "Weekly accounting time",
      days: {
        0: { hours: "", description: "" },
        1: { hours: "", description: "" },
        2: { hours: "", description: "" },
        3: { hours: "", description: "" },
        4: { hours: "", description: "" },
        5: { hours: "", description: "" },
        6: { hours: "", description: "" },
      },
    };
    setRows(prev => [...prev, newRow]);
  };

  // Duplicate a task row
  const handleDuplicateRow = (rowToCopy: MatrixRow) => {
    const cloned: MatrixRow = {
      ...rowToCopy,
      rowId: `row_${Date.now()}`,
      days: {
        0: { hours: "", description: "" },
        1: { hours: "", description: "" },
        2: { hours: "", description: "" },
        3: { hours: "", description: "" },
        4: { hours: "", description: "" },
        5: { hours: "", description: "" },
        6: { hours: "", description: "" },
      }
    };
    setRows(prev => [...prev, cloned]);
    toast({ title: "Row Duplicated", description: "New row added with blank hours for quick entry." });
  };

  // Delete a task row
  const handleDeleteRow = (rowId: string) => {
    setRows(prev => {
      if (prev.length <= 1) {
        // Keep at least 1 empty row
        return [{
          rowId: `row_${Date.now()}`,
          clientId: clients[0]?.id || null,
          jobId: null,
          taskName: "Annual Accounts Production",
          billable: true,
          ratePerHour: "85.00",
          costRate: "40.00",
          description: "Weekly accounting time",
          days: { 0: { hours: "", description: "" }, 1: { hours: "", description: "" }, 2: { hours: "", description: "" }, 3: { hours: "", description: "" }, 4: { hours: "", description: "" }, 5: { hours: "", description: "" }, 6: { hours: "", description: "" } },
        }];
      }
      return prev.filter(r => r.rowId !== rowId);
    });
  };

  // Populate tasks from previous week (Capium Article 9000235910)
  const handlePopulatePreviousWeek = () => {
    const prevTasks = matrixData?.previousWeekTasks || [];
    if (prevTasks.length === 0) {
      toast({
        title: "No Previous Tasks Found",
        description: "There are no timesheet tasks logged in the preceding week to copy.",
        variant: "destructive"
      });
      return;
    }

    const newRows: MatrixRow[] = prevTasks.map((pt, idx) => ({
      rowId: `row_prev_${Date.now()}_${idx}`,
      clientId: pt.clientId || null,
      jobId: pt.jobId || null,
      taskName: pt.taskName || "General Accounting",
      subtaskName: pt.subtaskName || "",
      billable: pt.billable !== undefined ? !!pt.billable : true,
      ratePerHour: pt.ratePerHour || "85.00",
      costRate: pt.costRate || "40.00",
      description: "Copied from previous week",
      days: {
        0: { hours: "", description: "" },
        1: { hours: "", description: "" },
        2: { hours: "", description: "" },
        3: { hours: "", description: "" },
        4: { hours: "", description: "" },
        5: { hours: "", description: "" },
        6: { hours: "", description: "" },
      }
    }));

    setRows(newRows);
    toast({
      title: "Previous Week Tasks Loaded",
      description: `Loaded ${newRows.length} client & task line(s). Ready for you to enter hours!`,
    });
  };

  // Save / Submit Mutation
  const saveMatrixMutation = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      // Build payload for backend
      const payloadRows = rows.map(r => ({
        clientId: r.clientId,
        jobId: r.jobId,
        taskName: r.taskName,
        subtaskName: r.subtaskName,
        billable: r.billable,
        ratePerHour: r.ratePerHour,
        costRate: r.costRate,
        description: r.description,
        days: Object.entries(r.days).map(([dayIdxStr, d]) => {
          const idx = parseInt(dayIdxStr);
          const dateStr = weekDays[idx].toISOString().split("T")[0];
          return {
            date: dateStr,
            hours: parseFloat(d.hours || "0"),
            description: d.description,
            id: d.id,
          };
        }),
      }));

      const res = await apiRequest("POST", "/api/time-fees/timesheets/matrix-save", {
        weekStart: weekStartStr,
        rows: payloadRows,
        submitForApproval,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save weekly timesheet");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Weekly Timesheet Saved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
      refetch();
    },
    onError: (err: any) => {
      toast({
        title: "Error Saving Timesheet",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Calculate column totals per day
  const dailyTotals = useMemo(() => {
    const totals = Array.from({ length: 7 }).map(() => ({ total: 0, billable: 0, nonBillable: 0 }));

    rows.forEach(r => {
      Object.entries(r.days).forEach(([idxStr, d]) => {
        const idx = parseInt(idxStr);
        const h = parseFloat(d.hours || "0");
        if (h > 0) {
          totals[idx].total += h;
          if (r.billable) {
            totals[idx].billable += h;
          } else {
            totals[idx].nonBillable += h;
          }
        }
      });
    });

    return totals;
  }, [rows]);

  // Calculate Grand Weekly Summaries
  const grandSummary = useMemo(() => {
    let grandHours = 0;
    let billableHours = 0;
    let billableRevenue = 0;
    let totalCost = 0;

    rows.forEach(r => {
      const rate = parseFloat(r.ratePerHour || "85");
      const cost = parseFloat(r.costRate || "40");

      Object.values(r.days).forEach(d => {
        const h = parseFloat(d.hours || "0");
        if (h > 0) {
          grandHours += h;
          totalCost += h * cost;
          if (r.billable) {
            billableHours += h;
            billableRevenue += h * rate;
          }
        }
      });
    });

    const profit = billableRevenue - totalCost;
    const margin = billableRevenue > 0 ? ((profit / billableRevenue) * 100).toFixed(1) : "0.0";

    return { grandHours, billableHours, billableRevenue, totalCost, profit, margin };
  }, [rows]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* 1. TOP BAR: Week Navigation & Action Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Week Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(currentWeekStart);
              d.setDate(d.getDate() - 7);
              onWeekChange(d);
            }}
            title="Previous Week"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => {
              const d = new Date();
              const day = d.getDay();
              const diff = d.getDate() - day + (day === 0 ? -6 : 1);
              d.setDate(diff);
              d.setHours(0, 0, 0, 0);
              onWeekChange(d);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            Current Week
          </button>

          <button
            onClick={() => {
              const d = new Date(currentWeekStart);
              d.setDate(d.getDate() + 7);
              onWeekChange(d);
            }}
            title="Next Week"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>

          <div className="flex items-center gap-2 ml-2">
            <Calendar size={15} className="text-purple-600" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-900">
              {weekDays[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — {weekDays[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePopulatePreviousWeek}
            title="Copy tasks you worked on last week with blank hours"
            className="px-3.5 py-2 rounded-xl border border-purple-200 bg-purple-50/80 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy size={13} /> Copy Last Week Tasks
          </button>

          <button
            onClick={handleAddRow}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Row
          </button>

          <button
            onClick={() => saveMatrixMutation.mutate(false)}
            disabled={saveMatrixMutation.isPending}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            {saveMatrixMutation.isPending ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={() => saveMatrixMutation.mutate(true)}
            disabled={saveMatrixMutation.isPending}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-950/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={13} />
            Submit Week (PFA)
          </button>
        </div>
      </div>

      {/* 2. SPREADSHEET MATRIX TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-56">Client</th>
              <th className="py-3 px-3 w-52">Service / Activity</th>
              <th className="py-3 px-2 w-24 text-center">Type</th>
              {weekDays.map((day, idx) => {
                const isToday = day.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
                return (
                  <th
                    key={idx}
                    className={`py-3 px-2 w-20 text-center border-l border-slate-200/60 ${
                      isToday ? "bg-purple-100/50 text-purple-900" : ""
                    }`}
                  >
                    <div>{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                    <div className="text-[10px] font-mono font-medium text-slate-500">{day.getDate()} {day.toLocaleDateString("en-GB", { month: "short" })}</div>
                  </th>
                );
              })}
              <th className="py-3 px-3 w-24 text-center border-l border-slate-200 bg-slate-50 font-bold text-slate-800">
                Total
              </th>
              <th className="py-3 px-2 w-16 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <Clock className="mx-auto mb-2 animate-spin text-purple-600" size={24} />
                  Loading weekly timesheet matrix...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  No task rows created yet. Click "+ Add Row" above to start logging.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                // Compute row total
                const rowHoursSum = Object.values(row.days).reduce(
                  (sum, d) => sum + parseFloat(d.hours || "0"),
                  0
                );

                const clientJobsList = jobs.filter((j: any) => j.clientId === row.clientId);

                return (
                  <tr key={row.rowId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Client Dropdown */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.clientId || ""}
                        onChange={(e) => {
                          const cid = e.target.value ? parseInt(e.target.value) : null;
                          updateRowField(row.rowId, { clientId: cid, jobId: null });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-purple-500 outline-none"
                      >
                        <option value="">General Practice</option>
                        {clients.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.clientName || c.companyName || c.name}
                          </option>
                        ))}
                      </select>
                      {row.clientId && clientJobsList.length > 0 && (
                        <select
                          value={row.jobId || ""}
                          onChange={(e) => updateRowField(row.rowId, { jobId: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-full mt-1 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 outline-none"
                        >
                          <option value="">(No specific job)</option>
                          {clientJobsList.map((j: any) => (
                            <option key={j.id} value={j.id}>Job: {j.jobName}</option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* Task / Service Activity Dropdown */}
                    <td className="py-2.5 px-3">
                      <select
                        value={row.taskName}
                        onChange={(e) => updateRowField(row.rowId, { taskName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-purple-500 outline-none"
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
                    </td>

                    {/* Billable toggle */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => updateRowField(row.rowId, { billable: !row.billable })}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          row.billable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {row.billable ? "Billable" : "Non-bill"}
                      </button>
                    </td>

                    {/* 7 Days Matrix Cells */}
                    {weekDays.map((day, dayIdx) => {
                      const dayEntry = row.days[dayIdx] || { hours: "", description: "" };
                      const hasHours = parseFloat(dayEntry.hours || "0") > 0;
                      const hasNote = !!dayEntry.description;
                      const isToday = day.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

                      return (
                        <td
                          key={dayIdx}
                          className={`py-2 px-1 text-center border-l border-slate-200/60 relative ${
                            isToday ? "bg-purple-50/20" : ""
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="24"
                              placeholder="—"
                              value={dayEntry.hours}
                              onChange={(e) => handleHoursChange(row.rowId, dayIdx, e.target.value)}
                              className={`w-14 text-center font-mono py-1 rounded border text-xs font-bold outline-none transition-all ${
                                hasHours
                                  ? "bg-purple-50 text-purple-900 border-purple-300 font-bold"
                                  : "bg-slate-50/50 text-slate-400 border-slate-200 focus:bg-white focus:border-purple-400"
                              }`}
                            />
                            {/* Note attachment icon */}
                            <button
                              onClick={() => setActiveNoteCell({
                                rowId: row.rowId,
                                dayIndex: dayIdx,
                                dayDateStr: day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
                              })}
                              title={hasNote ? `Note: ${dayEntry.description}` : "Attach note for this day"}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                hasNote
                                  ? "text-purple-600 bg-purple-100/70 hover:bg-purple-200"
                                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              <MessageSquare size={11} />
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    {/* Row Total */}
                    <td className="py-2.5 px-3 text-center border-l border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 text-xs">
                      {rowHoursSum > 0 ? `${rowHoursSum.toFixed(2)}h` : "—"}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDuplicateRow(row)}
                          title="Duplicate row"
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row.rowId)}
                          title="Delete row"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* 3. SUMMARY ROW (Column Daily Totals) */}
          <tfoot>
            <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
              <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] text-slate-600">
                Daily Totals:
              </td>

              {dailyTotals.map((tot, idx) => {
                const meetsStandard = tot.total >= 7.5;
                return (
                  <td key={idx} className="py-3 px-1 text-center border-l border-slate-200/80 font-mono">
                    <div className="font-extrabold text-slate-900 text-xs">
                      {tot.total > 0 ? `${tot.total.toFixed(2)}h` : "0.00h"}
                    </div>
                    {tot.total > 0 && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans ${
                        meetsStandard ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {meetsStandard ? "Target Met" : `${tot.total.toFixed(1)}h`}
                      </span>
                    )}
                  </td>
                );
              })}

              {/* Grand Total Hours */}
              <td className="py-3 px-3 text-center border-l border-slate-300 bg-purple-50 text-purple-900 font-mono font-extrabold text-sm">
                {grandSummary.grandHours.toFixed(2)}h
              </td>

              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. FINANCIAL SUMMARY CARDS BAR */}
      <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Weekly Billable Hours</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono text-purple-700">
              {grandSummary.billableHours.toFixed(2)}h
            </span>
            <span className="text-slate-400 text-[11px]">
              of {grandSummary.grandHours.toFixed(2)}h (
              {grandSummary.grandHours > 0
                ? ((grandSummary.billableHours / grandSummary.grandHours) * 100).toFixed(0)
                : 0}
              %)
            </span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Revenue</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono text-emerald-700">
              £{grandSummary.billableRevenue.toFixed(2)}
            </span>
            <span className="text-slate-400 text-[11px]">Billable WIP</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Cost</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono text-slate-700">
              £{grandSummary.totalCost.toFixed(2)}
            </span>
            <span className="text-slate-400 text-[11px]">Internal basis</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Profit Margin</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold font-mono text-indigo-700">
              {grandSummary.margin}%
            </span>
            <span className="text-slate-400 text-[11px] font-semibold text-emerald-600">
              +£{grandSummary.profit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. CELL NOTE POPOVER MODAL */}
      {activeNoteCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-purple-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  Task Note — {activeNoteCell.dayDateStr}
                </h4>
              </div>
              <button
                onClick={() => setActiveNoteCell(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-500">
                Add work details or breakdown for this specific day's timesheet entry:
              </p>
              <textarea
                rows={3}
                value={
                  rows.find(r => r.rowId === activeNoteCell.rowId)?.days[activeNoteCell.dayIndex]?.description || ""
                }
                onChange={(e) => handleDescriptionChange(activeNoteCell.rowId, activeNoteCell.dayIndex, e.target.value)}
                placeholder="e.g. Completed trial balance import, resolved unreconciled £120 transaction"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveNoteCell(null)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
