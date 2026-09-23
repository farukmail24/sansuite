import { useState, useEffect } from 'react'
import { Shield, BarChart3, Building2, Plus, Users, Settings, LogOut, Search, Activity, Power, PowerOff, ToggleLeft, ToggleRight, CreditCard, List } from 'lucide-react'
import { getAdminUser, saFetch, SA_TOKEN_KEY } from '../App'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import BillingTab from '../components/BillingTab'
import AuditLogsTab from '../components/AuditLogsTab'
import SettingsTab from '../components/SettingsTab'
import PlansTab from '../components/PlansTab'
import TicketsTab from '../components/TicketsTab'
import EmailTemplatesTab from '../components/EmailTemplatesTab'
import AdminsTab from '../components/AdminsTab'
import AnnouncementsTab from '../components/AnnouncementsTab'
import FirmDetailsModal from '../components/FirmDetailsModal'
import Pagination from '../components/Pagination'
import { Megaphone, ShieldAlert, Layers, Ticket, Mail, ImageIcon, Ban } from 'lucide-react'
import MediaLibraryTab from '../components/MediaLibraryTab'
import IpBansTab from '../components/IpBansTab'
import SystemHealthTab from '../components/SystemHealthTab'
import { usePaginationLimit } from '../hooks/useSettings'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'firms', label: 'Firms', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'plans', label: 'Plans & Pricing', icon: Layers },
  { id: 'tickets', label: 'Helpdesk', icon: Ticket },
  { id: 'users', label: 'Global Users', icon: Users },
  { id: 'admins', label: 'System Staff', icon: ShieldAlert },
  { id: 'emails', label: 'Email Templates', icon: Mail },
  { id: 'announcements', label: 'Broadcasts', icon: Megaphone },
  { id: 'media', label: 'Media Library', icon: ImageIcon },
  { id: 'audit', label: 'Audit Logs', icon: List },
  { id: 'ip-bans', label: 'IP Bans', icon: Ban },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface Props { onLogout: () => void }

