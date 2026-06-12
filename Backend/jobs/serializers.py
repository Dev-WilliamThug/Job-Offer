"""
jobs/serializers.py

Analogie : Le serializer est le formulaire de dépôt d'offre.
- CompanyJobCreateSerializer : le formulaire que remplit le recruteur
  pour publier une offre (avec toutes les validations).
- JobOfferListSerializer : la fiche résumée affichée sur le tableau
  d'affichage (juste ce qu'il faut pour choisir de cliquer).
- JobOfferDetailSerializer : la fiche complète qu'on lit avant de
  décider de postuler.
"""

from django.utils import timezone
from rest_framework import serializers

from companies.models import Company
from .models import ContractType, ExperienceLevel, JobOffer, JobStatus, WorkMode


# ──────────────────────────────────────────────────────────
# Lecture publique
# ──────────────────────────────────────────────────────────

class JobOfferListSerializer(serializers.ModelSerializer):
    """
    Version condensée pour les listes et la recherche.
    On n'affiche que les champs utiles au survol.
    """
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_logo = serializers.ImageField(source="company.logo", read_only=True)
    is_expired   = serializers.BooleanField(read_only=True)
    is_open      = serializers.BooleanField(read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            "id", "slug", "title", "company_name", "company_logo",
            "location", "contract_type", "experience_level", "work_mode",
            "salary_display", "status", "deadline", "is_expired", "is_open",
            "created_at",
        ]


class JobOfferDetailSerializer(serializers.ModelSerializer):
    """
    Version complète pour la page de détail d'une offre.
    Inclut les informations de l'entreprise et les compteurs.
    """
    company_name     = serializers.CharField(source="company.name",     read_only=True)
    company_logo     = serializers.ImageField(source="company.logo",     read_only=True)
    company_city     = serializers.CharField(source="company.city",     read_only=True)
    company_slug     = serializers.SlugField(source="company.slug",     read_only=True)
    recruiter_name   = serializers.CharField(source="recruiter.full_name", read_only=True)
    is_expired       = serializers.BooleanField(read_only=True)
    is_open          = serializers.BooleanField(read_only=True)
    salary_display   = serializers.CharField(read_only=True)
    application_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            "id", "slug", "title", "description", "requirements", "benefits",
            "company", "company_name", "company_logo", "company_city", "company_slug",
            "recruiter", "recruiter_name",
            "contract_type", "experience_level", "work_mode", "location",
            "salary_min", "salary_max", "salary_is_public", "salary_display",
            "status", "deadline", "is_expired", "is_open",
            "application_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "recruiter", "created_at", "updated_at"]


# ──────────────────────────────────────────────────────────
# Création / Modification (recruteur)
# ──────────────────────────────────────────────────────────

class JobOfferWriteSerializer(serializers.ModelSerializer):
    """
    Utilisé pour créer ou modifier une offre d'emploi.

    Validations métier intégrées :
    - R6 : salary_min et salary_max doivent être >= 0 (aussi dans le modèle via MinValueValidator)
    - R7 : deadline doit être dans le futur
    - Cohérence : salary_min <= salary_max

    Le recruteur et l'entreprise sont injectés depuis la vue (context),
    pas depuis les données envoyées — pour éviter l'usurpation.
    """

    class Meta:
        model = JobOffer
        fields = [
            "title", "description", "requirements", "benefits",
            "company",
            "contract_type", "experience_level", "work_mode", "location",
            "salary_min", "salary_max", "salary_is_public",
            "status", "deadline",
        ]

    def validate_deadline(self, value):
        """
        R7 : La date limite doit être dans le futur.
        Analogie : on ne peut pas afficher une offre dont la date
        de clôture est déjà passée — ce serait tromper les candidats.
        """
        if value <= timezone.now():
            raise serializers.ValidationError(
                "La date limite de candidature doit être dans le futur."
            )
        return value

    def validate_salary_min(self, value):
        """R6 : Le salaire minimum doit être positif ou nul."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Le salaire ne peut pas être négatif.")
        return value

    def validate_salary_max(self, value):
        """R6 : Le salaire maximum doit être positif ou nul."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Le salaire ne peut pas être négatif.")
        return value

    def validate(self, attrs):
        """Validation croisée : salary_min <= salary_max."""
        salary_min = attrs.get("salary_min")
        salary_max = attrs.get("salary_max")
        if salary_min is not None and salary_max is not None:
            if salary_min > salary_max:
                raise serializers.ValidationError(
                    {"salary_min": "Le salaire minimum ne peut pas dépasser le salaire maximum."}
                )
        return attrs

    def validate_company(self, company):
        """
        Le recruteur ne peut publier une offre QUE pour une entreprise active
        ET dont il est membre (RecruiterProfile.company).
        """
        from companies.models import CompanyStatus

        request = self.context.get("request")

        # Vérifie que l'entreprise est active
        if company.status != CompanyStatus.ACTIVE:
            raise serializers.ValidationError(
                "Vous ne pouvez publier une offre que pour une entreprise active."
            )

        # Vérifie que le recruteur appartient bien à cette entreprise
        if request and hasattr(request.user, "recruiter_profile"):
            if request.user.recruiter_profile.company != company:
                raise serializers.ValidationError(
                    "Vous ne pouvez publier une offre que pour votre propre entreprise."
                )
        return company

    def create(self, validated_data):
        """Le recruteur est injecté depuis request.user (pas depuis les données)."""
        request = self.context["request"]
        return JobOffer.objects.create(
            **validated_data,
            recruiter=request.user,
        )


# ──────────────────────────────────────────────────────────
# Changement de statut (recruteur)
# ──────────────────────────────────────────────────────────

class JobStatusSerializer(serializers.ModelSerializer):
    """
    Permet au recruteur de changer uniquement le statut de son offre
    (draft → published → closed).
    Analogie : le bouton "Publier" ou "Archiver" sur un blog.
    """

    class Meta:
        model = JobOffer
        fields = ["status"]

    def validate_status(self, value):
        instance = self.instance
        if instance is None:
            return value

        # On ne peut pas repasser une offre CLOSED en PUBLISHED
        if instance.status == JobStatus.CLOSED and value == JobStatus.PUBLISHED:
            raise serializers.ValidationError(
                "Une offre clôturée ne peut pas être republiée. Créez-en une nouvelle."
            )
        return value


# ──────────────────────────────────────────────────────────
# Vue admin
# ──────────────────────────────────────────────────────────

class AdminJobOfferSerializer(serializers.ModelSerializer):
    """Serializer complet pour l'admin — tous les champs accessibles."""
    company_name   = serializers.CharField(source="company.name",      read_only=True)
    recruiter_email = serializers.CharField(source="recruiter.email",   read_only=True)
    is_expired     = serializers.BooleanField(read_only=True)

    class Meta:
        model = JobOffer
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]