from django.contrib import admin
from django.urls import include, path

# Наша кастомная админка — открывается только главному администратору
# (описана в apps/accounts/admin.py).
from apps.accounts.admin import ares_admin_site

# Собираем модули и настраиваем автоматический сбор админ-классов.
admin.autodiscover()

# Корневая карта адресов сайта: куда направить запрос, в зависимости от пути.
urlpatterns = [
    # Стандартная админка Django (только для суперпользователя).
    path("admin/", ares_admin_site.urls),
    # Вход/регистрация/профиль.
    path("api/auth/", include("apps.accounts.urls")),
    # Админ-панель сайта (управление пользователями и статистика).
    path("api/panel/", include("apps.accounts.urls_panel")),
    # Результаты партий и лидерборд.
    path("api/", include("apps.games.urls")),
]