export default function DashboardLayout({ onLogout }: Props) {
  const getInitialTab = () => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0]
    if (NAV.some(n => n.id === rawHash)) return rawHash
    const saved = localStorage.getItem('sa_active_tab')
    if (saved && NAV.some(n => n.id === saved)) return saved
    return 'dashboard'
  }

  const [tab, setTab] = useState(getInitialTab)

  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')[0]
      if (NAV.some(n => n.id === rawHash)) {
        setTab(rawHash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    window.location.hash = `#/${tab}`
    localStorage.setItem('sa_active_tab', tab)
  }, [tab])
  const [showAddFirm, setShowAddFirm] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [firmsPage, setFirmsPage] = useState(1)
  const [usersPage, setUsersPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()
  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null)
  const admin = getAdminUser()
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => saFetch('/api/system-admin/stats').then(r => {
      if (!r.ok) throw new Error('Failed to fetch stats')
      return r.json()
    }),
  })

  const { data: firms = [], isLoading: isLoadingFirms, isError: isErrorFirms, error: errorFirms } = useQuery({
    queryKey: ['firms'],
    queryFn: () => saFetch('/api/system-admin/firms').then(r => {
      if (!r.ok) return r.json().then(err => { throw new Error(err.message || 'Failed to fetch firms') }).catch(() => { throw new Error('Failed to fetch firms') })
      return r.json()
    }),
    enabled: tab === 'firms',
  })

  const { data: usersList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => saFetch('/api/system-admin/users').then(r => {
      if (!r.ok) throw new Error('Failed to fetch users')
      return r.json()
    }),
    enabled: tab === 'users',
  })

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => saFetch('/api/system-admin/audit-logs').then(r => r.json()),
    enabled: tab === 'dashboard',
  })

  const toggleFirm = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      saFetch(`/api/system-admin/firms/${id}/status`, { method: 'POST', body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['firms'] }),
  })

  const toggleUser = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      saFetch(`/api/system-admin/users/${id}/status`, { method: 'POST', body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const impersonate = useMutation({
    mutationFn: (firmId: number) => saFetch(`/api/system-admin/impersonate/${firmId}`, { method: 'POST' }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.token && data.user) {
        const authState = {
          state: {
            user: data.user,
            token: data.token,
            isAuthenticated: true
          },
          version: 0
        }
        const mainAppUrl = window.location.port === '5174'
          ? `${window.location.protocol}//${window.location.hostname}:5000/`
          : `${window.location.origin}/`;
        window.open(mainAppUrl, '_blank') // Open main app in new tab
      }
    }
  })

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-brand text-white flex flex-col flex-shrink-0 shadow-xl z-20">
        <div className="h-14 flex items-center px-5 gap-3 border-b border-white/10 bg-black/10">
          <Shield size={20} className="text-white" />
          <span className="font-bold text-base tracking-wide text-white">SanSuite Admin</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-200 ${tab === id
                ? 'bg-brand-light text-white shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <Icon size={16} className={tab === id ? 'text-white' : 'text-slate-400'} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800 capitalize">{tab}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setFirmsPage(1); setUsersPage(1); }}
                placeholder="Global Search..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[13px] text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-56 transition-all"
              />
            </div>

            {/* Header Profile Info */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-2">
              <div onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{admin?.fullName}</p>
                  <p className="text-[11px] text-slate-500 capitalize leading-tight">{admin?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs shrink-0 border border-brand/20">
                  {admin?.fullName?.charAt(0) || 'A'}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div className="space-y-6 w-full mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">

              {/* Welcome Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-brand text-white shadow-xl">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand/40 to-transparent pointer-events-none"></div>
                <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome back, {admin?.firstName || 'Admin'}! 👋</h2>
                    <p className="text-slate-300 text-[13px] max-w-xl leading-relaxed">
                      System overview for <span className="text-white font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>. The platform is running optimally with <span className="text-emerald-400 font-semibold">{stats?.activeSubscriptions || 0} active premium subscriptions</span>.
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0 w-full md:w-auto">
                    <button onClick={() => setTab('firms')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      <Building2 size={14} /> Manage Firms
                    </button>
                    <button onClick={() => setTab('audit')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-brand hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      <List size={14} /> View Reports
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Firms" value={stats?.totalFirms} icon={Building2} color="brand" trend="+12%" isPositive={true} />
                <StatCard label="Total Users" value={stats?.totalUsers} icon={Users} color="blue" trend="+5%" isPositive={true} />
                <StatCard label="Active Subscriptions" value={stats?.activeSubscriptions} icon={BarChart3} color="emerald" trend="+18%" isPositive={true} />
                <StatCard label="System Admins" value={stats?.totalSystemAdmins} icon={Shield} color="amber" trend="0%" isPositive={true} />
              </div>

              {/* Charts & Activity Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Main Charts Column */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Firm Growth Chart */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-5">
                      <div>
                        <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider">Platform Growth</h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">New firm registrations over the last 6 months</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      {stats?.firmGrowth ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.firmGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorFirms" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', padding: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area type="monotone" dataKey="firms" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorFirms)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Loading chart data...</div>
                      )}
                    </div>
                  </div>

                  {/* Plan Distribution Chart */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider mb-1">Subscription Distribution</h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-5">Breakdown of current active plans</p>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      {stats?.plansDistribution ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.plansDistribution} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', padding: '8px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                              {stats.plansDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#6366f1'][index % 4]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-slate-400 text-xs">Loading plan data...</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">

                  {/* Quick Actions */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setTab('firms'); setShowAddFirm(true); }} className="p-3 rounded-lg border border-slate-100 shadow-sm hover:border-brand hover:-translate-y-0.5 transition-all flex items-center justify-start gap-3 group bg-white">
                        <div className="w-8 h-8 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
                          <Building2 size={14} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 group-hover:text-brand">Add Firm</span>
                      </button>
                      <button onClick={() => setTab('announcements')} className="p-3 rounded-lg border border-slate-100 shadow-sm hover:border-amber-500 hover:-translate-y-0.5 transition-all flex items-center justify-start gap-3 group bg-white">
                        <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <Megaphone size={14} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 group-hover:text-amber-600">Broadcast</span>
                      </button>
                      <button onClick={() => setTab('tickets')} className="p-3 rounded-lg border border-slate-100 shadow-sm hover:border-emerald-500 hover:-translate-y-0.5 transition-all flex items-center justify-start gap-3 group bg-white">
                        <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <Ticket size={14} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 group-hover:text-emerald-600">Support</span>
                      </button>
                      <button onClick={() => setTab('settings')} className="p-3 rounded-lg border border-slate-100 shadow-sm hover:border-slate-500 hover:-translate-y-0.5 transition-all flex items-center justify-start gap-3 group bg-white">
                        <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Settings size={14} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-800">Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Activity Feed */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-[340px]">
                    <div className="flex justify-between items-center mb-5 shrink-0">
                      <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider">System Activity</h3>
                      <button onClick={() => setTab('audit')} className="text-[10px] uppercase tracking-wider font-bold text-brand hover:text-white hover:bg-brand bg-brand/10 px-2.5 py-1 rounded transition-colors">View all</button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 relative">
                      {Array.isArray(recentLogs) ? (
                        <div className="space-y-3">
                          {recentLogs.slice(0, 10).map((log: any, i: number) => (
                            <div key={log.id} className="group flex items-start gap-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 p-2 transition-colors">
                              <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shadow-sm">
                                <Activity size={10} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-semibold text-slate-800 text-[11px] truncate">{log.adminName}</span>
                                  <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 leading-tight">
                                  <span className="text-slate-700 font-medium capitalize">{log.action.toLowerCase().replace(/_/g, ' ')}</span> {log.targetType} {log.targetId ? <span className="font-semibold text-brand">#{log.targetId}</span> : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                          {recentLogs.length === 0 && (
                            <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg relative z-10 bg-white">
                              No recent activity found.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-red-500 text-xs bg-red-50 rounded-lg relative z-10">
                          Failed to load recent activity.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* FIRMS */}
          {tab === 'firms' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shadow-inner">
                    <Building2 size={16} />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm">Registered Firms</h2>
                </div>
                <button
                  onClick={() => setShowAddFirm(true)}
                  className="px-4 py-2 bg-brand hover:bg-brand-light text-white text-[11px] font-bold rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 justify-center"
                >
                  <Plus size={14} /> Add Firm Manually
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-600">
                  <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Firm Name</th>
                      <th className="px-4 py-3">Subdomain</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingFirms ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading firms...</td></tr>
                    ) : isErrorFirms ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-red-500">Error: {(errorFirms as Error).message}</td></tr>
                    ) : (() => {
                      const filtered = Array.isArray(firms) ? firms.filter((f: any) =>
                        !globalSearch ||
                        f.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
                        f.subdomain.toLowerCase().includes(globalSearch.toLowerCase())
                      ) : [];
                      const paginated = filtered.slice((firmsPage - 1) * ITEMS_PER_PAGE, firmsPage * ITEMS_PER_PAGE);

                      if (paginated.length === 0) {
                        return <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No firms found.</td></tr>;
                      }

                      return (
                        <>
                          {paginated.map((f: any) => (
                            <tr key={f.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedFirmId(f.id)}>
                              <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200 group-hover:border-brand/30 group-hover:text-brand transition-colors">
                                  <Building2 size={12} />
                                </div>
                                {f.name}
                              </td>
                              <td className="px-4 py-3 text-brand font-semibold">{f.subdomain}.sansuite.com</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                  {f.plan}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge active={f.isActive} activeText="Active" inactiveText="Suspended" />
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-medium">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => impersonate.mutate(f.id)}
                                  disabled={impersonate.isPending}
                                  className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center gap-1.5 transition-all text-[10px] font-bold disabled:opacity-50"
                                  title="Login as this tenant"
                                >
                                  <Power size={12} /> Impersonate
                                </button>
                                {admin?.role === 'super_admin' && (
                                  <button
                                    onClick={() => toggleFirm.mutate({ id: f.id, isActive: !f.isActive })}
                                    className={`px-2.5 py-1.5 rounded-md bg-white border border-slate-200 flex items-center gap-1.5 transition-all text-[10px] font-bold ${f.isActive ? 'text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50' : 'text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'}`}
                                  >
                                    {f.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                                    {f.isActive ? 'Suspend' : 'Activate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
              {Array.isArray(firms) && firms.length > 0 && (
                <Pagination
                  currentPage={firmsPage}
                  totalItems={firms.filter((f: any) => !globalSearch || f.name.toLowerCase().includes(globalSearch.toLowerCase()) || f.subdomain.toLowerCase().includes(globalSearch.toLowerCase())).length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setFirmsPage}
                />
              )}
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="font-semibold text-slate-800 text-sm">Global Users Directory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Firm</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const filtered = Array.isArray(usersList) ? usersList.filter((u: any) =>
                        !globalSearch ||
                        (u.firstName + ' ' + u.lastName).toLowerCase().includes(globalSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(globalSearch.toLowerCase())
                      ) : [];
                      const paginated = filtered.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);

                      if (paginated.length === 0) {
                        return <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No users found or unable to load data.</td></tr>;
                      }

                      return (
                        <>
                          {paginated.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-slate-900">{u.firstName} {u.lastName}</td>
                              <td className="px-4 py-2.5">{u.email}</td>
                              <td className="px-4 py-2.5">{u.firmName || <span className="text-slate-400 italic">No Firm</span>}</td>
                              <td className="px-4 py-2.5 capitalize">{u.role}</td>
                              <td className="px-4 py-2.5">
                                <StatusBadge active={u.isActive} activeText="Active" inactiveText="Locked" />
                              </td>
                              <td className="px-4 py-2.5 text-slate-500">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                              <td className="px-4 py-2.5 flex items-center justify-end gap-2">
                                {admin?.role === 'super_admin' && (
                                  <button
                                    onClick={() => toggleUser.mutate({ id: u.id, isActive: !u.isActive })}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                    title={u.isActive ? "Lock User" : "Unlock User"}
                                  >
                                    {u.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-red-500" />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
              {Array.isArray(usersList) && usersList.length > 0 && (
                <Pagination
                  currentPage={usersPage}
                  totalItems={usersList.filter((u: any) => !globalSearch || (u.firstName + ' ' + u.lastName).toLowerCase().includes(globalSearch.toLowerCase()) || u.email.toLowerCase().includes(globalSearch.toLowerCase())).length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setUsersPage}
                />
              )}
            </div>
          )}

          {/* SYSTEM STAFF */}
          {tab === 'admins' && <AdminsTab />}
          {/* EMAILS */}
          {tab === 'emails' && <EmailTemplatesTab />}
          {/* ANNOUNCEMENTS */}
          {tab === 'announcements' && <AnnouncementsTab />}
          {/* MEDIA LIBRARY */}
          {tab === 'media' && <MediaLibraryTab />}
          {/* TICKETS */}
          {tab === 'tickets' && <TicketsTab />}
          {/* BILLING */}
          {tab === 'billing' && <BillingTab />}
          {/* PLANS */}
          {tab === 'plans' && <PlansTab />}
          {/* AUDIT LOGS */}
          {tab === 'audit' && <AuditLogsTab />}
          {/* IP BANS */}
          {tab === 'ip-bans' && <IpBansTab />}
          {/* SYSTEM HEALTH */}
          {tab === 'health' && <SystemHealthTab />}
          {/* SETTINGS */}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* MODALS */}
      {showAddFirm && <AddFirmModal onClose={() => setShowAddFirm(false)} />}
      {showProfileModal && <ProfileUpdateModal onClose={() => setShowProfileModal(false)} admin={admin} onLogout={onLogout} />}
      {selectedFirmId && <FirmDetailsModal firmId={selectedFirmId} onClose={() => setSelectedFirmId(null)} />}
    </div>
  )
}

function ProfileUpdateModal({ onClose, admin, onLogout }: { onClose: () => void, admin: any, onLogout: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    fullName: admin?.fullName || '',
    email: admin?.email || '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await saFetch('/api/system-admin/profile', { method: 'PUT', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update profile')
      setSuccess('Profile updated successfully! Please sign in again.')
      setTimeout(() => {
        onLogout()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Update Profile</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
        {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input required type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password (optional)</label>
            <input type="password" placeholder="Leave blank to keep current" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddFirmModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', subdomain: '', adminEmail: '', adminFirstName: '', adminLastName: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await saFetch('/api/system-admin/firms', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create firm')
      qc.invalidateQueries({ queryKey: ['firms'] })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Firm (Tenant)</h2>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Firm Name</label>
              <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subdomain</label>
              <input required type="text" value={form.subdomain} onChange={e => setForm({ ...form, subdomain: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin First Name</label>
              <input required type="text" value={form.adminFirstName} onChange={e => setForm({ ...form, adminFirstName: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Last Name</label>
              <input required type="text" value={form.adminLastName} onChange={e => setForm({ ...form, adminLastName: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
            <input required type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Password</label>
            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Firm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, trend, isPositive }: any) {
  const colors: Record<string, string> = {
    brand: 'bg-brand/10 text-brand',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-50 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-125 opacity-60"></div>
      <div className="relative flex justify-between items-start z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value ?? '—'}</p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {trend}
              </span>
              <span className="text-xs text-slate-400 font-medium">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]} ring-1 ring-black/5`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ active, activeText, inactiveText }: { active: boolean, activeText: string, inactiveText: string }) {
  if (active) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{activeText}</span>
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">{inactiveText}</span>
}
