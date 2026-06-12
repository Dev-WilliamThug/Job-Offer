"""
jobs/models.py

Modèles de l'application jobs.

Analogie : Si companies est le registre des locataires d'un immeuble,
jobs est le panneau d'affichage des offres dans le hall.
Chaque offre est une fiche collée sur ce panneau :
elle a une durée de validité (deadline), un auteur (recruteur),
un propriétaire (company), et des conditions (salaire, contrat, lieu).

Règles métier couvertes ici :
- R2 : Seuls les recruteurs créent des offres   → permission dans views.py
- R5 : Offre expirée → plus de candidature       → propriété is_expired + validation dans applications/
- R6 : Salaire positif                           → MinValueValidator
- R7 : Date limite future                        → validate_deadline dans serializers.py
"""

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

User = get_user_model()


class ContractType(models.TextChoices):
    """
    Type de contrat proposé.
    Analogie : les différentes formules d'abonnement d'un opérateur —
    prépayé (freelance), mensuel (CDD), annuel (CDI)...
    """
    CDI        = "cdi",        "CDI"
    CDD        = "cdd",        "CDD"
    INTERNSHIP = "internship", "Stage"
    FREELANCE  = "freelance",  "Freelance / Mission"
    APPRENTICE = "apprentice", "Alternance / Apprentissage"
    PARTTIME   = "parttime",   "Temps partiel"


class ExperienceLevel(models.TextChoices):
    """Niveau d'expérience requis pour le poste."""
    JUNIOR     = "junior",     "Junior (0–2 ans)"
    MID        = "mid",        "Confirmé (2–5 ans)"
    SENIOR     = "senior",     "Senior (5+ ans)"
    LEAD       = "lead",       "Lead / Manager"
    NO_REQUIRE = "no_require", "Sans exigence"


class JobStatus(models.TextChoices):
    """
    Statut de publication d'une offre.
    Une offre passe par : DRAFT → PUBLISHED → CLOSED
    Le recruteur peut la repasser en DRAFT ou la clore manuellement.
    L'expiration est automatique (calculée à partir de deadline).
    """
    DRAFT     = "draft",     "Brouillon"
    PUBLISHED = "published", "Publiée"
    CLOSED    = "closed",    "Clôturée"


class WorkMode(models.TextChoices):
    """Mode de travail proposé."""
    ONSITE  = "onsite",  "Présentiel"
    REMOTE  = "remote",  "Télétravail"
    HYBRID  = "hybrid",  "Hybride"


class JobOffer(models.Model):
    """
    Représente une offre d'emploi publiée par un recruteur.

    Relations :
    - company  : l'entreprise qui publie (ForeignKey → companies.Company)
    - recruiter: le recruteur qui a créé l'offre (ForeignKey → accounts.User)

    On stocke les deux car :
    - company  = l'entité légale (affichée publiquement)
    - recruiter = la personne physique (utile pour les notifications, l'audit)

    Règles intégrées dans le modèle :
    - salary >= 0 (MinValueValidator)
    - is_expired est calculé dynamiquement depuis deadline
    """

    title = models.CharField(max_length=255, verbose_name="Intitulé du poste")
    slug  = models.SlugField(max_length=270, unique=True, blank=True, verbose_name="Slug (URL)")

    description  = models.TextField(verbose_name="Description du poste")
    requirements = models.TextField(blank=True, verbose_name="Profil recherché / Prérequis")
    benefits     = models.TextField(blank=True, verbose_name="Avantages")

    # Qui publie l'offre
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="job_offers",
        verbose_name="Entreprise"
    )
    recruiter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="job_offers",
        verbose_name="Recruteur"
    )

    # Caractéristiques du poste
    contract_type    = models.CharField(max_length=20, choices=ContractType.choices, default=ContractType.CDI, verbose_name="Type de contrat")
    experience_level = models.CharField(max_length=20, choices=ExperienceLevel.choices, default=ExperienceLevel.NO_REQUIRE, verbose_name="Niveau d'expérience")
    work_mode        = models.CharField(max_length=10, choices=WorkMode.choices, default=WorkMode.ONSITE, verbose_name="Mode de travail")

    # Localisation (peut différer du siège social)
    location = models.CharField(max_length=200, blank=True, verbose_name="Lieu de travail")

    # Rémunération — R6 : le salaire doit être positif (MinValueValidator(0))
    salary_min = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire minimum (FCFA ou autre)"
    )
    salary_max = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire maximum"
    )
    salary_is_public = models.BooleanField(default=True, verbose_name="Afficher le salaire publiquement")

    # Statut et durée de vie
    status = models.CharField(
        max_length=15,
        choices=JobStatus.choices,
        default=JobStatus.DRAFT,
        verbose_name="Statut"
    )

    # R7 : La date limite doit être future — validée dans le serializer
    deadline = models.DateTimeField(verbose_name="Date limite de candidature")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Offre d'emploi"
        verbose_name_plural = "Offres d'emploi"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} — {self.company.name}"

    def save(self, *args, **kwargs):
        """Auto-génère un slug unique depuis le titre + nom de l'entreprise."""
        if not self.slug:
            from django.utils.text import slugify
            base = slugify(f"{self.title}-{self.company.name}")
            slug, counter = base, 1
            while JobOffer.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    # ── Helpers métier ─────────────────────────────────

    @property
    def is_expired(self):
        """
        R5 : Une offre expirée ne peut plus accepter de candidatures.
        On compare la deadline à l'heure courante (timezone-aware).
        """
        return timezone.now() > self.deadline

    @property
    def is_open(self):
        """
        Vrai si l'offre est publiée ET non expirée.
        C'est le critère complet pour accepter une candidature.
        """
        return self.status == JobStatus.PUBLISHED and not self.is_expired

    @property
    def application_count(self):
        """Nombre de candidatures reçues sur cette offre."""
        return self.applications.count()

    @property
    def salary_display(self):
        """Retourne une chaîne lisible du salaire ou None si non public."""
        if not self.salary_is_public:
            return "Salaire non communiqué"
        if self.salary_min and self.salary_max:
            return f"{self.salary_min:,.0f} – {self.salary_max:,.0f}"
        if self.salary_min:
            return f"À partir de {self.salary_min:,.0f}"
        return None