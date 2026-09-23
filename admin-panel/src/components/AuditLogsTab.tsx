import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { saFetch } from '../App'
import Pagination from './Pagination'
import { usePaginationLimit } from '../hooks/useSettings'

export default function AuditLogsTab() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => saFetch('/api/system-admin/audit-logs').then(r => {
      if (!r.ok) throw new Error('Failed to fetch audit logs')
      return r.json()
    }),
  })
  
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = usePaginationLimit()

  if (isLoading) return <div className="p-8 text-slate-500">Loading audit logs...</div>

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="font-semibold text-slate-800 text-sm">System Audit Logs</h2>
        <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">Global activity tracking across the system admin panel.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(() => {
              const paginated = Array.isArray(logs) ? logs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE) : [];
              if (paginated.length === 0) {
                return <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No logs found.</td></tr>;
              }
              return (
                <>
                  {paginated.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{log.adminName}</div>
                        <div className="text-[10px] text-slate-500">{log.adminEmail}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[10px] font-bold text-brand uppercase tracking-wider">{log.targetType}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">ID: {log.targetId || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-[10px] font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )
            })()}
          </tbody>
        </table>
      </div>
      {Array.isArray(logs) && logs.length > 0 && (
        <Pagination 
          currentPage={page} 
          totalItems={logs.length} 
          itemsPerPage={ITEMS_PER_PAGE} 
          onPageChange={setPage} 
        />
      )}
    </div>
  )
}
