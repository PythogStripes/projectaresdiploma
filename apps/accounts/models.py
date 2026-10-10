from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import AresUserManager


class User(AbstractUser):
    """Пользователь «Арес».

    is_superuser — главный администратор (может быть только один);
    is_staff     — администратор сайта (назначает/снимает главный админ).
    """

    THEME_CHOICES = [
        ("classic", "Оригинал (чёрно-белая)"),
        ("sapphire", "Тёмный сапфир"),
        ("gold", "Тёмное золото"),
    ]

    objects = AresUserManager()

    theme = models.CharField(
        "Тема оформления", max_length=16, choices=THEME_CHOICES, default="classic"
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def save(self, *args, **kwargs):
        # Страховка на уровне модели: второй суперюзер не появится,
        # даже если кто-то попытается создать его напрямую через ORM.
        if self.is_superuser:
            qs = User.objects.filter(is_superuser=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValueError(
                    "Главный администратор уже существует. "
                    "Суперпользователь может быть только один."
                )
        super().save(*args, **kwargs)

    @property
    def public_payload(self):
        return {
            "id": self.pk,
            "username": self.username,
            "email": self.email,
            "is_staff": self.is_staff,
            "is_superuser": self.is_superuser,
            "theme": self.theme,
            "date_joined": self.date_joined.strftime("%d.%m.%Y"),
        }
