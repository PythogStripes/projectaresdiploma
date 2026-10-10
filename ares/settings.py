"""
Настройки Django проекта «Арес — Настольный Сайт-Хаб».

Проект рассчитан на запуск «из коробки» на любом ПК:
- SQLite не требует настройки;
- SECRET_KEY берётся из переменной окружения DJANGO_SECRET_KEY,
  но есть безопасный fallback для разработки;
- все важные параметры можно переопределить через переменные окружения.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Ключ из окружения (продакшн) или dev-ключ по умолчанию (локальный запуск).
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-ares-hub-dev-key-#k4v9s2lq7mz&x1p8e5t3r6u0w-y+b2n",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

# По умолчанию разрешаем любые хосты, чтобы проект запускался на любом ПК.
# В продакшне задать: DJANGO_ALLOWED_HOSTS=mydomain.ru,www.mydomain.ru
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

# Приложения
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # сторонние
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # приложения «Арес»
    "apps.accounts",
    "apps.games",
]

MIDDLEWARE = [
    # CORS должен стоять выше CommonMiddleware (требование django-cors-headers)
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ares.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ares.wsgi.application"

# База данных — SQLite (работает на любом ПК без настройки)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Пользователи: собственная модель User с защитой «только один суперюзер»
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 6}},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# DRF: токен-аутентификация (без cookie => без CSRF-проблем для API)
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}

# CORS: проект открывается с любого порта/хоста в режиме разработки.
# Ошибка «corsheaders» исключена: пакет в requirements, приложение в
# INSTALLED_APPS, middleware первым в списке.
CORS_ALLOW_ALL_ORIGINS = os.environ.get("CORS_ALLOW_ALL", "1") == "1"
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
CORS_ALLOW_CREDENTIALS = True

# I18N / TZ
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
