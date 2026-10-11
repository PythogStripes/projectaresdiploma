#!/usr/bin/env python
"""Точка входа для всех команд Django.

Что бы вы ни запустили через `python manage.py ...` (сервер, миграции,
создание админа), Django сначала смотрит сюда. Здесь мы говорим ему,
где лежат настройки проекта, а потом передаём дальнейшую работу ему самому.
"""
import os
import sys

def main():
    # Говорим Django, какой файл настроек использовать по умолчанию.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ares.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Если Django не установлен — показываем понятную ошибку, а не «магическую».
        raise ImportError(
            "Не найден Django. Установите зависимости: pip install -r requirements.txt"
        ) from exc
    # Передаём Django всё, что было набрано в терминале после `manage.py`.
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
