import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch, getAdminUser } from '../App'
import { ShieldAlert, Plus, Package, Users, HardDrive } from 'lucide-react'

export default function PlansTab() {
  const qc = useQueryClient()
  const currentAdmin = getAdminUser()
  const [showForm, setShowForm] = useState(false)
  
  const defaultForm = { id: null, name: '', monthlyPrice: 0, annualPrice: 0, maxClients: 0, maxUsers: 0, maxStorageGb: 5, isActive: true, isPublic: true }
  const [form, setForm] = useState<any>(defaultForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => saFetch('/api/system-admin/plans').then(r => r.json()),
  })

  const savePlan = useMutation({
    mutationFn: (data: any) => saFetch('/api/system-admin/plans', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      setShowForm(false)
      setForm(defaultForm)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await savePlan.mutateAsync(form)
    } catch (err: any) {
      setError(err.message || 'Failed to save plan')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (plan: any) => {
    setForm(plan)
    setShowForm(true)
  }

  if (isLoading) return <div className="p-8 text-slate-500">Loading plans...</div>

  if (currentAdmin?.role !== 'super_admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-xl max-w-2xl mx-auto mt-10">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Admins can manage pricing plans.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="font-semibold text-slate-800">Subscription Plans Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define limits and pricing for SaaS tenants.</p>
        </div>
        <button 
          onClick={() => { setForm(defaultForm); setShowForm(!showForm) }}
          className="px-4 py-2 bg-brand hover:bg-brand-light text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'New Plan'}
        </button>
      </div>

      {showForm && (
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <form onSubmit={handleSubmit} className="max-w-4xl">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Basic Details</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Plan Name</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" placeholder="e.g., Enterprise" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Monthly Price ($)</label>
                    <input required type="number" step="0.01" value={form.monthlyPrice} onChange={e => setForm({...form, monthlyPrice: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Annual Price ($)</label>
                    <input required type="number" step="0.01" value={form.annualPrice} onChange={e => setForm({...form, annualPrice: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Resource Limits (0 = Unlimited)</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Clients</label>
                  <input required type="number" value={form.maxClients} onChange={e => setForm({...form, maxClients: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Staff Users</label>
                  <input required type="number" value={form.maxUsers} onChange={e => setForm({...form, maxUsers: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Storage (GB)</label>
                  <input required type="number" step="0.1" value={form.maxStorageGb} onChange={e => setForm({...form, maxStorageGb: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">Visibility</h3>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded border-slate-300 text-brand focus:ring-brand" />
                  Plan is Active (can be assigned)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isPublic} onChange={e => setForm({...form, isPublic: e.target.checked})} className="rounded border-slate-300 text-brand focus:ring-brand" />
                  Public (visible on pricing page)
                </label>
                <p className="text-xs text-slate-500 mt-2">Uncheck "Public" to create hidden grandfathered plans or custom enterprise deals.</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50">
                {loading ? 'Saving...' : form.id ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {Array.isArray(plans) && plans.length > 0 ? plans.map((plan: any) => (
          <div key={plan.id} className={`border rounded-xl p-5 relative bg-white shadow-sm transition-all hover:shadow-md ${!plan.isActive ? 'opacity-60 grayscale' : 'border-slate-200'}`}>
            {!plan.isPublic && plan.isActive && (
              <span className="absolute top-4 right-4 text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Hidden</span>
            )}
            {!plan.isActive && (
              <span className="absolute top-4 right-4 text-[10px] uppercase font-bold bg-red-100 text-red-600 px-2 py-1 rounded">Archived</span>
            )}
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-extrabold text-slate-900">${plan.monthlyPrice}</span>
              <span className="text-sm text-slate-500 font-medium">/mo</span>
            </div>
            
            <ul className="space-y-3 mb-6 text-sm text-slate-600">
              <li className="flex items-center gap-2"><Package size={16} className="text-indigo-500" /> {plan.maxClients === 0 ? 'Unlimited' : plan.maxClients} Clients</li>
              <li className="flex items-center gap-2"><Users size={16} className="text-emerald-500" /> {plan.maxUsers === 0 ? 'Unlimited' : plan.maxUsers} Users</li>
              <li className="flex items-center gap-2"><HardDrive size={16} className="text-amber-500" /> {plan.maxStorageGb} GB Storage</li>
            </ul>

            <button 
              onClick={() => handleEdit(plan)}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
            >
              Edit Plan
            </button>
          </div>
        )) : (
          <div className="col-span-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-500">
            No plans found or unable to load data.
          </div>
        )}
      </div>
    </div>
  )
}
