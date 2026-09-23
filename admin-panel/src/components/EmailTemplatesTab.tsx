import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch, getAdminUser } from '../App'
import { Mail, Edit, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function EmailTemplatesTab() {
  const qc = useQueryClient()
  const currentAdmin = getAdminUser()
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => saFetch('/api/system-admin/email-templates').then(r => r.json()),
  })

  const updateTemplate = useMutation({
    mutationFn: (data: any) => saFetch(`/api/system-admin/email-templates/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] })
      setEditingTemplate(null)
      setSuccessMsg('Template saved successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate) return
    await updateTemplate.mutateAsync(editingTemplate)
  }

  if (isLoading) return <div className="p-8 text-slate-500">Loading templates...</div>

  if (currentAdmin?.role !== 'super_admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-xl max-w-2xl mx-auto mt-10">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Admins can manage automated email templates.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6">
      
      {/* Left List */}
      <div className={`flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${editingTemplate ? 'hidden lg:flex lg:max-w-md' : ''}`}>
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Mail size={18} className="text-brand"/> Automated Emails</h2>
            <p className="text-xs text-slate-500 mt-1">Configure system communication.</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(() => {
            const paginated = Array.isArray(templates) ? templates.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
            if (!Array.isArray(templates)) {
              return (
                <div className="p-4 text-center text-sm text-red-500 border border-red-100 bg-red-50 rounded-xl">
                  Error: Could not load templates.
                </div>
              );
            }
            if (paginated.length === 0) {
              return <div className="p-4 text-center text-sm text-slate-500">No templates found.</div>;
            }
            return paginated.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => setEditingTemplate({...t})}
                className={`p-4 rounded-xl border cursor-pointer transition-colors hover:shadow-sm ${editingTemplate?.id === t.id ? 'border-brand bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-slate-800">{t.triggerName}</span>
                  <span className={`w-2 h-2 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="text-xs text-slate-500 line-clamp-1 mb-2">Subj: {t.subject}</div>
                <div className="text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded inline-block">Variables: {t.variables}</div>
              </div>
            ))
          })()}
        </div>
        {Array.isArray(templates) && templates.length > 0 && (
          <Pagination 
            currentPage={page} 
            totalItems={templates.length} 
            itemsPerPage={ITEMS_PER_PAGE} 
            onPageChange={setPage} 
          />
        )}
      </div>

      {/* Right Editor */}
      <div className="flex-[2] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        {editingTemplate ? (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <button type="button" onClick={() => setEditingTemplate(null)} className="text-xs text-brand hover:underline mb-1 lg:hidden">← Back to templates</button>
                <h2 className="font-bold text-slate-800">Edit {editingTemplate.triggerName}</h2>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                <input type="checkbox" checked={editingTemplate.isActive} onChange={e => setEditingTemplate({...editingTemplate, isActive: e.target.checked})} className="rounded text-brand focus:ring-brand" />
                Template Active
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-blue-900 mb-1">Available Variables for this template</div>
                  <div className="text-xs text-blue-800 font-mono bg-white p-2 rounded border border-blue-100">{editingTemplate.variables}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Subject</label>
                <input 
                  required 
                  type="text" 
                  value={editingTemplate.subject} 
                  onChange={e => setEditingTemplate({...editingTemplate, subject: e.target.value})} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-brand focus:ring-1 focus:ring-brand" 
                />
              </div>

              <div className="flex-1 flex flex-col min-h-[300px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">HTML Body</label>
                <textarea 
                  required 
                  value={editingTemplate.bodyHtml} 
                  onChange={e => setEditingTemplate({...editingTemplate, bodyHtml: e.target.value})} 
                  className="w-full flex-1 border border-slate-300 rounded-lg p-4 font-mono text-sm focus:border-brand focus:ring-1 focus:ring-brand" 
                />
              </div>

            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                {successMsg && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5"><CheckCircle2 size={16}/> {successMsg}</span>}
              </div>
              <button 
                type="submit" 
                disabled={updateTemplate.isPending}
                className="px-6 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-light disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Edit size={16} /> {updateTemplate.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <Mail size={48} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">Select a template to edit</p>
            <p className="text-sm mt-1">Configure automated emails sent to tenants.</p>
          </div>
        )}
      </div>
      
    </div>
  )
}
