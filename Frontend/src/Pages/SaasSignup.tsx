import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Loader2, ShieldCheck } from 'lucide-react'
import { saasAPI } from '../services/api'

const SaasSignup = () => {
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const startSignup = async (credential: string) => {
    if (!businessName.trim()) {
      setError('Business name is required.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await saasAPI.initiateGoogleSignup({
        credential,
        businessName: businessName.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      })

      if (!response.paymentUrl) {
        throw new Error('Payment URL not returned from server.')
      }

      window.location.href = response.paymentUrl
    } catch (err: any) {
      setError(err?.message || 'Failed to start SaaS signup.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f3fbf9] via-white to-[#eef8ff] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-teal-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">BizTrack SaaS Signup</h1>
          <Link to="/" className="text-sm font-semibold text-teal-700 hover:underline">Back to Website</Link>
        </div>

        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm font-semibold text-teal-800">Plan: BizTrack Business</p>
          <p className="mt-1 text-3xl font-black text-teal-900">NPR 999</p>
          <p className="mt-2 text-sm text-teal-700">One-time onboarding payment in sandbox. After payment, your Google account becomes the owner of your BizTrack workspace.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Business Name
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              placeholder="Enter your business name"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              placeholder="9800000000"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Already logged in? Log out first, then create a new workspace.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 flex flex-col items-start gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck size={16} className="text-teal-600" />
            Continue with Google as Owner
          </p>

          {isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing payment...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={(response) => {
                if (response.credential) {
                  void startSignup(response.credential)
                }
              }}
              onError={() => setError('Google signup failed. Please try again.')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default SaasSignup
