from django.urls import path

from . import views

urlpatterns = [
    path("results/", views.save_result),
    path("results/me/", views.my_results),
    path("leaderboard/", views.leaderboard),
]
