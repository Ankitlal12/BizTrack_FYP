import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './contexts/AuthContext'
import SessionTracker from './components/SessionTracker'


const Login = lazy(() => import('./Pages/Login'));
const Dashboard=lazy(()=>import('./Pages/Dashboard'));
const Inventory=lazy(()=>import('./Pages/Inventory'));
const Invoices =lazy(()=>import ('./Pages/Invoices'));
const InvoiceDetail = lazy(() => import('./Pages/Invoices/InvoiceDetail'));
const Purchases =lazy(()=>import ('./Pages/Purchases'));
const Reports=lazy(()=>import('./Pages/Reports.tsx'));
const Sales=lazy(()=>import('./Pages/Sales.tsx'));
const Settings=lazy(()=>import('./Pages/Settings.tsx'));
const TransactionHistory = lazy(() => import('./Pages/TransactionHistory.tsx'));
const Billing=lazy(()=>import('./Pages/Billing.tsx') )
const LowStock = lazy(() => import('./Pages/LowStock'));
const Suppliers = lazy(() => import('./Pages/Suppliers'));
const ReorderHistory = lazy(() => import('./Pages/ReorderHistory'));

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
      {isAuthenticated && <SessionTracker />}
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

        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : user?.role === "owner" ? (
              <Dashboard />
            ) : (
              <Navigate to="/inventory" replace />
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

          <Route
            path="/invoices/:id"
            element={
              isAuthenticated ? (
                <InvoiceDetail />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
           <Route
            path="/reports"
            element={
              isAuthenticated ? (
                <Reports />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
           <Route
            path="/sales"
            element={
              isAuthenticated ? (
                <Sales />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <Settings />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
         
           <Route
            path="/transactions"
            element={
              isAuthenticated ? (
                <TransactionHistory />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/low-stock"
            element={
              isAuthenticated && (user?.role === 'owner' || user?.role === 'manager') ? (
                <LowStock />
              ) : (
                <Navigate to="/inventory" replace />
              )
            }
          />

          <Route
            path="/suppliers"
            element={
              isAuthenticated && (user?.role === 'owner' || user?.role === 'manager') ? (
                <Suppliers />
              ) : (
                <Navigate to="/inventory" replace />
              )
            }
          />

          <Route
            path="/reorder-history"
            element={
              isAuthenticated && user?.role === 'owner' ? (
                <ReorderHistory />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

             <Route
            path="/billing"
            element={
              isAuthenticated ? (
                <Billing />
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
