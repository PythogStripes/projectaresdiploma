import os

from django.core.wsgi import get_wsgi_application

# Указываем Django, где лежат настройки проекта.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ares.settings")

# `application` — точка входа для классического сервера (WSGI).
# Именно этот объект «оживляет» сайт при запуске `python manage.py runserver`
# или при публикации на боевом хостинге.
application = get_wsgi_application()
