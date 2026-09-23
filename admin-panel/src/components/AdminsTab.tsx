import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch, getAdminUser } from '../App'
import { ToggleLeft, ToggleRight, ShieldAlert, KeyRound } from 'lucide-react'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function AdminsTab() {
  const qc = useQueryClient()
  const currentAdmin = getAdminUser()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'support' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['system-admins'],
    queryFn: () => saFetch('/api/system-admin/admins').then(r => r.json()),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) =>
      saFetch(`/api/system-admin/admins/${id}/status`, { method: 'POST', body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-admins'] }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await saFetch('/api/system-admin/admins', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create admin')
      qc.invalidateQueries({ queryKey: ['system-admins'] })
      setShowAdd(false)
      setForm({ fullName: '', email: '', password: '', role: 'support' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <div className="p-8 text-slate-500">Loading system staff...</div>

  if (currentAdmin?.role !== 'super_admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-xl max-w-2xl mx-auto mt-10">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Admins can view and manage system staff.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="font-semibold text-slate-800">System Staff Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage access for support and billing teams.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-brand hover:bg-brand-light text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          {showAdd ? 'Cancel' : 'Invite Staff'}
        </button>
      </div>

      {showAdd && (
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmit} className="max-w-3xl">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand">
                  <option value="support">Support</option>
                  <option value="billing">Billing</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(() => {
              const paginated = Array.isArray(admins) ? admins.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
              if (paginated.length === 0) {
                return <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No admins found.</td></tr>;
              }
              return (
                <>
                  {paginated.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{a.fullName} {a.id === currentAdmin?.id && <span className="text-xs text-indigo-500 ml-2">(You)</span>}</td>
                      <td className="px-4 py-2.5">{a.email}</td>
                      <td className="px-4 py-2.5 capitalize">{a.role.replace('_', ' ')}</td>
                      <td className="px-4 py-2.5">
                        {a.isActive ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span> : 
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">Locked</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{a.lastLogin ? new Date(a.lastLogin).toLocaleDateString() : 'Never'}</td>
                      <td className="px-4 py-2.5 flex justify-end gap-2">
                        {a.id !== currentAdmin?.id && (
                          <button 
                            onClick={() => toggleStatus.mutate({ id: a.id, isActive: !a.isActive })}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title={a.isActive ? "Lock Access" : "Unlock Access"}
                          >
                            {a.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-red-500" />}
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
      {Array.isArray(admins) && admins.length > 0 && (
        <Pagination 
          currentPage={page} 
          totalItems={admins.length} 
          itemsPerPage={ITEMS_PER_PAGE} 
          onPageChange={setPage} 
        />
      )}
    </div>
  )
}
