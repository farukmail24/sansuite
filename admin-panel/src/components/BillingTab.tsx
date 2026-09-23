import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'
import { CreditCard, TrendingUp, DollarSign, Plus, Download, Receipt, CheckCircle2, XCircle } from 'lucide-react'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function BillingTab() {
  const qc = useQueryClient()
  const [showManualInvoice, setShowManualInvoice] = useState(false)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()
  
  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => saFetch('/api/system-admin/revenue').then(r => r.json()),
  })

  const { data: firms = [] } = useQuery({
    queryKey: ['firms-list'],
    queryFn: () => saFetch('/api/system-admin/firms').then(r => r.json()),
    enabled: showManualInvoice
  })

  const [form, setForm] = useState({ practiceId: '', amount: '', description: '', paymentMethod: 'manual' })
  const [loading, setLoading] = useState(false)

  const createPayment = useMutation({
    mutationFn: (data: any) => saFetch('/api/system-admin/payments', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue'] })
      setShowManualInvoice(false)
      setForm({ practiceId: '', amount: '', description: '', paymentMethod: 'manual' })
    }
  })

  const approvePayment = useMutation({
    mutationFn: (id: number) => saFetch(`/api/system-admin/payments/${id}/approve`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue'] })
      qc.invalidateQueries({ queryKey: ['firms-list'] })
    }
  })

  const rejectPayment = useMutation({
    mutationFn: (id: number) => saFetch(`/api/system-admin/payments/${id}/reject`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenue'] })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await createPayment.mutateAsync({ ...form, practiceId: parseInt(form.practiceId), amount: parseFloat(form.amount) })
    setLoading(false)
  }

  if (loadingRevenue) return <div className="p-8 text-slate-500">Loading revenue data...</div>

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><TrendingUp size={16} className="text-emerald-600" /></div>
            <span className="font-semibold text-sm">Estimated MRR</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800">${revenueData?.mrr?.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2">Based on active subscriptions</div>
        </div>
        
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><CreditCard size={16} className="text-blue-600" /></div>
            <span className="font-semibold text-sm">Active Subscriptions</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-800">{revenueData?.activeSubscriptions}</div>
          <div className="text-xs text-slate-400 mt-2">Tenants with active billing</div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-xl shadow-sm flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
          <div className="relative z-10">
            <div className="font-semibold text-sm text-slate-300 mb-2">Total Ledger Entries</div>
            <div className="text-3xl font-extrabold">{revenueData?.payments?.length || 0}</div>
            <button 
              onClick={() => setShowManualInvoice(true)}
              className="mt-4 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors flex items-center gap-2 w-fit"
            >
              <Plus size={14} /> Record Manual Payment
            </button>
          </div>
        </div>
      </div>

      {showManualInvoice && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt size={18} className="text-brand"/> Record Custom Payment / Invoice</h3>
            <button onClick={() => setShowManualInvoice(false)} className="text-slate-400 hover:text-slate-600 text-sm">Cancel</button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Tenant</label>
              <select required value={form.practiceId} onChange={e => setForm({...form, practiceId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand">
                <option value="">-- Select --</option>
                {Array.isArray(firms) ? firms.map((f: any) => <option key={f.id} value={f.id}>{f.name} ({f.subdomain})</option>) : null}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Amount ($)</label>
              <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input required type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" placeholder="e.g. Custom Onboarding" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Global Payment Ledger</h2>
          <button className="text-xs font-medium text-slate-500 flex items-center gap-1.5 hover:text-slate-800 transition-colors">
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Tenant Firm</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Verification & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const payments = revenueData?.payments || [];
                const paginated = Array.isArray(payments) ? payments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
                if (paginated.length === 0) {
                  return <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No payment records found.</td></tr>;
                }
                return (
                  <>
                    {paginated.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{p.firmName}</td>
                        <td className="px-4 py-2.5">{p.description}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{p.currency === 'GBP' ? '£' : '$'}{p.amount}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            p.status === 'completed' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {p.status === 'pending' ? 'Pending Verification' : p.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {p.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => approvePayment.mutate(p.id)}
                                disabled={approvePayment.isPending}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                                title="Approve Payment & Activate Plan"
                              >
                                <CheckCircle2 size={14} /> Approve & Activate
                              </button>
                              <button
                                onClick={() => rejectPayment.mutate(p.id)}
                                disabled={rejectPayment.isPending}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                title="Reject Payment Request"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No action required</span>
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
        {revenueData?.payments && revenueData.payments.length > 0 && (
          <Pagination 
            currentPage={page} 
            totalItems={revenueData.payments.length} 
            itemsPerPage={ITEMS_PER_PAGE} 
            onPageChange={setPage} 
          />
        )}
      </div>
      
    </div>
  )
}
