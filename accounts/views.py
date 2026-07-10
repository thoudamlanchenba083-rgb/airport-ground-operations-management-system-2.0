import logging

from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django_ratelimit.decorators import ratelimit

from .models import User
from .serializers import UserSerializer, RegisterSerializer, ChangePasswordSerializer
from core_app.permissions import IsAdminUser

logger = logging.getLogger('accounts')

ACCESS_COOKIE = 'access_token'
REFRESH_COOKIE = 'refresh_token'


def _cookie_kwargs():
    return dict(
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path='/',
    )


def _set_auth_cookies(response, access=None, refresh=None):
    kwargs = _cookie_kwargs()
    if access is not None:
        response.set_cookie(
            ACCESS_COOKIE, access,
            max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            **kwargs,
        )
    if refresh is not None:
        response.set_cookie(
            REFRESH_COOKIE, refresh,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            **kwargs,
        )


def _clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE, path='/')
    response.delete_cookie(REFRESH_COOKIE, path='/')


@method_decorator(ratelimit(key='ip', rate='5/m',
                  method='POST', block=True), name='post')
class RateLimitedTokenObtainPairView(TokenObtainPairView):
    """Login endpoint - max 5 attempts per minute per IP.

    Tokens are set as httpOnly cookies rather than returned in the response
    body, so frontend JS never has direct access to them (mitigates token
    theft via XSS). A CSRF cookie is also issued here so the frontend can
    immediately start sending it back on subsequent state-changing requests.
    """

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', 'unknown')
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            logger.info(
                f"Login successful for user '{username}' from IP {request.META.get('REMOTE_ADDR')}")
            access = response.data.pop('access', None)
            refresh = response.data.pop('refresh', None)
            _set_auth_cookies(response, access=access, refresh=refresh)
            get_token(request)  # ensures the csrftoken cookie gets issued
            response.data = {'detail': 'Login successful.'}
        else:
            logger.warning(
                f"Login failed for user '{username}' from IP {request.META.get('REMOTE_ADDR')} - status {response.status_code}")
        return response


@method_decorator(ratelimit(key='ip', rate='10/m',
                  method='POST', block=True), name='post')
class RateLimitedTokenRefreshView(TokenRefreshView):
    """Token refresh - max 10 per minute per IP.

    Reads the refresh token from its httpOnly cookie (the frontend no
    longer sends it in the request body) and writes the rotated
    access/refresh pair back as cookies.
    """

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token missing.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        access = serializer.validated_data.get('access')
        refresh = serializer.validated_data.get('refresh')  # present when ROTATE_REFRESH_TOKENS is on

        response = Response({'detail': 'Token refreshed.'})
        _set_auth_cookies(response, access=access, refresh=refresh)
        return response


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
        serializer = UserSerializer(
            request.user, data=request.data, partial=True)
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
            if not user.check_password(
                    serializer.validated_data['old_password']):
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
        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        response_data = {'detail': 'Logged out successfully.'}
        response_status = status.HTTP_200_OK

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                # Already invalid/expired - fine, we're clearing cookies below regardless.
                pass
            except AttributeError:
                # Raised if 'rest_framework_simplejwt.token_blacklist' is ever
                # missing from INSTALLED_APPS - fail with a clear message
                # instead of an opaque 500.
                response_data = {'detail': 'Logout is temporarily unavailable. Please contact an administrator.'}
                response_status = status.HTTP_503_SERVICE_UNAVAILABLE

        response = Response(response_data, status=response_status)
        _clear_auth_cookies(response)
        return response
