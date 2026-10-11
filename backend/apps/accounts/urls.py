from django.urls import path

from . import views

# Маршруты раздела «Аккаунты». Префикс /api/auth/ добавлен в корневом urls.py.
urlpatterns = [
    path("register/", views.register),   # регистрация нового пользователя
    path("login/", views.login),         # вход, выдача токена
    path("logout/", views.logout),       # выход, удаление токена
    path("me/", views.me),               # данные текущего пользователя + смена темы
    path("me/summary/", views.my_summary),  # сводная статистика игрока
]
