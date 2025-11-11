import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CiLock, CiUser } from "react-icons/ci"

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const success = await login(username, password)
      if (success) {
        navigate('/', { replace: true })
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    alert('Password reset feature coming soon!')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-teal-50 overflow-hidden">
      {/* Soft Gradient Blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-teal-200 opacity-30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-300 opacity-20 rounded-full blur-3xl animate-pulse" />

      {/* Login Card */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md border border-gray-100 shadow-xl rounded-3xl p-10 w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-teal-400 shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-semibold text-gray-800">BizTrack</h1>
          <p className="text-gray-500 text-sm mt-1">
            Inventory & Business Management
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <CiUser className="absolute left-3 top-3.5 text-gray-400 text-lg" />
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="pl-10 w-full border border-gray-200 rounded-xl py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-gray-800 placeholder-gray-400"
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 w-full border border-gray-200 rounded-xl py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="ml-2">Remember me</span>
            </label>
            <button
              onClick={handleForgotPassword}
              className="text-teal-600 hover:text-teal-500 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} BizTrack. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default Login
