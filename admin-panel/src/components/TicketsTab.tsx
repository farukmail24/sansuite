import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { saFetch, getAdminUser } from '../App'
import { Ticket, Search, Filter, MessageSquare, AlertCircle, CheckCircle2, Clock, X, Forward } from 'lucide-react'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function TicketsTab() {
  const qc = useQueryClient()
  const currentAdmin = getAdminUser()
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [page, setPage] = useState(1)
  
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardForm, setForwardForm] = useState({
    type: 'department', // 'department' or 'agent'
    assignedDepartment: 'technical',
    assignedTo: '',
    internalNote: ''
  })

  const ITEMS_PER_PAGE = usePaginationLimit()

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => saFetch('/api/system-admin/tickets').then(r => r.json()),
  })

  const { data: ticketDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['ticket', selectedTicketId],
    queryFn: () => saFetch(`/api/system-admin/tickets/${selectedTicketId}`).then(r => r.json()),
    enabled: !!selectedTicketId
  })

  const { data: admins = [] } = useQuery({
    queryKey: ['system-admins'],
    queryFn: () => saFetch('/api/system-admin/admins').then(r => r.json()),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status, assignedTo }: any) => 
      saFetch(`/api/system-admin/tickets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, assignedTo }) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', selectedTicketId] })
    }
  })

  const forwardTicket = useMutation({
    mutationFn: (data: any) => 
      saFetch(`/api/system-admin/tickets/${selectedTicketId}/forward`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', selectedTicketId] })
      setShowForwardModal(false)
      setForwardForm({ type: 'department', assignedDepartment: 'technical', assignedTo: '', internalNote: '' })
    }
  })

  const sendReply = useMutation({
    mutationFn: ({ id, message, isInternal }: any) => 
      saFetch(`/api/system-admin/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ message, isInternal }) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', selectedTicketId] })
      setReply('')
      setIsInternal(false)
    }
  })

  if (loadingTickets) return <div className="p-8 text-slate-500">Loading helpdesk...</div>

  return (
    <div className="flex h-full gap-6">
      
      {/* Left List */}
      <div className={`flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col ${selectedTicketId ? 'hidden lg:flex lg:max-w-md' : ''}`}>
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Ticket size={18} className="text-brand"/> Support Queue</h2>
          </div>
          <div className="flex gap-2 text-slate-400">
            <button className="hover:text-slate-600"><Search size={18}/></button>
            <button className="hover:text-slate-600"><Filter size={18}/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const paginated = Array.isArray(tickets) ? tickets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
            if (paginated.length === 0) {
               return <div className="p-8 text-center text-slate-400 text-sm">No tickets in the queue.</div>;
            }
            return paginated.map((t: any) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTicketId(t.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedTicketId === t.id ? 'bg-indigo-50/50 border-l-4 border-l-brand' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-slate-500">#{t.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                    t.status === 'open' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{t.status.replace('_', ' ')}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 mb-1">{t.subject}</h4>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate pr-2">{t.firmName}</span>
                  <span className="shrink-0">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          })()}
        </div>
        {Array.isArray(tickets) && tickets.length > 0 && (
          <Pagination 
            currentPage={page} 
            totalItems={tickets.length} 
            itemsPerPage={ITEMS_PER_PAGE} 
            onPageChange={setPage} 
          />
        )}
      </div>

      {/* Right Detail Pane */}
      {selectedTicketId && (
        <div className="flex-[2] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          {loadingDetails ? (
            <div className="p-8 text-slate-400">Loading ticket details...</div>
          ) : ticketDetails?.ticket ? (
            <>
              {/* Ticket Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-slate-400">#{ticketDetails.ticket.id}</span>
                    <h2 className="text-lg font-bold text-slate-800">{ticketDetails.ticket.subject}</h2>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><Building2 size={14}/> {ticketDetails.ticket.firmName}</span>
                    <span className="flex items-center gap-1.5"><User size={14}/> {ticketDetails.ticket.userName}</span>
                    <span className="capitalize px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">{ticketDetails.ticket.category}</span>
                    {ticketDetails.ticket.priority === 'urgent' && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle size={14}/> Urgent</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <select 
                    value={ticketDetails.ticket.status} 
                    onChange={e => updateStatus.mutate({ id: ticketDetails.ticket.id, status: e.target.value, assignedTo: ticketDetails.ticket.assignedTo })}
                    className="text-sm border-slate-300 rounded-lg py-1.5 pl-3 pr-8 focus:ring-brand focus:border-brand bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  
                  <button 
                    onClick={() => setShowForwardModal(true)}
                    className="flex items-center gap-1.5 justify-center text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg py-1.5 px-3 transition-colors font-medium"
                  >
                    <Forward size={14} /> 
                    {ticketDetails.ticket.assignedTo 
                      ? 'Reassign' 
                      : ticketDetails.ticket.assignedDepartment 
                        ? `Assigned: ${ticketDetails.ticket.assignedDepartment}`
                        : 'Forward'
                    }
                  </button>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {Array.isArray(ticketDetails.messages) && ticketDetails.messages.map((m: any) => (
                  <div key={m.id} className={`flex gap-4 max-w-[85%] ${m.senderType === 'system_admin' ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                      m.senderType === 'system_admin' ? 'bg-brand' : 'bg-slate-400'
                    }`}>
                      {m.senderType === 'system_admin' ? m.adminName?.[0] : m.tenantName?.[0]}
                    </div>
                    <div className={`flex flex-col ${m.senderType === 'system_admin' ? 'items-end' : 'items-start'}`}>
                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                        <span className="font-medium text-slate-700">{m.senderType === 'system_admin' ? m.adminName : m.tenantName}</span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                        {m.isInternal && <span className="bg-amber-100 text-amber-700 px-1.5 rounded text-[10px] font-bold uppercase">Internal Note</span>}
                      </div>
                      <div className={`p-4 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                        m.isInternal ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tr-sm' :
                        m.senderType === 'system_admin' ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-tr-sm' : 
                        'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                <div className="flex flex-col gap-3">
                  <textarea 
                    rows={3}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    className={`w-full border rounded-xl p-3 text-sm focus:ring-1 focus:outline-none transition-colors ${
                      isInternal ? 'bg-amber-50 border-amber-300 focus:border-amber-500 focus:ring-amber-500' : 'border-slate-300 focus:border-brand focus:ring-brand'
                    }`}
                  />
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                      Add as Internal Note (Tenant won't see this)
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedTicketId(null)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden">Back</button>
                      <button 
                        onClick={() => sendReply.mutate({ id: ticketDetails.ticket.id, message: reply, isInternal })}
                        disabled={!reply.trim() || sendReply.isPending}
                        className={`px-5 py-2 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
                          isInternal ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand hover:bg-brand-light'
                        }`}
                      >
                        <MessageSquare size={16} />
                        {isInternal ? 'Save Note' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-red-500">Ticket not found</div>
          )}
        </div>
      )}

      {/* Forward Ticket Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Forward size={18} className="text-brand" /> Forward Ticket
              </h3>
              <button onClick={() => setShowForwardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                <button 
                  onClick={() => setForwardForm(f => ({ ...f, type: 'department' }))}
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${forwardForm.type === 'department' ? 'bg-white shadow-sm text-brand' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  To Department
                </button>
                <button 
                  onClick={() => setForwardForm(f => ({ ...f, type: 'agent' }))}
                  className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${forwardForm.type === 'agent' ? 'bg-white shadow-sm text-brand' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  To Specific Agent
                </button>
              </div>

              {forwardForm.type === 'department' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Department</label>
                  <select 
                    value={forwardForm.assignedDepartment}
                    onChange={e => setForwardForm(f => ({ ...f, assignedDepartment: e.target.value }))}
                    className="w-full border-slate-300 rounded-lg text-sm focus:ring-brand focus:border-brand"
                  >
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing & Finance</option>
                    <option value="sales">Sales</option>
                    <option value="onboarding">Onboarding</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Agent</label>
                  <select 
                    value={forwardForm.assignedTo}
                    onChange={e => setForwardForm(f => ({ ...f, assignedTo: e.target.value }))}
                    className="w-full border-slate-300 rounded-lg text-sm focus:ring-brand focus:border-brand"
                  >
                    <option value="" disabled>Select an agent...</option>
                    {Array.isArray(admins) && admins.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.fullName} ({a.role.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Internal Handoff Note (Optional)</label>
                <textarea 
                  value={forwardForm.internalNote}
                  onChange={e => setForwardForm(f => ({ ...f, internalNote: e.target.value }))}
                  placeholder="Explain why you are forwarding this ticket..."
                  rows={3}
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-brand focus:border-brand bg-amber-50/30"
                />
                <p className="text-[10px] text-slate-400 mt-1">This note will be visible only to System Admins.</p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setShowForwardModal(false)}
                className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => forwardTicket.mutate({
                  assignedDepartment: forwardForm.type === 'department' ? forwardForm.assignedDepartment : null,
                  assignedTo: forwardForm.type === 'agent' ? parseInt(forwardForm.assignedTo) : null,
                  internalNote: forwardForm.internalNote
                })}
                disabled={forwardTicket.isPending || (forwardForm.type === 'agent' && !forwardForm.assignedTo)}
                className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg shadow-sm hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {forwardTicket.isPending ? 'Forwarding...' : 'Confirm Forward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function User({size}: {size: number}) { return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> }
function Building2({size}: {size: number}) { return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4"></path><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M10 18h4"></path></svg> }
