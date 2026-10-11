"""Настройки проекта «Арес».

Здесь собраны все «крутилки» Django: база данных, установленные приложения,
доступ с фронтенда (CORS), язык и т.д. Значения подобраны для локального
запуска; для публикации в интернете многие из них переопределяются через
переменные окружения (см. README).
"""
import os
from pathlib import Path

# BASE_DIR — папка проекта (backend/). От неё строятся все пути к файлам.
BASE_DIR = Path(__file__).resolve().parent.parent

# Секретный ключ Django. В реальном проекте его держат в секрете и передают
# через переменную окружения; здесь — запасное значение «для разработки».
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-ares-hub-dev-key-#k4v9s2lq7mz&x1p8e5t3r6u0w-y+b2n",
)

# Режим отладки: 1 — показывать подробные ошибки (удобно при разработке),
# 0 — «боевой» режим. Через переменную окружения.
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

# С каких адресов разрешено обращаться к сайту. По умолчанию — всем ("*"),
# но на реальном сервере список сужают до своих доменов.
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

# Приложения, которые загружает Django. Стандартные (админка, сессии и т.д.)
# плюс наши: rest_framework для API, corsheaders для доступа с фронтенда,
# и два наших приложения — accounts (аккаунты) и games (игры).
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "apps.accounts",
    "apps.games",
]

# Промежуточные обработчики (middleware) — «прослойки», через которые проходит
# каждый запрос. CorsMiddleware должен стоять как можно выше, чтобы заголовки
# доступа добавлялись ко всем ответам.
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Главный файл с картой адресов сайта.
ROOT_URLCONF = "ares.urls"

# Настройка шаблонов. У нас вся отрисовка на React, поэтому Django-шаблоны
# практически не используются, но оставлены для админки.
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

# Точка входа для сервера.
WSGI_APPLICATION = "ares.wsgi.application"

# База данных. Используем SQLite — один файл db.sqlite3, который создаётся
# автоматически. Для дипломного проекта этого достаточно и удобно.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Своя модель пользователя (с темой оформления и защитой единственного админа).
AUTH_USER_MODEL = "accounts.User"

# Проверки пароля при регистрации: минимум 6 символов и запрет чисто числовых.
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 6}},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Настройки Django REST Framework. По умолчанию авторизация — по токену,
# вход открыт всем (доступ к конкретным ручкам ограничиваем точечно),
# обмен данными идёт в формате JSON.
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

# Разрешаем фронтенду (React на другом порту) обращаться к API. CORS_ALLOW_ALL
# открыт для локальной разработки; на боевом сервере его отключают.
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

# Язык интерфейса и часовой пояс.
LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

# Адрес, по которому отдаются статические файлы.
STATIC_URL = "static/"

# Тип первичных ключей по умолчанию для новых таблиц.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
