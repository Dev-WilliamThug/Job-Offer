"""
applications/admin.py

Interface d'administration pour les candidatures.
L'admin peut voir le cycle de vie complet des candidatures
et intervenir si nécessaire.
"""

from django.contrib import admin
from django.utils.html import format_html

from .models import Application, ApplicationStatus


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):

    list_display = [
        "candidate_name", "job_title", "company_name",
        "status_badge", "applied_at",
    ]
    list_filter  = ["status", "job_offer__company"]
    search_fields = [
        "candidate__email", "candidate__first_name",
        "job_offer__title", "job_offer__company__name",
    ]
    readonly_fields = ["applied_at", "updated_at"]
    ordering = ["-applied_at"]

    fieldsets = (
        ("Candidature", {
            "fields": ("candidate", "job_offer", "cover_letter", "resume"),
        }),
        ("Traitement", {
            "fields": ("status", "recruiter_note"),
        }),
        ("Dates", {
            "fields": ("applied_at", "updated_at"),
        }),
    )

    def candidate_name(self, obj):
        return obj.candidate.full_name
    candidate_name.short_description = "Candidat"

    def job_title(self, obj):
        return obj.job_offer.title
    job_title.short_description = "Offre"

    def company_name(self, obj):
        return obj.job_offer.company.name
    company_name.short_description = "Entreprise"

    def status_badge(self, obj):
        colors = {
            ApplicationStatus.PENDING:   "#f0ad4e",
            ApplicationStatus.REVIEWING: "#5bc0de",
            ApplicationStatus.ACCEPTED:  "#5cb85c",
            ApplicationStatus.REJECTED:  "#d9534f",
            ApplicationStatus.WITHDRAWN: "#999999",
        }
        color = colors.get(obj.status, "#999")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px;">{}</span>',
            color,
            obj.get_status_display(),
        )
    status_badge.short_description = "Statut"

    # Actions rapides
    actions = ["mark_reviewing", "mark_accepted", "mark_rejected"]

    def mark_reviewing(self, request, queryset):
        updated = queryset.filter(status=ApplicationStatus.PENDING).update(
            status=ApplicationStatus.REVIEWING
        )
        self.message_user(request, f"{updated} candidature(s) passée(s) en examen.")
    mark_reviewing.short_description = "Passer en cours d'examen"

    def mark_accepted(self, request, queryset):
        updated = queryset.update(status=ApplicationStatus.ACCEPTED)
        self.message_user(request, f"{updated} candidature(s) acceptée(s).")
    mark_accepted.short_description = "Accepter les candidatures sélectionnées"

    def mark_rejected(self, request, queryset):
        updated = queryset.update(status=ApplicationStatus.REJECTED)
        self.message_user(request, f"{updated} candidature(s) refusée(s).")
    mark_rejected.short_description = "Refuser les candidatures sélectionnées"