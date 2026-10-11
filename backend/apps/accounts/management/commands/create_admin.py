"""Команда `python manage.py create_admin`.

Создаёт главного администратора (суперпользователя). Такого человека в системе
может быть только один, поэтому команда сама проверяет, не создан ли он уже.
"""
import re

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User

# Имя тоже должно подходить под наш формат.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")

# Значения по умолчанию — если аргументы не передали в терминале.
DEFAULT_USERNAME = "exampleuser123"
DEFAULT_PASSWORD = "example444"


class Command(BaseCommand):
    help = "Создаёт главного администратора (суперпользователь может быть только один)."

    def add_arguments(self, parser):
        # Описываем, какие аргументы принимает команда (всё необязательно).
        parser.add_argument("--username", help="Имя администратора")
        parser.add_argument("--email", default="", help="E-mail (необязательно)")
        parser.add_argument("--password", help="Пароль (иначе спросит скрытым вводом)")

    def handle(self, *args, **options):
        # Главная проверка: суперпользователь уже есть — второго не создаём.
        if User.objects.filter(is_superuser=True).exists():
            existing = User.objects.get(is_superuser=True)
            raise CommandError(
                f"Главный администратор уже существует: «{existing.username}».\n"
                "Создать второго суперпользователя нельзя.\n"
                "Выдать права администратора обычному пользователю: "
                "python manage.py setadmin <ник> on"
            )

        username = options.get("username")
        password = options.get("password")

        # Если имя не задали — берём стандартное, но всё равно проверяем формат.
        if not username:
            username = DEFAULT_USERNAME
        if not USERNAME_RE.match(username):
            raise CommandError(
                "Имя: 3–20 символов, латиница, цифры и знаки _ . -"
            )
        if User.objects.filter(username__iexact=username).exists():
            raise CommandError("Такое имя пользователя уже занято.")

        # Пароль: стандартный, если не задан; минимум 6 символов.
        if not password:
            password = DEFAULT_PASSWORD
        if len(password) < 6:
            raise CommandError("Пароль должен быть не короче 6 символов.")

        # Создаём главного администратора. Внутри create_superuser тоже стоит
        # защита от второго суперпользователя.
        user = User.objects.create_superuser(
            username=username, email=options.get("email") or "", password=password
        )
        # Дружелюбно подсказываем, куда дальше идти.
        self.stdout.write(self.style.SUCCESS(
            f"Главный администратор «{user.username}» создан.\n"
            "  - Django-админка:  http://127.0.0.1:8000/admin/\n"
            "  - Админ-панель сайта: кнопка «Админ-панель» на фронтенде."
        ))
