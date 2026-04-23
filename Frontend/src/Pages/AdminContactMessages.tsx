import React, { useEffect, useState } from 'react'
import { AlertCircle, Bell, CheckCircle, Trash2, X, Clock, User, DollarSign, RotateCw } from 'lucide-react'
import Layout from '../layout/Layout'
import { adminAuditAPI } from '../services/api'

type ContactMessage = {
  _id: string
  type: string
  title: string
  message: string
  read: boolean
  dismissed: boolean
  clientName: string
  clientEmail: string
  createdAt: string
  metadata?: {
    subscriptionExpiresAt?: string
    daysLeft?: number
    staffCount?: number
    paymentAmount?: number
  }
  actionUrl?: string
}

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  const loadMessages = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [messagesData, unreadData] = await Promise.all([
        adminAuditAPI.getContactMessages({
          page,
          limit,
          type: typeFilter || undefined,
        }),
        adminAuditAPI.getUnreadMessageCount(),
      ])
      setMessages(messagesData.messages || [])
      setTotal(messagesData.pagination?.total || 0)
      setUnreadCount(unreadData.unreadCount || 0)
    } catch (err: any) {
      setError(err?.message || 'Failed to load contact messages.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [page, limit, typeFilter])

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await adminAuditAPI.markMessageAsRead(messageId)
      await loadMessages()
    } catch (err: any) {
      setError(err?.message || 'Failed to mark message as read.')
    }
  }

  const handleDismiss = async (messageId: string) => {
    try {
      await adminAuditAPI.dismissMessage(messageId)
      await loadMessages()
    } catch (err: any) {
      setError(err?.message || 'Failed to dismiss message.')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await adminAuditAPI.markAllMessagesAsRead()
      await loadMessages()
    } catch (err: any) {
      setError(err?.message || 'Failed to mark all messages as read.')
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      subscription_expiring_soon: 'Subscription Expiring',
      subscription_expired: 'Subscription Expired',
      new_signup: 'New Sign-up',
      client_frozen: 'Client Frozen',
      client_deleted: 'Client Deleted',
      payment_received: 'Payment Received',
      payment_failed: 'Payment Failed',
      system_alert: 'System Alert',
      account_reactivated: 'Account Reactivated',
      security_alert: 'Security Alert',
    }
    return labels[type] || type
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription_expiring_soon':
      case 'subscription_expired':
        return <Clock size={16} className="text-orange-600" />
      case 'new_signup':
        return <User size={16} className="text-green-600" />
      case 'payment_received':
        return <DollarSign size={16} className="text-green-600" />
      default:
        return <Bell size={16} className="text-blue-600" />
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Messages</h1>
            <p className="text-sm text-gray-600 mt-1">
              System notifications about SaaS clients, subscriptions, and account events.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <div className="bg-red-100 text-red-700 rounded-full px-4 py-2 font-semibold text-sm">
                {unreadCount} Unread
              </div>
            )}
            <button
              onClick={loadMessages}
              disabled={isLoading}
              title="Refresh messages"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 transition-all"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="subscription_expiring_soon">Subscription Expiring</option>
              <option value="subscription_expired">Subscription Expired</option>
              <option value="new_signup">New Sign-up</option>
              <option value="client_frozen">Client Frozen</option>
              <option value="payment_received">Payment Received</option>
            </select>
          </div>
          <div>
            <label htmlFor="messages-per-page" className="block text-sm font-medium text-gray-700 mb-1">
              Messages per Page
            </label>
            <select
              id="messages-per-page"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
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

        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-8 text-gray-500">Loading messages...</div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              No messages found.
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message._id}
              className={`rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                message.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(message.type)}
                    <span className="text-xs text-gray-600">{getTypeLabel(message.type)}</span>
                    {!message.read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <h3 className={`font-semibold mb-1 ${message.read ? 'text-gray-700' : 'text-gray-900'}`}>{message.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{message.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📧 {message.clientEmail}</span>
                    <span>🕐 {new Date(message.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!message.read ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(message._id)
                      }}
                      className="text-xs px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold whitespace-nowrap"
                    >
                      Mark Read
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(message._id)
                      }}
                      className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {messages.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                First
              </button>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedMessage.type)}
                <h2 className="text-lg font-semibold text-gray-900">{selectedMessage.title}</h2>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-500 hover:text-gray-700"
                title="Close message details"
                aria-label="Close message details"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Message Content */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{selectedMessage.message}</p>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client Name</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selectedMessage.clientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Client Email</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{selectedMessage.clientEmail}</p>
                </div>
              </div>

              {/* Metadata */}
              {selectedMessage.metadata && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Details</p>
                  <div className="space-y-2 text-sm">
                    {selectedMessage.metadata.daysLeft !== undefined && (
                      <p>
                        <span className="font-semibold">Days Left:</span> {selectedMessage.metadata.daysLeft}
                      </p>
                    )}
                    {selectedMessage.metadata.staffCount !== undefined && (
                      <p>
                        <span className="font-semibold">Staff Members:</span> {selectedMessage.metadata.staffCount}
                      </p>
                    )}
                    {selectedMessage.metadata.paymentAmount && (
                      <p>
                        <span className="font-semibold">Payment Amount:</span> Rs. {selectedMessage.metadata.paymentAmount.toLocaleString()}
                      </p>
                    )}
                    {selectedMessage.metadata.subscriptionExpiresAt && (
                      <p>
                        <span className="font-semibold">Expires:</span> {new Date(selectedMessage.metadata.subscriptionExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="text-xs text-gray-500">
                Received: {new Date(selectedMessage.createdAt).toLocaleString()}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {!selectedMessage.read ? (
                  <button
                    onClick={() => {
                      handleMarkAsRead(selectedMessage._id)
                      setSelectedMessage(null)
                    }}
                    className="flex-1 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    <CheckCircle size={14} className="inline mr-1" />
                    Mark as Read
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleDismiss(selectedMessage._id)
                      setSelectedMessage(null)
                    }}
                    className="flex-1 rounded-lg bg-gray-200 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-300"
                  >
                    <Trash2 size={14} className="inline mr-1" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AdminContactMessages
