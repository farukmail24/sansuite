import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../../components/layout/AppLayout";
import { practiceSidebar } from "./sidebar";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  Calendar as CalendarIcon, CheckCircle2, RefreshCw,
  Clock, Shield, ExternalLink, Settings2,
  CalendarCheck, AlertCircle, Check, Sparkles,
  Unlink, X, Mail
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch Connected Integrations from Database
  const { data: integrations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pm/calendar/integrations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pm/calendar/integrations");
      return res.ok ? await res.json() : [];
    },
  });

  const googleIntegration = integrations.find((i: any) => i.provider === "google");
  const officeIntegration = integrations.find((i: any) => i.provider === "office365");

  // Listen for OAuth Popup Callback completion messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_CALENDAR_SUCCESS") {
        queryClient.invalidateQueries({ queryKey: ["/api/pm/calendar/integrations"] });
        toast({
          title: `${event.data.provider === "google" ? "Google Calendar" : "Office 365 Calendar"} Connected!`,
          description: "2-way live event and deadline synchronization is now active.",
        });
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [queryClient, toast]);

  // Official Google OAuth Trigger
  const handleGoogleOAuth = () => {
    if (googleIntegration) {
      toast({ title: "Google Calendar", description: `Already connected with ${googleIntegration.accountEmail}` });
      return;
    }

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Google Calendar OAuth 2.0 parameters
    const clientId = "102575897546-jdgokdi2ve911754ig6ic1bg1lm1lv2n.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email openid");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    const popup = window.open(
      authUrl,
      "GoogleSignIn",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    // Fallback if popup is blocked
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for localhost to open the Google OAuth sign-in window.",
        variant: "destructive",
      });
    }
  };

  // Official Microsoft Office 365 OAuth Trigger
  const handleOfficeOAuth = () => {
    if (officeIntegration) {
      toast({ title: "Office 365 Calendar", description: `Already connected with ${officeIntegration.accountEmail}` });
      return;
    }

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Microsoft Graph OAuth 2.0 parameters
    const clientId = "9c235b2e-07a8-48b4-9273-04e30bdf3cb1";
    const redirectUri = `${window.location.origin}/api/pm/calendar/oauth/office/callback`;
    const scope = encodeURIComponent("Calendars.ReadWrite User.Read offline_access openid profile email");
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_mode=query`;

    const popup = window.open(
      authUrl,
      "MicrosoftSignIn",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for localhost to open the Microsoft OAuth sign-in window.",
        variant: "destructive",
      });
    }
  };

  // Update Preferences Mutation
  const updatePrefMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/pm/calendar/integrations/${id}`, updates);
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/calendar/integrations"] });
      toast({ title: "Preferences Saved", description: "Calendar synchronization rules updated." });
    },
  });

  // Sync Now Mutation
  const syncNowMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pm/calendar/integrations/sync");
      if (!res.ok) throw new Error("Failed to sync calendar");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/calendar/integrations"] });
      toast({
        title: "Sync Complete",
        description: data.message || "All HMRC statutory deadlines and client meetings synced.",
      });
    },
  });

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/pm/calendar/integrations/${id}`);
      if (!res.ok) throw new Error("Failed to disconnect calendar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pm/calendar/integrations"] });
      toast({ title: "Disconnected", description: "Calendar integration has been unlinked." });
    },
  });

  const activeIntegration = googleIntegration || officeIntegration;

  return (
    <AppLayout sidebar={practiceSidebar} module="Practice Management">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 w-full text-xs">
        
        {/* Main Container */}
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs text-center space-y-8">
            
            {/* Header Section */}
            <div className="space-y-2 max-w-md mx-auto">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Calendar Setup
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select one of below calendars to integrate events
              </p>
            </div>

            {/* Integration Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              
              {/* Sign in with Google Button (Triggers Official Google OAuth Popup) */}
              <button
                type="button"
                onClick={handleGoogleOAuth}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-lg border transition font-semibold text-xs shadow-xs cursor-pointer ${
                  googleIntegration
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:shadow-md"
                }`}
              >
                {/* Google Multi-Color G Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="flex items-center gap-1">
                  {googleIntegration ? (
                    <>
                      Google Connected ({googleIntegration.accountEmail})
                      <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                    </>
                  ) : (
                    "Sign in with Google"
                  )}
                </span>
              </button>

              {/* Office Calendar Button (Triggers Official Microsoft OAuth Popup) */}
              <button
                type="button"
                onClick={handleOfficeOAuth}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-lg border transition font-semibold text-xs shadow-xs cursor-pointer ${
                  officeIntegration
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:shadow-md"
                }`}
              >
                {/* Microsoft Office Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EB3C00" d="M11.5 2H2v9.5h9.5V2z" />
                  <path fill="#4AA400" d="M22 2h-9.5v9.5H22V2z" />
                  <path fill="#00A4EF" d="M11.5 12.5H2V22h9.5v-9.5z" />
                  <path fill="#FFB900" d="M22 12.5h-9.5V22H22v-9.5z" />
                </svg>
                <span className="flex items-center gap-1">
                  {officeIntegration ? (
                    <>
                      Office Connected ({officeIntegration.accountEmail})
                      <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                    </>
                  ) : (
                    "Office Calendar"
                  )}
                </span>
              </button>
            </div>

            {/* Illustration Section */}
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="relative w-64 h-48 flex items-center justify-center">
                <svg viewBox="0 0 320 240" className="w-full h-full drop-shadow-md">
                  <path d="M40 210 L160 50 L280 210 Z" fill="#e2e8f0" />
                  <path d="M40 210 L140 50 L120 210 Z" fill="#cbd5e1" opacity="0.6" />
                  <rect x="60" y="60" width="200" height="150" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="60" y="60" width="200" height="36" rx="8" fill="#e11d48" />
                  <rect x="60" y="86" width="200" height="10" fill="#e11d48" />
                  <circle cx="90" cy="55" r="5" fill="#94a3b8" />
                  <circle cx="130" cy="55" r="5" fill="#94a3b8" />
                  <circle cx="170" cy="55" r="5" fill="#94a3b8" />
                  <circle cx="210" cy="55" r="5" fill="#94a3b8" />
                  <circle cx="250" cy="55" r="5" fill="#94a3b8" />

                  {[0, 1, 2, 3, 4].map(row => (
                    [0, 1, 2, 3, 4, 5].map(col => (
                      <rect
                        key={`${row}-${col}`}
                        x={78 + col * 28}
                        y={105 + row * 18}
                        width="18"
                        height="12"
                        rx="2"
                        fill={row === 2 && col === 3 ? "#e11d48" : (row === 1 && col === 2 ? "#3b82f6" : "#f1f5f9")}
                      />
                    ))
                  ))}

                  <circle cx="265" cy="115" r="14" fill="#fbcfe8" />
                  <path d="M260 102 C255 106, 275 106, 270 102" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                  <rect x="250" y="130" width="30" height="50" rx="6" fill="#1e3a8a" />
                  <line x1="250" y1="140" x2="225" y2="120" stroke="#fbcfe8" strokeWidth="6" strokeLinecap="round" />
                  <line x1="280" y1="140" x2="295" y2="155" stroke="#fbcfe8" strokeWidth="6" strokeLinecap="round" />
                  <rect x="252" y="180" width="11" height="40" rx="4" fill="#e11d48" />
                  <rect x="267" y="180" width="11" height="40" rx="4" fill="#e11d48" />
                  <ellipse cx="257" cy="220" rx="8" ry="4" fill="#0f172a" />
                  <ellipse cx="272" cy="220" rx="8" ry="4" fill="#0f172a" />
                </svg>
              </div>
            </div>

            {/* Sync Settings Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 text-left space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-purple-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">2-Way Synchronization Preferences</span>
                </div>
                <button
                  type="button"
                  onClick={() => syncNowMutation.mutate()}
                  disabled={syncNowMutation.isPending || (!googleIntegration && !officeIntegration)}
                  className="bg-[#5c469c] hover:bg-[#4b3882] text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={syncNowMutation.isPending ? "animate-spin" : ""} />
                  {syncNowMutation.isPending ? "Syncing..." : "Sync Now"}
                </button>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Sync UK Statutory Deadlines (Accounts, CT600, VAT, CS01)</span>
                  <input
                    type="checkbox"
                    checked={activeIntegration ? activeIntegration.syncHmrcDeadlines : true}
                    onChange={(e) => {
                      if (activeIntegration) {
                        updatePrefMutation.mutate({
                          id: activeIntegration.id,
                          updates: { syncHmrcDeadlines: e.target.checked }
                        });
                      }
                    }}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Sync Client Schedule & Scheduled Meetings</span>
                  <input
                    type="checkbox"
                    checked={activeIntegration ? activeIntegration.syncMeetings : true}
                    onChange={(e) => {
                      if (activeIntegration) {
                        updatePrefMutation.mutate({
                          id: activeIntegration.id,
                          updates: { syncMeetings: e.target.checked }
                        });
                      }
                    }}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Sync Staff Work Tasks & Due Dates</span>
                  <input
                    type="checkbox"
                    checked={activeIntegration ? activeIntegration.syncStaffTasks : true}
                    onChange={(e) => {
                      if (activeIntegration) {
                        updatePrefMutation.mutate({
                          id: activeIntegration.id,
                          updates: { syncStaffTasks: e.target.checked }
                        });
                      }
                    }}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Connected Accounts Details */}
              {integrations.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Active Calendar Connections:</h4>
                  {integrations.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <CalendarCheck size={14} className="text-emerald-600" />
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.provider === "google" ? "Google Calendar" : "Office 365 Calendar"} ({item.accountEmail})
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Last synced: {item.lastSyncedAt ? new Date(item.lastSyncedAt).toLocaleString() : "Just now"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => disconnectMutation.mutate(item.id)}
                        className="text-rose-600 hover:text-rose-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Unlink size={12} />
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}
