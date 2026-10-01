import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "../../components/layout/AppLayout";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";
import { 
  BarChart3, Clock, Briefcase, FileText, Settings, Receipt, 
  PieChart, Building2, Save, Plus, Trash2, CheckCircle2, 
  AlertCircle, RefreshCw, Mail, Check, Sliders, DollarSign,
  HelpCircle, ShieldCheck, Users, UserCheck, Shield
} from "lucide-react";

import { timeFeesSidebar } from "./sidebar";

interface ActivityRate {
  id: number | string;
  code: string;
  name: string;
  defaultRate: string;
  billable: boolean;
}

interface StaffRate {
  userId: number;
  name: string;
  email: string;
  roleTier: string;
  capacityHoursPerWeek: string;
  billableRatePerHour: string;
  costRatePerHour: string;
  assignedTasks: string[];
  isActive: boolean;
}

const DEFAULT_ACTIVITIES: ActivityRate[] = [
  { id: 1, name: "Audit & Statutory Assurance", code: "ACT-001", defaultRate: "125.00", billable: true },
  { id: 2, name: "Tax Advisory & CT600", code: "ACT-002", defaultRate: "110.00", billable: true },
  { id: 3, name: "Bookkeeping & Management Accounts", code: "ACT-003", defaultRate: "55.00", billable: true },
  { id: 4, name: "Payroll & RTI Filing", code: "ACT-004", defaultRate: "45.00", billable: true },
  { id: 5, name: "Company Secretarial & Confirmation", code: "ACT-005", defaultRate: "65.00", billable: true },
  { id: 6, name: "Self Assessment SA100", code: "ACT-006", defaultRate: "75.00", billable: true },
  { id: 7, name: "General Administration", code: "ACT-007", defaultRate: "0.00", billable: false },
];

