from django.conf import settings
from django.db import models


class GameResult(models.Model):
    """Результат одной сыгранной партии (сохраняется для лидерборда)."""

    GAME_CHOICES = [
        ("chess", "Шахматы"),
        ("tictactoe", "Крестики-нолики"),
    ]
    RESULT_CHOICES = [
        ("win", "Победа"),
        ("loss", "Поражение"),
        ("draw", "Ничья"),
    ]
    MODE_CHOICES = [
        ("ai", "Против компьютера"),
        ("hotseat", "Два игрока"),
    ]
    DIFFICULTY_CHOICES = [
        ("easy", "Лёгкий"),
        ("medium", "Средний"),
        ("hard", "Сложный"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="results",
        verbose_name="Игрок",
    )
    game = models.CharField("Игра", max_length=16, choices=GAME_CHOICES)
    result = models.CharField("Результат", max_length=8, choices=RESULT_CHOICES)
    mode = models.CharField("Режим", max_length=8, choices=MODE_CHOICES, default="ai")
    difficulty = models.CharField(
        "Сложность", max_length=8, choices=DIFFICULTY_CHOICES, null=True, blank=True,
    )
    moves = models.PositiveIntegerField("Число ходов", null=True, blank=True)
    created_at = models.DateTimeField("Дата партии", auto_now_add=True)

    class Meta:
        verbose_name = "Результат партии"
        verbose_name_plural = "Результаты партий"
        ordering = ["-created_at"]

    POINTS = {"win": 3, "draw": 1, "loss": 0}

    @property
    def points(self):
        return self.POINTS.get(self.result, 0)

    def __str__(self):
        return f"{self.user.username} — {self.get_game_display()} — {self.get_result_display()}"
