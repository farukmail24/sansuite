import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'

export default function IpBansTab() {
  const qc = useQueryClient()
  const [banForm, setBanForm] = useState({ ipAddress: '', reason: '', banType: 'permanent' })

  const { data: ipBans = [], isLoading: isLoadingBans } = useQuery({
    queryKey: ['ip-bans'],
    queryFn: () => saFetch('/api/system-admin/security/ip-bans').then((r: Response) => r.json()),
  })

  const banIpMutation = useMutation({
    mutationFn: async ({ ipAddress, reason, banType }: { ipAddress: string, reason: string, banType: string }) => {
      const res = await saFetch('/api/system-admin/security/ip-bans', {
        method: 'POST',
        body: JSON.stringify({ ipAddress, reason, banType }),
      })
      if (!res.ok) throw new Error('Failed to ban IP')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ip-bans'] })
    }
  })

  const unbanIpMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await saFetch(`/api/system-admin/security/ip-bans/${id}/unban`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to unban IP')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ip-bans'] })
    }
  })

  return (
    <div className="p-8 max-w-4xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">IP Ban Monitoring</h2>
        <p className="text-slate-500 text-sm">View and manage explicit IP bans applied to users across the platform.</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IP Address</label>
                  <input 
                    type="text" 
                    value={banForm.ipAddress} 
                    onChange={e => setBanForm(prev => ({...prev, ipAddress: e.target.value}))}
                    placeholder="e.g. 192.168.1.100" 
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono" 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <input 
                    type="text" 
                    value={banForm.reason} 
                    onChange={e => setBanForm(prev => ({...prev, reason: e.target.value}))}
                    placeholder="e.g. Suspicious Activity" 
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs" 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select 
                    value={banForm.banType} 
                    onChange={e => setBanForm(prev => ({...prev, banType: e.target.value}))}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary (24h)</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <button 
                    type="button" 
                    disabled={!banForm.ipAddress || banIpMutation.isPending}
                    onClick={() => {
                      banIpMutation.mutate(banForm, {
                        onSuccess: () => setBanForm({ ipAddress: '', reason: '', banType: 'permanent' })
                      })
                    }}
                    className="w-full px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-md shadow-sm transition-all"
                  >
                    {banIpMutation.isPending ? 'Banning...' : 'Ban IP'}
                  </button>
                </div>
              </div>
            </div>

            {isLoadingBans ? (
              <div className="text-xs text-slate-500 py-4">Loading IP bans...</div>
            ) : ipBans.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center bg-slate-50 rounded-lg border border-slate-100">No active IP bans found.</div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold tracking-wider uppercase">IP Address</th>
                      <th className="px-4 py-3 text-[10px] font-bold tracking-wider uppercase">Reason</th>
                      <th className="px-4 py-3 text-[10px] font-bold tracking-wider uppercase">Type</th>
                      <th className="px-4 py-3 text-[10px] font-bold tracking-wider uppercase">Banned By</th>
                      <th className="px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ipBans.map((ban: any) => (
                      <tr key={ban.id} className={ban.unbannedAt ? 'opacity-50 bg-slate-50' : 'bg-white'}>
                        <td className="px-4 py-2.5 font-mono">{ban.ipAddress}</td>
                        <td className="px-4 py-2.5">{ban.reason}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${ban.banType === 'permanent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {ban.banType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{ban.bannedBy}</td>
                        <td className="px-4 py-2.5 text-right">
                          {!ban.unbannedAt ? (
                            <button 
                              type="button" 
                              disabled={unbanIpMutation.isPending}
                              onClick={() => unbanIpMutation.mutate(ban.id)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              Unban
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[10px] uppercase">Unbanned</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
