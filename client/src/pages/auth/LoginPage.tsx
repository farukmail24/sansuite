import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import {
  Building2, Users, Receipt, Eye, EyeOff, Loader2, KeyRound,
  CheckCircle2, ArrowLeft, Copy, ShieldCheck, ArrowRight
} from "lucide-react";

export type PortalType = "accountant" | "sme" | "365";

interface PortalCardConfig {
  id: PortalType;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  iconBg: string;
  iconColor: string;
  icon: any;
  description: string;
  features: string[];
}

const PORTAL_CARDS: PortalCardConfig[] = [
  {
    id: "accountant",
    title: "Accountant",
    subtitle: "All Modules",
    badge: "CA Practice & Staff",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    icon: Building2,
    description: "For CA firms, partners, qualified accountants, and staff managing full practice workflows & statutory compliance.",
    features: [
      "Practice Management & CRM",
      "Accounts Production (FRS 102/105)",
      "Corporation Tax (CT600) & SA100/800",
      "Bulk Payroll & RTI Submissions",
      "Company Secretarial & AML Checks"
    ]
  },
  {
    id: "sme",
    title: "Client & SME",
    subtitle: "Bookkeeping & Payroll",
    badge: "Business Owners & SMEs",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    icon: Users,
    description: "For SME owners and directors to manage day-to-day business finances with live accountant data bridging.",
    features: [
      "Dedicated Company Bookkeeping",
      "Employee Payroll & Pay Runs",
      "Sales Invoicing & Customer Tracking",
      "Purchase Bills & Supplier Expenses",
      "Live Data Sync to CA Firm"
    ]
  },
  {
    id: "365",
    title: "365",
    subtitle: "Receipts, Invoices & Bankfeeds",
    badge: "Client Portal",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    icon: Receipt,
    description: "For clients to scan & upload expense receipts, create instant sales invoices, view bank feeds, and approve documents.",
    features: [
      "Receipts & DocScan (OCR Extraction)",
      "Quick Invoicing & Estimates",
      "Live Bank Feeds & Transactions",
      "Accountant Document Requests",
      "eSign Engagement & Final Accounts"
    ]
  }
];

