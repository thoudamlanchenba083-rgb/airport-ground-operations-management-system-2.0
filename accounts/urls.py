from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, UserViewSet, ProfileView, ChangePasswordView, LogoutView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path(
        '',
        include(
            router.urls)),
    path(
        'register/',
        RegisterView.as_view(),
        name='register'),
    path(
        'profile/',
        ProfileView.as_view(),
        name='profile'),
    path(
        'change-password/',
        ChangePasswordView.as_view(),
        name='change-password'),
    path(
        'logout/',
        LogoutView.as_view(),
        name='logout'),
]
