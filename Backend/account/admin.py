"""
accounts/admin.py

Configuration de l'interface d'administration Django.
Analogie : C'est le tableau de bord du gestionnaire d'immeuble —
il peut voir et modifier tous les appartements (comptes utilisateurs).
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CandidateProfile, RecruiterProfile, User


class CandidateProfileInline(admin.StackedInline):
    """Affiche le profil candidat directement dans la page de l'utilisateur."""
    model = CandidateProfile
    can_delete = False
    verbose_name_plural = "Profil candidat"


class RecruiterProfileInline(admin.StackedInline):
    """Affiche le profil recruteur directement dans la page de l'utilisateur."""
    model = RecruiterProfile
    can_delete = False
    verbose_name_plural = "Profil recruteur"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    On étend l'admin Django standard pour afficher nos champs custom.
    BaseUserAdmin gère déjà la modification sécurisée du mot de passe.
    """

    # Colonnes visibles dans la liste
    list_display = ["email", "first_name", "last_name", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-created_at"]

    # Champs affichés dans le formulaire de détail
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Informations personnelles", {"fields": ("first_name", "last_name")}),
        ("Rôle & Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    readonly_fields = ["created_at", "updated_at", "last_login"]

    # Champs affichés lors de la création d'un utilisateur
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )

    # Affichage des profils selon le rôle (inline)
    def get_inlines(self, request, obj=None):
        if obj is None:
            return []
        if obj.is_candidate:
            return [CandidateProfileInline]
        if obj.is_recruiter:
            return [RecruiterProfileInline]
        return []

    # On utilise email comme identifiant (pas username)
    USERNAME_FIELD = "email"


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "location", "updated_at"]
    search_fields = ["user__email", "user__first_name", "skills"]


@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "company", "position", "updated_at"]
    search_fields = ["user__email", "company__name"]