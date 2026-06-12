"""
applications/models.py

Modèle de l'application applications.

Analogie : Si jobs/ est le panneau d'affichage des offres,
applications/ est la boîte aux lettres du recruteur.
Chaque fois qu'un candidat postule, une enveloppe (Application)
atterrit dans cette boîte. Le recruteur l'ouvre, lit la lettre
de motivation et le CV, puis répond : accepté, refusé ou en attente.

Règles métier couvertes ici :
- R1 : Un candidat ne peut pas postuler deux fois à la même offre
       → unique_together = (candidate, job_offer)
- R4 : Un candidat ne voit QUE ses propres candidatures
       → filtre queryset dans views.py
- R5 : Une offre expirée n'accepte plus de candidatures
       → validation dans ApplicationCreateSerializer
- R8 : Un recruteur ne peut pas postuler
       → IsCandidate dans views.py
"""

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class ApplicationStatus(models.TextChoices):
    """
    Cycle de vie d'une candidature.

    Analogie : comme le suivi d'un colis.
    PENDING   = en transit (personne ne l'a encore traité)
    REVIEWING = le recruteur a ouvert le colis et l'examine
    ACCEPTED  = livraison réussie
    REJECTED  = retour à l'expéditeur
    WITHDRAWN = le candidat a demandé l'annulation
    """
    PENDING   = "pending",   "En attente"
    REVIEWING = "reviewing", "En cours d'examen"
    ACCEPTED  = "accepted",  "Acceptée"
    REJECTED  = "rejected",  "Refusée"
    WITHDRAWN = "withdrawn", "Retirée par le candidat"


class Application(models.Model):
    """
    Représente la candidature d'un utilisateur (candidat) à une offre.

    Contraintes clés :
    1. unique_together (candidate, job_offer) : R1 — pas de double candidature.
    2. candidate doit avoir role=CANDIDATE : R8 — vérifié dans la vue/serializer.
    3. job_offer doit être ouverte (is_open) : R5 — vérifié dans le serializer.

    Le CV joint est optionnel : si absent, on utilise celui du profil candidat.
    """

    candidate = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="Candidat"
    )
    job_offer = models.ForeignKey(
        "jobs.JobOffer",
        on_delete=models.CASCADE,
        related_name="applications",
        verbose_name="Offre d'emploi"
    )

    # Contenu de la candidature
    cover_letter = models.TextField(blank=True, verbose_name="Lettre de motivation")
    resume       = models.FileField(
        upload_to="applications/resumes/",
        null=True, blank=True,
        verbose_name="CV joint (optionnel)"
    )

    status = models.CharField(
        max_length=15,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        verbose_name="Statut"
    )

    # Note interne du recruteur (non visible par le candidat)
    recruiter_note = models.TextField(
        blank=True,
        verbose_name="Note interne recruteur"
    )

    applied_at  = models.DateTimeField(auto_now_add=True, verbose_name="Date de candidature")
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Candidature"
        verbose_name_plural = "Candidatures"
        ordering = ["-applied_at"]

        # R1 : Un candidat ne peut pas postuler deux fois à la même offre.
        # unique_together est la garantie au niveau base de données —
        # même si la validation serializer saute, la DB rejette le doublon.
        unique_together = ("candidate", "job_offer")

    def __str__(self):
        return f"{self.candidate.full_name} → {self.job_offer.title}"

    # ── Helpers métier ─────────────────────────────────

    @property
    def is_active(self):
        """La candidature est active si elle n'est pas retirée ni refusée."""
        return self.status not in [
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
        ]

    @property
    def can_be_withdrawn(self):
        """Un candidat peut retirer sa candidature tant qu'elle n'est pas traitée."""
        return self.status in [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING]