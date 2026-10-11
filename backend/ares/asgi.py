import os

from django.core.asgi import get_asgi_application

# Указываем Django, где лежат настройки проекта.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ares.settings")

# `application` — это точка входа для асинхронных серверов (ASGI).
# Через неё запускается весь наш сайт, когда его разворачивают «по-серьёзному».
application = get_asgi_application()
