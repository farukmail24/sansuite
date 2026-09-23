import { useState, useEffect } from 'react'
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, KeyRound, ArrowLeft, CheckCircle2, Copy } from 'lucide-react'
import { SA_TOKEN_KEY, SA_USER_KEY } from '../App'

interface Props { onSuccess: () => void }

export default function LoginPage({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ssoGoogleEnabled, setSsoGoogleEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/public/security-settings')
      .then(res => res.json())
      .then(data => {
        if (data?.ssoGoogleEnabled) setSsoGoogleEnabled(true)
      })
      .catch(() => {})
  }, [])

  // 2FA Challenge / Setup State
  const [mode, setMode] = useState<'login' | '2fa_verify' | '2fa_setup'>('login')
  const [tempToken, setTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [setupOtpUrl, setSetupOtpUrl] = useState('')
  const [setupQrCode, setSetupQrCode] = useState('')
  const [copiedSecret, setCopiedSecret] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/system-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Authentication failed'); return }

      if (data.requires2faSetup) {
        setTempToken(data.tempToken)
        await fetch2faSetup(data.tempToken)
        setMode('2fa_setup')
      } else if (data.requires2fa) {
        setTempToken(data.tempToken)
        setMode('2fa_verify')
      } else {
        localStorage.setItem(SA_TOKEN_KEY, data.token)
        localStorage.setItem(SA_USER_KEY, JSON.stringify(data.admin))
        onSuccess()
      }
    } catch {
      setError('Network error. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const fetch2faSetup = async (token: string) => {
    try {
      const res = await fetch('/api/system-admin/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: token }),
      })
      const data = await res.json()
      if (res.ok) {
        setSetupSecret(data.secret)
        setSetupOtpUrl(data.otpAuthUrl)
        setSetupQrCode(data.qrCodeDataUrl || '')
      } else {
        setError(data.message || 'Failed to initialize 2FA setup')
      }
    } catch {
      setError('Failed to load 2FA configuration')
    }
  }

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/system-admin/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Invalid verification code')
        return
      }
      localStorage.setItem(SA_TOKEN_KEY, data.token)
      localStorage.setItem(SA_USER_KEY, JSON.stringify(data.admin))
      onSuccess()
    } catch {
      setError('Failed to verify code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 shadow-sm mb-4">
            <Shield size={32} className="text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Administration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            SanSuite Control Panel — Restricted Access
          </p>
        </div>

        {mode === 'login' && (
          <>
            {/* Warning */}
            <div className="flex gap-2.5 items-start bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Authorised personnel only.</strong> All access attempts are logged and monitored.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                    placeholder="admin@sansuite.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPwd ? 'text' : 'password'} 
                    value={password}
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-2.5 rounded-lg border border-transparent bg-brand text-white font-medium text-sm hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Shield size={16} />
                {loading ? 'Authenticating...' : 'Authenticate'}
              </button>

              {ssoGoogleEnabled && (
                <>
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">OR</span>
                    <div className="border-t border-slate-200 w-full" />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setError('')
                      setLoading(true)
                      try {
                        const googleEmail = prompt('Enter your registered Google / Gmail address for SSO:', email || 'admin@sansuite.com')
                        if (!googleEmail) { setLoading(false); return }

                        const res = await fetch('/api/system-admin/auth/google', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: googleEmail }),
                        })
                        const data = await res.json()
                        if (!res.ok) { setError(data.message || 'Google authentication failed'); return }

                        if (data.requires2faSetup) {
                          setTempToken(data.tempToken)
                          await fetch2faSetup(data.tempToken)
                          setMode('2fa_setup')
                        } else if (data.requires2fa) {
                          setTempToken(data.tempToken)
                          setMode('2fa_verify')
                        } else {
                          localStorage.setItem(SA_TOKEN_KEY, data.token)
                          localStorage.setItem(SA_USER_KEY, JSON.stringify(data.admin))
                          onSuccess()
                        }
                      } catch {
                        setError('Network error during Google authentication.')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 flex items-center justify-center gap-2.5 transition-all shadow-sm"
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

        {/* 2FA Setup View */}
        {mode === '2fa_setup' && (
          <form onSubmit={handleVerify2fa} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 mb-2">
                <KeyRound size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Two-Factor Security Setup</h2>
              <p className="text-xs text-slate-500 mt-1">System policy mandates 2FA for all administrative accounts.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">Step 1: Scan QR Code</div>
              
              {setupQrCode ? (
                <div className="flex justify-center my-2">
                  <img src={setupQrCode} alt="2FA QR Code" className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" />
                </div>
              ) : (
                <div className="w-44 h-44 mx-auto rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  Loading QR Code...
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed text-center">
                Scan this QR code with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> app on your mobile device.
              </p>
              
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 mb-1 text-center">Or enter Secret Key manually:</div>
                <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-2">
                  <code className="font-mono text-xs text-indigo-700 font-bold tracking-wider break-all">{setupSecret}</code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-slate-400 hover:text-slate-700 shrink-0 ml-2"
                    title="Copy secret key"
                  >
                    {copiedSecret ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Step 2: Enter 6-Digit Code</div>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                placeholder="123456"
                className="w-full text-center text-xl tracking-widest font-mono bg-slate-50 border border-slate-300 rounded-lg py-2.5 focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-1"
            >
              <ArrowLeft size={14} /> Back to Password Login
            </button>
          </form>
        )}

        {/* 2FA Verification View */}
        {mode === '2fa_verify' && (
          <form onSubmit={handleVerify2fa} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
            <div className="text-center">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 mb-2">
                <KeyRound size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Two-Factor Authentication</h2>
              <p className="text-xs text-slate-500 mt-1">Enter the 6-digit verification code from your Authenticator App.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
                Authentication Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest font-mono bg-slate-50 border border-slate-300 rounded-lg py-3 focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Shield size={16} />
              {loading ? 'Verifying...' : 'Authenticate 2FA'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className="w-full text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 py-1"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-slate-500">
          Looking for the firm portal?{' '}
          <a
            href={typeof window !== 'undefined' && window.location.port === '5174' ? `${window.location.protocol}//${window.location.hostname}:5000/auth` : '/auth'}
            className="text-brand hover:text-brand-light font-medium hover:underline"
          >
            Sign in here
          </a>
        </p>
      </div>
    </div>
  )
}
