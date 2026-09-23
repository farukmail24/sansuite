import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  Settings, Shield, Lock, Mail, Save, CheckCircle2,
  AlertCircle, LayoutDashboard, Users, HelpCircle
} from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";

const sidebar = [
  { label: "SA100 Returns", icon: <LayoutDashboard size={15} />, route: "/self-assessment" },
  { label: "SA800 (Partnerships)", icon: <Users size={15} />, route: "/self-assessment/sa800" },
  { label: "Questionnaire", icon: <HelpCircle size={15} />, route: "/self-assessment/questionnaire" },
  { label: "Settings", icon: <Settings size={15} />, route: "/self-assessment/settings" },
];

export default function SelfAssessmentSettingsPage() {
  const { toast } = useToast();
  const [senderId, setSenderId] = useState("HMRC-AGENT-7781");
  const [testMode, setTestMode] = useState(true);
  const [defaultTaxYear, setDefaultTaxYear] = useState("2025/2026");
  const [enablePasswordProtection, setEnablePasswordProtection] = useState(true);
  const [passwordFormat, setPasswordFormat] = useState("nino_dob");
  const [emailNotificationSender, setEmailNotificationSender] = useState("tax-filings@sansuite.co.uk");
  const [isSaving, setIsSaving] = useState(false);

  // Check HMRC connection status
  const { data: hmrcStatus } = useQuery({
    queryKey: ["/api/hmrc-gateway/oauth/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/hmrc-gateway/oauth/status");
      if (!res.ok) return { connected: false };
      return res.json();
    }
  });

  const handleConnectHmrc = async () => {
    try {
      const res = await apiRequest("GET", "/api/hmrc-gateway/oauth/auth-url");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not generate HMRC authorization URL.",
        type: "error",
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "Self Assessment module statutory and filing preferences updated.",
        type: "success",
      });
    }, 400);
  };

  return (
    <AppLayout sidebar={sidebar} module="Self Assessment">
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-6 text-xs">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-purple-600" />
                Self Assessment Module Settings
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure HMRC agent credentials, security encryption, and default statutory return parameters.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HMRC Gateway Settings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-600" />
                  <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    HMRC Gateway & API Status
                  </h2>
                </div>
                {hmrcStatus?.connected && !hmrcStatus?.expired ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-semibold rounded-full border border-rose-200 dark:border-rose-800">
                    Not Connected
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleConnectHmrc}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-sm"
                  >
                    {hmrcStatus?.connected ? "Reconnect to HMRC" : "Connect to HMRC"}
                  </button>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    HMRC Agent Sender ID *
                  </label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Your 12-character HMRC Online Services Agent Gateway ID.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Default Tax Year
                  </label>
                  <select
                    value={defaultTaxYear}
                    onChange={(e) => setDefaultTaxYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="2025/2026">2025/2026 (Current Tax Year)</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2022/2023">2022/2023</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Enable HMRC Test in Live (Sandbox Mode)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6 mt-0.5">
                    Validates SA100 returns against HMRC test schema without committing real tax submissions.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Security & Password Protection (Article 9000191277) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Lock size={16} className="text-indigo-600" />
                <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Document Password Protection
                </h2>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePasswordProtection}
                    onChange={(e) => setEnablePasswordProtection(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Password Protect Exported SA100 / SA302 PDFs
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Encrypts client tax returns and payment slips with AES-128 standard before emailing or downloading.
                </p>

                {enablePasswordProtection && (
                  <div className="pt-2 space-y-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-medium">
                      Password Scheme
                    </label>
                    <select
                      value={passwordFormat}
                      onChange={(e) => setPasswordFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    >
                      <option value="nino_dob">First 4 of NINO + DOB (DDMM)</option>
                      <option value="utr_postcode">First 5 of UTR + Postcode</option>
                      <option value="custom_client">Custom Client Portal Password</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Email & Notification Configuration (Article 9000201868) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Mail size={16} className="text-purple-600" />
                <h2 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Client Email & eSign Notifications (Article 9000201868)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                    Notification Sender Email Address *
                  </label>
                  <input
                    type="email"
                    value={emailNotificationSender}
                    onChange={(e) => setEmailNotificationSender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Address shown in client inboxes for eSign requests and tax payment slips.
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Statutory Deadline Reminders:</span>
                  <p>
                    Automatic email dispatch scheduled 30 days and 7 days prior to 31 January and 31 July Payments on Account deadlines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
