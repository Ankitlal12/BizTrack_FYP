// ==================== IMPORTS ====================
import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from './contexts/AuthContext'
import SessionTracker from './components/SessionTracker'

// ==================== LAZY PAGE IMPORTS ====================
const Login               = lazy(() => import('./Pages/Login'))
const Dashboard           = lazy(() => import('./Pages/Dashboard'))
const Inventory           = lazy(() => import('./Pages/Inventory'))
const Invoices            = lazy(() => import('./Pages/Invoices'))
const InvoiceDetail       = lazy(() => import('./Pages/Invoices/InvoiceDetail'))
const Purchases           = lazy(() => import('./Pages/Purchases'))
const Reports             = lazy(() => import('./Pages/Reports'))
const Sales               = lazy(() => import('./Pages/Sales'))
const Settings            = lazy(() => import('./Pages/Settings'))
const TransactionHistory  = lazy(() => import('./Pages/TransactionHistory'))
const Billing             = lazy(() => import('./Pages/Billing'))
const KhaltiPaymentSuccess  = lazy(() => import('./Pages/KhaltiPaymentSuccess'))
const KhaltiPurchaseSuccess = lazy(() => import('./Pages/KhaltiPurchaseSuccess'))
const LowStock            = lazy(() => import('./Pages/LowStock'))
const ExpiryManagement    = lazy(() => import('./Pages/ExpiryManagement'))
const Suppliers           = lazy(() => import('./Pages/Suppliers'))
const Customers           = lazy(() => import('./Pages/Customers'))
const ReorderHistory      = lazy(() => import('./Pages/ReorderHistory'))
const StockList           = lazy(() => import('./Pages/StockList'))
const StockReport         = lazy(() => import('./Pages/StockReport'))
const UpcomingProducts    = lazy(() => import('./Pages/UpcomingProducts'))
const StaffAnalytics      = lazy(() => import('./Pages/StaffAnalytics'))

// ==================== HELPERS ====================

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// Wrap a page element: redirect to /login if not authenticated
const Protected = ({ element }: { element: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{element}</> : <Navigate to="/login" replace />
}

// Wrap a page element: redirect to /inventory if role not allowed
const RoleGuard = ({
  element,
  roles,
  fallback = '/inventory',
}: {
  element: React.ReactNode
  roles: string[]
  fallback?: string
}) => {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!roles.includes(user?.role ?? '')) return <Navigate to={fallback} replace />
  return <>{element}</>
}

// ==================== APP ====================

export const App = () => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return <PageLoader />

  return (
    <>
      <Toaster position="top-right" richColors />
      {isAuthenticated && <SessionTracker />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth */}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
          />

          {/* Root — role-based redirect */}
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : user?.role === 'owner' ? (
                <Dashboard />
              ) : user?.role === 'manager' ? (
                <Navigate to="/inventory" replace />
              ) : (
                <Navigate to="/billing" replace />
              )
            }
          />

          {/* Owner + Manager */}
          <Route path="/inventory"         element={<RoleGuard element={<Inventory />}        roles={['owner', 'manager']} fallback="/billing" />} />
          <Route path="/low-stock"         element={<RoleGuard element={<LowStock />}          roles={['owner', 'manager']} />} />
          <Route path="/upcoming-products" element={<RoleGuard element={<UpcomingProducts />}  roles={['owner', 'manager']} />} />
          <Route path="/suppliers"         element={<RoleGuard element={<Suppliers />}         roles={['owner', 'manager']} />} />
          <Route path="/customers"         element={<RoleGuard element={<Customers />}         roles={['owner', 'manager']} />} />

          {/* Owner only */}
          <Route path="/reorder-history"   element={<RoleGuard element={<ReorderHistory />}   roles={['owner']} fallback="/login" />} />
          <Route path="/stock-list"        element={<RoleGuard element={<StockList />}         roles={['owner']} />} />
          <Route path="/stock-report"      element={<RoleGuard element={<StockReport />}       roles={['owner']} />} />
          <Route path="/staff-analytics"   element={<RoleGuard element={<StaffAnalytics />}   roles={['owner']} />} />

          {/* Authenticated (any role) */}
          <Route path="/purchases"                   element={<Protected element={<Purchases />} />} />
          <Route path="/invoices"                    element={<Protected element={<Invoices />} />} />
          <Route path="/invoices/:id"                element={<Protected element={<InvoiceDetail />} />} />
          <Route path="/reports"                     element={<Protected element={<Reports />} />} />
          <Route path="/sales"                       element={<Protected element={<Sales />} />} />
          <Route path="/settings"                    element={<Protected element={<Settings />} />} />
          <Route path="/transactions"                element={<Protected element={<TransactionHistory />} />} />
          <Route path="/expiry-management"           element={<Protected element={<ExpiryManagement />} />} />
          <Route path="/billing"                     element={<Protected element={<Billing />} />} />
          <Route path="/billing/payment-success"     element={<Protected element={<KhaltiPaymentSuccess />} />} />
          <Route path="/purchases/payment-success"   element={<Protected element={<KhaltiPurchaseSuccess />} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
