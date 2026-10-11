from django.contrib.auth.models import UserManager as DjangoUserManager


class AresUserManager(DjangoUserManager):
    # Менеджер отвечает за создание пользователей. Мы расширили стандартный,
    # чтобы добавить свою проверку в create_superuser.

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Защита на уровне создания: если главный администратор уже есть —
        # второго не заводим. Это ещё один рубеж защиты «суперпользователь один».
        if self.model.objects.filter(is_superuser=True).exists():
            raise ValueError(
                "Главный администратор уже существует. "
                "Создать второго суперпользователя нельзя."
            )
        return super().create_superuser(
            username, email=email, password=password, **extra_fields
        )
