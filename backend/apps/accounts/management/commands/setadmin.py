"""Команда `python manage.py setadmin <ник> on|off`.

Выдаёт (`on`) или забирает (`off`) права администратора сайта (is_staff)
у обычного пользователя. Главного администратора эта команда не трогает.
"""
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User

class Command(BaseCommand):
    help = "Выдаёт (on) или забирает (off) права администратора сайта у пользователя."

    def add_arguments(self, parser):
        # Два обязательных аргумента: кого и что сделать.
        parser.add_argument("username", help="Имя пользователя")
        parser.add_argument("action", choices=["on", "off"], help="on — выдать, off — забрать")

    def handle(self, *args, **options):
        username = options["username"]
        action = options["action"]

        # Ищем пользователя без учёта регистра в имени.
        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            raise CommandError(f"Пользователь «{username}» не найден.")

        # Главного админа трогать нельзя — его роль неизменна.
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
