import React, { memo, useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import { FaBell } from "react-icons/fa";
import { FiLogOut, FiUser, FiMail, FiShield, FiHash } from "react-icons/fi";
import { useAuth } from '../contexts/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { notificationsAPI } from '../services/api';

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = memo(({ children }) => {
  const { user, logout } = useAuth()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
  }

  // Load unread count
  useEffect(() => {
    if (user?.role === 'owner') {
      const loadUnreadCount = async () => {
        try {
          const result = await notificationsAPI.getUnreadCount()
          setUnreadCount(result.count)
        } catch (error) {
          console.error('Failed to load unread count:', error)
        }
      }
      
      loadUnreadCount()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.role])

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileModal(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    if (showProfileModal || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileModal, showNotifications])

  const handleProfileClick = () => {
    setShowProfileModal(!showProfileModal)
    setShowNotifications(false)
  }

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
    setShowProfileModal(false)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            
            <h1 className="text-2xl font-semibold text-gray-800">BizTrack</h1>

            {/* Three separate buttons: Notifications, Profile, Logout */}
            <div className="flex items-center gap-4">

              {/* Notifications Button */}
              {user?.role === 'owner' && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={handleNotificationClick}
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
                  
                  {/* Notifications Dropdown */}
                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                </div>
              )}

              {/* Profile Button */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={handleProfileClick}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="Profile"
                >
                  <FiUser className="h-5 w-5 text-gray-500" />
                </button>

                {/* Profile Information Modal */}
                {showProfileModal && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header with gradient background */}
                    <div className="bg-gradient-to-br from-teal-500 to-teal-600 px-6 py-8 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400 opacity-20 rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-300 opacity-20 rounded-full -ml-12 -mb-12"></div>
                      
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`h-24 w-24 rounded-full ${
                            user?.role === 'owner' 
                              ? 'bg-white/20 backdrop-blur-sm border-4 border-white/30' 
                              : 'bg-blue-500/20 backdrop-blur-sm border-4 border-white/30'
                          } flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-3`}
                        >
                          {user ? getInitials(user.name) : 'JD'}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {user?.name || 'John Doe'}
                        </h3>
                        <span className="text-sm text-teal-100 capitalize bg-white/20 px-3 py-1 rounded-full">
                          {user?.role || 'User'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Profile Details */}
                    <div className="p-6 bg-gray-50">
                      <div className="space-y-4">
                        {/* Name Field */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg">
                              <FiUser className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Full Name
                              </label>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {user?.name || 'John Doe'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Email Field */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg">
                              <FiMail className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Email Address
                              </label>
                              <p className="text-sm text-gray-700 mt-1 break-all">
                                {user?.email || 'user@example.com'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Role Field */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg">
                              <FiShield className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Role
                              </label>
                              <p className="text-sm text-gray-700 mt-1 capitalize">
                                {user?.role || 'User'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* User ID Field */}
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg">
                              <FiHash className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                User ID
                              </label>
                              <p className="text-sm text-gray-700 mt-1 font-mono break-all">
                                {user?.id || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Logout"
              >
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
