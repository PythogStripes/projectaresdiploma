from django.contrib.auth.models import UserManager as DjangoUserManager


class AresUserManager(DjangoUserManager):

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        if self.model.objects.filter(is_superuser=True).exists():
            raise ValueError(
                "Главный администратор уже существует. "
                "Создать второго суперпользователя нельзя."
            )
        return super().create_superuser(
            username, email=email, password=password, **extra_fields
        )
