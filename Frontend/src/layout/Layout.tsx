// ==================== IMPORTS ====================
import React, { memo, useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import { FaBell } from 'react-icons/fa'
import { FiLogOut, FiUser, FiMail, FiShield, FiHash } from 'react-icons/fi'
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

/** Profile info card shown in the header dropdown */
const ProfileCard = ({ user }: { user: any }) => (
  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
    {/* Gradient header */}
    <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-8 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400 opacity-20 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300 opacity-20 rounded-full -ml-12 -mb-12" />
      <div className="relative flex flex-col items-center">
        <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-3">
          {user ? getInitials(user.name) : 'JD'}
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">{user?.name || 'John Doe'}</h3>
        <span className="text-sm text-teal-100 capitalize bg-white/20 px-3 py-1 rounded-full">{user?.role || 'User'}</span>
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
              <p className="text-sm text-gray-700 mt-1 break-all capitalize">{value}</p>
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
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

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
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">BizTrack</h1>

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

        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
})

Layout.displayName = 'Layout'
export default Layout
