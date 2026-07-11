"""
Business logic for authentication cookie handling and account actions.
Kept separate from views.py per the project's services-layer convention.
"""
from django.conf import settings
from rest_framework.exceptions import ValidationError

ACCESS_COOKIE = 'access_token'
REFRESH_COOKIE = 'refresh_token'


class AuthCookieService:
    @staticmethod
    def _cookie_kwargs():
        return dict(
            httponly=True,
            secure=settings.JWT_COOKIE_SECURE,
            samesite=settings.JWT_COOKIE_SAMESITE,
            path='/',
        )

    @classmethod
    def set_auth_cookies(cls, response, access=None, refresh=None):
        kwargs = cls._cookie_kwargs()
        if access is not None:
            response.set_cookie(
                ACCESS_COOKIE, access,
                max_age=int(
                    settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                **kwargs,
            )
        if refresh is not None:
            response.set_cookie(
                REFRESH_COOKIE, refresh,
                max_age=int(
                    settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
                **kwargs,
            )

    @staticmethod
    def clear_auth_cookies(response):
        response.delete_cookie(ACCESS_COOKIE, path='/')
        response.delete_cookie(REFRESH_COOKIE, path='/')


class PasswordChangeService:
    @staticmethod
    def change_password(user, old_password, new_password):
        if not user.check_password(old_password):
            raise ValidationError({'old_password': 'Incorrect password.'})
        user.set_password(new_password)
        user.save()
        return user
