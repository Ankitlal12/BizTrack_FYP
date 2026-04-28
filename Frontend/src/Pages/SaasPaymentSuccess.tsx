import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { saasAPI, tokenManager } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const SaasPaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { setUser, setIsAuthenticated } = useAuth()

  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState('')
  const [renewalInfo, setRenewalInfo] = useState<{
    daysGranted?: number
    subscriptionExpiresAt?: string
    totalDaysRemaining?: number
  }>({})
  const isRenewalFlow = location.pathname === '/renew/payment-success'

  useEffect(() => {
    const pidx = searchParams.get('pidx')
    if (!pidx) {
      setError('Missing payment identifier in URL.')
      setIsVerifying(false)
      return
    }

    const verify = async () => {
      try {
        const response = isRenewalFlow
          ? await saasAPI.verifyRenewalPayment(pidx)
          : await saasAPI.verifyGoogleSignupPayment(pidx)

        // Store renewal information
        if (isRenewalFlow && response.subscriptionExpiresAt) {
          const expiryDate = new Date(response.subscriptionExpiresAt)
          const now = new Date()
          const totalDaysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          setRenewalInfo({
            daysGranted: response.daysGranted,
            subscriptionExpiresAt: response.subscriptionExpiresAt,
            totalDaysRemaining
          })
        }

        tokenManager.setToken(response.token)
        const userObj = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.avatar,
          subscriptionExpiresAt: response.user.subscriptionExpiresAt || response.subscriptionExpiresAt,
          subscriptionLastPaidAt: response.user.subscriptionLastPaidAt,
          accountStatus: response.user.accountStatus,
          isSaasCustomer: response.user.isSaasCustomer,
        }

        setUser(userObj)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(userObj))

        // Delay navigation to show success message with renewal details
        setTimeout(() => {
          navigate('/', { replace: true })
        }, isRenewalFlow ? 3000 : 2000)
      } catch (err: any) {
        setError(err?.message || (isRenewalFlow ? 'Renewal verification failed.' : 'Payment verification failed.'))
      } finally {
        setIsVerifying(false)
      }
    }

    void verify()
  }, [isRenewalFlow, navigate, searchParams, setIsAuthenticated, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f3fbf9] via-white to-[#eef8ff] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-teal-100 bg-white p-6 text-center shadow-xl">
        {isVerifying ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Verifying your payment...</h1>
            <p className="text-sm text-slate-600">
              {isRenewalFlow
                ? 'Please wait while we restore your BizTrack subscription access.'
                : 'Please wait while we activate your BizTrack workspace.'}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-red-700">
              {isRenewalFlow ? 'Renewal failed' : 'Signup failed'}
            </h1>
            <p className="text-sm text-slate-600">{error}</p>
            <Link
              to={isRenewalFlow ? '/renew' : '/signup'}
              className="inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {isRenewalFlow ? 'Try Renewal Again' : 'Try Signup Again'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="text-xl font-bold text-slate-900">
              {isRenewalFlow ? 'Subscription Renewed Successfully!' : 'Workspace Activated'}
            </h1>
            {isRenewalFlow && renewalInfo.totalDaysRemaining && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-teal-900">
                  ✅ {renewalInfo.daysGranted} days added to your subscription
                </p>
                <p className="text-sm text-teal-700">
                  You now have <span className="font-bold">{renewalInfo.totalDaysRemaining} days</span> remaining
                </p>
                {renewalInfo.subscriptionExpiresAt && (
                  <p className="text-xs text-teal-600">
                    Expires on: {new Date(renewalInfo.subscriptionExpiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-slate-600">
              {isRenewalFlow
                ? 'Redirecting you to your BizTrack dashboard...'
                : 'Redirecting you to your BizTrack owner dashboard...'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SaasPaymentSuccess
