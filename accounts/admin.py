from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

from .models import User


class UserCreationFormWithRole(UserCreationForm):
    """Add-user form: username + password fields (hashed) plus role/email/phone."""

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email', 'phone', 'role')


class UserChangeFormWithRole(UserChangeForm):
    """Edit-user form for the change page."""

    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreationFormWithRole
    form = UserChangeFormWithRole
    model = User

    # Columns shown on the user list page (/admin/accounts/user/)
    list_display = (
        'username',
        'email',
        'role',
        'phone',
        'is_active',
        'is_staff',
        'last_login')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'phone')
    ordering = ('username',)

    # Fields shown when editing an existing user
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        ('Role', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # Fields shown on the "Add user" page - this is the page that creates
    # username + password (hashed) + role for a new account in one step.
    add_fieldsets = (
        (None, {
            'classes': (
                'wide',), 'fields': (
                'username', 'email', 'phone', 'role', 'password1', 'password2'), }), )
