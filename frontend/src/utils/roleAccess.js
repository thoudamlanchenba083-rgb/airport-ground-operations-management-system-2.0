// Central map of which roles can access which pages.
// Kept in sync with the backend DRF permission classes in core_app/permissions.py:
//   - Reports     -> IsSupervisor          (ADMIN, SUPERVISOR, OPERATIONS_MANAGER)
//   - Staff       -> IsHR                  (ADMIN, HR)
//   - Maintenance -> IsMaintenanceStaff    (ADMIN, SUPERVISOR, MAINTENANCE, MAINTENANCE_ENGINEER)
//   - Analytics   -> pulls from Staff + Maintenance endpoints, so only roles with
//                    access to BOTH can see full analytics (effectively ADMIN)
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
  maintenance: ['ADMIN', 'SUPERVISOR', 'MAINTENANCE', 'MAINTENANCE_ENGINEER'],
  staff: ['ADMIN', 'HR'],
  reports: ['ADMIN', 'SUPERVISOR', 'OPERATIONS_MANAGER'],
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
