"""
companies/admin.py

Interface d'administration pour les entreprises.
L'admin peut voir, valider, suspendre et rechercher les entreprises.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Company, CompanyFollower


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display   = ["name", "city", "sector", "size", "status_badge", "recruiter_count", "created_at"]
    list_filter    = ["status", "size", "country"]
    search_fields  = ["name", "email", "city", "sector"]
    readonly_fields = ["slug", "created_by", "created_at", "updated_at"]
    ordering       = ["-created_at"]

    fieldsets = (
        ("Identité", {
            "fields": ("name", "slug", "logo", "description")
        }),
        ("Contact", {
            "fields": ("website", "email", "phone")
        }),
        ("Localisation", {
            "fields": ("address", "city", "country")
        }),
        ("Caractéristiques", {
            "fields": ("sector", "size", "founded_year")
        }),
        ("Statut & Gestion", {
            "fields": ("status", "created_by", "created_at", "updated_at")
        }),
    )

    def status_badge(self, obj):
        """
        Affiche le statut avec une couleur dans l'interface admin.
        Analogie : les voyants colorés d'un tableau de bord.
        """
        colors = {
            "pending":   "#f0ad4e",  # orange
            "active":    "#5cb85c",  # vert
            "suspended": "#d9534f",  # rouge
        }
        color = colors.get(obj.status, "#999")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_badge.short_description = "Statut"

    # Actions rapides depuis la liste
    actions = ["activate_companies", "suspend_companies"]

    def activate_companies(self, request, queryset):
        queryset.update(status="active")
        self.message_user(request, f"{queryset.count()} entreprise(s) activée(s).")
    activate_companies.short_description = "Activer les entreprises sélectionnées"

    def suspend_companies(self, request, queryset):
        queryset.update(status="suspended")
        self.message_user(request, f"{queryset.count()} entreprise(s) suspendue(s).")
    suspend_companies.short_description = "Suspendre les entreprises sélectionnées"


@admin.register(CompanyFollower)
class CompanyFollowerAdmin(admin.ModelAdmin):
    list_display  = ["user", "company", "followed_at"]
    list_filter   = ["company"]
    search_fields = ["user__email", "company__name"]
    readonly_fields = ["followed_at"]