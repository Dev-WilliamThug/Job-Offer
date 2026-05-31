"""
account/permissions.py

Les permissions sont les "videurs" de l'application.
Analogie : Imagine une boîte de nuit avec plusieurs zones. Le videur
à l'entrée vérifie ton identité (IsAuthenticated). Celui devant la zone
VIP vérifie si t'as le bon bracelet (IsRecruiter, IsCandidate...).

DRF appelle has_permission() avant même d'exécuter la vue,
et has_object_permission() quand on travaille sur un objet précis.
"""

from rest_framework.permissions import BasePermission

from .models import UserRole


class IsCandidate(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle 'candidate'."""

    message = "Seuls les candidats peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.CANDIDATE
        )


class IsRecruiter(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle 'recruiter'."""

    message = "Seuls les recruteurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.RECRUITER
        )


class IsAdminUser(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle 'admin'."""

    message = "Seuls les administrateurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Autorise l'accès si l'utilisateur est le propriétaire de l'objet
    OU un administrateur.

    Analogie : Tu peux voir et modifier TON dossier, ou l'admin peut
    voir et modifier N'IMPORTE quel dossier.

    Utilisé sur les vues de profil : un candidat ne peut modifier
    QUE son propre profil.
    """

    message = "Vous n'avez pas la permission d'accéder à cette ressource."

    def has_object_permission(self, request, view, obj):
        # obj peut être un User, CandidateProfile ou RecruiterProfile
        if hasattr(obj, "user"):
            # CandidateProfile / RecruiterProfile → obj.user
            owner = obj.user
        else:
            # User directement
            owner = obj

        return owner == request.user or request.user.role == UserRole.ADMIN


class IsRecruiterOrAdmin(BasePermission):
    """Autorise les recruteurs ET les admins."""

    message = "Seuls les recruteurs ou administrateurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [UserRole.RECRUITER, UserRole.ADMIN]
        )