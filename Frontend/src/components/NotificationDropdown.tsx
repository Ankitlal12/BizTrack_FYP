import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../services/api'
import { toast } from 'sonner'
import { 
  FiCheck, 
  FiCheckCircle, 
  FiTrash2, 
  FiShoppingBag, 
  FiAlertCircle,
  FiPackage,
  FiX,
  FiRefreshCw,
  FiCreditCard,
  FiZap,
  FiExternalLink
} from 'react-icons/fi'
import QuickReorderModal from './QuickReorderModal'

interface Notification {
  _id: string
  type: 'purchase' | 'sale' | 'low_stock' | 'out_of_stock' | 'system' | 'payment_received' | 'payment_made' | 'reorder_needed' | 'reorder_created' | 'reorder_approved' | 'auto_reorder' | 'low_stock_purchase' | 'login_failed' | 'login_success' | 'security_change'
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

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showQuickReorder, setShowQuickReorder] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [response, count] = await Promise.all([
        notificationsAPI.getAll({ limit: 7 }),
        notificationsAPI.getUnreadCount(),
      ])
      setNotifications(response.notifications)
      setUnreadCount(count.count)
      onUnreadCountChange?.(count.count)
      
      // Store hasMore for "View all" link
      setHasMore(response.hasMore)
      setTotalCount(response.totalCount)
    } catch (error: any) {
      console.error('Failed to load notifications:', error)
      toast.error('Failed to load notifications', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Poll for new notifications every 30 seconds when dropdown is open
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === id ? { ...notif, read: true } : notif
        )
      )
      const newCount = Math.max(0, unreadCount - 1)
      setUnreadCount(newCount)
      onUnreadCountChange?.(newCount)
    } catch (error: any) {
      toast.error('Failed to mark notification as read', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead()
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
      setUnreadCount(0)
      onUnreadCountChange?.(0)
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error('Failed to mark all as read', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id)
      const deletedNotif = notifications.find((n) => n._id === id)
      setNotifications((prev) => prev.filter((notif) => notif._id !== id))
      if (deletedNotif && !deletedNotif.read) {
        const newCount = Math.max(0, unreadCount - 1)
        setUnreadCount(newCount)
        onUnreadCountChange?.(newCount)
      }
    } catch (error: any) {
      toast.error('Failed to delete notification', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const handleDeleteAllRead = async () => {
    try {
      await notificationsAPI.deleteAllRead()
      setNotifications((prev) => prev.filter((notif) => !notif.read))
      toast.success('All read notifications deleted')
    } catch (error: any) {
      toast.error('Failed to delete read notifications', {
        description: error.message || 'Please try again.',
      })
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadNotifications()
  }

  const handleReorderNow = async (notification: Notification) => {
    if (!notification.metadata?.inventoryId) {
      toast.error('Cannot create reorder: missing inventory information');
      return;
    }

    try {
      // Create a mock item for the quick reorder modal
      const mockItem = {
        _id: notification.metadata.inventoryId,
        name: notification.metadata.itemName || 'Unknown Item',
        sku: notification.metadata.sku || 'N/A',
        category: 'Unknown',
        price: 0,
        cost: 0,
        stock: notification.metadata.stock || 0,
        reorderLevel: notification.metadata.reorderLevel || 5,
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
          currentStock: notification.metadata.stock || 0,
          reorderLevel: notification.metadata.reorderLevel || 5,
          daysUntilStockout: 999,
          calculations: {
            totalSold90Days: 0,
            annualDemand: 0,
            safetyStock: 5,
            leadTimeDays: 7,
            reviewPeriod: 7
          }
        },
        priority: 50,
        urgencyLevel: notification.metadata.stock <= 0 ? 'critical' : 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setSelectedItem(mockItem);
      setShowQuickReorder(true);
    } catch (error: any) {
      console.error('Error preparing reorder:', error);
      toast.error('Failed to prepare reorder');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await handleMarkAsRead(notification._id);
    }

    // Close the dropdown
    onClose();

    // Helper function to find and navigate to invoice
    const navigateToInvoice = async (relatedId: string, type: 'sale' | 'purchase') => {
      try {
        // Import the invoices API
        const { invoicesAPI } = await import('../services/api');
        
        // Find the invoice for this sale/purchase
        const response = await invoicesAPI.getAll(`relatedId=${relatedId}&type=${type}`);
        
        if (response.invoices && response.invoices.length > 0) {
          const invoice = response.invoices[0];
          // Navigate to the specific invoice detail page
          navigate(`/invoices/${invoice._id}`);
        } else {
          // If no invoice found, navigate to the list page
          if (type === 'sale') {
            navigate('/sales');
          } else {
            navigate('/purchases');
          }
          toast.info('Invoice not found', {
            description: 'Navigating to list page instead.'
          });
        }
      } catch (error) {
        console.error('Error finding invoice:', error);
        // Fallback to list page
        if (type === 'sale') {
          navigate('/sales');
        } else {
          navigate('/purchases');
        }
      }
    };

    // Navigate based on notification type and metadata
    switch (notification.type) {
      case 'purchase':
        // Navigate to specific purchase invoice if relatedId exists
        if (notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'purchase');
        } else {
          navigate('/purchases');
        }
        break;

      case 'sale':
        // Navigate to specific sale invoice if relatedId exists
        if (notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'sale');
        } else {
          navigate('/sales');
        }
        break;

      case 'payment_received':
        // Navigate to specific sale invoice (customer payments)
        if (notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'sale');
        } else {
          navigate('/sales');
        }
        break;

      case 'payment_made':
        // Navigate to specific purchase invoice (supplier payments)
        if (notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'purchase');
        } else {
          navigate('/purchases');
        }
        break;

      case 'low_stock':
      case 'out_of_stock':
        // Navigate to low stock page
        navigate('/low-stock');
        break;

      case 'reorder_needed':
      case 'reorder_created':
      case 'reorder_approved':
      case 'auto_reorder':
        // Navigate to reorder history page
        navigate('/reorder-history');
        break;

      case 'low_stock_purchase':
        // Navigate to specific purchase invoice if relatedId exists
        if (notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'purchase');
        } else {
          navigate('/purchases');
        }
        break;

      case 'system':
        // For staff/user management notifications, navigate to settings with staff tab
        if (notification.title.toLowerCase().includes('staff') || 
            notification.title.toLowerCase().includes('member') ||
            notification.message.toLowerCase().includes('staff') || 
            notification.message.toLowerCase().includes('member')) {
          // Navigate to settings and open staff tab
          navigate('/settings?tab=staff');
        } else {
          // For other system notifications, go to dashboard
          navigate('/');
        }
        break;

      case 'login_failed':
        // Failed login attempts - navigate to login history tab in settings
        navigate('/settings?tab=loginHistory');
        break;

      case 'login_success':
        // Successful login from new location/device - navigate to login history
        navigate('/settings?tab=loginHistory');
        break;

      case 'security_change':
        // Username/password changed - navigate to security tab in settings
        navigate('/settings?tab=security');
        break;

      default:
        // For unknown types, try to navigate based on relatedModel
        if (notification.relatedModel === 'Sale' && notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'sale');
        } else if (notification.relatedModel === 'Purchase' && notification.relatedId) {
          await navigateToInvoice(notification.relatedId, 'purchase');
        } else if (notification.relatedModel === 'Inventory') {
          navigate('/inventory');
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <FiShoppingBag className="h-5 w-5 text-blue-500" />
      case 'sale':
        return <FiCreditCard className="h-5 w-5 text-green-500" />
      case 'payment_received':
        return <FiCreditCard className="h-5 w-5 text-emerald-500" />
      case 'payment_made':
        return <FiCreditCard className="h-5 w-5 text-purple-500" />
      case 'low_stock':
        return <FiAlertCircle className="h-5 w-5 text-yellow-500" />
      case 'out_of_stock':
        return <FiPackage className="h-5 w-5 text-red-500" />
      case 'reorder_needed':
      case 'reorder_created':
      case 'reorder_approved':
      case 'auto_reorder':
      case 'low_stock_purchase':
        return <FiZap className="h-5 w-5 text-orange-500" />
      case 'login_failed':
        return <FiAlertCircle className="h-5 w-5 text-red-600" />
      case 'login_success':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />
      case 'security_change':
        return <FiAlertCircle className="h-5 w-5 text-blue-600" />
      default:
        return <FiAlertCircle className="h-5 w-5 text-gray-500" />
    }
  }



  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <FiX className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="text-xs text-teal-600 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FiCheckCircle className="h-3.5 w-3.5" />
            Mark all as read
          </button>
          <button
            onClick={handleDeleteAllRead}
            disabled={notifications.filter((n) => n.read).length === 0}
            className="text-xs text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FiTrash2 className="h-3.5 w-3.5" />
            Clear read
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50/30' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <FiExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                        
                        {/* Reorder Action Button */}
                        {(notification.type === 'low_stock' || notification.type === 'out_of_stock') && 
                         notification.metadata?.inventoryId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent notification click
                              handleReorderNow(notification);
                            }}
                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                          >
                            <FiZap className="h-3 w-3" />
                            Reorder Now
                          </button>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent notification click
                          handleMarkAsRead(notification._id);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Mark as read"
                      >
                        <FiCheck className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent notification click
                        handleDelete(notification._id);
                      }}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Dismiss"
                    >
                      <FiTrash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View All Footer */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              onClose();
              navigate('/settings?tab=notifications');
            }}
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
          onClose={() => {
            setShowQuickReorder(false);
            setSelectedItem(null);
          }}
          onSuccess={() => {
            setShowQuickReorder(false);
            setSelectedItem(null);
            loadNotifications(); // Refresh notifications
          }}
        />
      )}
    </div>
  )
}

export default NotificationDropdown

