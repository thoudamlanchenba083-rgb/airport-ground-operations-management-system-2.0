from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'phone', 'is_staff']
        read_only_fields = ['is_staff']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    ALLOWED_ROLES = ['GROUND_STAFF', 'SUPERVISOR', 'MAINTENANCE']

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'phone']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_role(self, value):
        if value == 'ADMIN':
            raise serializers.ValidationError('You cannot register as ADMIN. Contact your administrator.')
        if value not in self.ALLOWED_ROLES:
            raise serializers.ValidationError(f'Invalid role. Allowed: {", ".join(self.ALLOWED_ROLES)}')
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'GROUND_STAFF'),
            phone=validated_data.get('phone', ''),
        )


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        if value.isdigit():
            raise serializers.ValidationError('Password cannot be entirely numeric.')
        return value