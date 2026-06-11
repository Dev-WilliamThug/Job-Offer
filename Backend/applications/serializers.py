"""
applications/serializers.py

Analogie : Le serializer de candidature est le formulaire de dépôt
de dossier dans une agence d'emploi.
- ApplicationCreateSerializer : le formulaire que remplit le candidat
  (avec vérification que le poste est encore disponible).
- ApplicationCandidateSerializer : le reçu que le candidat peut consulter
  (ne montre PAS les notes internes du recruteur).
- ApplicationRecruiterSerializer : la fiche complète vue par le recruteur
  (avec les notes internes et le bouton statut).
"""

from rest_framework import serializers

from jobs.models import JobOffer
from .models import Application, ApplicationStatus


# ──────────────────────────────────────────────────────────
# Vue candidat
# ──────────────────────────────────────────────────────────

class ApplicationCreateSerializer(serializers.ModelSerializer):
    """
    Permet à un candidat de postuler à une offre.

    Validations :
    - R1  : pas de double candidature (unique_together + validation explicite)
    - R5  : l'offre doit être ouverte (publiée et non expirée)
    - R8  : le candidat ne doit pas être recruteur (vérifié dans la vue)

    Le candidat est injecté depuis request.user, pas depuis les données.
    """

    class Meta:
        model  = Application
        fields = ["job_offer", "cover_letter", "resume"]

    def validate_job_offer(self, job_offer):
        """
        R5 : Vérifie que l'offre est encore ouverte.
        On centralise cette vérification ici plutôt que dans la vue
        pour qu'elle soit réutilisable (ex: depuis une tâche Celery).
        """
        if not job_offer.is_open:
            raise serializers.ValidationError(
                "Cette offre est clôturée ou expirée. Les candidatures ne sont plus acceptées."
            )
        return job_offer

    def validate(self, attrs):
        """
        R1 : Vérifie qu'une candidature n'existe pas déjà pour ce duo
        (candidat, offre). Double protection avec unique_together.

        Analogie : comme vérifier qu'on n'a pas déjà envoyé un CV
        à cette entreprise pour ce poste avant d'en envoyer un autre.
        """
        candidate = self.context["request"].user
        job_offer = attrs.get("job_offer")

        if Application.objects.filter(candidate=candidate, job_offer=job_offer).exists():
            raise serializers.ValidationError(
                {"job_offer": "Vous avez déjà postulé à cette offre."}
            )
        return attrs

    def create(self, validated_data):
        """Le candidat est injecté depuis request.user."""
        candidate = self.context["request"].user
        return Application.objects.create(
            **validated_data,
            candidate=candidate,
        )


class ApplicationCandidateSerializer(serializers.ModelSerializer):
    """
    Vue d'une candidature pour le candidat.

    On inclut les informations essentielles de l'offre (titre, entreprise)
    mais on N'EXPOSE PAS le champ recruiter_note — c'est une note interne.

    R4 : Un candidat ne voit QUE ses candidatures → filtrage dans la vue.
    """
    job_title      = serializers.CharField(source="job_offer.title",        read_only=True)
    company_name   = serializers.CharField(source="job_offer.company.name", read_only=True)
    job_slug       = serializers.SlugField(source="job_offer.slug",         read_only=True)
    can_withdraw   = serializers.BooleanField(source="can_be_withdrawn",    read_only=True)

    class Meta:
        model  = Application
        fields = [
            "id", "job_offer", "job_title", "company_name", "job_slug",
            "cover_letter", "resume",
            "status", "can_withdraw",
            "applied_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "applied_at", "updated_at"]


# ──────────────────────────────────────────────────────────
# Vue recruteur
# ──────────────────────────────────────────────────────────

class ApplicationRecruiterSerializer(serializers.ModelSerializer):
    """
    Vue d'une candidature pour le recruteur.
    Inclut les informations du candidat et la note interne.
    """
    candidate_name  = serializers.CharField(source="candidate.full_name",  read_only=True)
    candidate_email = serializers.CharField(source="candidate.email",      read_only=True)
    job_title       = serializers.CharField(source="job_offer.title",       read_only=True)

    # Accès au profil candidat (CV du profil, compétences, etc.)
    candidate_resume    = serializers.FileField(
        source="candidate.candidate_profile.resume", read_only=True
    )
    candidate_skills    = serializers.CharField(
        source="candidate.candidate_profile.skills", read_only=True
    )
    candidate_linkedin  = serializers.URLField(
        source="candidate.candidate_profile.linkedin_url", read_only=True
    )

    class Meta:
        model  = Application
        fields = [
            "id", "job_offer", "job_title",
            "candidate", "candidate_name", "candidate_email",
            "candidate_resume", "candidate_skills", "candidate_linkedin",
            "cover_letter", "resume",
            "status", "recruiter_note",
            "applied_at", "updated_at",
        ]
        read_only_fields = [
            "id", "job_offer", "candidate",
            "cover_letter", "resume", "applied_at",
        ]


class ApplicationStatusSerializer(serializers.ModelSerializer):
    """
    Permet au recruteur de changer le statut et d'ajouter une note.

    Validations :
    - On ne peut pas changer le statut d'une candidature retirée.
    - WITHDRAWN est réservé au candidat (non modifiable par le recruteur ici).
    """

    class Meta:
        model  = Application
        fields = ["status", "recruiter_note"]

    def validate_status(self, value):
        instance = self.instance

        if instance and instance.status == ApplicationStatus.WITHDRAWN:
            raise serializers.ValidationError(
                "Cette candidature a été retirée par le candidat et ne peut plus être traitée."
            )
        if value == ApplicationStatus.WITHDRAWN:
            raise serializers.ValidationError(
                "Le statut 'retiré' ne peut être défini que par le candidat lui-même."
            )
        return value


# ──────────────────────────────────────────────────────────
# Retrait de candidature (candidat)
# ──────────────────────────────────────────────────────────

class ApplicationWithdrawSerializer(serializers.ModelSerializer):
    """
    Permet au candidat de retirer sa candidature.
    On force le statut à WITHDRAWN sans autre choix possible.
    """

    class Meta:
        model  = Application
        fields = ["status"]
        read_only_fields = ["status"]

    def validate(self, attrs):
        if not self.instance.can_be_withdrawn:
            raise serializers.ValidationError(
                "Cette candidature ne peut plus être retirée "
                "(elle a déjà été acceptée ou refusée)."
            )
        return attrs

    def update(self, instance, validated_data):
        instance.status = ApplicationStatus.WITHDRAWN
        instance.save()
        return instance


# ──────────────────────────────────────────────────────────
# Vue admin
# ──────────────────────────────────────────────────────────

class AdminApplicationSerializer(serializers.ModelSerializer):
    """Serializer complet pour l'admin — tous les champs accessibles."""
    candidate_email = serializers.CharField(source="candidate.email",      read_only=True)
    job_title       = serializers.CharField(source="job_offer.title",      read_only=True)
    company_name    = serializers.CharField(source="job_offer.company.name", read_only=True)

    class Meta:
        model  = Application
        fields = "__all__"
        read_only_fields = ["applied_at", "updated_at"]