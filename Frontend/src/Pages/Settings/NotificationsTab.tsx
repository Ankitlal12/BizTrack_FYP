import React, { useEffect, useState } from 'react'
import { notificationsAPI } from '../../services/api'
import { toast } from 'sonner'
import { 
  FiCheck, 
  FiCheckCircle, 
  FiTrash2, 
  FiShoppingBag, 
  FiAlertCircle,
  FiPackage,
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

const NotificationsTab: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [notifs, count] = await Promise.all([
        notificationsAPI.getAll({ limit: 50 }),
        notificationsAPI.getUnreadCount(),
      ])
      setNotifications(notifs)
      setUnreadCount(count.count)
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
    loadNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === id ? { ...notif, read: true } : notif
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      toast.success('Notification marked as read')
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
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
      toast.success('Notification deleted')
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

  return (
    <div className="space-y-8">
      {/* Notification List Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-gray-800">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-sm text-teal-600 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 px-3 py-1 rounded hover:bg-teal-50"
                >
                  <FiCheckCircle className="h-4 w-4" />
                  Mark all as read
                </button>
                <button
                  onClick={handleDeleteAllRead}
                  disabled={notifications.filter((n) => n.read).length === 0}
                  className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1 px-3 py-1 rounded hover:bg-red-50"
                >
                  <FiTrash2 className="h-4 w-4" />
                  Clear read
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
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
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="p-2 rounded hover:bg-gray-200 transition-colors"
                          title="Mark as read"
                        >
                          <FiCheck className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification._id)}
                        className="p-2 rounded hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsTab
