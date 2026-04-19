import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { saasAPI, tokenManager } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const SaasPaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser, setIsAuthenticated } = useAuth()

  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const pidx = searchParams.get('pidx')
    if (!pidx) {
      setError('Missing payment identifier in URL.')
      setIsVerifying(false)
      return
    }

    const verify = async () => {
      try {
        const response = await saasAPI.verifyGoogleSignupPayment(pidx)

        tokenManager.setToken(response.token)
        const userObj = {
          id: response.user._id || response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role,
          avatar: response.user.avatar,
        }

        setUser(userObj)
        setIsAuthenticated(true)
        localStorage.setItem('biztrack_user', JSON.stringify(userObj))

        navigate('/', { replace: true })
      } catch (err: any) {
        setError(err?.message || 'Payment verification failed.')
      } finally {
        setIsVerifying(false)
      }
    }

    void verify()
  }, [navigate, searchParams, setIsAuthenticated, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f3fbf9] via-white to-[#eef8ff] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-teal-100 bg-white p-6 text-center shadow-xl">
        {isVerifying ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Verifying your payment...</h1>
            <p className="text-sm text-slate-600">Please wait while we activate your BizTrack workspace.</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-red-700">Signup failed</h1>
            <p className="text-sm text-slate-600">{error}</p>
            <Link to="/signup" className="inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              Try Signup Again
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="text-xl font-bold text-slate-900">Workspace Activated</h1>
            <p className="text-sm text-slate-600">Redirecting you to your BizTrack owner dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SaasPaymentSuccess
