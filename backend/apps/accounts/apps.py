from django.apps import AppConfig

# Регистрационная карточка приложения «Аккаунты».
# Django читает её при старте, чтобы понять, как называется приложение.
class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Аккаунты"
