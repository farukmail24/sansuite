import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, X, Send, MessageSquare, Ticket } from 'lucide-react'

export default function SupportTicketWidget() {
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'list' | 'create' | 'chat'>('list')
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

  // Fetch tenant tickets
  const { data: rawTickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: () => fetch('/api/support/tickets', {
      headers: { 'x-tenant-id': localStorage.getItem('tenant_token') || 'default', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
    enabled: isOpen
  })

  const tickets = Array.isArray(rawTickets) ? rawTickets : [];

  // Fetch specific ticket messages
  const { data: ticketDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['tenant-ticket', selectedTicketId],
    queryFn: () => fetch(`/api/support/tickets/${selectedTicketId}`, {
      headers: { 'x-tenant-id': localStorage.getItem('tenant_token') || 'default', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()),
    enabled: !!selectedTicketId
  })

  const [form, setForm] = useState({ subject: '', category: 'technical', priority: 'normal', message: '' })
  const [reply, setReply] = useState('')

  const createTicket = useMutation({
    mutationFn: (data: any) => fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': localStorage.getItem('tenant_token') || 'default', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tenant-tickets'] })
      setSelectedTicketId(res.ticketId)
      setView('chat')
      setForm({ subject: '', category: 'technical', priority: 'normal', message: '' })
    }
  })

  const sendReply = useMutation({
    mutationFn: (message: string) => fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': localStorage.getItem('tenant_token') || 'default', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ message })
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-ticket', selectedTicketId] })
      setReply('')
    }
  })

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 hover:scale-110 transition-all z-50"
      >
        <HelpCircle size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 z-50 overflow-hidden flex flex-col" style={{ height: '550px', maxHeight: 'calc(100vh - 120px)' }}>
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shrink-0">
            <h3 className="font-bold flex items-center gap-2">
              <Ticket size={18} />
              {view === 'list' ? 'Support Tickets' : view === 'create' ? 'New Ticket' : 'Ticket Conversation'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* List View */}
          {view === 'list' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loadingTickets ? (
                  <p className="text-center text-sm text-gray-400 mt-10">Loading tickets...</p>
                ) : tickets.length === 0 ? (
                  <div className="text-center mt-10">
                    <p className="text-sm text-gray-500 mb-4">No support tickets found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t: any) => (
                      <div 
                        key={t.id} 
                        onClick={() => { setSelectedTicketId(t.id); setView('chat'); }}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-semibold text-gray-500">#{t.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                            t.status === 'open' ? 'bg-blue-100 text-blue-700' :
                            t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>{t.status ? t.status.replace('_', ' ') : 'OPEN'}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">{t.subject}</h4>
                        <div className="text-xs text-gray-400 mt-2">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-white border-t border-gray-100 text-center">
                <button 
                  onClick={() => setView('create')} 
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition-colors"
                >
                  Create New Support Ticket
                </button>
              </div>
            </>
          )}

          {/* Create View */}
          {view === 'create' && (
            <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(form); }} className="flex-1 flex flex-col p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
                <input 
                  required 
                  type="text" 
                  value={form.subject} 
                  onChange={e => setForm({ ...form, subject: e.target.value })} 
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" 
                  placeholder="Brief description of the issue"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                  <select 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })} 
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
                  <select 
                    value={form.priority} 
                    onChange={e => setForm({ ...form, priority: e.target.value })} 
                    className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
                <textarea 
                  required 
                  value={form.message} 
                  onChange={e => setForm({ ...form, message: e.target.value })} 
                  className="w-full flex-1 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 min-h-[100px]" 
                  placeholder="Describe your issue in detail..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setView('list')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl">Cancel</button>
                <button type="submit" disabled={createTicket.isPending} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl disabled:opacity-50">
                  {createTicket.isPending ? 'Sending...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          )}

          {/* Chat View */}
          {view === 'chat' && (
            <div className="flex-1 flex flex-col h-full bg-gray-50">
              <div className="p-3 bg-white border-b border-gray-200 flex justify-between items-center text-xs">
                <button onClick={() => setView('list')} className="text-indigo-600 font-semibold hover:underline">← Back to List</button>
                <span className="font-semibold text-gray-500">Ticket #{selectedTicketId}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingDetails ? (
                  <p className="text-center text-xs text-gray-400 mt-10">Loading conversation...</p>
                ) : ticketDetails?.messages?.map((m: any) => (
                  <div key={m.id} className={`flex flex-col ${m.senderType === 'tenant' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs ${
                      m.senderType === 'tenant' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 px-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendReply.mutate(reply); }} className="p-2 bg-white border-t border-gray-200 flex gap-2">
                <input 
                  type="text" 
                  value={reply} 
                  onChange={e => setReply(e.target.value)} 
                  placeholder="Type a message..." 
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                />
                <button type="submit" disabled={sendReply.isPending || !reply.trim()} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  )
}
