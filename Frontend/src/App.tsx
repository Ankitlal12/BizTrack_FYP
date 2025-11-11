import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './contexts/AuthContext'

const Login = lazy(() => import('./Pages/Login'))


const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
)

export const App = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader />

  return (
    <>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<PageLoader />}>
        <Routes>
         
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login />
              ) : (
                <Navigate to={location.state?.from?.pathname || '/'} replace />
              )
            }
          />

        
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-gray-800">
                  <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-center">
                    <h1 className="text-2xl font-bold text-teal-700 mb-2">
                      ✅ Logged in successfully!
                    </h1>
                    <p className="text-gray-600 mb-6">
                      Welcome back, <span className="font-medium">{user?.name}</span> 👋
                    </p>
                    <div className="space-y-4">
                      <button
                        onClick={() => logout()}
                        className="w-full py-2 px-4 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
