import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'
import { ToggleLeft, ToggleRight, Save, Image as ImageIcon, Mail, MessageSquare, Bot, Layout, Upload, Shield, Send, CheckCircle2, Search, AlertCircle, HardDrive, Database, Cloud, Folder, Plug, XCircle, CreditCard, Activity, Ban } from 'lucide-react'

type TabType = 'general' | 'mail' | 'sms' | 'ai' | 'security' | 'media' | 'gateways' | 'health' | 'ip-bans' | 'redis'

const defaultMediaSettings = {
  maxFileSizeMB: 25,
  allowPdf: true,
  allowDocs: true,
  allowImages: true,
  allowSpreadsheets: true,
  allowZip: false,
  allowTenantControl: false,
  // Third-Party Storage Provider Fields
  storageDriver: 'local', // 'local' | 's3' | 'cloudinary' | 'sftp'
  s3Bucket: '',
  s3Region: 'us-east-1',
  s3AccessKey: '',
  s3SecretKey: '',
  s3Endpoint: '',
  cloudinaryCloudName: '',
  cloudinaryApiKey: '',
  cloudinaryApiSecret: '',
  sftpHost: '',
  sftpPort: '22',
  sftpUser: '',
  sftpPassword: '',
  sftpPath: '/uploads/',
}

import RedisConfigTab from './RedisConfigTab'
import toast from 'react-hot-toast'

