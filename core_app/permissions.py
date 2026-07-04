from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.role == 'ADMIN')
        )


class IsSupervisor(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['ADMIN', 'SUPERVISOR', 'OPERATIONS_MANAGER']
        )


class IsMaintenanceStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['ADMIN', 'SUPERVISOR', 'MAINTENANCE', 'MAINTENANCE_ENGINEER', 'GROUND_STAFF']
        )


class IsAuthenticatedReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.role in ['ADMIN', 'GROUND_STAFF']


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.role == 'ADMIN':
            return True
        return obj.user == request.user


def HasRole(*allowed_roles):
    """
    Factory that returns a permission class allowing only the given roles
    (ADMIN is always allowed) to write; everyone authenticated can read.
    Usage: permission_classes = [HasRole('GATE_MANAGER', 'OPERATIONS_MANAGER')]
    """
    class _RolePermission(BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if request.method in SAFE_METHODS:
                return True
            return request.user.is_staff or request.user.role in (*allowed_roles, 'ADMIN')
    return _RolePermission


class IsGateManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.role in ['ADMIN', 'GATE_MANAGER', 'OPERATIONS_MANAGER', 'GROUND_STAFF']


class IsBaggageSupervisor(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.role in ['ADMIN', 'BAGGAGE_SUPERVISOR', 'GROUND_STAFF']


class IsHR(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ['ADMIN', 'HR']
        )


class IsSecurityOfficer(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff or request.user.role in ['ADMIN', 'SECURITY_OFFICER']


class IsReportsUser(BasePermission):
    """Reports page: ADMIN/SUPERVISOR/OPERATIONS_MANAGER plus GROUND_STAFF get full access."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.role in
             ['ADMIN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'GROUND_STAFF'])
        )


class IsAuthenticatedBlockGroundStaffWrite(BasePermission):
    """Equipment pages: any authenticated user can read; GROUND_STAFF is read-only, others can write."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role != 'GROUND_STAFF'


class IsViewerReadOnly(BasePermission):
    """Pure read-only role — blocks ALL writes regardless of other checks."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'VIEWER':
            return request.method in SAFE_METHODS
        return True
