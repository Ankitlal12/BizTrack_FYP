import React, { useEffect, useState } from 'react'
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
  FiDollarSign
} from 'react-icons/fi'

interface Notification {
  _id: string
  type: 'purchase' | 'sale' | 'low_stock' | 'out_of_stock' | 'system'
  title: string
  message: string
  read: boolean
  createdAt: string
  metadata?: any
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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [notifs, count] = await Promise.all([
        notificationsAPI.getAll({ limit: 20 }),
        notificationsAPI.getUnreadCount(),
      ])
      setNotifications(notifs)
      setUnreadCount(count.count)
      onUnreadCountChange?.(count.count)
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <FiShoppingBag className="h-5 w-5 text-blue-500" />
      case 'sale':
        return <FiDollarSign className="h-5 w-5 text-green-500" />
      case 'low_stock':
        return <FiAlertCircle className="h-5 w-5 text-yellow-500" />
      case 'out_of_stock':
        return <FiPackage className="h-5 w-5 text-red-500" />
      default:
        return <FiAlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-blue-50 border-blue-200'
      case 'sale':
        return 'bg-green-50 border-green-200'
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-200'
      case 'out_of_stock':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
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
                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Mark as read"
                      >
                        <FiCheck className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="Delete"
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
    </div>
  )
}

export default NotificationDropdown

