import logging

logger = logging.getLogger('accounts')

from rest_framework import viewsets, generics, permissions, status


from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from django.contrib.auth import update_session_auth_hash
from .models import User
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer
from core_app.permissions import IsAdminUser

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.response import Response
from rest_framework import status


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """Login endpoint — max 5 attempts per minute per IP."""

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', 'unknown')
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            logger.info(f"Login successful for user '{username}' from IP {request.META.get('REMOTE_ADDR')}")
        else:
            logger.warning(f"Login failed for user '{username}' from IP {request.META.get('REMOTE_ADDR')} - status {response.status_code}")
        return response
@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class RateLimitedTokenRefreshView(TokenRefreshView):
    """Token refresh — max 10 per minute per IP."""
    pass

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        from core_app.email_utils import send_welcome_email
        send_welcome_email(user)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': 'Incorrect password.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'detail': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Logged out successfully.'})
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except AttributeError:
            # Raised if 'rest_framework_simplejwt.token_blacklist' is ever
            # missing from INSTALLED_APPS — fail with a clear message
            # instead of an opaque 500.
            return Response(
                {'detail': 'Logout is temporarily unavailable. Please contact an administrator.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )