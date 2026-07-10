from pathlib import Path
from datetime import timedelta
from decouple import config
import os
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

# True whenever running `manage.py test` (or pytest via manage.py) -
# used below to disable rate-limiting so test suites don't get
# throttled by the same 5/min login limit real users face.
TESTING = 'test' in sys.argv or 'pytest' in sys.modules

# Disable rate-limiting during test runs by default so test suites that don't
# add their own @override_settings(RATELIMIT_ENABLE=False) (e.g. ground_equipment)
# don't get throttled by the real 5/min login limit and fail with KeyError('access').
# Still respects an explicit RATELIMIT_ENABLE env var when one is set (e.g. for
# load-testing runserver locally with rate limiting deliberately turned off).
RATELIMIT_ENABLE = config(
    'RATELIMIT_ENABLE', default=str(
        not TESTING), cast=bool)

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'accounts',
    'flights',
    'gates',
    'staff',
    'maintenance',
    'baggage',
    'turnaround',
    'fuel_management',
    'catering',
    'aircraft_cleaning',
    'water_lavatory_service',
    'notifications',
    'reports',
    'core_app',
    'ground_equipment',
    'hr_management',
    'ai_module',
    'passenger_boarding',
    'incident_management',
    'cargo_management',
    'ramp_operations',
    'digital_twin',
    'rest_framework_simplejwt.token_blacklist',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# --- DATABASE (PostgreSQL via env, fallback to SQLite for local dev) ---
DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
# Where `collectstatic` copies files to (admin CSS/JS, DRF browsable API
# assets, etc.) so WhiteNoise can serve them in production. Required -
# collectstatic refuses to run at all without this set, and
# CompressedManifestStaticFilesStorage throws "Missing staticfiles manifest
# entry" on any {% static %} lookup (e.g. loading /admin/) until collectstatic
# has actually populated this directory. Run as part of your build step:
#   python manage.py collectstatic --noinput
STATIC_ROOT = BASE_DIR / 'staticfiles'
# NOTE: previously included frontend/ here via STATICFILES_DIRS, but the
# React app is built/deployed separately (Vercel/Netlify) - Django never
# serves it, so there's nothing of ours to collect from that folder.

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

AUTH_USER_MODEL = 'accounts.User'

# --- Admin path (configurable so it isn't always the default scanner-bait /admin/) ---
# Set ADMIN_URL in your env to something private, e.g. ADMIN_URL=ops-console/.
# Must end with a trailing slash. Defaults to 'admin/' so nothing breaks if unset.
ADMIN_URL = config('ADMIN_URL', default='admin/')

# --- CORS (explicit list only, no silent allow-all) ---
_cors_origins = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = [o.strip()
                        for o in _cors_origins.split(',') if o.strip()]

# Needed so the browser actually sends the httpOnly JWT cookies (and the
# CSRF cookie) on cross-origin requests to this API.
CORS_ALLOW_CREDENTIALS = True

# --- JWT cookie settings ---
# SameSite=None + Secure works whether the frontend ends up on the same
# parent domain as the API or a completely different one - it's the safe
# default until that's decided. It does require real HTTPS in production
# (browsers silently drop SameSite=None cookies that aren't Secure).
# In DEBUG (local dev over plain http), Secure=True would make browsers
# refuse to store the cookie at all, so we relax to Lax+non-secure locally -
# fine there, since a Vite dev server on a different port than Django's is
# still "same-site" (same scheme+domain, only the port differs).
JWT_COOKIE_SECURE = not DEBUG
JWT_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'

CSRF_COOKIE_SECURE = JWT_COOKIE_SECURE
CSRF_COOKIE_SAMESITE = JWT_COOKIE_SAMESITE
# Must stay False (the default) - the frontend's JS needs to read this
# cookie's value to send it back as the X-CSRFToken header.
CSRF_COOKIE_HTTPONLY = False

# Django 4+ requires this explicitly for any cross-origin POST that relies on
# session/cookie auth (the admin panel, primarily - JWT-based API endpoints
# aren't affected). Reuses CORS_ALLOWED_ORIGINS by default so you don't have
# to maintain the same domain list twice; override with CSRF_TRUSTED_ORIGINS
# in your env if the admin is served from a different origin than the API.
_csrf_trusted = config('CSRF_TRUSTED_ORIGINS', default='')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_trusted.split(',') if o.strip()] or CORS_ALLOWED_ORIGINS

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'core_app.exceptions.custom_exception_handler',
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
# --- EMAIL ---
EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL',
                            default='Airport Ops <noreply@airportops.com>')

# --- Weather (used by ai_module for live flight-delay predictions) ---
OPENWEATHER_API_KEY = config('OPENWEATHER_API_KEY', default='')

# LLM-backed AI Assistant (ai_module/llm_engine.py, ai_module/gemini_engine.py).
# If neither key is set (or both fail), the assistant falls back to the
# offline rule-based engine (ai_module/chatbot.py). If both are set, Claude
# is tried first, then Gemini.
ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')
AI_CHAT_MODEL = config('AI_CHAT_MODEL', default='claude-sonnet-4-6')
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
GEMINI_CHAT_MODEL = config('GEMINI_CHAT_MODEL', default='gemini-2.5-flash')


# --- Swagger: require auth (not fully public) ---
SWAGGER_SETTINGS = {
    'USE_SESSION_AUTH': False,
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Enter: Bearer <your JWT access token>',
        },
    },
    'DEFAULT_AUTO_SCHEMA_CLASS': 'drf_yasg.inspectors.SwaggerAutoSchema',
}


# --- Logging: surface production errors instead of losing them silently ---
# Always logs to console (captured by most hosts - Render/Railway/Heroku all
# show stdout in their log viewers) and to a rotating local file. Email-on-error
# only activates if you set ADMINS/EMAIL_* env vars below; otherwise it's a no-op.
LOGS_DIR = BASE_DIR / 'logs'
os.makedirs(LOGS_DIR, exist_ok=True)

_admin_email = config('ADMIN_EMAIL', default='')
ADMINS = [('Admin', _admin_email)] if _admin_email else []
MANAGERS = ADMINS

SERVER_EMAIL = config('SERVER_EMAIL', default=EMAIL_HOST_USER)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} [{levelname}] {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'django.log',
            'maxBytes': 5 * 1024 * 1024,  # 5MB per file
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