export default function TimeFeesSettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active section tab: "preferences" | "staff-rates" | "business" | "invoices" | "estimates" | "activities"
  const [activeTab, setActiveTab] = useState<"preferences" | "staff-rates" | "business" | "invoices" | "estimates" | "activities">("preferences");

  // Fetch settings & practice profile from API
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/time-fees/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/settings");
      return res.json();
    }
  });

  // Local state form fields
  const [formData, setFormData] = useState({
    startWeekOn: "Monday",
    defaultCapacityHours: "37.50",
    defaultHourlyRate: "75.00",
    mileageRate: "0.45",
    minChargeableTime: 15,
    timesheetDueDay: "Friday",
    timeFormat: "decimal",
    timeMode: "duration",
    invoicePrefix: "INV-",
    estimatePrefix: "EST-",
    defaultVatRate: "20.00",
    defaultPaymentTermsDays: 30,
    autoGenerateInvoices: false,
    paymentMethod: "BACS",
    bankDetails: "Barclays Bank UK\nSort Code: 20-00-00\nAccount No: 12345678\nAccount Name: SanSuite Client Services",
    invoiceFooter: "Payment terms: 30 days net from invoice date. Please quote invoice reference on bank transfer.",
    estimateFooter: "This fee estimate is valid for 30 calendar days from the date of issue. Fixed fee terms apply subject to scope agreement.",
  });

  const [activities, setActivities] = useState<ActivityRate[]>(DEFAULT_ACTIVITIES);
  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityRate, setNewActivityRate] = useState("65.00");
  const [newActivityBillable, setNewActivityBillable] = useState(true);

  // Sync settings when loaded from DB
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setFormData({
        startWeekOn: s.startWeekOn || "Monday",
        defaultCapacityHours: s.defaultCapacityHours ? String(s.defaultCapacityHours) : "37.50",
        defaultHourlyRate: s.defaultHourlyRate ? String(s.defaultHourlyRate) : "75.00",
        mileageRate: s.mileageRate ? String(s.mileageRate) : "0.45",
        minChargeableTime: s.minChargeableTime || 15,
        timesheetDueDay: s.timesheetDueDay || "Friday",
        timeFormat: s.timeFormat || "decimal",
        timeMode: s.timeMode || "duration",
        invoicePrefix: s.invoicePrefix || "INV-",
        estimatePrefix: s.estimatePrefix || "EST-",
        defaultVatRate: s.defaultVatRate ? String(s.defaultVatRate) : "20.00",
        defaultPaymentTermsDays: s.defaultPaymentTermsDays || 30,
        autoGenerateInvoices: Boolean(s.autoGenerateInvoices),
        paymentMethod: s.paymentMethod || "BACS",
        bankDetails: s.bankDetails || "Barclays Bank UK\nSort Code: 20-00-00\nAccount No: 12345678",
        invoiceFooter: s.invoiceFooter || "Payment terms: 30 days net. Please quote invoice reference on transfer.",
        estimateFooter: s.estimateFooter || "This estimate is valid for 30 calendar days from date of issue.",
      });

      if (s.activitiesJson) {
        try {
          const parsed = typeof s.activitiesJson === "string" ? JSON.parse(s.activitiesJson) : s.activitiesJson;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActivities(parsed);
          }
        } catch {
          // Keep defaults
        }
      }
    }
  }, [settingsData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        activitiesJson: activities,
      };
      const res = await apiRequest("POST", "/api/time-fees/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/settings"] });
      toast({
        title: "Settings Saved",
        description: "Practice Time & Fees preferences and chargeout rates have been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err.message || "Could not save settings. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Query staff rates
  const { data: staffRates = [], isLoading: isLoadingStaff, refetch: refetchStaff } = useQuery<StaffRate[]>({
    queryKey: ["/api/time-fees/manage/staff-rates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/time-fees/manage/staff-rates");
      return res.json();
    },
  });

  // Staff rate edits state
  const [staffRateEdits, setStaffRateEdits] = useState<Record<number, Partial<StaffRate>>>({});

  const updateStaffField = (userId: number, field: keyof StaffRate, val: any) => {
    setStaffRateEdits(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: val,
      }
    }));
  };

  const syncStaffMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/time-fees/manage/sync-users");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/manage/staff-rates"] });
      toast({ title: "Staff Synchronized", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    }
  });

  const saveStaffRateMutation = useMutation({
    mutationFn: async (payload: Partial<StaffRate>) => {
      const res = await apiRequest("POST", "/api/time-fees/manage/staff-rates", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-fees/manage/staff-rates"] });
      toast({ title: "Rate Card Saved", description: "Staff capacity and chargeout rates updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleSaveStaffRow = (user: StaffRate) => {
    const edits = staffRateEdits[user.userId] || {};
    saveStaffRateMutation.mutate({
      userId: user.userId,
      roleTier: edits.roleTier ?? user.roleTier,
      capacityHoursPerWeek: edits.capacityHoursPerWeek ?? user.capacityHoursPerWeek,
      billableRatePerHour: edits.billableRatePerHour ?? user.billableRatePerHour,
      costRatePerHour: edits.costRatePerHour ?? user.costRatePerHour,
      isActive: edits.isActive ?? user.isActive,
    });
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    const newAct: ActivityRate = {
      id: Date.now(),
      name: newActivityName.trim(),
      code: `ACT-00${activities.length + 1}`,
      defaultRate: newActivityRate || "65.00",
      billable: newActivityBillable
    };
    setActivities(prev => [...prev, newAct]);
    setNewActivityName("");
    setNewActivityRate("65.00");
    setNewActivityBillable(true);
    toast({ title: "Activity Added", description: `Added ${newAct.name} to chargeout activities list.` });
  };

  const handleDeleteActivity = (id: number | string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({ title: "Activity Removed", description: "Activity rate category removed." });
  };

  const handleUpdateActivityRate = (id: number | string, rate: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, defaultRate: rate } : a));
  };

  const handleToggleActivityBillable = (id: number | string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, billable: !a.billable } : a));
  };

  const practice = settingsData?.practice;

  return (
    <AppLayout sidebar={timeFeesSidebar} module="Time & Fees">
      <div className="p-6 space-y-6 max-w-6xl">
        {/* Module Header Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
          {timeFeesSidebar.map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                item.route === "/time-fees/settings"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Top Header & Save Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                <Settings size={18} />
              </span>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Time & Fees Configuration</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Statutory practice rates, approval rules, billing preferences, and HMRC compliance defaults
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isLoading}
              className="btn-SanSuite flex items-center gap-2 text-xs font-semibold shadow-xs"
            >
              {saveMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Settings Navigation Tabs (Capium Article 9000235943 Sections) */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "preferences"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Clock size={14} /> Time & Work Preferences
          </button>
          <button
            onClick={() => setActiveTab("staff-rates")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "staff-rates"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users size={14} /> Staff Rate Cards & Capacity
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "activities"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Sliders size={14} /> Chargeout Rates & Activities
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "invoices"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileText size={14} /> Invoices & Billing Defaults
          </button>
          <button
            onClick={() => setActiveTab("estimates")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "estimates"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <DollarSign size={14} /> Estimates & Quotations
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === "business"
                ? "bg-purple-100 text-purple-800 shadow-xs"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Building2 size={14} /> My Business Profile
          </button>
        </div>

        {/* TAB 1: Time & Work Preferences */}
        {activeTab === "preferences" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Clock size={16} className="text-purple-600" /> Timesheet & Capacity Rules
              </h2>
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Start Week On</label>
                  <select
                    value={formData.startWeekOn}
                    onChange={(e) => setFormData({ ...formData, startWeekOn: e.target.value })}
                    className="SanSuite-input w-full"
                  >
                    <option value="Monday">Monday (Standard UK Practice)</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-0.5">Determines the starting column on the Timesheet Week Matrix view.</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Default Capacity Hours per Week</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.defaultCapacityHours}
                    onChange={(e) => setFormData({ ...formData, defaultCapacityHours: e.target.value })}
                    className="SanSuite-input w-full font-mono font-semibold"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Baseline weekly hours used for staff productivity and utilization calculations (e.g. 37.5 hrs).</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Timesheet Due Day</label>
                  <select
                    value={formData.timesheetDueDay}
                    onChange={(e) => setFormData({ ...formData, timesheetDueDay: e.target.value })}
                    className="SanSuite-input w-full"
                  >
                    <option value="Friday">Friday EOD</option>
                    <option value="Sunday">Sunday EOD</option>
                    <option value="Monday">Monday 9:00 AM</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-0.5">Deadline by which staff must submit weekly timesheets for manager approval (PFA).</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Minimum Chargeable Time Unit</label>
                  <select
                    value={formData.minChargeableTime}
                    onChange={(e) => setFormData({ ...formData, minChargeableTime: parseInt(e.target.value) })}
                    className="SanSuite-input w-full"
                  >
                    <option value="6">6 Minutes (1/10th Hour)</option>
                    <option value="15">15 Minutes (1/4th Hour - Standard)</option>
                    <option value="30">30 Minutes (1/2 Hour)</option>
                    <option value="60">60 Minutes (Full Hour)</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-0.5">Rounds stopwatch timer entries to the nearest increment when logged.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <DollarSign size={16} className="text-purple-600" /> Default Hourly Rates & Mileage
              </h2>
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Practice Standard Hourly Rate (£ / hr)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-mono text-gray-400">£</span>
                    <input
                      type="number"
                      step="1"
                      value={formData.defaultHourlyRate}
                      onChange={(e) => setFormData({ ...formData, defaultHourlyRate: e.target.value })}
                      className="SanSuite-input pl-6 w-full font-mono font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">Default rate applied to timelogs if no client or activity-specific override is set.</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Approved HMRC Mileage Allowance Rate (£ / mile)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-mono text-gray-400">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mileageRate}
                      onChange={(e) => setFormData({ ...formData, mileageRate: e.target.value })}
                      className="SanSuite-input pl-6 w-full font-mono font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">Statutory rate for business car travel reimbursement (HMRC standard: £0.45/mile up to 10,000 miles).</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Time Entry Mode</label>
                  <select
                    value={formData.timeMode}
                    onChange={(e) => setFormData({ ...formData, timeMode: e.target.value })}
                    className="SanSuite-input w-full"
                  >
                    <option value="duration">Duration Only (e.g. 2.50 hours)</option>
                    <option value="start_end">Start Time & End Time (e.g. 09:30 - 12:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Time Display Format</label>
                  <select
                    value={formData.timeFormat}
                    onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value })}
                    className="SanSuite-input w-full"
                  >
                    <option value="decimal">Decimal Hours (e.g. 2.75 hrs)</option>
                    <option value="hhmm">Hours & Minutes (e.g. 2h 45m)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1.5: Staff Rate Cards & Capacity (Capium Article 9000236008 & 9000271112) */}
        {activeTab === "staff-rates" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Users size={16} className="text-purple-600" /> Staff Rate Cards & Weekly Capacity
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure individual staff target hours, billable rates, cost rates, and role access tiers (Admin, Manager, Staff).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => syncStaffMutation.mutate()}
                    disabled={syncStaffMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors shadow-xs"
                  >
                    <RefreshCw size={13} className={syncStaffMutation.isPending ? "animate-spin" : ""} />
                    {syncStaffMutation.isPending ? "Syncing..." : "Sync Staff from My Admin"}
                  </button>
                </div>
              </div>

              {/* Informational Guidance Box */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Capium Parity: Individual Staff Rate Overrides & Capacity</span>
                  <p className="text-[11px] text-purple-800">
                    When staff record time, their personalized billable rate (£/hr) and internal cost rate (£/hr) are applied automatically. The weekly capacity determines their timesheet completion target and utilization metrics on the Dashboard.
                  </p>
                </div>
              </div>

              {/* Staff Rate Cards Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Staff Member</th>
                      <th className="py-2.5 px-3">Role Tier</th>
                      <th className="py-2.5 px-3">Weekly Capacity (Hrs)</th>
                      <th className="py-2.5 px-3">Billable Rate (£/hr)</th>
                      <th className="py-2.5 px-3">Cost Rate (£/hr)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingStaff ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          <RefreshCw size={18} className="animate-spin inline mr-2 text-purple-600" />
                          Loading staff rate cards...
                        </td>
                      </tr>
                    ) : staffRates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <div className="max-w-sm mx-auto space-y-2">
                            <Users size={32} className="mx-auto text-gray-300" />
                            <p className="font-semibold text-gray-700 text-sm">No Staff Registered Yet</p>
                            <p className="text-gray-500 text-xs">
                              Sync users from your practice administration to automatically generate their Time & Fees rate cards.
                            </p>
                            <button
                              type="button"
                              onClick={() => syncStaffMutation.mutate()}
                              disabled={syncStaffMutation.isPending}
                              className="mt-2 btn-SanSuite text-xs font-semibold px-4 py-2 inline-flex items-center gap-1.5"
                            >
                              <RefreshCw size={13} className={syncStaffMutation.isPending ? "animate-spin" : ""} />
                              Sync Staff Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      staffRates.map((staff) => {
                        const edits = staffRateEdits[staff.userId] || {};
                        const currentRole = edits.roleTier ?? staff.roleTier;
                        const currentCapacity = edits.capacityHoursPerWeek ?? staff.capacityHoursPerWeek;
                        const currentBillable = edits.billableRatePerHour ?? staff.billableRatePerHour;
                        const currentCost = edits.costRatePerHour ?? staff.costRatePerHour;
                        const currentActive = edits.isActive ?? staff.isActive;
                        const hasChanges = Object.keys(edits).length > 0;

                        return (
                          <tr key={staff.userId} className="hover:bg-purple-50/20 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-gray-900">{staff.name}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{staff.email}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={currentRole}
                                onChange={(e) => updateStaffField(staff.userId, "roleTier", e.target.value)}
                                className="SanSuite-input py-1 px-2 text-xs font-medium"
                              >
                                <option value="Admin">Admin (Full Access)</option>
                                <option value="Manager">Manager (Approver)</option>
                                <option value="Staff">Staff (Standard)</option>
                              </select>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="100"
                                  value={currentCapacity}
                                  onChange={(e) => updateStaffField(staff.userId, "capacityHoursPerWeek", e.target.value)}
                                  className="SanSuite-input py-1 px-2 text-xs font-mono w-20 text-right"
                                />
                                <span className="text-gray-400 text-[11px]">hrs</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">£</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={currentBillable}
                                  onChange={(e) => updateStaffField(staff.userId, "billableRatePerHour", e.target.value)}
                                  className="SanSuite-input py-1 pl-5 pr-2 text-xs font-mono font-semibold w-full text-right"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="relative w-24">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">£</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={currentCost}
                                  onChange={(e) => updateStaffField(staff.userId, "costRatePerHour", e.target.value)}
                                  className="SanSuite-input py-1 pl-5 pr-2 text-xs font-mono text-gray-600 w-full text-right"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => updateStaffField(staff.userId, "isActive", !currentActive)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                  currentActive
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                {currentActive ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleSaveStaffRow(staff)}
                                disabled={saveStaffRateMutation.isPending || !hasChanges}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                                  hasChanges
                                    ? "bg-purple-700 text-white hover:bg-purple-800"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                <Save size={12} />
                                {hasChanges ? "Save" : "Saved"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Chargeout Rates & Activities */}
        {activeTab === "activities" && (
          <div className="space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Activity Chargeout Rates Matrix</h2>
                  <p className="text-xs text-gray-500">Configure standard billable rates and chargeability status across service lines</p>
                </div>
                <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-lg">
                  {activities.length} Configured Categories
                </span>
              </div>

              {/* Add Activity Form */}
              <form onSubmit={handleAddActivity} className="flex flex-wrap items-center gap-3 bg-purple-50/60 p-3.5 rounded-xl border border-purple-100">
                <input
                  type="text"
                  placeholder="Activity Category (e.g. Forensics & Investigation)"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  className="SanSuite-input flex-1 min-w-[200px] text-xs bg-white"
                  required
                />
                <div className="w-32 relative">
                  <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-mono">£</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="Rate"
                    value={newActivityRate}
                    onChange={(e) => setNewActivityRate(e.target.value)}
                    className="SanSuite-input pl-6 w-full text-xs font-mono bg-white"
                    required
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newActivityBillable}
                    onChange={(e) => setNewActivityBillable(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Billable
                </label>
                <button type="submit" className="btn-SanSuite flex items-center gap-1.5 text-xs shrink-0 shadow-xs">
                  <Plus size={14} /> Add Category
                </button>
              </form>

              {/* Table of Activities */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="SanSuite-table w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="py-2.5 px-3">Activity Code</th>
                      <th className="py-2.5 px-3">Service Category</th>
                      <th className="py-2.5 px-3">Standard Rate (£/hr)</th>
                      <th className="py-2.5 px-3">Chargeable Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activities.map((act) => (
                      <tr key={act.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-purple-700 font-bold">{act.code}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{act.name}</td>
                        <td className="py-2.5 px-3">
                          <div className="relative inline-block w-28">
                            <span className="absolute left-2 top-1.5 text-xs font-mono text-gray-400">£</span>
                            <input
                              type="number"
                              step="1"
                              value={act.defaultRate}
                              onChange={(e) => handleUpdateActivityRate(act.id, e.target.value)}
                              className="SanSuite-input pl-5 py-1 text-xs font-mono font-semibold w-full"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleActivityBillable(act.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                              act.billable
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {act.billable ? "BILLABLE" : "NON-BILLABLE"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id)}
                            className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Invoices & Billing Defaults */}
        {activeTab === "invoices" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <FileText size={16} className="text-purple-600" /> Invoice Numbering & Payment Rules
              </h2>
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Invoice ID Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="SanSuite-input w-full font-mono"
                    placeholder="INV-"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Appended before sequential invoice numbers (e.g. INV-1001).</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Standard VAT Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={formData.defaultVatRate}
                      onChange={(e) => setFormData({ ...formData, defaultVatRate: e.target.value })}
                      className="SanSuite-input w-full font-mono font-semibold"
                    />
                    <span className="absolute right-3 top-2 text-xs font-mono text-gray-400">%</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">UK standard statutory rate (currently 20.00%).</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Default Payment Due Terms</label>
                  <select
                    value={formData.defaultPaymentTermsDays}
                    onChange={(e) => setFormData({ ...formData, defaultPaymentTermsDays: parseInt(e.target.value) })}
                    className="SanSuite-input w-full"
                  >
                    <option value="7">7 Days Net</option>
                    <option value="14">14 Days Net</option>
                    <option value="30">30 Days Net (Standard)</option>
                    <option value="60">60 Days Net</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Default Remittance Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="SanSuite-input w-full"
                  >
                    <option value="BACS">BACS / Electronic Bank Transfer</option>
                    <option value="Direct Debit">Direct Debit (GoCardless)</option>
                    <option value="Debit/Credit Card">Debit / Credit Card (Stripe)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoGenerateInvoices}
                      onChange={(e) => setFormData({ ...formData, autoGenerateInvoices: e.target.checked })}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-semibold text-gray-800 block text-xs">Auto-draft Invoice on Job Sign-off</span>
                      <span className="text-gray-400 text-[11px]">Automatically compiles unbilled timelogs and expenses into a draft fee invoice when a job status is set to Completed.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                <Building2 size={16} className="text-purple-600" /> Bank Remittance & Invoice Footer
              </h2>
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Practice Bank Account Details (Printed on Invoices)</label>
                  <textarea
                    rows={4}
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    className="SanSuite-input w-full font-mono text-xs"
                    placeholder="Bank Name, Sort Code, Account Number, IBAN"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Displayed in the payment remittance advice section of generated client invoices.</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Standard Invoice Footer / Legal Disclaimer</label>
                  <textarea
                    rows={4}
                    value={formData.invoiceFooter}
                    onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                    className="SanSuite-input w-full text-xs"
                    placeholder="Payment terms, interest charges for late settlement, etc."
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Printed at the bottom of all generated invoices.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Estimates & Quotations */}
        {activeTab === "estimates" && (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4 max-w-2xl">
            <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-purple-600" /> Estimates & Quotes Preferences
            </h2>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Estimate ID Prefix</label>
                <input
                  type="text"
                  value={formData.estimatePrefix}
                  onChange={(e) => setFormData({ ...formData, estimatePrefix: e.target.value })}
                  className="SanSuite-input w-full font-mono"
                  placeholder="EST-"
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Preceding code for statutory fee proposals (e.g. EST-2001).</p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Estimate Terms & Conditions Footer</label>
                <textarea
                  rows={4}
                  value={formData.estimateFooter}
                  onChange={(e) => setFormData({ ...formData, estimateFooter: e.target.value })}
                  className="SanSuite-input w-full text-xs"
                  placeholder="This proposal is valid for 30 days..."
                />
                <p className="text-[11px] text-gray-400 mt-0.5">Standard engagement conditions and validity window printed on client quotes.</p>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900 flex items-start gap-2">
                <CheckCircle2 size={15} className="text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">1-Click Invoice Conversion Parity</span>
                  <p className="mt-0.5 text-purple-800">
                    Approved estimates can be directly converted to draft invoices with all line-items, VAT calculations, and client details preserved intact.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: My Business Profile */}
        {activeTab === "business" && (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4 max-w-2xl">
            <h2 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" /> Practice Business Details
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Practice Legal Name</label>
                <input
                  type="text"
                  value={practice?.name || "SanSuite Practice"}
                  disabled
                  className="SanSuite-input w-full bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Practice Subdomain</label>
                <input
                  type="text"
                  value={practice?.subdomain ? `${practice.subdomain}.sansuite.co.uk` : "app.sansuite.co.uk"}
                  disabled
                  className="SanSuite-input w-full bg-gray-50 text-gray-700 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Subscription Plan</label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold text-[11px] rounded-lg uppercase tracking-wider">
                    {practice?.plan || "Professional Suite"}
                  </span>
                  <span className="text-gray-500 text-[11px]">Time & Fees Full Parity License</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 flex items-start gap-2">
                <HelpCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Managed Practice Profile</span>
                  <p className="mt-0.5 text-amber-800">
                    Your practice address, Companies House registration number, and VAT registration are synchronized from your Master Practice Settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
