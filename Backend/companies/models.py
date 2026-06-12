"""
companies/models.py

Modèles de l'application companies.

Analogie : Si account est la carte d'identité des personnes,
companies est le registre du commerce. On y consigne les entreprises
qui publient des offres, avec toutes leurs informations légales et pratiques.

Une Company est liée à un ou plusieurs recruteurs (RecruiterProfile dans account/).
Elle est également référencée par les JobOffer (app jobs/).
"""

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

User = get_user_model()


class CompanySize(models.TextChoices):
    """
    Taille de l'entreprise — liste fermée standardisée.
    Ces catégories sont communes dans les plateformes RH.
    """
    MICRO      = "micro",      "Micro (1–9 employés)"
    SMALL      = "small",      "Petite (10–49 employés)"
    MEDIUM     = "medium",     "Moyenne (50–249 employés)"
    LARGE      = "large",      "Grande (250–999 employés)"
    ENTERPRISE = "enterprise", "Très grande (1000+ employés)"


class CompanyStatus(models.TextChoices):
    """
    Statut de validation d'une entreprise.
    Analogie : comme un compte bancaire professionnel —
    il peut être en attente d'activation, actif ou suspendu.
    """
    PENDING   = "pending",   "En attente de validation"
    ACTIVE    = "active",    "Active"
    SUSPENDED = "suspended", "Suspendue"


class Company(models.Model):
    """
    Représente une entreprise sur la plateforme.

    Règle métier : seul un recruteur (role=recruiter) peut créer
    une entreprise. Cette règle est appliquée dans la vue via
    la permission IsRecruiter, pas dans le modèle.

    Le champ `created_by` pointe vers l'utilisateur qui a créé
    la fiche entreprise — ce sera toujours un recruteur.
    """

    name = models.CharField(
        max_length=255,
        unique=True,
        verbose_name="Nom de l'entreprise"
    )
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        verbose_name="Slug (URL)"
    )
    description = models.TextField(blank=True, verbose_name="Description")
    mission     = models.TextField(blank=True, verbose_name="Mission / Valeurs")
    website     = models.URLField(blank=True, verbose_name="Site web")
    email       = models.EmailField(blank=True, verbose_name="Email de contact")
    phone       = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    linkedin_url = models.URLField(blank=True, verbose_name="Page LinkedIn")

    logo = models.ImageField(
        upload_to="company_logos/",
        null=True,
        blank=True,
        verbose_name="Logo"
    )

    # Localisation
    address = models.CharField(max_length=255, blank=True, verbose_name="Adresse")
    city    = models.CharField(max_length=100, blank=True, verbose_name="Ville")
    country = models.CharField(max_length=100, blank=True, verbose_name="Pays")

    # Caractéristiques
    sector = models.CharField(max_length=150, blank=True, verbose_name="Secteur d'activité")
    size   = models.CharField(
        max_length=20,
        choices=CompanySize.choices,
        blank=True,
        verbose_name="Taille"
    )
    founded_year = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1800)],
        verbose_name="Année de création"
    )

    # Statut de validation (contrôlé par l'admin)
    status = models.CharField(
        max_length=20,
        choices=CompanyStatus.choices,
        default=CompanyStatus.PENDING,
        verbose_name="Statut"
    )

    # Qui a créé cette fiche entreprise
    # SET_NULL : si ce recruteur est supprimé, la Company reste
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="companies_created",
        verbose_name="Créé par"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entreprise"
        verbose_name_plural = "Entreprises"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """
        Auto-génère le slug depuis le nom si non renseigné.
        Garantit l'unicité en ajoutant un compteur si nécessaire.

        Analogie : comme un nom de domaine généré automatiquement
        depuis le nom de l'entreprise. Si "techcorp.com" est pris,
        on essaie "techcorp-2.com", puis "techcorp-3.com"...
        """
        if not self.slug:
            base_slug = slugify(self.name)
            slug      = base_slug
            counter   = 1
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    # ── Helpers métier ────────────────────────────────

    @property
    def is_active(self):
        return self.status == CompanyStatus.ACTIVE

    @property
    def recruiter_count(self):
        """Nombre de recruteurs liés à cette entreprise."""
        return self.recruiters.count()

    @property
    def job_count(self):
        """
        Nombre d'offres publiées par cette entreprise.
        Utilise le related_name défini dans jobs/models.py.
        """
        return self.job_offers.count()


class CompanyFollower(models.Model):
    """
    Un candidat peut "suivre" une entreprise pour être notifié
    de ses nouvelles offres.

    Analogie : comme s'abonner à la newsletter d'une marque.

    La contrainte unique_together empêche de suivre deux fois
    la même entreprise (miroir de la Règle R1 sur les candidatures).
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followed_companies",
        verbose_name="Utilisateur"
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="followers",
        verbose_name="Entreprise"
    )
    followed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Abonnement entreprise"
        verbose_name_plural = "Abonnements entreprises"
        unique_together = ("user", "company")   # on ne peut pas suivre deux fois

    def __str__(self):
        return f"{self.user.email} suit {self.company.name}"