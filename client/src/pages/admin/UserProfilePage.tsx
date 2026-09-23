import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../hooks/useAuth";
import { 
  User, ShieldCheck, KeyRound, Save, Mail, Phone, Lock, Building2, 
  CheckCircle2, ShieldAlert, Smartphone, Copy, X, AlertCircle 
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/useToast";

export default function UserProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);

    try {
      const res = await apiRequest("PATCH", "/api/auth/profile", {
        firstName,
        lastName,
        email,
        phone,
      });
      const data = await res.json();
      if (data.user) {
        updateUser(data.user);
      }

      toast({
        title: "Profile Saved",
        description: data.message || "Your personal profile details have been updated.",
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPassword(true);

    try {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      const data = await res.json();

      toast({
        title: "Password Updated",
        description: data.message || "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Password Change Failed",
        description: err.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  // 2FA Management State & Handlers
  const [show2faModal, setShow2faModal] = useState(false);
  const [setup2faData, setSetup2faData] = useState<{ secret: string; qrCodeDataUrl: string; email: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [isVerifying2fa, setIsVerifying2fa] = useState(false);
  const [isDisabling2fa, setIsDisabling2fa] = useState(false);

  const handleInitiate2faSetup = async () => {
    setIsSettingUp2fa(true);
    try {
      const res = await apiRequest("POST", "/api/auth/2fa/setup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initialize 2FA setup");
      setSetup2faData(data);
      setShow2faModal(true);
    } catch (err: any) {
      toast({
        title: "2FA Setup Failed",
        description: err.message || "Could not generate authentication key.",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp2fa(false);
    }
  };

  const handleVerifyAndEnable2fa = async () => {
    if (verificationCode.trim().length !== 6) return;
    setIsVerifying2fa(true);
    try {
      const res = await apiRequest("POST", "/api/auth/2fa/verify", { token: verificationCode.trim() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid verification code");

      if (user) {
        updateUser({ ...user, twoFactorEnabled: true });
      }

      toast({
        title: "2FA Activated Successfully",
        description: "Two-factor authentication is now active on your practice account.",
      });

      setShow2faModal(false);
      setVerificationCode("");
      setSetup2faData(null);
    } catch (err: any) {
      toast({
        title: "Verification Failed",
        description: err.message || "Invalid 6-digit code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying2fa(false);
    }
  };

  const handleDisable2fa = async () => {
    if (!confirm("Are you sure you want to disable Two-Factor Authentication? Your account will be protected by password only.")) {
      return;
    }

    setIsDisabling2fa(true);
    try {
      const res = await apiRequest("POST", "/api/auth/2fa/disable");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to disable 2FA");

      if (user) {
        updateUser({ ...user, twoFactorEnabled: false });
      }

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for this account.",
      });
    } catch (err: any) {
      toast({
        title: "Disable Failed",
        description: err.message || "Failed to disable 2FA.",
        variant: "destructive",
      });
    } finally {
      setIsDisabling2fa(false);
    }
  };

  return (
    <AppLayout module="My Profile & Security">
      <div className="bg-gray-50 min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top Banner Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                {firstName?.[0] || user?.firstName?.[0] || "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {firstName} {lastName}
                </h1>
                <p className="text-sm text-gray-500">{email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full uppercase">
                    Role: {user?.role || "Staff"}
                  </span>
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Active Account
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs space-y-1 text-gray-600">
              <p className="flex items-center gap-2">
                <Building2 size={14} className="text-purple-600" />
                <span>Practice ID: #{user?.practiceId || 1}</span>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-600" />
                <span>eIDAS 256-bit Encryption Security</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b pb-3 flex items-center gap-2 text-gray-800 font-bold text-base">
                <User size={18} className="text-purple-600" />
                <h2>Personal Information</h2>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Mail size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7911 123456"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Phone size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> {updatingProfile ? "Saving Profile..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b pb-3 flex items-center gap-2 text-gray-800 font-bold text-base">
                <KeyRound size={18} className="text-purple-600" />
                <h2>Change Security Password</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <Lock size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <KeyRound size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <KeyRound size={16} className="absolute left-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock size={14} /> {updatingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Two-Factor Authentication (2FA) Security Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.twoFactorEnabled ? "bg-emerald-50 text-emerald-600" : "bg-purple-50 text-purple-600"}`}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">Two-Factor Authentication (2FA)</h2>
                  <p className="text-xs text-gray-500">Protect your practice accountant account with Time-based One-Time Passwords (TOTP).</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  user?.twoFactorEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {user?.twoFactorEnabled ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {user?.twoFactorEnabled ? "2FA Active" : "2FA Not Enabled"}
                </span>

                {user?.twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable2fa}
                    disabled={isDisabling2fa}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldAlert size={14} />
                    {isDisabling2fa ? "Disabling..." : "Disable 2FA"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleInitiate2faSetup}
                    disabled={isSettingUp2fa}
                    className="btn-SanSuite text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone size={14} />
                    {isSettingUp2fa ? "Generating Key..." : "Enable 2FA Protection"}
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <p>
                Two-factor authentication adds a critical second layer of protection to your SanSuite workspace. When enabled, you will need to provide a 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) when logging into your account.
              </p>
            </div>
          </div>
        </div>

        {/* 2FA Setup Modal */}
        {show2faModal && setup2faData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-purple-600" />
                  <h3 className="font-bold text-gray-800 text-sm">Setup Two-Factor Authentication</h3>
                </div>
                <button
                  onClick={() => {
                    setShow2faModal(false);
                    setVerificationCode("");
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-700">1. Scan the QR Code</p>
                  <p className="text-xs text-gray-500">
                    Open Google Authenticator, Microsoft Authenticator, or Authy on your mobile device and scan this barcode:
                  </p>
                </div>

                {setup2faData.qrCodeDataUrl ? (
                  <div className="flex justify-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <img src={setup2faData.qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48 rounded-lg shadow-xs" />
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400">Loading QR code...</div>
                )}

                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-700">Can&apos;t scan the barcode? Enter this manual secret:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 p-2 rounded-lg text-xs font-mono font-bold text-purple-700 tracking-wider select-all text-center">
                      {setup2faData.secret}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(setup2faData.secret);
                        toast({ title: "Copied!", description: "2FA secret copied to clipboard." });
                      }}
                      className="p-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-gray-600 cursor-pointer"
                      title="Copy Secret"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    2. Enter 6-Digit Code from Authenticator App *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center text-xl tracking-widest font-mono font-bold border-2 border-purple-200 rounded-xl py-2 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShow2faModal(false);
                      setVerificationCode("");
                    }}
                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyAndEnable2fa}
                    disabled={verificationCode.length !== 6 || isVerifying2fa}
                    className="btn-SanSuite text-xs font-semibold px-4 py-2 cursor-pointer"
                  >
                    {isVerifying2fa ? "Verifying..." : "Verify & Activate 2FA"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
