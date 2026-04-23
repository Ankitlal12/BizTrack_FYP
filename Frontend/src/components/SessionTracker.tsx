// ==================== IMPORTS ====================
import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { loginHistoryAPI } from '../services/api'

// ==================== CONSTANTS ====================

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000  // 2 minutes
// @ts-ignore - Vite env
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api'

// ==================== HELPERS ====================

/** Send a logout beacon when the page is closing (sendBeacon or keepalive fetch fallback) */
const sendLogoutBeacon = (userId: string) => {
  const token = localStorage.getItem('biztrack_token')
  if (!token) return // Don't send beacon if no token
  
  const url = `${API_BASE_URL}/login-history/logout`
  const body = JSON.stringify({ userId })
  const blob = new Blob([body], { type: 'application/json' })

  if (navigator.sendBeacon) {
    // sendBeacon doesn't support custom headers — append token as query param
    navigator.sendBeacon(`${url}?token=${token}`, blob)
  } else {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Silently fail on logout beacon errors
    })
  }
}

// ==================== COMPONENT ====================

/**
 * SessionTracker — invisible component that:
 * 1. Sends a heartbeat every 2 minutes to keep the session alive
 * 2. Records logout time when the browser tab/window closes
 * 3. Sends a heartbeat when the user returns to the tab
 */
const SessionTracker: React.FC = () => {
  const { user } = useAuth()
  const heartbeatRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user?.id) return

    // Check if token exists before starting heartbeat
    const token = localStorage.getItem('biztrack_token')
    if (!token) return

    // ---- Heartbeat ----
    const sendHeartbeat = async () => {
      // Verify token still exists before sending heartbeat
      const currentToken = localStorage.getItem('biztrack_token')
      if (!currentToken) {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
        }
        return
      }

      try {
        await loginHistoryAPI.updateHeartbeat(user.id)
      } catch (error: any) {
        // Silently handle authentication errors (user logged out or session expired)
        // These are expected when the session ends, so we don't log them
        if (error?.status === 401 || error?.status === 404) {
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current)
            heartbeatRef.current = null
          }
          return
        }
        // Only log unexpected errors (not auth-related)
        if (error?.status !== 403 && error?.status !== 402) {
          console.warn('Heartbeat failed:', error?.message || 'Unknown error')
        }
      }
    }

    sendHeartbeat() // immediate on mount
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    // ---- Activity tracking ----
    const updateActivity = () => {} // kept for future use; heartbeat covers session tracking
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click'] as const
    activityEvents.forEach(e => window.addEventListener(e, updateActivity))

    // ---- Tab visibility ----
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentToken = localStorage.getItem('biztrack_token')
        if (currentToken) sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ---- Page close / unload ----
    const handleClose = () => {
      const currentToken = localStorage.getItem('biztrack_token')
      if (currentToken) sendLogoutBeacon(user.id)
    }
    window.addEventListener('beforeunload', handleClose)
    window.addEventListener('unload', handleClose)
    window.addEventListener('pagehide', handleClose)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      activityEvents.forEach(e => window.removeEventListener(e, updateActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleClose)
      window.removeEventListener('unload', handleClose)
      window.removeEventListener('pagehide', handleClose)
    }
  }, [user?.id])

  return null
}

export default SessionTracker
