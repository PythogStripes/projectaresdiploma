"""API аккаунтов: регистрация, вход, профиль, панель администратора."""
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

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
COMMON_PASSWORDS = {
    "123456", "1234567", "12345678", "123456789", "1234567890",
    "password", "qwerty", "qwerty123", "111111", "000000", "abc123",
    "iloveyou", "admin", "admin123", "1q2w3e4r", "qwertyuiop", "666666",
    "987654321", "123123", "654321", "88888888",
}
ALLOWED_THEMES = {choice[0] for choice in User.THEME_CHOICES}

# Простая защита входа: не более 5 неудачных попыток в минуту с одного IP.
_failed_logins: dict = {}
_lock = threading.Lock()


def _client_ip(request):
    return request.META.get("REMOTE_ADDR", "unknown")


def _too_many_attempts(ip):
    now = time.time()
    with _lock:
        stamps = [t for t in _failed_logins.get(ip, []) if now - t < 60]
        _failed_logins[ip] = stamps
        return len(stamps) >= 5


def _register_failure(ip):
    with _lock:
        _failed_logins.setdefault(ip, []).append(time.time())


# Права доступа
class IsStaff(BasePermission):
    """Доступ только для администраторов сайта (is_staff)."""

    message = "Доступ только для администраторов."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsSuperUser(BasePermission):
    """Доступ только для главного администратора (суперпользователя)."""

    message = "Доступ только для главного администратора."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


# Регистрация / вход / выход / профиль
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    data = request.data or {}
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", ""))
    password2 = str(data.get("password2", ""))

    errors = {}
    if not USERNAME_RE.match(username):
        errors["username"] = (
            "Имя пользователя: 3–20 символов, только латиница, цифры и знаки _ . -"
        )
    elif User.objects.filter(username__iexact=username).exists():
        errors["username"] = "Это имя пользователя уже занято."

    if email:
        if not EMAIL_RE.match(email):
            errors["email"] = "Некорректный e-mail."
        elif User.objects.filter(email__iexact=email).exists():
            errors["email"] = "Этот e-mail уже используется."

    if len(password) < 6:
        errors["password"] = "Пароль должен содержать минимум 6 символов."
    elif password.lower() in COMMON_PASSWORDS:
        errors["password"] = "Слишком простой пароль, придумайте надёжнее."
    elif password2 and password != password2:
        errors["password2"] = "Пароли не совпадают."

    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    # is_staff/is_superuser принудительно False — роли выдаёт только админ.
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
    data = request.data or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    ip = _client_ip(request)

    if _too_many_attempts(ip):
        return Response(
            {"detail": "Слишком много неудачных попыток. Подождите минуту и попробуйте снова."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        _register_failure(ip)
        # Маленькая защита: не раскрываем, что именно неверно.
        return Response(
            {"detail": "Неверное имя пользователя или пароль."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    with _lock:
        _failed_logins.pop(ip, None)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user.public_payload})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Вы вышли из аккаунта."})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
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


# Панель администратора (REST): пользователи, роли, статистика
@api_view(["GET"])
@permission_classes([IsStaff])
def panel_users(request):
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
    """Выдать или забрать права администратора (is_staff) у пользователя."""
    target = get_object_or_404(User, pk=user_id)
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
    users_total = User.objects.count()
    stats = {"users": users_total, "games": {}}
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
    stats["games"]["overall"] = {
        "title": "Все игры",
        "total": GameResult.objects.count(),
        "wins": GameResult.objects.filter(result="win").count(),
        "draws": GameResult.objects.filter(result="draw").count(),
        "losses": GameResult.objects.filter(result="loss").count(),
        "players": User.objects.filter(results__isnull=False).distinct().count(),
    }
    stats["admins"] = User.objects.filter(is_staff=True, is_superuser=False).count()
    return Response(stats)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_summary(request):
    return Response(summarize_user(request.user))
