"""Обработчики (views) раздела «Аккаунты» и админ-панели.

Здесь: регистрация, вход/выход по токену, профиль со сменой темы,
а также «ручки» админ-панели (список пользователей, выдача прав, удаление).
"""
import re
import threading
import time

from django.contrib.auth import authenticate
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.games.models import GameResult
from apps.games.views import summarize_user

from .models import User

# Разрешённые форматы: имя пользователя и e-mail — через регулярные выражения.
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Самые популярные (и потому ненадёжные) пароли — при регистрации отклоняем.
COMMON_PASSWORDS = {
    "123456", "1234567", "12345678", "123456789", "1234567890",
    "password", "qwerty", "qwerty123", "111111", "000000", "abc123",
    "iloveyou", "admin", "admin123", "1q2w3e4r", "qwertyuiop", "666666",
    "987654321", "123123", "654321", "88888888",
}
# Множество допустимых тем оформления (берём коды из модели пользователя).
ALLOWED_THEMES = {choice[0] for choice in User.THEME_CHOICES}

# Защита от подбора "пароля"
# Словарь «IP -> список времени неудачных попыток» и замок для потокобезопасности.
# Счётчик живёт в памяти процесса и сбрасывается при перезапуске сервера.
_failed_logins: dict = {}
_lock = threading.Lock()

def _client_ip(request):
    # IP-адрес клиента. Если не определился — заглушка «unknown».
    return request.META.get("REMOTE_ADDR", "unknown")

def _too_many_attempts(ip):
    # Проверяем, не превысил ли этот IP лимит (5 неудач в минуту).
    now = time.time()
    with _lock:
        # Оставляем только попытки за последнюю минуту.
        stamps = [t for t in _failed_logins.get(ip, []) if now - t < 60]
        _failed_logins[ip] = stamps
        return len(stamps) >= 5

def _register_failure(ip):
    # Запоминаем ещё одну неудачную попытку входа для этого IP.
    with _lock:
        _failed_logins.setdefault(ip, []).append(time.time())

# Разрешения доступа
# Свои «пропуска» для админских ручек: пускаем только нужных пользователей.

