"""
companies/serializers.py

Analogie : Le serializer est l'agent immobilier de l'API.
Quand un recruteur soumet la fiche d'une entreprise (entrée),
l'agent vérifie que tout est en ordre (validation).
Quand un candidat consulte la fiche (sortie), l'agent
présente les informations de façon claire et structurée.
"""

from django.utils.text import slugify
from rest_framework import serializers

from account.serializers import UserSerializer
from .models import Company, CompanyFollower, CompanySize, CompanyStatus


class CompanyCreateSerializer(serializers.ModelSerializer):
    """
    Utilisé à la création d'une entreprise par un recruteur.
    On ne laisse pas le recruteur choisir le statut (toujours PENDING)
    ni le créateur (toujours request.user).
    """

    class Meta:
        model = Company
        fields = [
            "name", "description", "website", "email", "phone",
            "logo", "address", "city", "country",
            "sector", "size", "founded_year",
        ]

    def validate_founded_year(self, value):
        """L'année de création ne peut pas être dans le futur."""
        from django.utils import timezone
        current_year = timezone.now().year
        if value and value > current_year:
            raise serializers.ValidationError(
                "L'année de création ne peut pas être dans le futur."
            )
        return value

    def create(self, validated_data):
        """
        Le créateur est injecté depuis la vue (request.user).
        Le statut est forcé à PENDING — l'admin devra valider.
        Lie automatiquement l'entreprise au profil recruteur.
        """
        request = self.context["request"]
        company = Company.objects.create(
            **validated_data,
            created_by=request.user,
            status=CompanyStatus.PENDING,
        )
        if hasattr(request.user, "recruiter_profile"):
            profile = request.user.recruiter_profile
            profile.company = company
            profile.save(update_fields=["company"])
        return company


class CompanyUpdateSerializer(serializers.ModelSerializer):
    """
    Mise à jour partielle d'une entreprise par son recruteur.
    On exclut les champs sensibles (statut, créateur).
    """

    class Meta:
        model = Company
        fields = [
            "name", "description", "website", "email", "phone",
            "logo", "address", "city", "country",
            "sector", "size", "founded_year",
        ]


class CompanyListSerializer(serializers.ModelSerializer):
    """
    Version légère pour les listes (recherche, catalogue).
    Contient uniquement les champs utiles à l'affichage en liste.
    On évite de charger la description complète ou les recruteurs.
    """

    job_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id", "name", "slug", "logo", "city", "country",
            "sector", "size", "status", "job_count",
        ]


class CompanyDetailSerializer(serializers.ModelSerializer):
    """
    Version complète pour la page de détail d'une entreprise.
    Inclut les informations du créateur (en lecture seule).
    """

    created_by = UserSerializer(read_only=True)
    job_count = serializers.IntegerField(read_only=True)
    recruiter_count = serializers.IntegerField(read_only=True)
    is_followed = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id", "name", "slug", "description", "website", "email", "phone",
            "logo", "address", "city", "country", "sector", "size", "founded_year",
            "status", "created_by", "job_count", "recruiter_count",
            "is_followed", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "status", "created_by", "created_at", "updated_at"]

    def get_is_followed(self, obj):
        """
        Indique si l'utilisateur courant suit cette entreprise.
        Retourne False si l'utilisateur n'est pas connecté.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return CompanyFollower.objects.filter(
                user=request.user, company=obj
            ).exists()
        return False


# ── Admin ────────────────────────────────────────────────────────

class AdminCompanyStatusSerializer(serializers.ModelSerializer):
    """
    Permet à l'admin de changer uniquement le statut d'une entreprise.
    Analogie : comme le tampon "Approuvé / Refusé" du responsable
    dans un dossier administratif.
    """

    class Meta:
        model = Company
        fields = ["status"]

    def validate_status(self, value):
        allowed = [s.value for s in CompanyStatus]
        if value not in allowed:
            raise serializers.ValidationError(f"Statut invalide. Valeurs acceptées : {allowed}")
        return value


# ── Followers ────────────────────────────────────────────────────

class CompanyFollowerSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    company_id   = serializers.IntegerField(source="company.id",   read_only=True)

    class Meta:
        model = CompanyFollower
        fields = ["id", "company_id", "company_name", "followed_at"]
        read_only_fields = ["id", "followed_at"]