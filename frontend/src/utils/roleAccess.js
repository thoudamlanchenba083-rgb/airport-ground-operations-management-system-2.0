// Central map of which roles can access which pages.
// Kept in sync with the backend DRF permission classes in core_app/permissions.py:
//   - Reports     -> IsReportsUser         (ADMIN, SUPERVISOR, OPERATIONS_MANAGER, GROUND_STAFF)
//   - Staff       -> IsHR                  (ADMIN, HR) — GROUND_STAFF excluded
//   - Maintenance -> IsMaintenanceStaff    (ADMIN, SUPERVISOR, MAINTENANCE, MAINTENANCE_ENGINEER, GROUND_STAFF)
//   - Equipment   -> open to view, but IsAuthenticatedBlockGroundStaffWrite blocks
//                    GROUND_STAFF from add/edit/delete — GROUND_STAFF excluded from full access
//   - Analytics   -> pulls from Staff + Maintenance endpoints, so only roles with
//                    access to BOTH can see full analytics (effectively ADMIN) — GROUND_STAFF excluded
//
// GROUND_STAFF has full add/edit/delete access (incl. marking notifications read) on every
// other page: flights, gates, baggage, notifications, maintenance, reports.
//
// A page not listed here (or set to null) is open to any authenticated user.
export const PAGE_ROLES = {
  dashboard: null,
  flights: null,
  gates: null,
  baggage: null,
  equipment: null,
  notifications: null,
  chatbot: null,
  maintenance: ['ADMIN', 'SUPERVISOR', 'MAINTENANCE', 'MAINTENANCE_ENGINEER', 'GROUND_STAFF'],
  staff: ['ADMIN', 'HR'],
  reports: ['ADMIN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'GROUND_STAFF'],
  analytics: ['ADMIN'],
}

/**
 * Returns true if the given user is allowed to see the given page.
 * `page` should be one of the keys in PAGE_ROLES (e.g. 'staff', 'reports').
 */
export function canAccessPage(user, page) {
  const allowedRoles = PAGE_ROLES[page]
  if (!allowedRoles) return true // open to everyone who is logged in
  if (!user) return false
  return allowedRoles.includes(user.role)
}
