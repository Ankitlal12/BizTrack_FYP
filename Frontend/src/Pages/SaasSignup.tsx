import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Loader2, ShieldCheck, Eye, EyeOff, Building2, Phone, AlertCircle } from 'lucide-react'
import { CiLock } from "react-icons/ci"
import { useAuth } from '../contexts/AuthContext'
import { saasAPI } from '../services/api'

const SaasSignup = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ 
    businessName?: string
    password?: string
    confirmPassword?: string 
  }>({})

  const validateFields = () => {
    const nextErrors: typeof fieldErrors = {}

    if (!businessName.trim()) {
      nextErrors.businessName = 'Business name is required'
    }

    if (!password || password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters'
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleLogout = async () => {
    await logout()
    setError('')
  }

  const startSignup = async (credential: string) => {
    if (!validateFields()) {
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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-teal-50 overflow-hidden px-4 py-8">

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-teal-200 opacity-30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 opacity-20 rounded-full blur-3xl animate-pulse"></div>

      {/* Signup Card */}
      <div className="login-card-animated-border relative z-10 bg-white/85 backdrop-blur-md shadow-xl rounded-3xl p-6 sm:p-10 w-full max-w-2xl mx-4">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">Create Your Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">
            Start your BizTrack journey today
          </p>
        </div>

        {/* Pricing Info */}
        <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-800">BizTrack Business Plan</p>
              <p className="mt-1 text-3xl font-bold text-teal-900">NPR 999</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-teal-500/20">
              <ShieldCheck className="text-teal-600" size={24} />
            </div>
          </div>
          <p className="mt-3 text-sm text-teal-700">
            One-time onboarding payment. Your Google account becomes the owner of your workspace.
          </p>
        </div>

        {/* Already Logged In Warning */}
        {isAuthenticated && user && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  You are already logged in
                </p>
                <p className="text-sm text-amber-700 mb-3">
                  Logged in as <span className="font-medium">{user.email || user.name}</span>. 
                  To create a new workspace, please log out first.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Log Out
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-amber-900 text-sm font-semibold rounded-lg border border-amber-300 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {/* Business Name */}
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value)
                  if (fieldErrors.businessName) {
                    setFieldErrors((prev) => ({ ...prev, businessName: undefined }))
                  }
                }}
                placeholder="Enter your business name"
                className={`pl-10 w-full border ${fieldErrors.businessName ? 'border-red-400' : 'border-gray-200'} rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400`}
              />
            </div>
            {fieldErrors.businessName && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.businessName}</p>
            )}
          </div>

          {/* Phone (Optional) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9800000000"
                className="pl-10 w-full border border-gray-200 rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <CiLock className="absolute left-3 top-3.5 text-gray-400 text-lg" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }))
                  }
                }}
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                className={`pl-10 pr-10 w-full border ${fieldErrors.password ? 'border-red-400' : 'border-gray-200'} rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <CiLock className="absolute left-3 top-3.5 text-gray-400 text-lg" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }
                }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={`pl-10 pr-10 w-full border ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-200'} rounded-xl py-3 
                  focus:ring-2 focus:ring-teal-500 focus:border-teal-500 
                  outline-none transition-all text-gray-800 placeholder-gray-400`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
            💡 Already logged in? Please log out first before creating a new workspace.
          </p>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Continue with Google</span>
          </div>
        </div>

        {/* Google Signup */}
        <div className="flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <ShieldCheck size={16} className="text-teal-600" />
            Sign up as Workspace Owner
          </p>

          {isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              Preparing payment...
            </div>
          ) : isAuthenticated ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Please log out to create a new workspace
              </p>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Log Out Now
              </button>
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

        {/* Back to Website / Login Link */}
        <div className="mt-6 text-center space-y-2">
          <Link 
            to="/" 
            className="block text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            ← Back to Website
          </Link>
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} BizTrack. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default SaasSignup
