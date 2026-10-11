from django.urls import path

from . import views

# Маршруты админ-панели сайта. Префикс /api/panel/ добавлен в корневом urls.py.
# Права доступа проверяются уже во вьюхах (views) отдельными классами-разрешениями.
urlpatterns = [
    path("users/", views.panel_users),                          # список пользователей (админам)
    path("users/<int:user_id>/staff/", views.panel_set_staff),  # выдать/снять права админа (гл. админ)
    path("users/<int:user_id>/delete/", views.panel_delete_user),  # удалить пользователя (гл. админ)
    path("stats/", views.panel_stats),                          # общая статистика (админам)
]
