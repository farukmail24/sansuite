import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'
import { ToggleLeft, ToggleRight, Megaphone, Trash2 } from 'lucide-react'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function AnnouncementsTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info', expiresAt: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => saFetch('/api/system-admin/announcements').then(r => r.json()),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) =>
      saFetch(`/api/system-admin/announcements/${id}/status`, { method: 'POST', body: JSON.stringify({ isActive }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await saFetch('/api/system-admin/announcements', { method: 'POST', body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to create announcement')
      qc.invalidateQueries({ queryKey: ['announcements'] })
      setShowAdd(false)
      setForm({ title: '', message: '', type: 'info', expiresAt: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <div className="p-8 text-slate-500">Loading announcements...</div>

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="font-semibold text-slate-800">Global Announcements</h2>
          <p className="text-xs text-slate-500 mt-0.5">Broadcast messages to all tenant users.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-brand hover:bg-brand-light text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Megaphone size={16} />
          {showAdd ? 'Cancel' : 'New Broadcast'}
        </button>
      </div>

      {showAdd && (
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmit} className="max-w-3xl">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Headline (Title)</label>
                <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" placeholder="e.g., Scheduled Maintenance" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Message Content</label>
                <textarea required rows={3} value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Details of the announcement..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Alert Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand">
                    <option value="info">Information (Blue)</option>
                    <option value="warning">Warning (Yellow)</option>
                    <option value="error">Critical (Red)</option>
                    <option value="success">Success (Green)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expires At (Optional)</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
                {loading ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Announcement</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Author & Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(() => {
              const paginated = Array.isArray(announcements) ? announcements.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
              if (paginated.length === 0) {
                return <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No announcements broadcasted yet.</td></tr>;
              }
              return (
                <>
                  {paginated.map((a: any) => (
                    <tr key={a.id} className={`hover:bg-slate-50/50 transition-colors ${!a.isActive && 'opacity-60'}`}>
                      <td className="px-4 py-2.5">
                        {a.isActive ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span> : 
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Archived</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate max-w-xs" title={a.message}>{a.message}</p>
                      </td>
                      <td className="px-4 py-2.5 capitalize">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          a.type === 'error' ? 'bg-red-50 text-red-600' :
                          a.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {a.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-medium text-slate-700">{a.author}</div>
                        <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-2.5 flex justify-end gap-2">
                        <button 
                          onClick={() => toggleStatus.mutate({ id: a.id, isActive: !a.isActive })}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title={a.isActive ? "Archive Announcement" : "Republish Announcement"}
                        >
                          {a.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-400" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )
            })()}
          </tbody>
        </table>
      </div>
      {Array.isArray(announcements) && announcements.length > 0 && (
        <Pagination 
          currentPage={page} 
          totalItems={announcements.length} 
          itemsPerPage={ITEMS_PER_PAGE} 
          onPageChange={setPage} 
        />
      )}
    </div>
  )
}