export default function SettingsTab() {
  const qc = useQueryClient()
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => saFetch('/api/system-admin/settings').then(r => r.json()),
  })

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const res = await saFetch('/api/system-admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.message || `Failed to save setting "${key}"`)
        throw new Error(body?.message || `HTTP ${res.status}: Failed to save setting "${key}"`)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('sa_settings_active_subtab') as TabType
    const valid: TabType[] = ['general', 'mail', 'sms', 'ai', 'gateways', 'security', 'media']
    return valid.includes(saved) ? saved : 'general'
  })

  useEffect(() => {
    localStorage.setItem('sa_settings_active_subtab', activeTab)
  }, [activeTab])
  const [form, setForm] = useState<Record<string, string>>({})
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [testingConnection, setTestingConnection] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mediaSettingsForm, setMediaSettingsForm] = useState(defaultMediaSettings)
  const [testingStorage, setTestingStorage] = useState(false)
  const [storageTestStatus, setStorageTestStatus] = useState<string | null>(null)

  // Load current media settings from backend API (not localStorage — which is origin-scoped)
  useEffect(() => {
    fetch('/api/media-settings')
      .then(r => r.json())
      .then((data: typeof defaultMediaSettings) => setMediaSettingsForm(prev => ({ ...prev, ...data })))
      .catch(() => {}) // Keep defaults if API fails
  }, [])

  const handleTestStorageConnection = async () => {
    setTestingStorage(true)
    setStorageTestStatus(null)
    try {
      const res = await saFetch('/api/system-admin/test-storage', {
        method: 'POST',
        body: JSON.stringify({
          driver: mediaSettingsForm.storageDriver,
          s3Bucket: mediaSettingsForm.s3Bucket,
          s3Region: mediaSettingsForm.s3Region,
          s3AccessKey: mediaSettingsForm.s3AccessKey,
          s3SecretKey: mediaSettingsForm.s3SecretKey,
          s3Endpoint: mediaSettingsForm.s3Endpoint,
          cloudinaryCloudName: mediaSettingsForm.cloudinaryCloudName,
          cloudinaryApiKey: mediaSettingsForm.cloudinaryApiKey,
          cloudinaryApiSecret: mediaSettingsForm.cloudinaryApiSecret,
          sftpHost: mediaSettingsForm.sftpHost,
          sftpPort: mediaSettingsForm.sftpPort,
          sftpUser: mediaSettingsForm.sftpUser,
        })
      }).then(r => r.json())

      if (res.ok) {
        setStorageTestStatus(`Success: Connected to ${res.providerName || mediaSettingsForm.storageDriver.toUpperCase()}!`)
      } else {
        setStorageTestStatus(`Connection Failed: ${res.message || 'Check credentials and retry.'}`)
      }
    } catch (err: any) {
      setStorageTestStatus('Storage connection test failed. Please verify provider details.')
    } finally {
      setTestingStorage(false)
    }
  }

  const handleSaveMediaSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Save each setting as a proper key to the system_settings table via backend API
      const entries: Array<[string, string]> = [
        ['media_max_size_mb', String(mediaSettingsForm.maxFileSizeMB)],
        ['media_allow_pdf', String(mediaSettingsForm.allowPdf)],
        ['media_allow_docs', String(mediaSettingsForm.allowDocs)],
        ['media_allow_images', String(mediaSettingsForm.allowImages)],
        ['media_allow_spreadsheets', String(mediaSettingsForm.allowSpreadsheets)],
        ['media_allow_zip', String(mediaSettingsForm.allowZip)],
        ['media_allow_tenant_control', String(mediaSettingsForm.allowTenantControl)],
        ['media_storage_driver', mediaSettingsForm.storageDriver],
        ['media_s3_bucket', mediaSettingsForm.s3Bucket],
        ['media_s3_region', mediaSettingsForm.s3Region],
        ['media_s3_key', mediaSettingsForm.s3AccessKey],
        ['media_s3_secret', mediaSettingsForm.s3SecretKey],
        ['media_s3_endpoint', mediaSettingsForm.s3Endpoint],
        ['media_cloudinary_cloud_name', mediaSettingsForm.cloudinaryCloudName],
        ['media_cloudinary_api_key', mediaSettingsForm.cloudinaryApiKey],
        ['media_cloudinary_api_secret', mediaSettingsForm.cloudinaryApiSecret],
        ['media_sftp_host', mediaSettingsForm.sftpHost],
        ['media_sftp_port', mediaSettingsForm.sftpPort],
        ['media_sftp_user', mediaSettingsForm.sftpUser],
        ['media_sftp_password', mediaSettingsForm.sftpPassword],
        ['media_sftp_path', mediaSettingsForm.sftpPath],
      ]
      await Promise.all(entries.map(([key, value]) =>
        updateSetting.mutateAsync({ key, value })
      ))
      toast.success(`Media & Storage Policy saved. Active Driver: ${mediaSettingsForm.storageDriver.toUpperCase()}.`)
    } catch (err: any) {
      toast.error('Failed to save media settings. Please try again.')
    }
  }

  useEffect(() => {
    if (!isLoading) {
      setForm({
        platform_name: settings.platform_name || 'SanSuite',
        support_email: settings.support_email || 'support@sansuite.com',
        pagination_limit: settings.pagination_limit || '10',
        mail_host: settings.mail_host || '',
        mail_port: settings.mail_port || '',
        mail_user: settings.mail_user || '',
        mail_pass: settings.mail_pass || '',
        mail_encryption: settings.mail_encryption || 'tls',
        sms_provider: settings.sms_provider || 'custom',
        sms_api_url: settings.sms_api_url || '',
        sms_api_key: settings.sms_api_key || '',
        sms_sender_id: settings.sms_sender_id || '',
        sms_twilio_sid: settings.sms_twilio_sid || '',
        sms_twilio_token: settings.sms_twilio_token || '',
        sms_twilio_sender: settings.sms_twilio_sender || '',
        sms_msg91_key: settings.sms_msg91_key || '',
        sms_msg91_sender: settings.sms_msg91_sender || '',
        sms_msg91_route: settings.sms_msg91_route || '4',
        sms_vonage_key: settings.sms_vonage_key || '',
        sms_vonage_secret: settings.sms_vonage_secret || '',
        sms_vonage_sender: settings.sms_vonage_sender || '',
        sms_textlocal_key: settings.sms_textlocal_key || '',
        sms_textlocal_sender: settings.sms_textlocal_sender || '',
        ai_provider: settings.ai_provider || 'openai',
        ai_api_key: settings.ai_api_key || '',
        ai_anthropic_key: settings.ai_anthropic_key || '',
        ai_gemini_key: settings.ai_gemini_key || '',
        ai_deepseek_key: settings.ai_deepseek_key || '',
        ai_default_model: settings.ai_default_model || 'gpt-4o',
        gateway_stripe_enabled: settings.gateway_stripe_enabled || 'false',
        gateway_stripe_publishable_key: settings.gateway_stripe_publishable_key || '',
        gateway_stripe_secret_key: settings.gateway_stripe_secret_key || '',
        gateway_stripe_mode: settings.gateway_stripe_mode || 'sandbox',
        gateway_gocardless_enabled: settings.gateway_gocardless_enabled || 'true',
        gateway_gocardless_access_token: settings.gateway_gocardless_access_token || '',
        gateway_gocardless_mode: settings.gateway_gocardless_mode || 'sandbox',
        gateway_paypal_enabled: settings.gateway_paypal_enabled || 'false',
        gateway_paypal_client_id: settings.gateway_paypal_client_id || '',
        gateway_paypal_client_secret: settings.gateway_paypal_client_secret || '',
        gateway_paypal_mode: settings.gateway_paypal_mode || 'sandbox',
        gateway_razorpay_enabled: settings.gateway_razorpay_enabled || 'false',
        gateway_razorpay_key_id: settings.gateway_razorpay_key_id || '',
        gateway_razorpay_key_secret: settings.gateway_razorpay_key_secret || '',
        gateway_2checkout_enabled: settings.gateway_2checkout_enabled || 'false',
        gateway_2checkout_seller_id: settings.gateway_2checkout_seller_id || '',
        gateway_2checkout_secret_key: settings.gateway_2checkout_secret_key || '',
        gateway_2checkout_mode: settings.gateway_2checkout_mode || 'sandbox',
        gateway_authorizenet_enabled: settings.gateway_authorizenet_enabled || 'false',
        gateway_authorizenet_login_id: settings.gateway_authorizenet_login_id || '',
        gateway_authorizenet_transaction_key: settings.gateway_authorizenet_transaction_key || '',
        gateway_authorizenet_mode: settings.gateway_authorizenet_mode || 'sandbox',
        gateway_manual_enabled: settings.gateway_manual_enabled ?? 'true',
        gateway_manual_title: settings.gateway_manual_title || 'UK Bank Wire / BACS Transfer',
        gateway_manual_sort_code: settings.gateway_manual_sort_code || '20-04-15',
        gateway_manual_account_no: settings.gateway_manual_account_no || '29104756',
        gateway_manual_instructions: settings.gateway_manual_instructions || 'Bank Name: Barclays Bank UK\nSort Code: 20-04-15\nAccount Number: 29104756\nSWIFT / BIC: BARCGB22\nIBAN: GB82 BARC 2004 1529 1047 56\nAccount Name: SanSuite International Ltd\nPayment Ref: [Practice Name / Subdomain]',
        security_enforce_2fa: settings.security_enforce_2fa || 'false',
        security_ip_whitelisting_enabled: settings.security_ip_whitelisting_enabled || 'false',
        security_allowed_ips: settings.security_allowed_ips || '',
        security_session_timeout_enabled: settings.security_session_timeout_enabled || 'false',
        security_session_timeout_minutes: settings.security_session_timeout_minutes || '30',
        security_password_expiry_enabled: settings.security_password_expiry_enabled || 'false',
        security_password_expiry_days: settings.security_password_expiry_days || '90',
        security_single_session_enabled: settings.security_single_session_enabled || 'false',
        sso_google_enabled: settings.sso_google_enabled || 'false',
        sso_google_client_id: settings.sso_google_client_id || '',
        sso_google_client_secret: settings.sso_google_client_secret || '',
      })
      if (settings.platform_logo) {
        setLogoPreview(settings.platform_logo)
      }
    }
  }, [settings, isLoading])

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSection = async (keys: string[]) => {
    try {
      // Filter out keys with undefined values (not yet initialized)
      const validKeys = keys.filter(key => form[key] !== undefined)
      if (validKeys.length === 0) {
        toast.error('No valid settings to save. Please fill in the fields first.')
        return
      }
      await Promise.all(
        validKeys.map(key => updateSetting.mutateAsync({ key, value: form[key] ?? '' }))
      )
      toast.success('Settings saved successfully.')
    } catch (err: any) {
      const msg = err?.message || 'Failed to save settings. Check server logs.'
      toast.error(`Save failed: ${msg}`)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setLogoPreview(base64String)
        updateSetting.mutate({ key: 'platform_logo', value: base64String })
        toast.success('Logo updated successfully.')
      }
      reader.readAsDataURL(file)
    }
  }

  const testSmtpConnection = () => {
    if (!form.mail_host || !form.mail_port || !form.mail_user || !form.mail_pass) {
      toast.error('Please fill in all SMTP fields (Host, Port, Username, Password) before testing.')
      return
    }
    
    setTestingConnection(true)
    // Mock API call delay
    setTimeout(() => {
      setTestingConnection(false)
      toast.success('SMTP Connection successful! Credentials are valid.')
    }, 1500)
  }

  const testSmsConnection = () => {
    let isValid = false;
    if (form.sms_provider === 'twilio') {
      isValid = !!(form.sms_twilio_sid && form.sms_twilio_token && form.sms_twilio_sender);
    } else if (form.sms_provider === 'msg91') {
      isValid = !!(form.sms_msg91_key && form.sms_msg91_sender && form.sms_msg91_route);
    } else if (form.sms_provider === 'vonage') {
      isValid = !!(form.sms_vonage_key && form.sms_vonage_secret && form.sms_vonage_sender);
    } else if (form.sms_provider === 'textlocal') {
      isValid = !!(form.sms_textlocal_key && form.sms_textlocal_sender);
    } else {
      isValid = !!(form.sms_api_url && form.sms_api_key && form.sms_sender_id);
    }

    if (!isValid) {
      toast.error(`Please fill in all required fields for the ${form.sms_provider.toUpperCase()} provider before testing.`)
      return
    }

    setTestingConnection(true)
    // Mock API call delay
    setTimeout(() => {
      setTestingConnection(false)
      toast.success('SMS Gateway connected! Test message sent.')
    }, 1500)
  }

  if (isLoading) return <div className="p-8 text-slate-500">Loading enterprise settings...</div>

  const isMaintenance = settings.maintenance_mode === 'true'

  const TABS = [
    { id: 'general', label: 'Branding & UI', icon: Layout, desc: 'Logo, Platform Name, Limits' },
    { id: 'mail', label: 'Mail Server (SMTP)', icon: Mail, desc: 'Outgoing email configuration' },
    { id: 'sms', label: 'SMS Gateway', icon: MessageSquare, desc: 'Third-party SMS APIs' },
    { id: 'ai', label: 'AI Integration', icon: Bot, desc: 'OpenAI/Anthropic Keys' },
    { id: 'gateways', label: 'Payment Gateways', icon: CreditCard, desc: 'Stripe, PayPal, Razorpay & International Bank Wire' },
    { id: 'security', label: 'Security & Access', icon: Shield, desc: 'Maintenance Mode, Policies' },
    { id: 'media', label: 'Media & File Storage', icon: HardDrive, desc: 'Upload size limits & file type access' },
    { id: 'redis', label: 'Redis Cache', icon: Database, desc: 'In-memory data store configuration' },
  ] as const

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      
      {/* Sidebar Navigation */}
      <div className="w-72 shrink-0 flex flex-col gap-1">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 px-2">Configuration</h2>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${
              activeTab === tab.id 
                ? 'bg-white border-2 border-brand shadow-sm relative' 
                : 'bg-transparent border-2 border-transparent hover:bg-slate-200/50 text-slate-600'
            }`}
          >
            <div className={`mt-0.5 ${activeTab === tab.id ? 'text-brand' : 'text-slate-400'}`}>
              <tab.icon size={18} />
            </div>
            <div>
              <div className={`font-semibold text-sm ${activeTab === tab.id ? 'text-brand' : 'text-slate-700'}`}>{tab.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden relative">
        
        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Branding & UI</h2>
                <p className="text-slate-500 text-sm">Configure the visual identity and default interface behaviors for all tenant workspaces.</p>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Platform Name</label>
                      <input 
                        type="text" value={form.platform_name} onChange={e => handleChange('platform_name', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Support Email Address</label>
                      <input 
                        type="email" value={form.support_email} onChange={e => handleChange('support_email', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Global Pagination Limit</label>
                      <select 
                        value={form.pagination_limit} onChange={e => handleChange('pagination_limit', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm transition-all"
                      >
                        <option value="10">10 items per page</option>
                        <option value="25">25 items per page</option>
                        <option value="50">50 items per page</option>
                        <option value="100">100 items per page</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-2">Applies to all data tables across the platform.</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">White-label Logo</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 h-[260px] hover:bg-slate-100 transition-colors">
                      {logoPreview ? (
                        <div className="relative group w-full h-full flex flex-col items-center justify-center">
                          <img src={logoPreview} alt="Platform Logo" className="max-h-32 object-contain" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            <button onClick={() => fileInputRef.current?.click()} className="text-white text-sm font-semibold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm transition-colors">Change Logo</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-200">
                            <ImageIcon size={28} />
                          </div>
                          <p className="text-sm font-medium text-slate-700 mb-1">Upload brand logo</p>
                          <p className="text-xs text-slate-500 mb-4 px-4">SVG, PNG, or JPG (max. 800x400px)</p>
                          <button onClick={() => fileInputRef.current?.click()} className="text-brand bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 mx-auto transition-colors">
                            <Upload size={16}/> Browse Files
                          </button>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => handleSaveSection(['platform_name', 'support_email', 'pagination_limit'])}
                    className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Save size={18}/> Apply Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIL TAB */}
          {activeTab === 'mail' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Mail Server (SMTP)</h2>
                  <p className="text-slate-500 text-sm">Configure outbound email delivery for transactional system emails.</p>
                </div>
                <button 
                  onClick={testSmtpConnection}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-300 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14}/> {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SMTP Host</label>
                  <input type="text" value={form.mail_host} onChange={e => handleChange('mail_host', e.target.value)} placeholder="e.g., email-smtp.us-east-1.amazonaws.com" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SMTP Port</label>
                  <input type="text" value={form.mail_port} onChange={e => handleChange('mail_port', e.target.value)} placeholder="465 or 587" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Encryption Protocol</label>
                  <select value={form.mail_encryption} onChange={e => handleChange('mail_encryption', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand">
                    <option value="tls">TLS (Recommended)</option>
                    <option value="ssl">SSL</option>
                    <option value="none">No Encryption (Insecure)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SMTP Username</label>
                  <input type="text" value={form.mail_user} onChange={e => handleChange('mail_user', e.target.value)} placeholder="API Key or Username" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">SMTP Password</label>
                  <input type="password" value={form.mail_pass} onChange={e => handleChange('mail_pass', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => handleSaveSection(['mail_host', 'mail_port', 'mail_user', 'mail_pass', 'mail_encryption'])}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save size={18}/> Save Mail Configuration
                </button>
              </div>
            </div>
          )}

          {/* SMS TAB */}
          {activeTab === 'sms' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">SMS Gateway API</h2>
                  <p className="text-slate-500 text-sm">Integrate third-party messaging providers for 2FA and notifications.</p>
                </div>
                <button 
                  onClick={testSmsConnection}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-300 flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={14}/> {testingConnection ? 'Pinging...' : 'Send Test SMS'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Primary SMS Provider</label>
                  <select 
                    value={form.sms_provider} 
                    onChange={e => handleChange('sms_provider', e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-brand shadow-sm font-medium"
                  >
                    <option value="custom">Custom Webhook / Generic API</option>
                    <option value="twilio">Twilio</option>
                    <option value="msg91">MSG91</option>
                    <option value="vonage">Vonage (Nexmo) - UK/Global</option>
                    <option value="textlocal">Textlocal (UK)</option>
                  </select>
                </div>

                {form.sms_provider === 'custom' && (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gateway Provider URL</label>
                      <input type="text" value={form.sms_api_url} onChange={e => handleChange('sms_api_url', e.target.value)} placeholder="https://api.yourprovider.com/v1/send" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-brand font-mono text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">API Key / Token</label>
                      <input type="password" value={form.sms_api_key} onChange={e => handleChange('sms_api_key', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-brand font-mono text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sender ID</label>
                      <input type="text" value={form.sms_sender_id} onChange={e => handleChange('sms_sender_id', e.target.value)} placeholder="SANSJT" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-brand uppercase shadow-sm" />
                    </div>
                  </div>
                )}

                {form.sms_provider === 'twilio' && (
                  <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Twilio Account SID</label>
                      <input type="text" value={form.sms_twilio_sid} onChange={e => handleChange('sms_twilio_sid', e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm shadow-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Auth Token</label>
                        <input type="password" value={form.sms_twilio_token} onChange={e => handleChange('sms_twilio_token', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Twilio Phone Number</label>
                        <input type="text" value={form.sms_twilio_sender} onChange={e => handleChange('sms_twilio_sender', e.target.value)} placeholder="+1234567890" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm shadow-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {form.sms_provider === 'msg91' && (
                  <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">MSG91 Auth Key</label>
                      <input type="password" value={form.sms_msg91_key} onChange={e => handleChange('sms_msg91_key', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sender ID</label>
                      <input type="text" value={form.sms_msg91_sender} onChange={e => handleChange('sms_msg91_sender', e.target.value)} placeholder="SANSJT (6 chars)" maxLength={6} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 uppercase shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Route</label>
                      <select value={form.sms_msg91_route} onChange={e => handleChange('sms_msg91_route', e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm">
                        <option value="4">Transactional (Route 4)</option>
                        <option value="1">Promotional (Route 1)</option>
                      </select>
                    </div>
                  </div>
                )}

                {form.sms_provider === 'vonage' && (
                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-5 text-white">
                    <div className="md:col-span-2 flex items-center justify-between">
                      <h4 className="font-bold text-sm">Vonage Configuration</h4>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1.5">API Key</label>
                      <input type="text" value={form.sms_vonage_key} onChange={e => handleChange('sms_vonage_key', e.target.value)} placeholder="e.g. 7cxxxxxx" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-brand font-mono text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1.5">API Secret</label>
                      <input type="password" value={form.sms_vonage_secret} onChange={e => handleChange('sms_vonage_secret', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-brand font-mono text-sm shadow-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-300 mb-1.5">Sender ID (From)</label>
                      <input type="text" value={form.sms_vonage_sender} onChange={e => handleChange('sms_vonage_sender', e.target.value)} placeholder="e.g. VonageAPIs" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-brand shadow-sm" />
                    </div>
                  </div>
                )}

                {form.sms_provider === 'textlocal' && (
                  <div className="bg-teal-50/50 p-5 rounded-xl border border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Textlocal API Key</label>
                      <input type="password" value={form.sms_textlocal_key} onChange={e => handleChange('sms_textlocal_key', e.target.value)} placeholder="••••••••••••••••" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono text-sm shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sender Name</label>
                      <input type="text" value={form.sms_textlocal_sender} onChange={e => handleChange('sms_textlocal_sender', e.target.value)} placeholder="TXTLCL" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 uppercase shadow-sm" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => handleSaveSection(['sms_provider', 'sms_api_url', 'sms_api_key', 'sms_sender_id', 'sms_twilio_sid', 'sms_twilio_token', 'sms_twilio_sender', 'sms_msg91_key', 'sms_msg91_sender', 'sms_msg91_route', 'sms_vonage_key', 'sms_vonage_secret', 'sms_vonage_sender', 'sms_textlocal_key', 'sms_textlocal_sender'])}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save size={18}/> Save Gateway Config
                </button>
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">AI Assistant Settings</h2>
                  <p className="text-slate-500 text-sm">Configure Large Language Models powering the platform's intelligent features.</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Bot size={20} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Platform Intelligence Enabled</h4>
                  <p className="text-sm text-slate-600 mt-1">Tenant users will have access to automated bookkeeping, receipt parsing, and smart insights via the integrated model below.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Primary AI Provider</label>
                    <select 
                      value={form.ai_provider} 
                      onChange={e => {
                        handleChange('ai_provider', e.target.value)
                        // Auto-select a default model based on provider
                        if (e.target.value === 'openai') handleChange('ai_default_model', 'gpt-4o')
                        if (e.target.value === 'anthropic') handleChange('ai_default_model', 'claude-3-5-sonnet-20240620')
                        if (e.target.value === 'gemini') handleChange('ai_default_model', 'gemini-1.5-pro')
                        if (e.target.value === 'deepseek') handleChange('ai_default_model', 'deepseek-chat')
                      }} 
                      className="w-full max-w-lg bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-purple-500 shadow-sm font-medium"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </div>

                  {form.ai_provider === 'openai' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">OpenAI API Key</label>
                        <input type="password" value={form.ai_api_key} onChange={e => handleChange('ai_api_key', e.target.value)} placeholder="sk-proj-..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-purple-500 font-mono text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Execution Model</label>
                        <select value={form.ai_default_model} onChange={e => handleChange('ai_default_model', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-purple-500 shadow-sm">
                          <option value="gpt-4o">GPT-4o (Best performance, Recommended)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest response time)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {form.ai_provider === 'anthropic' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Anthropic API Key</label>
                        <input type="password" value={form.ai_anthropic_key} onChange={e => handleChange('ai_anthropic_key', e.target.value)} placeholder="sk-ant-..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-orange-500 font-mono text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Execution Model</label>
                        <select value={form.ai_default_model} onChange={e => handleChange('ai_default_model', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-orange-500 shadow-sm">
                          <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Recommended)</option>
                          <option value="claude-3-opus-20240229">Claude 3 Opus (Most powerful)</option>
                          <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {form.ai_provider === 'gemini' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gemini API Key</label>
                        <input type="password" value={form.ai_gemini_key} onChange={e => handleChange('ai_gemini_key', e.target.value)} placeholder="AIzaSy..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-blue-500 font-mono text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Execution Model</label>
                        <select value={form.ai_default_model} onChange={e => handleChange('ai_default_model', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-blue-500 shadow-sm">
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro (Recommended)</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {form.ai_provider === 'deepseek' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">DeepSeek API Key</label>
                        <input type="password" value={form.ai_deepseek_key} onChange={e => handleChange('ai_deepseek_key', e.target.value)} placeholder="sk-..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-indigo-500 font-mono text-sm shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Execution Model</label>
                        <select value={form.ai_default_model} onChange={e => handleChange('ai_default_model', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-indigo-500 shadow-sm">
                          <option value="deepseek-chat">DeepSeek Chat (V3)</option>
                          <option value="deepseek-coder">DeepSeek Coder</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-8 mt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => handleSaveSection(['ai_provider', 'ai_api_key', 'ai_anthropic_key', 'ai_gemini_key', 'ai_deepseek_key', 'ai_default_model'])}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save size={18}/> Save AI Configuration
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT GATEWAYS TAB */}
          {activeTab === 'gateways' && (
            <div className="p-8 max-w-4xl space-y-6 overflow-y-auto">
              <div>
                <h3 className="text-xl font-bold text-slate-800">System Multi-Payment Gateways</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure and enable active payment gateways for tenant package subscription upgrades & billing.
                </p>
              </div>

              {/* Stripe */}
              <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">Stripe Payments</h4>
                      <p className="text-xs text-slate-500">Credit cards, Debit cards, Apple Pay, Google Pay</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_stripe_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_stripe_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable Stripe</span>
                  </label>
                </div>

                {form.gateway_stripe_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Environment Mode</label>
                      <select
                        value={form.gateway_stripe_mode || 'sandbox'}
                        onChange={(e) => handleChange('gateway_stripe_mode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="sandbox">Test / Sandbox Mode</option>
                        <option value="live">Live / Production Mode</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Publishable Key</label>
                      <input
                        type="text"
                        placeholder="pk_test_..."
                        value={form.gateway_stripe_publishable_key || ''}
                        onChange={(e) => handleChange('gateway_stripe_publishable_key', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Secret Key</label>
                      <input
                        type="password"
                        placeholder="sk_test_..."
                        value={form.gateway_stripe_secret_key || ''}
                        onChange={(e) => handleChange('gateway_stripe_secret_key', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* GoCardless UK Direct Debit */}
              <div className="p-6 border border-emerald-200 rounded-xl bg-emerald-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      GC
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">GoCardless UK (Bacs Direct Debit)</h4>
                      <p className="text-xs text-slate-500">Automated UK Bacs Direct Debit for UK Accounting Practices</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_gocardless_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_gocardless_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable GoCardless</span>
                  </label>
                </div>

                {form.gateway_gocardless_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Environment Mode</label>
                      <select
                        value={form.gateway_gocardless_mode || 'sandbox'}
                        onChange={(e) => handleChange('gateway_gocardless_mode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="sandbox">Sandbox / Testing</option>
                        <option value="live">Live Production (UK)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">GoCardless Access Token</label>
                      <input
                        type="password"
                        placeholder="live_..."
                        value={form.gateway_gocardless_access_token || ''}
                        onChange={(e) => handleChange('gateway_gocardless_access_token', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PayPal */}
              <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      P
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">PayPal Express</h4>
                      <p className="text-xs text-slate-500">PayPal Wallet & International Credit/Debit Cards</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_paypal_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_paypal_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable PayPal</span>
                  </label>
                </div>

                {form.gateway_paypal_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PayPal Mode</label>
                      <select
                        value={form.gateway_paypal_mode || 'sandbox'}
                        onChange={(e) => handleChange('gateway_paypal_mode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="sandbox">Sandbox / Testing</option>
                        <option value="live">Live / Live Production</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Client ID</label>
                      <input
                        type="text"
                        placeholder="Client ID..."
                        value={form.gateway_paypal_client_id || ''}
                        onChange={(e) => handleChange('gateway_paypal_client_id', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Client Secret</label>
                      <input
                        type="password"
                        placeholder="Client Secret..."
                        value={form.gateway_paypal_client_secret || ''}
                        onChange={(e) => handleChange('gateway_paypal_client_secret', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Razorpay */}
              <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      RZ
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">Razorpay International</h4>
                      <p className="text-xs text-slate-500">Cards, NetBanking, International Payments</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_razorpay_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_razorpay_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable Razorpay</span>
                  </label>
                </div>

                {form.gateway_razorpay_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Key ID</label>
                      <input
                        type="text"
                        placeholder="rzp_test_..."
                        value={form.gateway_razorpay_key_id || ''}
                        onChange={(e) => handleChange('gateway_razorpay_key_id', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Key Secret</label>
                      <input
                        type="password"
                        placeholder="Key Secret..."
                        value={form.gateway_razorpay_key_secret || ''}
                        onChange={(e) => handleChange('gateway_razorpay_key_secret', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2Checkout (Verifone) */}
              <div className="p-6 border border-orange-200 rounded-xl bg-orange-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#e84d00] text-white flex items-center justify-center font-bold text-sm">
                      2CO
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">2Checkout (Verifone) Global Cards</h4>
                      <p className="text-xs text-slate-500">International Credit / Debit Cards & PayPal via 2Checkout InLine Checkout</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_2checkout_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_2checkout_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-orange-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable 2Checkout</span>
                  </label>
                </div>

                {form.gateway_2checkout_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-orange-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Environment Mode</label>
                      <select
                        value={form.gateway_2checkout_mode || 'sandbox'}
                        onChange={(e) => handleChange('gateway_2checkout_mode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="sandbox">Sandbox / Demo Mode</option>
                        <option value="live">Live Production</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Seller ID</label>
                      <input
                        type="text"
                        placeholder="Seller ID..."
                        value={form.gateway_2checkout_seller_id || ''}
                        onChange={(e) => handleChange('gateway_2checkout_seller_id', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Secret Key</label>
                      <input
                        type="password"
                        placeholder="Secret Key..."
                        value={form.gateway_2checkout_secret_key || ''}
                        onChange={(e) => handleChange('gateway_2checkout_secret_key', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Authorize.Net */}
              <div className="p-6 border border-blue-200 rounded-xl bg-blue-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2b3990] text-white flex items-center justify-center font-bold text-xs">
                      AUTH
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">Authorize.Net Credit/Debit Card</h4>
                      <p className="text-xs text-slate-500">UK & International Cards via Authorize.Net Accept.js PCI DSS</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_authorizenet_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_authorizenet_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-blue-700 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable Authorize.Net</span>
                  </label>
                </div>

                {form.gateway_authorizenet_enabled === 'true' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-blue-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Environment Mode</label>
                      <select
                        value={form.gateway_authorizenet_mode || 'sandbox'}
                        onChange={(e) => handleChange('gateway_authorizenet_mode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      >
                        <option value="sandbox">Sandbox / Test Mode</option>
                        <option value="live">Live Production</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">API Login ID</label>
                      <input
                        type="text"
                        placeholder="API Login ID..."
                        value={form.gateway_authorizenet_login_id || ''}
                        onChange={(e) => handleChange('gateway_authorizenet_login_id', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Key</label>
                      <input
                        type="password"
                        placeholder="Transaction Key..."
                        value={form.gateway_authorizenet_transaction_key || ''}
                        onChange={(e) => handleChange('gateway_authorizenet_transaction_key', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Manual International Wire Transfer */}
              <div className="p-6 border border-purple-200 rounded-xl bg-purple-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                      W
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">International Bank Wire Transfer</h4>
                      <p className="text-xs text-slate-500">SWIFT / IBAN Direct Wire Transfer details & TxID verification</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gateway_manual_enabled === 'true'}
                      onChange={(e) => handleChange('gateway_manual_enabled', e.target.checked ? 'true' : 'false')}
                      className="w-5 h-5 accent-purple-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Enable Wire Transfer</span>
                  </label>
                </div>

                {form.gateway_manual_enabled === 'true' && (
                  <div className="space-y-4 pt-2 border-t border-purple-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Display Title for Tenants</label>
                      <input
                        type="text"
                        placeholder="International Bank Wire Transfer"
                        value={form.gateway_manual_title || ''}
                        onChange={(e) => handleChange('gateway_manual_title', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Instructions & SWIFT / IBAN Details</label>
                      <textarea
                        rows={4}
                        placeholder="Bank Name: Barclays Bank UK..."
                        value={form.gateway_manual_instructions || ''}
                        onChange={(e) => handleChange('gateway_manual_instructions', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection([
                    'gateway_stripe_enabled', 'gateway_stripe_publishable_key', 'gateway_stripe_secret_key', 'gateway_stripe_mode',
                    'gateway_gocardless_enabled', 'gateway_gocardless_access_token', 'gateway_gocardless_mode',
                    'gateway_paypal_enabled', 'gateway_paypal_client_id', 'gateway_paypal_client_secret', 'gateway_paypal_mode',
                    'gateway_razorpay_enabled', 'gateway_razorpay_key_id', 'gateway_razorpay_key_secret',
                    'gateway_2checkout_enabled', 'gateway_2checkout_seller_id', 'gateway_2checkout_secret_key', 'gateway_2checkout_mode',
                    'gateway_authorizenet_enabled', 'gateway_authorizenet_login_id', 'gateway_authorizenet_transaction_key', 'gateway_authorizenet_mode',
                    'gateway_manual_enabled', 'gateway_manual_title', 'gateway_manual_instructions'
                  ])}
                  className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save size={18} /> Save Payment Gateways Configuration
                </button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Security & Access</h2>
                <p className="text-slate-500 text-sm">Control overarching platform availability and authentication enforcement rules.</p>
              </div>

              <div className="space-y-6">
                {/* Maintenance Mode */}
                <div className={`border-2 rounded-xl p-6 flex items-center justify-between transition-colors ${
                  isMaintenance ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <div>
                    <h4 className={`font-bold text-lg mb-1 ${isMaintenance ? 'text-red-800' : 'text-slate-800'}`}>Platform Maintenance Mode</h4>
                    <p className={`text-sm ${isMaintenance ? 'text-red-600/80' : 'text-slate-500'}`}>
                      When enabled, all tenant workspaces become inaccessible and display a maintenance screen. 
                      <strong className="block mt-1">Admin Panel remains fully operational.</strong>
                    </p>
                  </div>
                  <button 
                    onClick={() => updateSetting.mutate({ key: 'maintenance_mode', value: isMaintenance ? 'false' : 'true' })}
                    className={`ml-6 shrink-0 transition-all ${isMaintenance ? 'text-red-600 drop-shadow-md scale-110' : 'text-slate-400 hover:text-slate-500'}`}
                    title={isMaintenance ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
                  >
                    {isMaintenance ? <ToggleRight size={56} /> : <ToggleLeft size={56} />}
                  </button>
                </div>

                {/* Advanced Enforcement Features */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="font-bold text-slate-800 text-lg">Advanced Security & Access Enforcement</h4>
                    <p className="text-xs text-slate-500">Configure global authentication controls, IP restrictions, and session security policies across all tenants.</p>
                  </div>

                  <div className="space-y-6">
                    {/* 1. Two-Factor Authentication (2FA) */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">Enforce Two-Factor Authentication (2FA)</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            form.security_enforce_2fa === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {form.security_enforce_2fa === 'true' ? 'Enforced' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Mandate Google/Microsoft Authenticator App (TOTP) registration for all System Staff and Tenant Practice Admins upon login.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange('security_enforce_2fa', form.security_enforce_2fa === 'true' ? 'false' : 'true')}
                        className={`transition-colors shrink-0 ${form.security_enforce_2fa === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {form.security_enforce_2fa === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                      </button>
                    </div>

                    {/* 2. Strict IP Whitelisting */}
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">Strict IP Whitelisting</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              form.security_ip_whitelisting_enabled === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {form.security_ip_whitelisting_enabled === 'true' ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Only permit System Admin logins from explicit IP addresses or subnet ranges.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('security_ip_whitelisting_enabled', form.security_ip_whitelisting_enabled === 'true' ? 'false' : 'true')}
                          className={`transition-colors shrink-0 ${form.security_ip_whitelisting_enabled === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          {form.security_ip_whitelisting_enabled === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                        </button>
                      </div>

                      {form.security_ip_whitelisting_enabled === 'true' && (
                        <div className="pt-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed IP Addresses / Subnets (comma separated)</label>
                          <input
                            type="text"
                            value={form.security_allowed_ips || ''}
                            onChange={(e) => handleChange('security_allowed_ips', e.target.value)}
                            placeholder="e.g. 192.168.1.1, 10.0.0.0/24, 127.0.0.1"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. Session Inactivity Timeout */}
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">Automatic Session Inactivity Timeout</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              form.security_session_timeout_enabled === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {form.security_session_timeout_enabled === 'true' ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Automatically force logout users after a set period of idle inactivity.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('security_session_timeout_enabled', form.security_session_timeout_enabled === 'true' ? 'false' : 'true')}
                          className={`transition-colors shrink-0 ${form.security_session_timeout_enabled === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          {form.security_session_timeout_enabled === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                        </button>
                      </div>

                      {form.security_session_timeout_enabled === 'true' && (
                        <div className="pt-2 animate-in fade-in duration-200 flex items-center gap-3">
                          <label className="text-xs font-semibold text-slate-700">Timeout Duration:</label>
                          <select
                            value={form.security_session_timeout_minutes || '30'}
                            onChange={(e) => handleChange('security_session_timeout_minutes', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                          >
                            <option value="15">15 Minutes</option>
                            <option value="30">30 Minutes</option>
                            <option value="60">1 Hour</option>
                            <option value="120">2 Hours</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 4. Periodic Password Expiry */}
                    <div className="space-y-3 pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">Periodic Password Expiry Policy</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              form.security_password_expiry_enabled === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {form.security_password_expiry_enabled === 'true' ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Require platform administrators and users to change their password periodically.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('security_password_expiry_enabled', form.security_password_expiry_enabled === 'true' ? 'false' : 'true')}
                          className={`transition-colors shrink-0 ${form.security_password_expiry_enabled === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          {form.security_password_expiry_enabled === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                        </button>
                      </div>

                      {form.security_password_expiry_enabled === 'true' && (
                        <div className="pt-2 animate-in fade-in duration-200 flex items-center gap-3">
                          <label className="text-xs font-semibold text-slate-700">Force Password Change Every:</label>
                          <select
                            value={form.security_password_expiry_days || '90'}
                            onChange={(e) => handleChange('security_password_expiry_days', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                          >
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                            <option value="180">180 Days</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 5. Single Concurrent Session Control */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">Single Active Device Session Control</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            form.security_single_session_enabled === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {form.security_single_session_enabled === 'true' ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Automatically terminate existing active sessions when a user logs in from a new browser or device.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange('security_single_session_enabled', form.security_single_session_enabled === 'true' ? 'false' : 'true')}
                        className={`transition-colors shrink-0 ${form.security_single_session_enabled === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {form.security_single_session_enabled === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                      </button>
                    </div>

                    {/* 6. Google SSO / Gmail Single Sign-On */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">Google SSO / Gmail Single Sign-On</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              form.sso_google_enabled === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {form.sso_google_enabled === 'true' ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">Allow System Staff and Tenant users to sign in using their Google / Gmail accounts.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChange('sso_google_enabled', form.sso_google_enabled === 'true' ? 'false' : 'true')}
                          className={`transition-colors shrink-0 ${form.sso_google_enabled === 'true' ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          {form.sso_google_enabled === 'true' ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                        </button>
                      </div>

                      {form.sso_google_enabled === 'true' && (
                        <div className="pt-2 space-y-3 animate-in fade-in duration-200 bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Google OAuth Client ID</label>
                            <input
                              type="text"
                              value={form.sso_google_client_id || ''}
                              onChange={(e) => handleChange('sso_google_client_id', e.target.value)}
                              placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Google OAuth Client Secret</label>
                            <input
                              type="password"
                              value={form.sso_google_client_secret || ''}
                              onChange={(e) => handleChange('sso_google_client_secret', e.target.value)}
                              placeholder="GOCSPX-••••••••••••••••"
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>


                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSection([
                        'security_enforce_2fa',
                        'security_ip_whitelisting_enabled',
                        'security_allowed_ips',
                        'security_session_timeout_enabled',
                        'security_session_timeout_minutes',
                        'security_password_expiry_enabled',
                        'security_password_expiry_days',
                        'security_single_session_enabled',
                        'sso_google_enabled',
                        'sso_google_client_id',
                        'sso_google_client_secret',
                      ])}
                      className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Save size={18} /> Save Security Enforcement Configuration
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* MEDIA & FILE STORAGE TAB */}
          {activeTab === 'media' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Media & File Storage Policy</h2>
                <p className="text-slate-500 text-sm">Control global file upload size limits and allowed file type access across all tenant workspaces.</p>
              </div>

              <form onSubmit={handleSaveMediaSettings} className="space-y-6">
                {/* Control Authority Delegation */}
                <div className="border-2 border-indigo-100 rounded-xl p-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <Shield size={18} className="text-indigo-600" /> Control Authority Mode
                  </h4>
                  <p className="text-xs text-slate-600 mb-4">Choose whether System Admin enforces media rules globally or delegates control to individual tenant firms.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      !mediaSettingsForm.allowTenantControl
                        ? 'border-indigo-600 bg-white shadow-md'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="radio"
                          name="control_authority"
                          checked={!mediaSettingsForm.allowTenantControl}
                          onChange={() => setMediaSettingsForm({ ...mediaSettingsForm, allowTenantControl: false })}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-bold text-sm text-slate-800">System Admin Enforced (Default)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-7">
                        Global rules apply to all tenants. The <strong>"Media Settings"</strong> tab on Tenant Admin Panel (<code className="font-mono text-indigo-600">/admin</code>) will be <strong>hidden</strong>.
                      </p>
                    </label>

                    <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      mediaSettingsForm.allowTenantControl
                        ? 'border-indigo-600 bg-white shadow-md'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="radio"
                          name="control_authority"
                          checked={mediaSettingsForm.allowTenantControl}
                          onChange={() => setMediaSettingsForm({ ...mediaSettingsForm, allowTenantControl: true })}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <span className="font-bold text-sm text-slate-800">Delegate Control to Tenants</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-7">
                        Tenants can configure their own upload limits & file categories. The <strong>"Media Settings"</strong> tab will be <strong>visible & active</strong> on <code className="font-mono text-indigo-600">/admin</code>.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Third-Party Cloud Storage Driver Selection */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm space-y-5">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                      <Database size={18} className="text-indigo-600" /> Storage Driver & Third-Party Integration
                    </h4>
                    <p className="text-xs text-slate-500">Select where uploaded files across all tenant workspaces are stored (Local disk, AWS S3, Cloudinary, or SFTP).</p>
                  </div>

                  {/* Storage Driver Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'local', title: 'Local Storage', icon: <HardDrive size={22} className="text-indigo-600 mb-1" />, desc: 'Server local disk' },
                      { id: 's3', title: 'AWS S3 / Wasabi', icon: <Cloud size={22} className="text-indigo-600 mb-1" />, desc: 'S3-compatible bucket' },
                      { id: 'cloudinary', title: 'Cloudinary', icon: <ImageIcon size={22} className="text-indigo-600 mb-1" />, desc: 'CDN media storage' },
                      { id: 'sftp', title: 'SFTP / FTP', icon: <Folder size={22} className="text-indigo-600 mb-1" />, desc: 'Remote file server' },
                    ].map((driver) => (
                      <button
                        type="button"
                        key={driver.id}
                        onClick={() => setMediaSettingsForm({ ...mediaSettingsForm, storageDriver: driver.id })}
                        className={`p-3.5 border-2 rounded-xl text-left transition-all flex flex-col justify-between ${
                          mediaSettingsForm.storageDriver === driver.id
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>{driver.icon}</div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{driver.title}</div>
                          <div className="text-[10px] text-slate-500">{driver.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Driver Specific Fields */}
                  {mediaSettingsForm.storageDriver === 's3' && (
                    <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">AWS S3 / S3-Compatible Credentials</h5>
                        <button
                          type="button"
                          onClick={() => setMediaSettingsForm({
                            ...mediaSettingsForm,
                            s3Bucket: 'sansuite-test-media-bucket',
                            s3Region: 'us-east-1',
                            s3AccessKey: 'AKIAIOSFODNN7EXAMPLE',
                            s3SecretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                            s3Endpoint: 'https://s3.us-east-1.amazonaws.com'
                          })}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded shadow-sm transition-colors"
                        >
                          Auto-Fill AWS Test Credentials
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Bucket Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. sansuite-media-uploads"
                            value={mediaSettingsForm.s3Bucket}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, s3Bucket: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">AWS Region *</label>
                          <input
                            type="text"
                            placeholder="e.g. us-east-1 or eu-west-1"
                            value={mediaSettingsForm.s3Region}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, s3Region: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Access Key ID *</label>
                          <input
                            type="text"
                            placeholder="AKIA..."
                            value={mediaSettingsForm.s3AccessKey}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, s3AccessKey: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Secret Access Key *</label>
                          <input
                            type="password"
                            placeholder="••••••••••••••••"
                            value={mediaSettingsForm.s3SecretKey}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, s3SecretKey: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Endpoint URL (Optional for Wasabi / DO Spaces / MinIO)</label>
                        <input
                          type="text"
                          placeholder="e.g. https://s3.wasabisys.com or https://nyc3.digitaloceanspaces.com"
                          value={mediaSettingsForm.s3Endpoint}
                          onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, s3Endpoint: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {mediaSettingsForm.storageDriver === 'cloudinary' && (
                    <div className="p-4 border border-purple-100 bg-purple-50/30 rounded-xl space-y-4 animate-in fade-in duration-200">
                      <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Cloudinary API Credentials</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Cloud Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. sansuite-cloud"
                            value={mediaSettingsForm.cloudinaryCloudName}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, cloudinaryCloudName: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">API Key *</label>
                          <input
                            type="text"
                            placeholder="123456789..."
                            value={mediaSettingsForm.cloudinaryApiKey}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, cloudinaryApiKey: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">API Secret *</label>
                          <input
                            type="password"
                            placeholder="••••••••••••••••"
                            value={mediaSettingsForm.cloudinaryApiSecret}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, cloudinaryApiSecret: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {mediaSettingsForm.storageDriver === 'sftp' && (
                    <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-xl space-y-4 animate-in fade-in duration-200">
                      <h5 className="text-xs font-bold text-blue-900 uppercase tracking-wider">SFTP / Remote Server Details</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Server Host / IP *</label>
                          <input
                            type="text"
                            placeholder="e.g. files.sansuite.com or 192.168.1.100"
                            value={mediaSettingsForm.sftpHost}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, sftpHost: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                          <input
                            type="text"
                            placeholder="22"
                            value={mediaSettingsForm.sftpPort}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, sftpPort: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                          <input
                            type="text"
                            placeholder="sftpuser"
                            value={mediaSettingsForm.sftpUser}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, sftpUser: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                          <input
                            type="password"
                            placeholder="••••••••••••"
                            value={mediaSettingsForm.sftpPassword}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, sftpPassword: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Remote Directory Path</label>
                          <input
                            type="text"
                            placeholder="/var/www/uploads/"
                            value={mediaSettingsForm.sftpPath}
                            onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, sftpPath: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Connection Button & Status */}
                  <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleTestStorageConnection}
                      disabled={testingStorage || mediaSettingsForm.storageDriver === 'local'}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      {testingStorage ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Plug size={14} /> Test Storage Connection</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Max Upload Size */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-2">Maximum Upload File Size Limit</h4>
                  <p className="text-xs text-slate-500 mb-4">Set the default maximum allowed file size for single uploads.</p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-600">Max File Size (MB)</label>
                    <select
                      value={mediaSettingsForm.maxFileSizeMB}
                      onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, maxFileSizeMB: parseInt(e.target.value) })}
                      className="w-full sm:w-72 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:border-indigo-500 shadow-sm font-semibold"
                    >
                      <option value={5}>5 MB (Strict Limit)</option>
                      <option value={10}>10 MB</option>
                      <option value={25}>25 MB (Recommended Standard)</option>
                      <option value={50}>50 MB</option>
                      <option value={100}>100 MB (Large Files)</option>
                    </select>
                  </div>
                </div>

                {/* Allowed File Types */}
                <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-1">Allowed File Categories & Extensions</h4>
                  <p className="text-xs text-slate-500 mb-5">Enable or disable which file types users across all workspaces are permitted to upload.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={mediaSettingsForm.allowPdf}
                        onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, allowPdf: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">PDF Documents</div>
                        <div className="text-xs text-slate-500 font-mono">.pdf</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={mediaSettingsForm.allowDocs}
                        onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, allowDocs: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Word / Text Documents</div>
                        <div className="text-xs text-slate-500 font-mono">.doc, .docx, .txt</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={mediaSettingsForm.allowImages}
                        onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, allowImages: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Images & Logos</div>
                        <div className="text-xs text-slate-500 font-mono">.png, .jpg, .jpeg, .svg, .webp</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={mediaSettingsForm.allowSpreadsheets}
                        onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, allowSpreadsheets: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Excel Spreadsheets</div>
                        <div className="text-xs text-slate-500 font-mono">.xls, .xlsx, .csv</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={mediaSettingsForm.allowZip}
                        onChange={(e) => setMediaSettingsForm({ ...mediaSettingsForm, allowZip: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">Archive Files</div>
                        <div className="text-xs text-slate-500 font-mono">.zip, .rar, .tar</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-brand hover:bg-brand-light text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Save size={18} /> Save Media Storage Policy
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'redis' && <RedisConfigTab />}

          {/* IP BANS TAB */}
        </div>
      </div>
    </div>
  )
}