class IsStaff(BasePermission):
    # Пропуск для администраторов сайта (is_staff).
    message = "Доступ только для администраторов."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class IsSuperUser(BasePermission):
    # Пропуск только для главного администратора (is_superuser).
    message = "Доступ только для главного администратора."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    # Регистрация нового игрока. Доступна всем (AllowAny).
    data = request.data or {}
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    password2 = str(data.get("password2", ""))

    errors = {}
    # Проверяем имя: сначала формат, потом занятость.
    if not USERNAME_RE.match(username):
        errors["username"] = (
            "Имя пользователя: 3–20 символов, только латиница, цифры и знаки _ . -"
        )
    elif User.objects.filter(username__iexact=username).exists():
        errors["username"] = "Это имя пользователя уже занято."

    # E-mail необязателен, но если указан — проверяем формат и уникальность.
    if email:
        if not EMAIL_RE.match(email):
            errors["email"] = "Некорректный e-mail."
        elif User.objects.filter(email__iexact=email).exists():
            errors["email"] = "Этот e-mail уже используется."

    # Пароль: длина, отсутствие в списке простых и (если введён повтор) совпадение.
    if len(password) < 6:
        errors["password"] = "Пароль должен содержать минимум 6 символов."
    elif password.lower() in COMMON_PASSWORDS:
        errors["password"] = "Слишком простой пароль, придумайте надёжнее."
    elif password2 and password != password2:
        errors["password2"] = "Пароли не совпадают."

    # Если есть хотя бы одна ошибка — отдаём их все сразу и ничего не создаём.
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    # Создаём обычного пользователя (без админских прав) и сразу выдаём токен,
    # чтобы после регистрации человек оказался «внутри» аккаунта.
    user = User.objects.create_user(username=username, email=email, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "user": user.public_payload,
         "detail": "Регистрация успешна. Добро пожаловать в Арес!"},
        status=status.HTTP_201_CREATED,
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    # Вход в аккаунт. Доступен всем, но с защитой от частых неудачных попыток.
    data = request.data or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    ip = _client_ip(request)

    # Если с этого IP слишком много неудач — просим подождать (код 429).
    if _too_many_attempts(ip):
        return Response(
            {"detail": "Слишком много неудачных попыток. Подождите минуту и попробуйте снова."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Пытаемся аутентифицировать. Сообщение намеренно не уточняет, что именно
    # неверно — логин или пароль, чтобы не помогать злоумышленнику.
    user = authenticate(request, username=username, password=password)
    if user is None:
        _register_failure(ip)
        return Response(
            {"detail": "Неверное имя пользователя или пароль."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Успех — сбрасываем счётчик неудач для этого IP и выдаём токен.
    with _lock:
        _failed_logins.pop(ip, None)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user.public_payload})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    # Выход из аккаунта: удаляем токен текущего пользователя из базы,
    # после этого прежний токен больше не действует.
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Вы вышли из аккаунта."})

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    # GET — вернуть данные текущего пользователя.
    # PATCH — изменить тему оформления.
    user = request.user
    if request.method == "PATCH":
        theme = (request.data or {}).get("theme")
        if theme not in ALLOWED_THEMES:
            return Response(
                {"detail": "Неизвестная тема. Доступны: classic, sapphire, gold."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.theme = theme
        user.save(update_fields=["theme"])
    return Response(user.public_payload)

@api_view(["GET"])
@permission_classes([IsStaff])
def panel_users(request):
    # Список пользователей для админ-панели (только для админов сайта).
    # К каждому добавляем число сыгранных партий и отметку «это вы».
    users = User.objects.annotate(games_count=Count("results")).order_by("date_joined")
    rows = []
    for u in users:
        rows.append({
            **u.public_payload,
            "games": u.games_count,
            "is_you": u.pk == request.user.pk,
        })
    return Response({"users": rows})

@api_view(["POST"])
@permission_classes([IsSuperUser])
def panel_set_staff(request, user_id):
    # Выдать или снять права администратора сайта. Только для главного админа.
    target = get_object_or_404(User, pk=user_id)
    # Главного админа и самого себя трогать нельзя.
    if target.is_superuser:
        return Response(
            {"detail": "Нельзя менять роль главного администратора."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if target.pk == request.user.pk:
        return Response(
            {"detail": "Нельзя изменять собственную роль."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    flag = bool((request.data or {}).get("is_staff"))
    target.is_staff = flag
    target.save(update_fields=["is_staff"])
    return Response({
        "user": {**target.public_payload, "games": GameResult.objects.filter(user=target).count()},
        "detail": "Пользователь назначен администратором." if flag
        else "Права администратора сняты.",
    })

@api_view(["POST"])
@permission_classes([IsSuperUser])
def panel_delete_user(request, user_id):
    # Удалить пользователя. Только для главного админа и не самого себя.
    target = get_object_or_404(User, pk=user_id)
    if target.is_superuser:
        return Response(
            {"detail": "Главного администратора удалить нельзя."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if target.pk == request.user.pk:
        return Response(
            {"detail": "Нельзя удалить собственный аккаунт."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    username = target.username
    target.delete()
    return Response({"detail": f"Пользователь «{username}» удалён."})

@api_view(["GET"])
@permission_classes([IsStaff])
def panel_stats(request):
    # Сводная статистика по играм и пользователям для админ-панели.
    users_total = User.objects.count()
    stats = {"users": users_total, "games": {}}
    # Считаем по каждой игре: всего партий, победы, ничьи, поражения, число игроков.
    for code, title in GameResult.GAME_CHOICES:
        qs = GameResult.objects.filter(game=code)
        stats["games"][code] = {
            "title": title,
            "total": qs.count(),
            "wins": qs.filter(result="win").count(),
            "draws": qs.filter(result="draw").count(),
            "losses": qs.filter(result="loss").count(),
            "players": qs.values("user").distinct().count(),
        }
    # Общий зачёт по всем играм сразу.
    stats["games"]["overall"] = {
        "title": "Все игры",
        "total": GameResult.objects.count(),
        "wins": GameResult.objects.filter(result="win").count(),
        "draws": GameResult.objects.filter(result="draw").count(),
        "losses": GameResult.objects.filter(result="loss").count(),
        "players": User.objects.filter(results__isnull=False).distinct().count(),
    }
    # Сколько админов сайта, не считая главного.
    stats["admins"] = User.objects.filter(is_staff=True, is_superuser=False).count()
    return Response(stats)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_summary(request):
    # Личная сводка игрока (та же функция, что и в разделе игр).
    return Response(summarize_user(request.user))
