// ==================== IMPORTS ====================
import React, { memo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { FaBell } from 'react-icons/fa'
import { FiLogOut, FiUser, FiMail, FiShield, FiHash } from 'react-icons/fi'
import { AlertCircle, CheckCircle, CreditCard, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationDropdown from '../components/NotificationDropdown'
import { notificationsAPI } from '../services/api'

// ==================== TYPES ====================

interface LayoutProps {
  children: React.ReactNode
}

// ==================== HELPERS ====================

const getInitials = (name: string) =>
  name.split(' ').map(p => p.charAt(0)).join('').toUpperCase()

// ==================== SUB-COMPONENTS ====================

/** Subscription banner shown at the top for owners */
const SubscriptionBanner = ({ user }: { user: any }) => {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (!user?.subscriptionExpiresAt || !user?.isSaasCustomer || dismissed) {
    return null
  }

  const expiryDate = new Date(user.subscriptionExpiresAt)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const isExpired = expiryDate < now

  // Show banner if expired or less than 5 days remaining
  const showWarning = isExpired || daysRemaining < 5

  const getStatusColor = () => {
    if (isExpired) return 'red'
    if (daysRemaining < 2) return 'yellow'
    if (daysRemaining < 5) return 'orange'
    return 'blue'
  }

  const getMessage = () => {
    if (isExpired) {
      return `Your subscription expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago. Renew now to regain access.`
    }
    if (daysRemaining === 1) {
      return 'Your subscription expires tomorrow! Renew now to avoid service interruption.'
    }
    if (daysRemaining < 5) {
      return `Your subscription expires in ${daysRemaining} days. Renew now to extend by 10 more days.`
    }
    return `You have ${daysRemaining} days remaining in your subscription.`
  }

  const colorClasses = {
    red: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
    },
    yellow: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
    },
    orange: {
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
    blue: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  }

  const colors = colorClasses[getStatusColor() as keyof typeof colorClasses]
  const Icon = showWarning ? AlertCircle : CheckCircle

  return (
    <div className={`${colors.bg} border-b ${colors.text} px-4 py-2.5`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Icon className={colors.icon} size={20} />
          <div className="flex items-center gap-2">
            <p className="text-base font-medium">{getMessage()}</p>
            <span className="text-sm opacity-75">
              (Expires: {expiryDate.toLocaleDateString()})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/renew')}
            className={`flex items-center gap-2 px-3 py-1.5 ${colors.button} text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap`}
          >
            <CreditCard size={14} />
            Renew
          </button>
          {showWarning && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Profile info card shown in the header dropdown */
const ProfileCard = ({ user }: { user: any }) => (
  <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
    {/* Gradient header */}
    <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-8 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400 opacity-20 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300 opacity-20 rounded-full -ml-12 -mb-12" />
      <div className="relative flex flex-col items-center">
        <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white font-semibold text-3xl shadow-lg mb-3">
          {user ? getInitials(user.name) : 'JD'}
        </div>
        <h3 className="text-2xl font-medium text-white mb-1">{user?.name || 'John Doe'}</h3>
        <span className="text-base text-teal-100 capitalize bg-white/20 px-3 py-1 rounded-full">{user?.role || 'User'}</span>
      </div>
    </div>

    {/* Details */}
    <div className="p-6 bg-gray-50 space-y-4">
      {[
        { icon: <FiUser className="h-4 w-4 text-teal-600" />, label: 'Full Name',      value: user?.name || 'John Doe' },
        { icon: <FiMail className="h-4 w-4 text-teal-600" />, label: 'Email Address',  value: user?.email || 'user@example.com' },
        { icon: <FiShield className="h-4 w-4 text-teal-600" />, label: 'Role',         value: user?.role || 'User' },
        { icon: <FiHash className="h-4 w-4 text-teal-600" />, label: 'User ID',        value: user?.id || 'N/A' },
      ].map(({ icon, label, value }) => (
        <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-50 rounded-lg">{icon}</div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</label>
              <p className="text-base text-gray-700 mt-1 break-all capitalize">{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ==================== LAYOUT ====================

const Layout: React.FC<LayoutProps> = memo(({ children }) => {
  const { user, logout } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [ownerSubscription, setOwnerSubscription] = useState<any>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // ==================== FETCH OWNER SUBSCRIPTION ====================

  useEffect(() => {
    // Fetch owner's subscription data for all users in the workspace
    const fetchOwnerSubscription = async () => {
      if (!user?.role || user.role === 'admin') return

      try {
        // If user is owner, use their own data
        if (user.role === 'owner') {
          setOwnerSubscription({
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            isSaasCustomer: user.isSaasCustomer,
            ownerName: user.name,
            ownerEmail: user.email,
          })
        } else {
          // For managers and staff, fetch owner's subscription data from API
          const token = localStorage.getItem('biztrack_token')
          if (!token) return

          const apiUrl = window.location.origin.includes('localhost') 
            ? 'http://localhost:5000' 
            : window.location.origin

          const response = await fetch(`${apiUrl}/api/users`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const users = await response.json()
            const owner = users.find((u: any) => u.role === 'owner')
            
            if (owner) {
              setOwnerSubscription({
                subscriptionExpiresAt: owner.subscriptionExpiresAt,
                isSaasCustomer: owner.isSaasCustomer,
                ownerName: owner.name,
                ownerEmail: owner.email,
              })
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch owner subscription:', error)
      }
    }

    fetchOwnerSubscription()
  }, [user])

  // ==================== UNREAD COUNT ====================

  useEffect(() => {
    if (user?.role !== 'owner') return
    const load = async () => {
      try {
        const result = await notificationsAPI.getUnreadCount()
        setUnreadCount(result.count)
      } catch { /* silent */ }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user?.role])

  // ==================== CLICK OUTSIDE ====================

  useEffect(() => {
    if (!showProfile && !showNotifications) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProfile, showNotifications])

  // ==================== RENDER ====================

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl sm:text-3xl font-medium text-gray-800">BizTrack</h1>

            <div className="flex items-center gap-4">
              {/* Notifications (owner only) */}
              {user?.role === 'owner' && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => { setShowNotifications(v => !v); setShowProfile(false) }}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                    title="Notifications"
                  >
                    <FaBell className="h-5 w-5 text-gray-500" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                </div>
              )}

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setShowProfile(v => !v); setShowNotifications(false) }}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Profile"
                >
                  <FiUser className="h-5 w-5 text-gray-500" />
                </button>
                {showProfile && <ProfileCard user={user} />}
              </div>

              {/* Logout */}
              <button onClick={logout} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Logout">
                <FiLogOut className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </header>

        {/* Subscription Banner - Show for all users (owner, manager, staff) with owner's subscription data */}
        {user?.role !== 'admin' && ownerSubscription && (
          <SubscriptionBanner user={ownerSubscription} />
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
})

Layout.displayName = 'Layout'
export default Layout
