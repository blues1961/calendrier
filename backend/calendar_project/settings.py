import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent


def _split_env(name: str, default: str = ""):
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]


def _env_bool(name: str, default: bool = False):
    val = os.environ.get(name)
    if val is None or val == "":
        return default

    normalized = str(val).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _env_int(name: str, default: int):
    val = os.environ.get(name)
    if val is None or val == "":
        return default
    try:
        return int(val)
    except Exception:
        return default


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me")
DEBUG = _env_bool("DJANGO_DEBUG", os.environ.get("APP_ENV", "dev") == "dev")

ALLOWED_HOSTS = _split_env(
    "DJANGO_ALLOWED_HOSTS",
    os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1,backend,0.0.0.0"),
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "calendar_api",
]

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "calendar_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "calendar_project.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", os.environ.get("POSTGRES_HOST", "db")),
        "PORT": os.environ.get("DB_PORT", os.environ.get("POSTGRES_PORT", "5432")),
    }
}

LANGUAGE_CODE = "fr-ca"
TIME_ZONE = "America/Toronto"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=_env_int("ACCESS_TOKEN_LIFETIME_MIN", 60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=_env_int("REFRESH_TOKEN_LIFETIME_DAYS", 7)
    ),
}

CORS_ALLOWED_ORIGINS = _split_env("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = _split_env(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    os.environ.get("CSRF_TRUSTED_ORIGINS", ""),
)
CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    if not CORS_ALLOWED_ORIGINS:
        vite_port = os.environ.get("DEV_VITE_PORT", "5173")
        CORS_ALLOWED_ORIGINS = [
            f"http://localhost:{vite_port}",
            f"http://127.0.0.1:{vite_port}",
        ]
    if not CSRF_TRUSTED_ORIGINS:
        vite_port = os.environ.get("DEV_VITE_PORT", "5173")
        CSRF_TRUSTED_ORIGINS = [
            "http://localhost",
            "http://127.0.0.1",
            f"http://localhost:{vite_port}",
            f"http://127.0.0.1:{vite_port}",
        ]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = _env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = _env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = _env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_HSTS_SECONDS = int(
    os.environ.get("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG
)
SECURE_HSTS_PRELOAD = _env_bool("SECURE_HSTS_PRELOAD", not DEBUG)
