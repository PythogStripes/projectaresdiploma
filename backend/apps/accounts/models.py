"""Модель пользователя проекта.

Это стандартный пользователь Django (логин, пароль, e-mail, права), к которому
мы добавили одно поле — тему оформления, — и встроили защиту «главного
администратора должен быть ровно один».
"""
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import AresUserManager


class User(AbstractUser):

    # Доступные темы оформления. Значение слева пишется в базу,
    # справа — показывается человеку в интерфейсе.
    THEME_CHOICES = [
        ("classic", "Оригинал (чёрно-белая)"),
        ("sapphire", "Тёмный сапфир"),
        ("gold", "Тёмное золото"),
    ]

    # Свой менеджер — чтобы перехватывать создание суперпользователя.
    objects = AresUserManager()

    # Тема оформления пользователя. Хранится на сервере, меняется в профиле.
    theme = models.CharField(
        "Тема оформления", max_length=16, choices=THEME_CHOICES, default="classic"
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def save(self, *args, **kwargs):
        # Главный администратор (is_superuser) может быть только один.
        # Перед сохранением проверяем: если этот пользователь — суперпользователь
        # и в базе уже есть другой такой, запрещаем сохранение.
        if self.is_superuser:
            qs = User.objects.filter(is_superuser=True)
            if self.pk:  # при обновлении исключаем самого себя из проверки
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValueError(
                    "Главный администратор уже существует. "
                    "Суперпользователь может быть только один."
                )
        super().save(*args, **kwargs)

    @property
    def public_payload(self):
        # Удобный «чемодан» с данными пользователя, который отдаём на фронтенд.
        # Пароль и прочие секреты сюда не попадают.
        return {
            "id": self.pk,
            "username": self.username,
            "email": self.email,
            "is_staff": self.is_staff,
            "is_superuser": self.is_superuser,
            "theme": self.theme,
            "date_joined": self.date_joined.strftime("%d.%m.%Y"),
        }
