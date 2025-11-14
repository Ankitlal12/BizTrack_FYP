import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './contexts/AuthContext'


const Login = lazy(() => import('./Pages/Login'));
const Dashboard=lazy(()=>import('./Pages/Dashboard'));
const Inventory=lazy(()=>import('./Pages/Inventory'));
const Invoices =lazy(()=>import ('./Pages/Invoices'))
const Purchases =lazy(()=>import ('./Pages/Purchases'))

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
         {/* // This is for login page */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <Login />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

        {/* This is for Dashboard page */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Dashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/inventory"
            element={
              isAuthenticated ? (
                <Inventory />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/purchases"
            element={
              isAuthenticated ? (
                <Purchases />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/invoices"
            element={
              isAuthenticated ? (
                <Invoices />
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
