from django.urls import path

from . import views

urlpatterns = [
    path("users/", views.panel_users),
    path("users/<int:user_id>/staff/", views.panel_set_staff),
    path("users/<int:user_id>/delete/", views.panel_delete_user),
    path("stats/", views.panel_stats),
]
