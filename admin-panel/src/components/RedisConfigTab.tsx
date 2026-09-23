import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch } from '../App'
import { Server, Shield, CheckCircle2, AlertCircle, Database } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RedisConfigTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'local', provider: 'local', url: '' })
  const [isDirty, setIsDirty] = useState(false)
  
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-redis-config'],
    queryFn: () => saFetch('/api/system-admin/settings/redis').then(r => r.json()),
  })

  useEffect(() => {
    if (config) {
      setForm(config)
      setIsDirty(false)
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await saFetch('/api/system-admin/settings/redis', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save configuration')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-redis-config'] })
      setIsDirty(false)
      toast.success("Redis configuration updated successfully.")
    },
    onError: (err: any) => {
      toast.error("Error: " + err.message)
    }
  })

  if (isLoading) return <div className="p-8 text-sm text-slate-500">Loading Redis configuration...</div>

  return (
    <div className="p-8 max-w-4xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Redis Distributed Cache</h2>
        <p className="text-slate-500 text-sm">Configure the in-memory data store for sessions, rate limiting, and queues.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`cursor-pointer relative p-6 border-2 rounded-2xl transition-all ${form.type === 'local' ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="redis-type" 
              value="local"
              checked={form.type === 'local'}
              onChange={() => { setForm({ ...form, type: 'local', provider: 'local', url: '' }); setIsDirty(true) }}
              className="absolute opacity-0 w-0 h-0"
            />
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${form.type === 'local' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Server size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Local In-Memory Shim</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Runs directly inside the Node process. Suitable for single-server setups and development. Data is lost on restart.
                </p>
              </div>
              {form.type === 'local' && <CheckCircle2 className="text-brand absolute top-6 right-6" size={20} />}
            </div>
          </label>

          <label className={`cursor-pointer relative p-6 border-2 rounded-2xl transition-all ${form.type === 'external' ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
            <input 
              type="radio" 
              name="redis-type" 
              value="external"
              checked={form.type === 'external'}
              onChange={() => { setForm({ ...form, type: 'external', provider: 'upstash' }); setIsDirty(true) }}
              className="absolute opacity-0 w-0 h-0"
            />
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${form.type === 'external' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">External Server / Distributed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Connects to a dedicated Redis cluster (e.g., Upstash, AWS, Aiven). Required for multi-node deployments.
                </p>
              </div>
              {form.type === 'external' && <CheckCircle2 className="text-brand absolute top-6 right-6" size={20} />}
            </div>
          </label>
        </div>

        {form.type === 'external' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-2">
              <Shield size={16} className="text-slate-400" /> Connection Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Provider</label>
                <select 
                  value={form.provider}
                  onChange={e => { setForm({ ...form, provider: e.target.value }); setIsDirty(true) }}
                  className="w-full md:w-1/2 p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand"
                >
                  <option value="upstash">Upstash (Serverless Redis)</option>
                  <option value="aws">AWS ElastiCache</option>
                  <option value="aiven">Aiven</option>
                  <option value="custom">Custom / Self-hosted</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Redis URL (rediss://...)</label>
                <input 
                  type="password"
                  placeholder="rediss://default:password@host:port"
                  value={form.url}
                  onChange={e => { setForm({ ...form, url: e.target.value }); setIsDirty(true) }}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand focus:border-brand font-mono"
                />
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> The connection will be tested on save before being applied.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={!isDirty || saveMutation.isPending || (form.type === 'external' && !form.url)}
            className="px-6 py-2.5 bg-brand text-white font-medium text-sm rounded-lg hover:bg-brand-light transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending ? 'Testing Connection & Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}
