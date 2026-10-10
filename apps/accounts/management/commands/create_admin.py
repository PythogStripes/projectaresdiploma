"""Создание ЕДИНСТВЕННОГО главного администратора «Арес».

Без аргументов создаёт главного администратора с учётными данными
по умолчанию: логин exampleuser123, пароль example444.

Пример:
    python manage.py create_admin                       (логин exampleuser123 / пароль example444)
    python manage.py create_admin --username ares --password SuperSecret123
"""
import re

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")

DEFAULT_USERNAME = "exampleuser123"
DEFAULT_PASSWORD = "example444"


class Command(BaseCommand):
    help = "Создаёт главного администратора (суперпользователь может быть только один)."

    def add_arguments(self, parser):
        parser.add_argument("--username", help="Имя администратора")
        parser.add_argument("--email", default="", help="E-mail (необязательно)")
        parser.add_argument("--password", help="Пароль (иначе спросит скрытым вводом)")

    def handle(self, *args, **options):
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

        # По умолчанию — учётные данные проекта (exampleuser123 / example444).
        if not username:
            username = DEFAULT_USERNAME
        if not USERNAME_RE.match(username):
            raise CommandError(
                "Имя: 3–20 символов, латиница, цифры и знаки _ . -"
            )
        if User.objects.filter(username__iexact=username).exists():
            raise CommandError("Такое имя пользователя уже занято.")

        if not password:
            password = DEFAULT_PASSWORD
        if len(password) < 6:
            raise CommandError("Пароль должен быть не короче 6 символов.")

        user = User.objects.create_superuser(
            username=username, email=options.get("email") or "", password=password
        )
        self.stdout.write(self.style.SUCCESS(
            f"Главный администратор «{user.username}» создан.\n"
            "  - Django-админка:  http://127.0.0.1:8000/admin/\n"
            "  - Админ-панель сайта: кнопка «Админ-панель» на фронтенде."
        ))
