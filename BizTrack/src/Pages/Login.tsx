import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

import { CiLock } from "react-icons/ci";
import { CiUser } from "react-icons/ci";

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
        navigate('/', {
          replace: true,
        })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            BizTrack
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inventory & Business Management System
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 block w-full border border-gray-300 rounded-md py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Username"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full border border-gray-300 rounded-md py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Password"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  onClick={handleForgotPassword}
                  className="font-medium text-teal-600 hover:text-teal-500"
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-300"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              {/* <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Demo Credentials
                </span>
              </div> */}
            </div>
            {/* <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <p className="font-bold text-gray-700">Owner Login:</p>
                <p>Username: admin</p>
                <p>Password: admin123</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <p className="font-bold text-gray-700">Manager Login:</p>
                <p>Username: mike</p>
                <p>Password: mike123</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md text-xs">
                <p className="font-bold text-gray-700">Staff Login:</p>
                <p>Username: sarah</p>
                <p>Password: sarah123</p>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
export default Login
