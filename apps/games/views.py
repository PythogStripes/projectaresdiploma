"""API игр: сохранение результатов и лидерборд."""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import GameResult

ALLOWED_GAMES = {choice[0] for choice in GameResult.GAME_CHOICES}
ALLOWED_RESULTS = {choice[0] for choice in GameResult.RESULT_CHOICES}
ALLOWED_MODES = {choice[0] for choice in GameResult.MODE_CHOICES}
ALLOWED_DIFFICULTIES = {choice[0] for choice in GameResult.DIFFICULTY_CHOICES}


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_result(request):
    """Сохранить результат партии текущего пользователя."""
    data = request.data or {}
    game = data.get("game")
    result = data.get("result")
    mode = data.get("mode", "ai")
    difficulty = data.get("difficulty")
    moves = data.get("moves")

    if game not in ALLOWED_GAMES:
        return Response({"detail": "Неизвестная игра."}, status=status.HTTP_400_BAD_REQUEST)
    if result not in ALLOWED_RESULTS:
        return Response({"detail": "Неизвестный результат."}, status=status.HTTP_400_BAD_REQUEST)
    if mode not in ALLOWED_MODES:
        mode = "ai"
    if difficulty not in ALLOWED_DIFFICULTIES:
        difficulty = None
    try:
        moves = int(moves) if moves is not None else None
    except (TypeError, ValueError):
        moves = None

    row = GameResult.objects.create(
        user=request.user, game=game, result=result, mode=mode,
        difficulty=difficulty, moves=moves,
    )
    return Response(
        {"detail": "Результат сохранён.", "result": {
            "id": row.pk, "game": row.game, "result": row.result,
            "mode": row.mode, "difficulty": row.difficulty, "points": row.points,
        }},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_results(request):
    """Статистика текущего пользователя для профиля."""
    return Response(summarize_user(request.user))


def summarize_user(user):
    """Агрегированная статистика пользователя по обеим играм."""
    out = {"username": user.username, "games": {}}
    for code, title in GameResult.GAME_CHOICES:
        qs = GameResult.objects.filter(user=user, game=code)
        wins = qs.filter(result="win").count()
        draws = qs.filter(result="draw").count()
        losses = qs.filter(result="loss").count()
        out["games"][code] = {
            "title": title,
            "total": qs.count(),
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "points": wins * 3 + draws,
        }
    out["recent"] = [
        {
            "game": r.get_game_display(),
            "result": r.get_result_display(),
            "mode": r.get_mode_display(),
            "difficulty": r.get_difficulty_display(),
            "moves": r.moves,
            "date": r.created_at.strftime("%d.%m.%Y %H:%M"),
        }
        for r in GameResult.objects.filter(user=user)[:10]
    ]
    return out


def _board_rows(qs):
    rows = qs.annotate(
        games=Count("id"),
        wins=Count("id", filter=Q(result="win")),
        draws=Count("id", filter=Q(result="draw")),
        losses=Count("id", filter=Q(result="loss")),
    )
    data = []
    for idx, row in enumerate(rows, start=1):
        data.append({
            "place": idx,
            "username": row["user__username"],
            "games": row["games"],
            "wins": row["wins"],
            "draws": row["draws"],
            "losses": row["losses"],
            "points": row["wins"] * 3 + row["draws"],
        })
    return data


@api_view(["GET"])
@permission_classes([AllowAny])
def leaderboard(request):
    """Лидерборд: очки = победа 3 / ничья 1 / поражение 0."""
    User = get_user_model()
    out = {}
    base_fields = ["user__username"]

    def build(qs):
        rows = qs.values(*base_fields).annotate(
            games=Count("id"),
            wins=Count("id", filter=Q(result="win")),
            draws=Count("id", filter=Q(result="draw")),
            losses=Count("id", filter=Q(result="loss")),
        ).order_by("-wins", "-draws", "user__username")
        data = sorted(
            (
                {
                    "username": r["user__username"],
                    "games": r["games"], "wins": r["wins"],
                    "draws": r["draws"], "losses": r["losses"],
                    "points": r["wins"] * 3 + r["draws"],
                }
                for r in rows
            ),
            key=lambda r: (-r["points"], -r["wins"], r["username"].lower()),
        )
        for idx, row in enumerate(data, start=1):
            row["place"] = idx
        return data

    for code, _title in GameResult.GAME_CHOICES:
        out[code] = build(GameResult.objects.filter(game=code))
    out["overall"] = build(GameResult.objects.all())
    return Response(out)
