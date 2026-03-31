// ==================== IMPORTS ====================
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../services/api'
import { toast } from 'sonner'
import {
  FiCheck, FiCheckCircle, FiTrash2, FiShoppingBag, FiAlertCircle,
  FiPackage, FiX, FiRefreshCw, FiCreditCard, FiZap, FiExternalLink,
} from 'react-icons/fi'
import QuickReorderModal from '../reorder/QuickReorderModal'

// ==================== TYPES ====================

interface Notification {
  _id: string
  type: 'purchase' | 'sale' | 'low_stock' | 'out_of_stock' | 'system' | 'payment_received' |
        'payment_made' | 'reorder_needed' | 'reorder_created' | 'reorder_approved' |
        'auto_reorder' | 'low_stock_purchase' | 'login_failed' | 'login_success' |
        'security_change' | 'expiring_soon' | 'expired' | 'installment_due'
  title: string
  message: string
  read: boolean
  createdAt: string
  metadata?: any
  relatedId?: string
  relatedModel?: string
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

// ==================== HELPERS ====================

/** Map a notification type to its icon */
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'purchase':        return <FiShoppingBag className="h-5 w-5 text-blue-500" />
    case 'sale':            return <FiCreditCard className="h-5 w-5 text-green-500" />
    case 'payment_received':return <FiCreditCard className="h-5 w-5 text-emerald-500" />
    case 'payment_made':    return <FiCreditCard className="h-5 w-5 text-purple-500" />
    case 'installment_due': return <FiCreditCard className="h-5 w-5 text-orange-500" />
    case 'low_stock':       return <FiAlertCircle className="h-5 w-5 text-yellow-500" />
    case 'out_of_stock':    return <FiPackage className="h-5 w-5 text-red-500" />
    case 'expiring_soon':   return <FiAlertCircle className="h-5 w-5 text-orange-500" />
    case 'expired':         return <FiAlertCircle className="h-5 w-5 text-red-600" />
    case 'reorder_needed':
    case 'reorder_created':
    case 'reorder_approved':
    case 'auto_reorder':
    case 'low_stock_purchase': return <FiZap className="h-5 w-5 text-orange-500" />
    case 'login_failed':    return <FiAlertCircle className="h-5 w-5 text-red-600" />
    case 'login_success':   return <FiCheckCircle className="h-5 w-5 text-green-600" />
    case 'security_change': return <FiAlertCircle className="h-5 w-5 text-blue-600" />
    default:                return <FiAlertCircle className="h-5 w-5 text-gray-500" />
  }
}

/** Human-readable relative time */
const formatTime = (dateString: string) => {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateString).toLocaleDateString()
}

