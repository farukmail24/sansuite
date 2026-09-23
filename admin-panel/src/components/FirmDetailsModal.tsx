import { useQuery } from '@tanstack/react-query'
import { saFetch } from '../App'
import { Building2, Users, HardDrive, Server, X, Activity, AlertCircle } from 'lucide-react'

export default function FirmDetailsModal({ firmId, onClose }: { firmId: number, onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['firm-details', firmId],
    queryFn: () => saFetch(`/api/system-admin/firms/${firmId}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch firm details')
      return r.json()
    }),
  })

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl min-h-[500px] flex items-center justify-center">
          <div className="animate-pulse text-slate-400 font-medium">Loading Firm 360° View...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <p className="text-red-500">Error loading firm details. Please try again.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">Close</button>
        </div>
      </div>
    )
  }

  const { firm, subscription, usage, recentLogs } = data
  const maxClients = subscription?.maxClients || 0
  const clientsPercent = maxClients > 0 ? Math.min(100, (usage.clients / maxClients) * 100) : 0

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{firm.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-mono bg-slate-100 px-1.5 rounded">{firm.subdomain}.sansuite.com</span>
                <span>•</span>
                <span className="capitalize">Plan: {firm.plan}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${firm.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {firm.isActive ? 'Active' : 'Suspended'}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (Usage & Plan) */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-brand" /> Resource Usage</h3>
                <div className="space-y-5">
                  
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1.5">
                      <span className="text-slate-700">Client Profiles</span>
                      <span className="text-slate-500">{usage.clients} / {maxClients === 0 ? 'Unlimited' : maxClients}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${clientsPercent > 90 ? 'bg-red-500' : clientsPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${clientsPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1.5"><Users size={14}/> Staff Users</div>
                      <div className="text-lg font-bold text-slate-800">{usage.users} Active</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1.5"><HardDrive size={14}/> Storage Used</div>
                      <div className="text-lg font-bold text-slate-800">{usage.storageGb} GB</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Server size={18} className="text-brand" /> Subscription Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <div className="text-slate-500 mb-0.5">Tier Name</div>
                    <div className="font-medium text-slate-800">{subscription?.tierName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Payment Status</div>
                    <div className="font-medium text-slate-800">{subscription?.paymentStatus || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Cycle Start</div>
                    <div className="font-medium text-slate-800">{subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-0.5">Cycle End</div>
                    <div className="font-medium text-slate-800">{subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (Audit Logs & Quick Actions) */}
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Recent Activity</h3>
                <div className="space-y-4">
                  {recentLogs.length > 0 ? recentLogs.map((log: any) => (
                    <div key={log.id} className="text-sm">
                      <div className="font-medium text-slate-700">{log.action.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  )) : (
                    <div className="text-sm text-slate-500 italic">No recent system logs.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
