import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Loader2, ShieldCheck, AlertCircle, Calendar, CreditCard, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { saasAPI } from '../services/api'

const SubscriptionRenewal = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    expiresAt: Date | null
    daysRemaining: number | null
    isExpired: boolean
  }>({
    expiresAt: null,
    daysRemaining: null,
    isExpired: false,
  })

  useEffect(() => {
    if (user?.subscriptionExpiresAt) {
      const expiryDate = new Date(user.subscriptionExpiresAt)
      const now = new Date()
      const diffTime = expiryDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      setSubscriptionInfo({
        expiresAt: expiryDate,
        daysRemaining: daysRemaining,
        isExpired: expiryDate < now,
      })
    }
  }, [user])

  const handleRenewal = async (credential: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await saasAPI.initiateGoogleRenewal({ credential })

      if (!response.paymentUrl) {
        throw new Error('Payment URL not returned from server.')
      }

      // Redirect to Khalti payment
      window.location.href = response.paymentUrl
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate renewal.')
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getStatusColor = () => {
    if (subscriptionInfo.isExpired) return 'red'
    if (subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining < 2) return 'yellow'
    return 'green'
  }

  const getStatusMessage = () => {
    if (subscriptionInfo.isExpired) {
      return 'Your subscription has expired. Renew now to regain access.'
    }
    if (subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining < 2) {
      return `Your subscription expires in ${subscriptionInfo.daysRemaining} day${subscriptionInfo.daysRemaining === 1 ? '' : 's'}!`
    }
    return `Your subscription is active for ${subscriptionInfo.daysRemaining} more days.`
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-teal-50 overflow-hidden px-4 py-8">
      
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-teal-200 opacity-30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>

      {/* Renewal Card */}
      <div className="relative z-10 bg-white/85 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-10 w-full max-w-2xl mx-4">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">Renew Your Subscription</h1>
          <p className="text-gray-500 text-sm mt-1">
            Continue using BizTrack without interruption
          </p>
        </div>

        {/* Subscription Status */}
        {isAuthenticated && user && (
          <div className={`mb-6 rounded-2xl border ${
            getStatusColor() === 'red' ? 'border-red-200 bg-red-50' :
            getStatusColor() === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
            'border-green-200 bg-green-50'
          } p-5 shadow-sm`}>
            <div className="flex items-start gap-3">
              {getStatusColor() === 'red' ? (
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
              ) : getStatusColor() === 'yellow' ? (
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={24} />
              ) : (
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold mb-1 ${
                  getStatusColor() === 'red' ? 'text-red-900' :
                  getStatusColor() === 'yellow' ? 'text-yellow-900' :
                  'text-green-900'
                }`}>
                  {getStatusMessage()}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                  <Calendar size={16} />
                  <span>Expires: {formatDate(subscriptionInfo.expiresAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Info */}
        <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-800">10-Day Subscription Renewal</p>
              <p className="mt-1 text-3xl font-bold text-teal-900">NPR 999</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-teal-500/20">
              <CreditCard className="text-teal-600" size={24} />
            </div>
          </div>
          <p className="mt-3 text-sm text-teal-700">
            Extends your subscription by 10 days from your current expiry date.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Benefits */}
        <div className="mb-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">What you get:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
              <span>10 more days of full access to BizTrack</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
              <span>All team members retain access</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
              <span>No data loss or service interruption</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
              <span>Instant activation after payment</span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Renew with Google</span>
          </div>
        </div>

        {/* Google Renewal */}
        <div className="flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <ShieldCheck size={16} className="text-teal-600" />
            Secure Payment via Khalti
          </p>

          {isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              Preparing payment...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  void handleRenewal(response.credential)
                }
              }}
              onError={() => setError('Google authentication failed. Please try again.')}
            />
          )}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} BizTrack. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default SubscriptionRenewal
