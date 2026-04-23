import React, { useEffect, useMemo, useState } from 'react'
import { Activity, AlertCircle, CheckCircle, Trash2, Eye, Zap, RotateCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Layout from '../layout/Layout'
import { adminAuditAPI } from '../services/api'

type AuditLog = {
  _id: string
  adminEmail: string
  action: string
  targetClientEmail: string
  targetClientName: string
  status: 'success' | 'failed'
  createdAt: string
  details?: {
    changes?: Array<{ field: string; oldValue: any; newValue: any }>
  }
  errorMessage?: string
}

const AdminAuditLog = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageSize, setPageSize] = useState(20)

  const loadAuditLogs = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await adminAuditAPI.getAuditLogs({
        page,
        limit: pageSize,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
      })
      setLogs(response.logs || [])
      setTotal(response.pagination?.total || 0)
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [page, pageSize, actionFilter, statusFilter])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'freeze_client':
        return <Zap size={16} className="text-yellow-500" />
      case 'unfreeze_client':
        return <CheckCircle size={16} className="text-green-600" />
      case 'delete_client':
        return <Trash2 size={16} className="text-red-600" />
      case 'edit_client':
        return <Activity size={16} className="text-blue-600" />
      case 'view_client':
        return <Eye size={16} className="text-gray-600" />
      default:
        return <Activity size={16} className="text-gray-600" />
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      freeze_client: 'Freeze Client',
      unfreeze_client: 'Unfreeze Client',
      delete_client: 'Delete Client',
      edit_client: 'Edit Client',
      update_client_username: 'Update Username',
      toggle_client_active: 'Toggle Active',
      view_client: 'View Client',
      login_view: 'Login View',
    }
    return labels[action] || action
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageWindow = useMemo(() => {
    const windowSize = 5
    const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1))
    const end = Math.min(totalPages, start + windowSize - 1)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [page, totalPages])

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Audit Log</h1>
            <p className="text-sm text-gray-600 mt-1">Track all admin actions and changes to SaaS client accounts.</p>
          </div>
          <button
            onClick={loadAuditLogs}
            disabled={isLoading}
            title="Refresh audit logs"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="freeze_client">Freeze Client</option>
              <option value="unfreeze_client">Unfreeze Client</option>
              <option value="delete_client">Delete Client</option>
              <option value="edit_client">Edit Client</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="page-size" className="block text-sm font-medium text-gray-700 mb-1">
              Rows per Page
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Target Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!isLoading && logs.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500 text-center" colSpan={6}>
                      No audit logs found.
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.adminEmail}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span>{getActionLabel(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">{log.targetClientName}</p>
                        <p className="text-xs text-gray-500">{log.targetClientEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {log.status === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLog(log)
                        }}
                        className="text-teal-600 hover:text-teal-700 text-xs font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronsLeft size={14} />
                  First
                </button>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {pageWindow.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                        page === pageNum
                          ? 'bg-teal-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                >
                  Last
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Action Date/Time</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Email</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selectedLog.adminEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        selectedLog.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {selectedLog.status === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      {selectedLog.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Admin Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Admin</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{selectedLog.adminEmail}</p>
              </div>

              {/* Action */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Action</p>
                <div className="mt-1 flex items-center gap-2">
                  {getActionIcon(selectedLog.action)}
                  <span className="text-sm font-medium text-gray-900">{getActionLabel(selectedLog.action)}</span>
                </div>
              </div>

              {/* Target Client */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target Client</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-gray-900">{selectedLog.targetClientName}</p>
                  <p className="text-xs text-gray-600">{selectedLog.targetClientEmail}</p>
                </div>
              </div>

              {/* Changes */}
              {selectedLog.details?.changes && selectedLog.details.changes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Changes</p>
                  <div className="space-y-2">
                    {selectedLog.details.changes.map((change, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-700">{change.field}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-gray-600">
                            <strong>Old:</strong> {JSON.stringify(change.oldValue)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-600">
                            <strong>New:</strong> {JSON.stringify(change.newValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700">Error Message</p>
                  <p className="mt-1 text-xs text-red-600">{selectedLog.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminAuditLog
