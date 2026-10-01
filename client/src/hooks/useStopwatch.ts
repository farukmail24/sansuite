import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest, queryClient } from "../lib/queryClient";

export interface StopwatchState {
  isRunning: boolean;
  startedAt: number | null; // Date.now() timestamp
  accumulatedSeconds: number;
  clientId: number | null;
  clientName: string;
  jobId: number | null;
  jobName: string;
  taskName: string;
  subtaskName: string;
  description: string;
  billable: boolean;
  ratePerHour: string;
  costRate: string;
  isMinimized: boolean;
  isOpen: boolean;
}

const STORAGE_KEY = "sansuite_active_stopwatch";

const DEFAULT_STATE: StopwatchState = {
  isRunning: false,
  startedAt: null,
  accumulatedSeconds: 0,
  clientId: null,
  clientName: "",
  jobId: null,
  jobName: "",
  taskName: "Annual Accounts Production",
  subtaskName: "Statutory Review",
  description: "",
  billable: true,
  ratePerHour: "85.00",
  costRate: "40.00",
  isMinimized: true,
  isOpen: false,
};

export function useStopwatch() {
  const [state, setState] = useState<StopwatchState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load stopwatch from localStorage:", e);
    }
    return DEFAULT_STATE;
  });

  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save stopwatch state:", e);
    }
  }, [state]);

  // Compute live elapsed seconds
  const calculateElapsed = useCallback(() => {
    if (!state.isRunning || !state.startedAt) {
      return state.accumulatedSeconds;
    }
    const delta = Math.floor((Date.now() - state.startedAt) / 1000);
    return state.accumulatedSeconds + Math.max(0, delta);
  }, [state.isRunning, state.startedAt, state.accumulatedSeconds]);

  // Tick interval for live updates
  useEffect(() => {
    setCurrentSeconds(calculateElapsed());

    if (state.isRunning) {
      timerRef.current = setInterval(() => {
        setCurrentSeconds(calculateElapsed());
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, state.startedAt, state.accumulatedSeconds, calculateElapsed]);

  // Cross-tab sync via storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState(prev => ({ ...prev, ...parsed }));
        } catch (err) {
          console.error("Error syncing stopwatch across tabs", err);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const start = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      startedAt: Date.now(),
    }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => {
      if (!prev.isRunning || !prev.startedAt) return prev;
      const delta = Math.floor((Date.now() - prev.startedAt) / 1000);
      return {
        ...prev,
        isRunning: false,
        startedAt: null,
        accumulatedSeconds: prev.accumulatedSeconds + Math.max(0, delta),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      startedAt: null,
      accumulatedSeconds: 0,
    }));
    setCurrentSeconds(0);
  }, []);

  const updateDetails = useCallback((patch: Partial<StopwatchState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  const setOpen = useCallback((isOpen: boolean) => {
    setState(prev => ({ ...prev, isOpen }));
  }, []);

  const setMinimized = useCallback((isMinimized: boolean) => {
    setState(prev => ({ ...prev, isMinimized }));
  }, []);

  const saveToTimesheet = useCallback(async (customDate?: string) => {
    const totalSecs = calculateElapsed();
    if (totalSecs < 10) {
      throw new Error("Time recorded is less than 10 seconds. Run the timer longer before logging.");
    }

    const calculatedHours = (Math.max(totalSecs / 3600, 0.10)).toFixed(2);
    const dateToUse = customDate || new Date().toISOString().split("T")[0];

    const payload = {
      clientId: state.clientId,
      jobId: state.jobId,
      taskName: state.taskName || "General Accounting",
      subtaskName: state.subtaskName || undefined,
      description: state.description || `Live tracked time (${formatTime(totalSecs)})`,
      date: dateToUse,
      hours: calculatedHours,
      billable: state.billable,
      ratePerHour: state.ratePerHour,
      costRate: state.costRate,
      status: "Unsubmitted",
    };

    const res = await apiRequest("POST", "/api/time-fees/timesheets", payload);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to log time" }));
      throw new Error(err.message || "Failed to log timesheet from stopwatch");
    }

    queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/time-fees/dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/time-fees/timesheets/matrix-week"] });

    // Reset stopwatch after successful save
    reset();
    return await res.json();
  }, [state, calculateElapsed, reset]);

  return {
    state,
    currentSeconds,
    start,
    pause,
    reset,
    updateDetails,
    setOpen,
    setMinimized,
    saveToTimesheet,
  };
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
