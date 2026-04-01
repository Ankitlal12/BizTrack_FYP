/**
 * ============================================================
 * CENTRALIZED BACKEND ROLE POLICY — single source of truth
 * ============================================================
 *
 * API-ROLE MATRIX:
 * ┌──────────────────────────────┬───────┬─────────┬───────┐
 * │ API Group                    │ owner │ manager │ staff │
 * ├──────────────────────────────┼───────┼─────────┼───────┤
 * │ POST   /api/billing/bills    │  ✓    │  ✓      │  ✓    │
 * │ GET    /api/billing/*        │  ✓    │  ✓      │  ✓    │
 * │ POST   /api/billing/khalti/* │  ✓    │  ✓      │  ✓    │
 * │ GET    /api/inventory        │  ✓    │  ✓      │  ✗    │
 * │ POST   /api/inventory        │  ✓    │  ✓      │  ✗    │
 * │ PUT    /api/inventory/:id    │  ✓    │  ✓      │  ✗    │
 * │ DELETE /api/inventory/:id    │  ✓    │  ✗      │  ✗    │
 * │ GET    /api/purchases        │  ✓    │  ✓      │  ✗    │
 * │ POST   /api/purchases        │  ✓    │  ✓      │  ✗    │
 * │ PUT    /api/purchases/:id    │  ✓    │  ✓      │  ✗    │
 * │ DELETE /api/purchases/:id    │  ✓    │  ✗      │  ✗    │
 * │ GET    /api/sales            │  ✓    │  ✓      │  ✗    │
 * │ POST   /api/sales            │  ✓    │  ✓      │  ✗    │
 * │ DELETE /api/sales/:id        │  ✓    │  ✗      │  ✗    │
 * │ GET    /api/invoices         │  ✓    │  ✓      │  ✗    │
 * │ GET    /api/suppliers        │  ✓    │  ✓      │  ✗    │
 * │ POST   /api/suppliers        │  ✓    │  ✓      │  ✗    │
 * │ DELETE /api/suppliers/:id    │  ✓    │  ✗      │  ✗    │
 * │ GET    /api/customers        │  ✓    │  ✓      │  ✗    │
 * │ GET    /api/transactions     │  ✓    │  ✓      │  ✗    │
 * │ GET    /api/reorders         │  ✓    │  ✓      │  ✗    │
 * │ GET    /api/users            │  ✓    │  ✗      │  ✗    │
 * │ POST   /api/users/add        │  ✓    │  ✗      │  ✗    │
 * │ DELETE /api/users/:id        │  ✓    │  ✗      │  ✗    │
 * │ GET    /api/users/staff-*    │  ✓    │  ✗      │  ✗    │
 * └──────────────────────────────┴───────┴─────────┴───────┘
 */

const ROLES = {
  OWNER:   'owner',
  MANAGER: 'manager',
  STAFF:   'staff',
};

const OWNER_MANAGER = [ROLES.OWNER, ROLES.MANAGER];
const OWNER_ONLY    = [ROLES.OWNER];
const ALL_ROLES     = [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF];

module.exports = { ROLES, OWNER_MANAGER, OWNER_ONLY, ALL_ROLES };