/** Build a minimal mock item for the QuickReorderModal from notification metadata */
const buildMockReorderItem = (metadata: any) => ({
  _id: metadata.inventoryId,
  name: metadata.itemName || 'Unknown Item',
  sku: metadata.sku || 'N/A',
  category: 'Unknown',
  price: 0, cost: 0,
  stock: metadata.stock || 0,
  reorderLevel: metadata.reorderLevel || 5,
  reorderQuantity: 10,
  maximumStock: 100,
  preferredSupplierId: null,
  supplierProductCode: '',
  lastPurchasePrice: 0,
  reorderStatus: 'needed',
  pendingOrderId: null,
  lastReorderDate: null,
  averageDailySales: 0,
  leadTimeDays: 7,
  safetyStock: 5,
  autoReorderEnabled: false,
  supplier: 'Unknown',
  location: 'Warehouse',
  analytics: {
    suggestedQuantity: 10,
    averageDailySales: 1,
    currentStock: metadata.stock || 0,
    reorderLevel: metadata.reorderLevel || 5,
    daysUntilStockout: 999,
    calculations: { totalSold90Days: 0, annualDemand: 0, safetyStock: 5, leadTimeDays: 7, reviewPeriod: 7 },
  },
  priority: 50,
  urgencyLevel: (metadata.stock || 0) <= 0 ? 'critical' : 'high',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// ==================== COMPONENT ====================

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onUnreadCountChange }) => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showQuickReorder, setShowQuickReorder] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // ==================== DATA LOADING ====================

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [response, count] = await Promise.all([
        notificationsAPI.getAll({ limit: 7 }),
        notificationsAPI.getUnreadCount(),
      ])
      setNotifications(response.notifications)
      setUnreadCount(count.count)
      setHasMore(response.hasMore)
      setTotalCount(response.totalCount)
      onUnreadCountChange?.(count.count)
    } catch (error: any) {
      toast.error('Failed to load notifications', { description: error.message })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Load on open; poll every 30s while open
  useEffect(() => {
    if (!isOpen) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [isOpen])

  // ==================== NOTIFICATION ACTIONS ====================

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
      const newCount = Math.max(0, unreadCount - 1)
      setUnreadCount(newCount)
      onUnreadCountChange?.(newCount)
    } catch (error: any) {
      toast.error('Failed to mark as read', { description: error.message })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      onUnreadCountChange?.(0)
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error('Failed to mark all as read', { description: error.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id)
      const deleted = notifications.find(n => n._id === id)
      setNotifications(prev => prev.filter(n => n._id !== id))
      if (deleted && !deleted.read) {
        const newCount = Math.max(0, unreadCount - 1)
        setUnreadCount(newCount)
        onUnreadCountChange?.(newCount)
      }
    } catch (error: any) {
      toast.error('Failed to delete notification', { description: error.message })
    }
  }

  const handleDeleteAllRead = async () => {
    try {
      await notificationsAPI.deleteAllRead()
      setNotifications(prev => prev.filter(n => !n.read))
      toast.success('All read notifications deleted')
    } catch (error: any) {
      toast.error('Failed to delete read notifications', { description: error.message })
    }
  }

  // ==================== SPECIAL ACTIONS ====================

  const handleReorderNow = (notification: Notification) => {
    if (!notification.metadata?.inventoryId) {
      toast.error('Cannot create reorder: missing inventory information')
      return
    }
    setSelectedItem(buildMockReorderItem(notification.metadata))
    setShowQuickReorder(true)
  }

  const handlePayInstallment = async (notification: Notification) => {
    const { purchaseId, installmentIndex, amount, purchaseNumber } = notification.metadata || {}
    if (!purchaseId || installmentIndex === undefined) {
      toast.error('Missing installment info')
      return
    }
    try {
      const { purchasesAPI } = await import('../services/api')
      const result = await purchasesAPI.initiateKhaltiInstallmentPayment({ purchaseId, installmentIndex })
      if (result.payment_url) {
        localStorage.setItem('biztrack_khalti_installment', JSON.stringify({ purchaseId, installmentIndex, amount, purchaseNumber }))
        window.location.href = result.payment_url
      } else {
        toast.error('Failed to get Khalti payment URL')
      }
    } catch (error: any) {
      toast.error('Failed to initiate payment', { description: error.message })
    }
  }

  // ==================== NAVIGATION ====================

  /** Find the invoice for a sale/purchase and navigate to it */
  const navigateToInvoice = async (relatedId: string, type: 'sale' | 'purchase') => {
    try {
      const { invoicesAPI } = await import('../services/api')
      const response = await invoicesAPI.getAll(`relatedId=${relatedId}&type=${type}`)
      if (response.invoices?.length > 0) {
        navigate(`/invoices/${response.invoices[0]._id}`)
      } else {
        navigate(type === 'sale' ? '/sales' : '/purchases')
        toast.info('Invoice not found', { description: 'Navigating to list page instead.' })
      }
    } catch {
      navigate(type === 'sale' ? '/sales' : '/purchases')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) await handleMarkAsRead(notification._id)
    onClose()

    const { type, relatedId, relatedModel, title, message } = notification

    switch (type) {
      case 'purchase':
      case 'payment_made':
      case 'low_stock_purchase':
        return relatedId ? navigateToInvoice(relatedId, 'purchase') : navigate('/purchases')

      case 'sale':
      case 'payment_received':
        return relatedId ? navigateToInvoice(relatedId, 'sale') : navigate('/sales')

      case 'installment_due':
        return navigate('/purchases')

      case 'low_stock':
      case 'out_of_stock':
      case 'expiring_soon':
      case 'expired':
        return navigate(relatedId ? `/inventory?highlight=${relatedId}` : '/inventory')

      case 'reorder_needed':
      case 'reorder_created':
      case 'reorder_approved':
      case 'auto_reorder':
        return navigate('/reorder-history')

      case 'system':
        return navigate(
          title.toLowerCase().includes('staff') || message.toLowerCase().includes('staff')
            ? '/settings?tab=staff'
            : '/'
        )

      case 'login_failed':
      case 'login_success':
        return navigate('/settings?tab=loginHistory')

      case 'security_change':
        return navigate('/settings?tab=security')

      default:
        if (relatedModel === 'Sale' && relatedId) return navigateToInvoice(relatedId, 'sale')
        if (relatedModel === 'Purchase' && relatedId) return navigateToInvoice(relatedId, 'purchase')
        if (relatedModel === 'Inventory') return navigate('/inventory')
    }
  }

  // ==================== RENDER ====================

  if (!isOpen) return null

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsRefreshing(true); loadNotifications() }} disabled={isRefreshing} className="p-1.5 rounded hover:bg-gray-100" title="Refresh">
            <FiRefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100" title="Close">
            <FiX className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
          <button onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="text-xs text-teal-600 hover:text-teal-700 disabled:text-gray-400 flex items-center gap-1">
            <FiCheckCircle className="h-3.5 w-3.5" /> Mark all as read
          </button>
          <button onClick={handleDeleteAllRead} disabled={notifications.filter(n => n.read).length === 0} className="text-xs text-red-600 hover:text-red-700 disabled:text-gray-400 flex items-center gap-1">
            <FiTrash2 className="h-3.5 w-3.5" /> Clear read
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">No notifications</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => (
              <div
                key={notification._id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <FiExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>

                        {/* Reorder action */}
                        {(notification.type === 'low_stock' || notification.type === 'out_of_stock') && notification.metadata?.inventoryId && (
                          <button
                            onClick={e => { e.stopPropagation(); handleReorderNow(notification) }}
                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                          >
                            <FiZap className="h-3 w-3" /> Reorder Now
                          </button>
                        )}

                        {/* Installment pay action */}
                        {notification.type === 'installment_due' && notification.metadata?.purchaseId && (
                          <button
                            onClick={e => { e.stopPropagation(); handlePayInstallment(notification) }}
                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            <FiCreditCard className="h-3 w-3" />
                            Pay Rs {notification.metadata.amount?.toFixed(2)} via Khalti
                          </button>
                        )}
                      </div>
                      {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                    </div>
                  </div>

                  {/* Per-item actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button onClick={e => { e.stopPropagation(); handleMarkAsRead(notification._id) }} className="p-1.5 rounded hover:bg-gray-200" title="Mark as read">
                        <FiCheck className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(notification._id) }} className="p-1.5 rounded hover:bg-red-50" title="Dismiss">
                      <FiTrash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View all footer */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => { onClose(); navigate('/settings?tab=notifications') }}
            className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-2"
          >
            View all {totalCount} notifications in Settings
            <FiExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick Reorder Modal */}
      {showQuickReorder && selectedItem && (
        <QuickReorderModal
          item={selectedItem}
          onClose={() => { setShowQuickReorder(false); setSelectedItem(null) }}
          onSuccess={() => { setShowQuickReorder(false); setSelectedItem(null); loadNotifications() }}
        />
      )}
    </div>
  )
}

export default NotificationDropdown
