"""Главный URL-маршрутизатор «Арес»."""
from django.contrib import admin
from django.urls import include, path

from apps.accounts.admin import ares_admin_site

# Регистрируем кастомную админ-панель (доступ только у суперюзера).
# Стандартный admin.site не используется, чтобы никто, кроме главного
# администратора, не попал в /admin/.
admin.autodiscover()

urlpatterns = [
    path("admin/", ares_admin_site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/panel/", include("apps.accounts.urls_panel")),
    path("api/", include("apps.games.urls")),
]
