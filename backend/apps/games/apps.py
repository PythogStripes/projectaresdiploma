from django.apps import AppConfig

# Регистрационная карточка приложения «Игры».
class GamesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.games"
    verbose_name = "Игры и результаты"
