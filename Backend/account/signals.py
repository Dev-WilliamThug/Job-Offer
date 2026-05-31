"""
accounts/signals.py

Les signals Django sont un système d'événements.
Analogie : C'est comme des alertes automatiques dans un hôpital.
Quand un patient est admis (post_save sur User), le système déclenche
automatiquement plusieurs actions — chambre assignée, dossier créé, etc.
Sans signal, il faudrait appeler manuellement chaque action partout.

Ici on crée automatiquement le profil si on oublie de le faire à la main
(filet de sécurité en plus du RegisterSerializer).
"""

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CandidateProfile, RecruiterProfile, UserRole

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Après la création d'un User, on crée le profil correspondant
    si ce n'est pas déjà fait.

    `created` vaut True seulement à la CRÉATION (pas à chaque save).
    On utilise get_or_create pour éviter les doublons.
    """
    if not created:
        return  # mise à jour d'un user existant → on ne fait rien

    if instance.role == UserRole.CANDIDATE:
        CandidateProfile.objects.get_or_create(user=instance)
    elif instance.role == UserRole.RECRUITER:
        RecruiterProfile.objects.get_or_create(user=instance)