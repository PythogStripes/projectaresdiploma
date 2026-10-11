"""Настройка админки Django.

Здесь мы:
- описываем форму редактирования пользователя с защитой «суперпользователь один»;
- настраиваем, как пользователи и результаты партий выглядят в админке;
- создаём собственную админку, вход в которую разрешён только главному админу.
"""
from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.core.exceptions import ValidationError

from apps.games.models import GameResult

from .models import User

class AresUserChangeForm(forms.ModelForm):
    # Форма редактирования пользователя в стандартной админке.
    # Нужна, чтобы продублировать защиту «главный админ один» и на уровне формы.
    class Meta:
        model = User
        fields = "__all__"

    def clean_is_superuser(self):
        # Проверяем поле «суперпользователь» перед сохранением.
        value = bool(self.cleaned_data.get("is_superuser"))
        others = User.objects.filter(is_superuser=True).exclude(pk=self.instance.pk)
        if value and others.exists():
            raise ValidationError("Может быть только один суперпользователь.")
        if not value and self.instance.pk and self.instance.is_superuser:
            raise ValidationError(
                "Нельзя снять права суперпользователя — главный администратор должен быть один."
            )
        return value

    def clean(self):
        cleaned = super().clean()
        is_superuser = cleaned.get("is_superuser")
        # Суперпользователю автоматически включаем доступ к админке и активность,
        # иначе он просто не сможет войти.
        if is_superuser:
            cleaned["is_staff"] = True
            cleaned["is_active"] = True
        return cleaned

class AresUserAdmin(UserAdmin):
    # Как показывать пользователей в админке: колонки, фильтры, поиск,
    # плюс наш блок «Арес» с полем темы оформления.
    form = AresUserChangeForm
    list_display = ("username", "email", "is_staff", "is_superuser", "theme", "date_joined")
    list_filter = ("is_staff", "is_superuser", "is_active", "theme")
    fieldsets = UserAdmin.fieldsets + (("Арес", {"fields": ("theme",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Арес", {"fields": ("theme",)}),)
    search_fields = ("username", "email")
    ordering = ("username",)

class GameResultAdmin(admin.ModelAdmin):
    # Как показывать результаты партий в админке.
    list_display = ("user", "game", "result", "mode", "moves", "created_at")
    list_filter = ("game", "result", "mode")
    search_fields = ("user__username",)
    date_hierarchy = "created_at"

class SuperuserOnlyAdminSite(admin.AdminSite):
    # Своя версия админки: пускает внутрь только главного администратора.
    # Обычные админы сайта (is_staff) сюда не попадают.

    site_header = "Арес — панель главного администратора"
    site_title = "Арес · Админ"
    index_title = "Управление Настольным Сайт-Хабом"

    def has_permission(self, request):
        # Разрешаем вход только активному суперпользователю.
        return bool(
            request.user.is_active
            and request.user.is_superuser
        )

# Создаём экземпляр нашей админки и регистрируем в нём нужные модели.
ares_admin_site = SuperuserOnlyAdminSite(name="ares_admin")
ares_admin_site.register(User, AresUserAdmin)
ares_admin_site.register(GameResult, GameResultAdmin)
