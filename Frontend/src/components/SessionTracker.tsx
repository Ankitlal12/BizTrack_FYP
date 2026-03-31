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
  const url = `${API_BASE_URL}/login-history/logout`
  const body = JSON.stringify({ userId })
  const blob = new Blob([body], { type: 'application/json' })

  if (navigator.sendBeacon) {
    // sendBeacon doesn't support custom headers — append token as query param
    navigator.sendBeacon(token ? `${url}?token=${token}` : url, blob)
  } else {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body,
      keepalive: true,
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

    // ---- Heartbeat ----
    const sendHeartbeat = async () => {
      try {
        await loginHistoryAPI.updateHeartbeat(user.id)
      } catch (error) {
        console.error('Failed to send heartbeat:', error)
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
      if (document.visibilityState === 'visible') sendHeartbeat()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ---- Page close / unload ----
    const handleClose = () => sendLogoutBeacon(user.id)
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