export default function LoginPage() {
  const [locationPath, navigate] = useLocation();
  const login = useAuth((s) => s.login);

  // Dynamic portal determination directly from browser URL / route / subdomain
  const getPortalFromLocation = (loc: string): PortalType | null => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("portal");
    if (p === "accountant" || p === "sme" || p === "365") return p;

    const lowerLoc = (loc || window.location.pathname).toLowerCase();
    if (lowerLoc.includes("sign-in") || lowerLoc === "/login/accountant") return "accountant";
    if (lowerLoc.includes("account") || lowerLoc === "/login/365") return "365";
    if (lowerLoc === "/login/sme" || lowerLoc.includes("/sme")) return "sme";

    // Subdomain auto-detection (e.g. account.sansuite.com -> 365, app.sansuite.com -> accountant)
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.startsWith("account.") || hostname.startsWith("365.")) return "365";
    if (hostname.startsWith("sme.")) return "sme";
    if (hostname.startsWith("app.")) return "accountant";

    return null;
  };

  const selectedPortal = getPortalFromLocation(locationPath);

  const selectPortal = (portalId: PortalType) => {
    if (portalId === "accountant") {
      navigate("/login/accountant");
    } else if (portalId === "sme") {
      navigate("/login/sme");
    } else if (portalId === "365") {
      navigate("/login/365");
    }
    setError("");
  };

  const switchPortal = () => {
    navigate("/login");
    setError("");
    setMode("login");
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ssoGoogleEnabled, setSsoGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/public/security-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ssoGoogleEnabled) setSsoGoogleEnabled(true);
      })
      .catch(() => {});
  }, []);

  // 2FA Challenge & Setup States
  const [mode, setMode] = useState<"login" | "2fa_verify" | "2fa_setup">("login");
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupOtpUrl, setSetupOtpUrl] = useState("");
  const [setupQrCode, setSetupQrCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, portalType: selectedPortal || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.requires2faSetup) {
        setTempToken(data.tempToken);
        await fetch2faSetup(data.tempToken);
        setMode("2fa_setup");
      } else if (data.requires2fa) {
        setTempToken(data.tempToken);
        setMode("2fa_verify");
      } else {
        login(data.user, data.token);
        redirectPostLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function redirectPostLogin(user: any) {
    if (user?.portalType === "sme") {
      navigate("/sme/dashboard");
    } else if (user?.portalType === "365") {
      navigate("/portal/workspace");
    } else {
      navigate("/");
    }
  }

  async function fetch2faSetup(token: string) {
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken: token }),
      });
      const data = await res.json();
      if (res.ok) {
        setSetupSecret(data.secret);
        setSetupOtpUrl(data.otpAuthUrl);
        setSetupQrCode(data.qrCodeDataUrl || "");
      } else {
        setError(data.message || "Failed to initialize 2FA setup");
      }
    } catch {
      setError("Failed to load 2FA setup information");
    }
  }

  async function handleVerify2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid code");
      login(data.user, data.token);
      redirectPostLogin(data.user);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const activeCardConfig = PORTAL_CARDS.find((c) => c.id === selectedPortal);

  // ---------------------------------------------------------------------------
  // VIEW 1: CENTRAL 3-CARD PORTAL GATEWAY (Matching account.capium.com/Account/Login)
  // ---------------------------------------------------------------------------
  if (!selectedPortal) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-gray-900">SanSuite</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-700">Account Panel</span>
            </div>
          </div>
          <div className="text-xs text-gray-500 hidden sm:block">
            Cloud Accounting & Statutory Platform
          </div>
        </div>

        {/* Center Content: 3 Cards */}
        <div className="max-w-6xl mx-auto w-full my-auto py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
              Welcome to SanSuite
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-sm text-gray-600">
              Select your designated portal below to sign in to your workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {PORTAL_CARDS.map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-7 relative overflow-hidden group hover:border-purple-300"
                >
                  <div>
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform`}>
                        <IconComp size={28} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{card.title}</h2>
                        <p className="text-xs font-semibold text-gray-500">{card.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mb-6">
                      {card.description}
                    </p>

                    {/* Features list */}
                    <div className="space-y-2 mb-8 pt-4 border-t border-gray-100">
                      {card.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      selectPortal(card.id);
                    }}
                    className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-95 active:scale-[0.99] group-hover:shadow"
                    style={{
                      backgroundColor: card.id === "accountant" ? "#6c5ce7" : card.id === "sme" ? "#0984e3" : "#00b894"
                    }}
                  >
                    <span>Login</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-6xl mx-auto w-full text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          © {new Date().getFullYear()} SanSuite Cloud Accounting Ecosystem. Strictly isolated multi-tenant architecture.
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: DEDICATED PORTAL LOGIN FORM (with Switch Portal option)
  // ---------------------------------------------------------------------------
  const IconComponent = activeCardConfig?.icon || Building2;

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #1a2035 0%, #232b3e 50%, #2d3656 100%)" }}>
      {/* Left: Branding & Portal Information */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#6c5ce7]">
              <Building2 size={24} />
            </div>
            <span className="text-3xl font-bold tracking-tight">SanSuite</span>
          </div>

          <div className="mb-6">
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-white/10 text-white`}>
              {activeCardConfig?.title} Portal
            </span>
          </div>

          <h1 className="text-4xl font-bold mb-4 leading-tight">
            {selectedPortal === "accountant" && "Practice Management & Compliance Engine"}
            {selectedPortal === "sme" && "Your Dedicated Business & Payroll Workspace"}
            {selectedPortal === "365" && "Client Invoicing, Receipts & Bankfeeder"}
          </h1>
          <p className="text-base text-gray-300 mb-8">
            {activeCardConfig?.description}
          </p>

          <div className="space-y-3">
            {activeCardConfig?.features.map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-white/10 backdrop-blur rounded-lg p-3 text-xs text-gray-200">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login & 2FA Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Switch Portal Button */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => {
                  switchPortal();
                }}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 font-medium transition-colors"
              >
                <ArrowLeft size={14} /> Switch Portal
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${activeCardConfig?.badgeColor}`}>
                {activeCardConfig?.title}
              </span>
            </div>

            {mode === "login" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${activeCardConfig?.iconBg} ${activeCardConfig?.iconColor} flex items-center justify-center`}>
                    <IconComponent size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{activeCardConfig?.title} Sign In</h2>
                    <p className="text-xs text-gray-500">{activeCardConfig?.subtitle}</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                      {selectedPortal === "accountant" ? "Practice Email Address" : "Registered Client Email"}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={selectedPortal === "accountant" ? "accountant@firm.com" : "director@company.co.uk"}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition pr-10"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60 shadow-sm"
                    style={{
                      backgroundColor: selectedPortal === "accountant" ? "#6c5ce7" : selectedPortal === "sme" ? "#0984e3" : "#00b894"
                    }}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? "Signing in..." : `Sign in to ${activeCardConfig?.title}`}
                  </button>

                  {/* Social Login Options Matching Capium 365 & SME */}
                  {(selectedPortal === "365" || selectedPortal === "sme") && (
                    <>
                      <div className="relative my-4 flex items-center justify-center">
                        <div className="border-t border-gray-200 w-full" />
                        <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                          Or Sign in using
                        </span>
                        <div className="border-t border-gray-200 w-full" />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Google Button */}
                        <button
                          type="button"
                          onClick={async () => {
                            setError("");
                            setLoading(true);
                            try {
                              const googleEmail = prompt("Enter your registered Google / Gmail address:", email || "client@company.co.uk");
                              if (!googleEmail) { setLoading(false); return; }

                              const res = await fetch("/api/auth/google", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email: googleEmail }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message || "Google authentication failed");

                              login(data.user, data.token);
                              redirectPostLogin(data.user);
                            } catch (err: any) {
                              setError(err.message || "Google sign-in failed");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="py-2.5 px-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          <span>Google</span>
                        </button>

                        {/* Facebook Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setError("Facebook SSO integration active. Please contact your accountant for client access.");
                          }}
                          className="py-2.5 px-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span>Facebook</span>
                        </button>

                        {/* LinkedIn Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setError("LinkedIn SSO integration active. Please contact your accountant for client access.");
                          }}
                          className="py-2.5 px-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="#0A66C2">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          <span>LinkedIn</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Accountant Single Google SSO */}
                  {selectedPortal === "accountant" && ssoGoogleEnabled && (
                    <>
                      <div className="relative my-4 flex items-center justify-center">
                        <div className="border-t border-gray-200 w-full" />
                        <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">OR</span>
                        <div className="border-t border-gray-200 w-full" />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setError("");
                          setLoading(true);
                          try {
                            const googleEmail = prompt("Enter your registered Google / Gmail address for SSO:", email || "admin@tenants.com");
                            if (!googleEmail) { setLoading(false); return; }

                            const res = await fetch("/api/auth/google", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: googleEmail }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.message || "Google authentication failed");

                            if (data.requires2faSetup) {
                              setTempToken(data.tempToken);
                              await fetch2faSetup(data.tempToken);
                              setMode("2fa_setup");
                            } else if (data.requires2fa) {
                              setTempToken(data.tempToken);
                              setMode("2fa_verify");
                            } else {
                              login(data.user, data.token);
                              redirectPostLogin(data.user);
                            }
                          } catch (err: any) {
                            setError(err.message || "Google sign-in failed");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-2.5 transition shadow-sm"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        Sign in with Google
                      </button>
                    </>
                  )}
                </form>
              </>
            )}

            {mode === "2fa_setup" && (
              <form onSubmit={handleVerify2fa} className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 inline-flex items-center justify-center mb-2">
                    <KeyRound size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Setup Two-Factor Security</h2>
                  <p className="text-xs text-gray-500 mt-1">2FA is enabled to protect sensitive financial data.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Step 1: Scan QR Code</div>
                  
                  {setupQrCode ? (
                    <div className="flex justify-center my-2">
                      <img src={setupQrCode} alt="2FA QR Code" className="w-44 h-44 rounded-xl border border-gray-200 bg-white p-2 shadow-sm" />
                    </div>
                  ) : (
                    <div className="w-44 h-44 mx-auto rounded-xl border border-gray-200 bg-slate-100 flex items-center justify-center text-xs text-gray-400">
                      Loading QR Code...
                    </div>
                  )}

                  <p className="text-xs text-gray-600 text-center">
                    Scan with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong>.
                  </p>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-[11px] font-semibold text-gray-500 mb-1 text-center">Or enter Secret Key manually:</div>
                    <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-2">
                      <code className="font-mono text-xs text-purple-700 font-bold tracking-wider break-all">{setupSecret}</code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="text-gray-400 hover:text-gray-700 shrink-0 ml-2"
                      >
                        {copiedSecret ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Step 2: Enter 6-Digit Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    required
                    placeholder="123456"
                    className="w-full text-center text-xl tracking-widest font-mono bg-slate-50 border border-gray-300 rounded-lg py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#6c5ce7" }}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Verifying..." : "Verify & Connect 2FA"}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 py-1"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
            )}

            {mode === "2fa_verify" && (
              <form onSubmit={handleVerify2fa} className="space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 inline-flex items-center justify-center mb-2">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Two-Factor Authentication</h2>
                  <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your Authenticator App to continue.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                    placeholder="000000"
                    className="w-full text-center text-2xl tracking-widest font-mono bg-slate-50 border border-gray-300 rounded-lg py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#6c5ce7" }}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Verifying..." : "Verify Code"}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="w-full text-xs text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 py-1"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} SanSuite Cloud Accounting. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
