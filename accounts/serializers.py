from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'is_staff']
        read_only_fields = ['is_staff']


# Roles selectable at public self-registration. ADMIN is deliberately excluded —
# elevated/admin access must be granted manually by an existing admin
# afterward.
SELF_REGISTERABLE_ROLES = [choice[0]
                           for choice in User.ROLE_CHOICES if choice[0] != 'ADMIN']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=SELF_REGISTERABLE_ROLES,
        default='VIEWER')

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'A user with this email already exists.')
        return value

    def validate_role(self, value):
        if value == 'ADMIN':
            raise serializers.ValidationError(
                'Self-registration as ADMIN is not permitted.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'VIEWER'),
            phone=validated_data.get('phone', ''),
        )


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        if value.isdigit():
            raise serializers.ValidationError(
                'Password cannot be entirely numeric.')
        return value
