// ==================== IMPORTS ====================
import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { useAuth } from './contexts/AuthContext'
import SessionTracker from './components/SessionTracker'
import { canAccess, ROLE_HOME, UserRole } from './config/roles'

// ==================== LAZY PAGE IMPORTS ====================
const Login               = lazy(() => import('./Pages/Login'))
const WebsiteHome         = lazy(() => import('./Pages/WebsiteHome'))
const SaasSignup          = lazy(() => import('./Pages/SaasSignup'))
const SubscriptionRenewal = lazy(() => import('./Pages/SubscriptionRenewal'))
const SaasPaymentSuccess  = lazy(() => import('./Pages/SaasPaymentSuccess'))
const Dashboard           = lazy(() => import('./Pages/Dashboard'))
const AdminOverview       = lazy(() => import('./Pages/AdminOverview'))
const AdminUsers          = lazy(() => import('./Pages/AdminUsers'))
const PaymentHistory      = lazy(() => import('./Pages/PaymentHistory'))
const AdminAuditLog       = lazy(() => import('./Pages/AdminAuditLog'))
const AdminContactMessages = lazy(() => import('./Pages/AdminContactMessages'))
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

/**
 * RoleGuard — checks authentication AND role before rendering.
 * - Not authenticated  → /login
 * - Auth loading       → spinner (prevents flash of restricted content)
 * - Role not allowed   → role's home page + "Access denied" toast
 */
const RoleGuard = ({ element, roles }: { element: React.ReactNode; roles: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !roles.includes(user.role)) {
      toast.error('Access denied', {
        description: `Your role (${user.role}) does not have permission to view this page.`,
      })
    }
  }, [isLoading, isAuthenticated, user, location.pathname])

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user || !roles.includes(user.role)) {
    const home = ROLE_HOME[(user?.role as UserRole) ?? 'staff']
    return <Navigate to={home} replace />
  }
  return <>{element}</>
}

/**
 * Protected — requires authentication only (any role).
 * Uses canAccess() from the centralized role policy so staff
 * cannot reach routes that are not in their allowed list.
 */
const Protected = ({ element }: { element: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !canAccess(user.role as UserRole, location.pathname)) {
      toast.error('Access denied', {
        description: `Your role (${user.role}) does not have permission to view this page.`,
      })
    }
  }, [isLoading, isAuthenticated, user, location.pathname])

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Role check via centralized policy
  if (user && !canAccess(user.role as UserRole, location.pathname)) {
    const home = ROLE_HOME[(user.role as UserRole) ?? 'staff']
    return <Navigate to={home} replace />
  }

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
          {/* ── Auth ── */}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
          />

          {/* ── Public SaaS website ── */}
          <Route path="/signup" element={!isAuthenticated ? <SaasSignup /> : <Navigate to="/" replace />} />
          <Route path="/renew" element={<SubscriptionRenewal />} />
          <Route path="/signup/payment-success" element={<SaasPaymentSuccess />} />
          <Route path="/renew/payment-success" element={<SaasPaymentSuccess />} />

          {/* ── Root: role-based home redirect ── */}
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <WebsiteHome />
              ) : user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : user?.role === 'owner' ? (
                <Dashboard />
              ) : user?.role === 'manager' ? (
                <Navigate to="/inventory" replace />
              ) : (
                <Navigate to="/billing" replace />
              )
            }
          />

          {/* ── Owner + Manager only ── */}
          <Route path="/inventory"         element={<RoleGuard element={<Inventory />}       roles={['owner', 'manager']} />} />
          <Route path="/low-stock"         element={<RoleGuard element={<LowStock />}         roles={['owner', 'manager']} />} />
          <Route path="/upcoming-products" element={<RoleGuard element={<UpcomingProducts />} roles={['owner', 'manager']} />} />
          <Route path="/expiry-management" element={<RoleGuard element={<ExpiryManagement />} roles={['owner', 'manager']} />} />
          <Route path="/suppliers"         element={<RoleGuard element={<Suppliers />}        roles={['owner', 'manager']} />} />
          <Route path="/customers"         element={<RoleGuard element={<Customers />}        roles={['owner', 'manager']} />} />
          <Route path="/purchases"         element={<RoleGuard element={<Purchases />}        roles={['owner', 'manager']} />} />
          <Route path="/purchases/payment-success" element={<RoleGuard element={<KhaltiPurchaseSuccess />} roles={['owner', 'manager']} />} />
          <Route path="/sales"             element={<RoleGuard element={<Sales />}            roles={['owner', 'manager']} />} />
          <Route path="/invoices"          element={<RoleGuard element={<Invoices />}         roles={['owner', 'manager']} />} />
          <Route path="/invoices/:id"      element={<RoleGuard element={<InvoiceDetail />}    roles={['owner', 'manager']} />} />
          <Route path="/transactions"      element={<RoleGuard element={<TransactionHistory />} roles={['owner', 'manager']} />} />
          <Route path="/settings"          element={<RoleGuard element={<Settings />}         roles={['owner', 'manager']} />} />

          {/* ── Admin only ── */}
          <Route path="/admin"             element={<RoleGuard element={<AdminOverview />}    roles={['admin']} />} />
          <Route path="/admin/users"       element={<RoleGuard element={<AdminUsers />}       roles={['admin']} />} />
          <Route path="/admin/payment-history" element={<RoleGuard element={<PaymentHistory />} roles={['admin']} />} />
          <Route path="/admin/audit-log"   element={<RoleGuard element={<AdminAuditLog />}    roles={['admin']} />} />
          <Route path="/admin/contact-messages" element={<RoleGuard element={<AdminContactMessages />} roles={['admin']} />} />

          {/* ── Owner only ── */}
          <Route path="/reports"           element={<RoleGuard element={<Reports />}          roles={['owner']} />} />
          <Route path="/reorder-history"   element={<RoleGuard element={<ReorderHistory />}   roles={['owner']} />} />
          <Route path="/stock-list"        element={<RoleGuard element={<StockList />}         roles={['owner']} />} />
          <Route path="/stock-report"      element={<RoleGuard element={<StockReport />}       roles={['owner']} />} />
          <Route path="/staff-analytics"   element={<RoleGuard element={<StaffAnalytics />}   roles={['owner']} />} />

          {/* ── All authenticated roles (billing + Khalti success) ── */}
          <Route path="/billing"                 element={<Protected element={<Billing />} />} />
          <Route path="/billing/payment-success" element={<Protected element={<KhaltiPaymentSuccess />} />} />

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
