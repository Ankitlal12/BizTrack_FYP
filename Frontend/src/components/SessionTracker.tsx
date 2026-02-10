import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { loginHistoryAPI } from '../services/api'

/**
 * SessionTracker Component
 * 
 * Tracks user session activity and automatically logs out inactive sessions.
 * 
 * Features:
 * 1. Sends heartbeat every 2 minutes to keep session alive
 * 2. Detects browser close/tab close and records logout time
 * 3. Detects page visibility changes (tab switching)
 * 4. Records exact logout time when browser is closed
 */
const SessionTracker: React.FC = () => {
  const { user } = useAuth()
  const heartbeatIntervalRef = useRef<number | null>(null)
  const lastActivityRef = useRef<Date>(new Date())

  // Send heartbeat to server
  const sendHeartbeat = async () => {
    if (!user?.id) return

    try {
      await loginHistoryAPI.updateHeartbeat(user.id)
      lastActivityRef.current = new Date()
      console.log('💓 Heartbeat sent:', new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }

  // Record logout when browser/tab is closed
  const recordLogoutOnClose = async () => {
    if (!user?.id) return

    console.log('🔴 Browser closing, recording logout for user:', user.id)

    try {
      // Use sendBeacon for reliable delivery even when page is closing
      const data = JSON.stringify({ userId: user.id })
      const blob = new Blob([data], { type: 'application/json' })
      
      // Get token for authentication
      const token = localStorage.getItem('biztrack_token')
      // @ts-ignore - Vite environment variables
      const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api'
      const url = `${apiUrl}/login-history/logout`
      
      console.log('📡 Sending logout beacon to:', url)
      console.log('📦 Data:', data)
      console.log('🔑 Token:', token ? 'Present' : 'Missing')
      
      // Try sendBeacon first (most reliable for page unload)
      if (navigator.sendBeacon) {
        // Note: sendBeacon doesn't support custom headers, so we append token to URL
        const beaconUrl = token ? `${url}?token=${token}` : url
        const sent = navigator.sendBeacon(beaconUrl, blob)
        console.log('✅ Beacon sent:', sent)
      } else {
        console.log('⚠️ sendBeacon not supported, using fetch')
        // Fallback to synchronous fetch (less reliable but better than nothing)
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: data,
          keepalive: true, // Keep request alive even if page closes
        })
      }
    } catch (error) {
      console.error('❌ Failed to record logout on close:', error)
    }
  }

  useEffect(() => {
    if (!user?.id) return

    // Start heartbeat interval (every 2 minutes)
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat()
    }, 2 * 60 * 1000) // 2 minutes

    // Send initial heartbeat
    sendHeartbeat()

    // Track user activity (mouse, keyboard, scroll)
    const updateActivity = () => {
      lastActivityRef.current = new Date()
    }

    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('scroll', updateActivity)
    window.addEventListener('click', updateActivity)

    // Handle page visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to tab, send heartbeat
        sendHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle browser/tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      recordLogoutOnClose()
      // Don't show confirmation dialog
      // e.preventDefault()
      // e.returnValue = ''
    }

    const handleUnload = () => {
      recordLogoutOnClose()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    // Handle page hide (more reliable than unload on mobile)
    const handlePageHide = () => {
      recordLogoutOnClose()
    }

    window.addEventListener('pagehide', handlePageHide)

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('scroll', updateActivity)
      window.removeEventListener('click', updateActivity)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [user?.id])

  // This component doesn't render anything
  return null
}

export default SessionTracker
