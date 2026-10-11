from django.urls import path

from . import views

# Маршруты раздела «Игры». Префикс /api/ добавлен в корневом urls.py.
urlpatterns = [
    path("results/", views.save_result),       # сохранить результат партии (вошедшим)
    path("results/me/", views.my_results),     # личная статистика (вошедшим)
    path("leaderboard/", views.leaderboard),   # таблицы лидеров (всем)
]
