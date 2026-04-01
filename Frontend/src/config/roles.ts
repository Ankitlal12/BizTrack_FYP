/**
 * ============================================================
 * CENTRALIZED ROLE POLICY — single source of truth
 * ============================================================
 *
 * ROLES:
 *   owner   — full access to everything
 *   manager — inventory, purchases, suppliers, customers, billing
 *   staff   — billing only
 *
 * ROUTE-ROLE MATRIX:
 * ┌─────────────────────────┬───────┬─────────┬───────┐
 * │ Route                   │ owner │ manager │ staff │
 * ├─────────────────────────┼───────┼─────────┼───────┤
 * │ /                       │  ✓    │  ✓      │  ✓    │
 * │ /billing                │  ✓    │  ✓      │  ✓    │
 * │ /billing/payment-success│  ✓    │  ✓      │  ✓    │
 * │ /purchases/payment-*    │  ✓    │  ✓      │  ✗    │
 * │ /inventory              │  ✓    │  ✓      │  ✗    │
 * │ /low-stock              │  ✓    │  ✓      │  ✗    │
 * │ /upcoming-products      │  ✓    │  ✓      │  ✗    │
 * │ /expiry-management      │  ✓    │  ✓      │  ✗    │
 * │ /suppliers              │  ✓    │  ✓      │  ✗    │
 * │ /customers              │  ✓    │  ✓      │  ✗    │
 * │ /purchases              │  ✓    │  ✓      │  ✗    │
 * │ /sales                  │  ✓    │  ✓      │  ✗    │
 * │ /invoices               │  ✓    │  ✓      │  ✗    │
 * │ /invoices/:id           │  ✓    │  ✓      │  ✗    │
 * │ /transactions           │  ✓    │  ✓      │  ✗    │
 * │ /settings               │  ✓    │  ✓      │  ✗    │
 * │ /reports                │  ✓    │  ✗      │  ✗    │
 * │ /reorder-history        │  ✓    │  ✗      │  ✗    │
 * │ /stock-list             │  ✓    │  ✗      │  ✗    │
 * │ /stock-report           │  ✓    │  ✗      │  ✗    │
 * │ /staff-analytics        │  ✓    │  ✗      │  ✗    │
 * └─────────────────────────┴───────┴─────────┴───────┘
 */

export type UserRole = 'owner' | 'manager' | 'staff'

// The default landing page for each role after login or on access-denied redirect
export const ROLE_HOME: Record<UserRole, string> = {
  owner:   '/',
  manager: '/inventory',
  staff:   '/billing',
}

// Routes each role is allowed to visit (used by RoleGuard)
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  owner: [
    '/', '/billing', '/billing/payment-success',
    '/inventory', '/low-stock', '/upcoming-products', '/expiry-management',
    '/suppliers', '/customers',
    '/purchases', '/purchases/payment-success',
    '/sales', '/invoices', '/transactions', '/settings', '/reports',
    '/reorder-history', '/stock-list', '/stock-report', '/staff-analytics',
  ],
  manager: [
    '/', '/billing', '/billing/payment-success',
    '/inventory', '/low-stock', '/upcoming-products', '/expiry-management',
    '/suppliers', '/customers',
    '/purchases', '/purchases/payment-success',
    '/sales', '/invoices', '/transactions', '/settings',
  ],
  staff: [
    '/', '/billing', '/billing/payment-success',
  ],
}

/**
 * Check whether a given role can access a given path.
 * Handles dynamic segments like /invoices/:id by prefix matching.
 */
export const canAccess = (role: UserRole | undefined, path: string): boolean => {
  if (!role) return false
  const allowed = ROLE_ALLOWED_ROUTES[role] ?? []
  return allowed.some(r => path === r || path.startsWith(r + '/'))
}
