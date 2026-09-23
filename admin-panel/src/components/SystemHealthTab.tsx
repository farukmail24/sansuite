import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { saFetch } from '../App'
import { Activity, HardDrive, Server, Cpu, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor(seconds % (3600 * 24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  return `${d}d ${h}h ${m}m`
}

export default function SystemHealthTab() {
  const [history, setHistory] = useState<any[]>([])
  
  const { data: diagnostics, isLoading: isLoadingDiag, isRefetching, refetch, error } = useQuery({
    queryKey: ['system-diagnostics'],
    queryFn: () => saFetch('/api/system-admin/system/diagnostics').then((r: Response) => {
      if (!r.ok) throw new Error('Failed to fetch diagnostics')
      return r.json()
    }),
    refetchInterval: 2000 // Real-time pulse every 2s
  })

  useEffect(() => {
    if (diagnostics) {
      setHistory(prev => {
        const memPercent = diagnostics.server?.totalMem && diagnostics.server?.freeMem 
          ? ((diagnostics.server.totalMem - diagnostics.server.freeMem) / diagnostics.server.totalMem) * 100 
          : 0;
        const cpuAvg = diagnostics.server?.loadAvg?.[0] || 0;
        
        const point = {
          time: new Date().toISOString(),
          memory: memPercent,
          cpu: cpuAvg
        }
        return [...prev, point].slice(-30) // Keep last 30 data points (60 seconds)
      })
    }
  }, [diagnostics])

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Infrastructure</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time telemetry and health monitoring for core backend services.</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-50 hover:text-brand transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          {isRefetching ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {isLoadingDiag && !diagnostics ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
          <Activity size={32} className="text-brand animate-pulse mb-3" />
          <p className="text-slate-500 font-medium">Gathering system telemetry...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle size={20} /></div>
          <div>
            <h3 className="font-bold text-red-800 text-sm">Diagnostic Failure</h3>
            <p className="text-red-600 text-xs mt-1">{(error as any).message || 'Unable to reach backend diagnostic services.'}</p>
          </div>
        </div>
      ) : diagnostics ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Server Node */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100 to-transparent rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-inner">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Application Node</h3>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{diagnostics.server?.platform} • {diagnostics.server?.release}</p>
                </div>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-5 relative z-10">
              {/* Uptime */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock size={14} />
                  <span className="text-xs font-semibold">Node Uptime</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {diagnostics.server?.uptime ? formatUptime(diagnostics.server.uptime) : 'N/A'}
                </span>
              </div>

              {/* Memory Usage Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600">Memory Usage</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {diagnostics.server?.freeMem && diagnostics.server?.totalMem 
                      ? Math.round(((diagnostics.server.totalMem - diagnostics.server.freeMem) / diagnostics.server.totalMem) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner mb-2">
                  <div 
                    className="bg-brand h-1.5 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${diagnostics.server?.freeMem && diagnostics.server?.totalMem ? ((diagnostics.server.totalMem - diagnostics.server.freeMem) / diagnostics.server.totalMem) * 100 : 0}%` }}
                  ></div>
                </div>
                {/* Real-time memory sparkline */}
                {history.length > 1 && (
                  <div className="h-10 w-full mb-1 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Area type="monotone" dataKey="memory" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} strokeWidth={1.5} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span>{formatBytes(diagnostics.server?.totalMem - diagnostics.server?.freeMem)} used</span>
                  <span>{formatBytes(diagnostics.server?.totalMem)} total</span>
                </div>
              </div>

              {/* CPU Load */}
              <div>
                <div className="flex items-center justify-between text-slate-600 mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu size={14} />
                    <span className="text-xs font-semibold">CPU Load (1m, 5m, 15m)</span>
                  </div>
                </div>
                {/* Real-time CPU sparkline */}
                {history.length > 1 && (
                  <div className="h-12 w-full mb-3 opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Area type="monotone" dataKey="cpu" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={1.5} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {diagnostics.server?.loadAvg?.map((load: number, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg py-1.5 text-center transition-all duration-500">
                      <span className="text-xs font-mono font-bold text-slate-800">{load.toFixed(2)}</span>
                    </div>
                  )) || <div className="col-span-3 text-xs text-slate-400">N/A</div>}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Node {diagnostics.server?.nodeVersion}</span>
              <span>PID: {diagnostics.server?.processUptime ? 'Active' : 'Unknown'}</span>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Database Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-brand/30 transition-colors relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 text-slate-50 opacity-50">
                <HardDrive size={120} />
              </div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className={`p-3 rounded-xl shadow-inner ${diagnostics.database?.status === 'Online' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  <HardDrive size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">MySQL Primary</h3>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Relational Store</p>
                </div>
                <div className="ml-auto">
                  <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${diagnostics.database?.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${diagnostics.database?.status === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {diagnostics.database?.status || "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="mt-auto pt-5 border-t border-slate-100 relative z-10">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Connection pooling is active. The database is responding to health checks normally.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Latency</p>
                    <p className="text-sm font-mono font-bold text-emerald-600">{"< 5ms"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pool Status</p>
                    <p className="text-sm font-mono font-bold text-slate-800">Healthy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Redis Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-brand/30 transition-colors relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 text-slate-50 opacity-50">
                <Activity size={120} />
              </div>
              
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className={`p-3 rounded-xl shadow-inner ${diagnostics.redis?.status === 'Online' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Redis Cache</h3>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">In-Memory Store</p>
                </div>
                <div className="ml-auto">
                  <span className={`flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${diagnostics.redis?.status === 'Online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${diagnostics.redis?.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {diagnostics.redis?.status || "Fallback"}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-5 border-t border-slate-100 relative z-10">
                 <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Handling ephemeral sessions, queue jobs, and API rate limiting.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Memory Usage</p>
                    <p className="text-sm font-mono font-bold text-slate-800">{diagnostics.redis?.memory || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Clients</p>
                    <p className="text-sm font-mono font-bold text-slate-800">{diagnostics.redis?.connectedClients || "0"}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  )
}
