"""
jobs/admin.py

Interface d'administration pour les offres d'emploi.
L'admin peut voir, filtrer, et agir sur toutes les offres.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import JobOffer, JobStatus


@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):

    list_display = [
        "title", "company", "recruiter", "contract_type",
        "status_badge", "deadline_display", "application_count", "created_at",
    ]
    list_filter  = ["status", "contract_type", "experience_level", "work_mode"]
    search_fields = ["title", "company__name", "recruiter__email", "location"]
    readonly_fields = ["slug", "created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Identité de l'offre", {
            "fields": ("title", "slug", "company", "recruiter"),
        }),
        ("Contenu", {
            "fields": ("description", "requirements", "benefits"),
        }),
        ("Conditions", {
            "fields": (
                "contract_type", "experience_level", "work_mode", "location",
                "salary_min", "salary_max", "salary_is_public",
            ),
        }),
        ("Publication", {
            "fields": ("status", "deadline", "created_at", "updated_at"),
        }),
    )

    def status_badge(self, obj):
        """Badge coloré pour le statut de l'offre."""
        colors = {
            JobStatus.DRAFT:     ("#f0ad4e", "⬤"),
            JobStatus.PUBLISHED: ("#5cb85c", "⬤"),
            JobStatus.CLOSED:    ("#d9534f", "⬤"),
        }
        color, icon = colors.get(obj.status, ("#999", "⬤"))
        label = obj.get_status_display()
        # Alerte si expirée mais encore "publiée"
        if obj.status == JobStatus.PUBLISHED and obj.is_expired:
            color = "#cc0000"
            label = "Expirée (publiée)"
        return format_html(
            '<span style="color:{};font-weight:bold;">{} {}</span>',
            color, icon, label,
        )
    status_badge.short_description = "Statut"

    def deadline_display(self, obj):
        """Affiche la deadline en rouge si dépassée."""
        if obj.is_expired:
            return format_html(
                '<span style="color:red;">{}</span>',
                obj.deadline.strftime("%d/%m/%Y")
            )
        return obj.deadline.strftime("%d/%m/%Y")
    deadline_display.short_description = "Date limite"

    # Actions rapides
    actions = ["publish_offers", "close_offers"]

    def publish_offers(self, request, queryset):
        updated = queryset.filter(status=JobStatus.DRAFT).update(status=JobStatus.PUBLISHED)
        self.message_user(request, f"{updated} offre(s) publiée(s).")
    publish_offers.short_description = "Publier les offres sélectionnées"

    def close_offers(self, request, queryset):
        updated = queryset.exclude(status=JobStatus.CLOSED).update(status=JobStatus.CLOSED)
        self.message_user(request, f"{updated} offre(s) clôturée(s).")
    close_offers.short_description = "Clôturer les offres sélectionnées"