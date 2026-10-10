"""Выдать или забрать права администратора (is_staff) у пользователя.

Пример:
    python manage.py setadmin vasya on
    python manage.py setadmin vasya off

Главного администратора (суперпользователя) изменить этой командой нельзя.
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User


class Command(BaseCommand):
    help = "Выдаёт (on) или забирает (off) права администратора сайта у пользователя."

    def add_arguments(self, parser):
        parser.add_argument("username", help="Имя пользователя")
        parser.add_argument("action", choices=["on", "off"], help="on — выдать, off — забрать")

    def handle(self, *args, **options):
        username = options["username"]
        action = options["action"]

        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            raise CommandError(f"Пользователь «{username}» не найден.")

        if user.is_superuser:
            raise CommandError(
                "Это главный администратор — его роль изменять нельзя."
            )

        user.is_staff = action == "on"
        user.save(update_fields=["is_staff"])

        if user.is_staff:
            self.stdout.write(self.style.SUCCESS(
                f"Пользователь «{user.username}» теперь администратор сайта."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Права администратора сняты с пользователя «{user.username}»."
            ))
