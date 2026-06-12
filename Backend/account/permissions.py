"""
accounts/permissions.py

Les permissions sont les "videurs" de l'application.

Pourquoi 401 vs 403 ?
- 401 Unauthorized : "Je ne sais pas qui tu es" → pas de token du tout
- 403 Forbidden    : "Je sais qui tu es, mais tu n'as pas le droit"

DRF retourne 401 uniquement si la permission échouante définit
`WWW_AUTHENTICATE_REALM` (via la méthode `authenticate_header`).
Sans ça, même un anonyme reçoit 403.
On règle ça en héritant de IsAuthenticated pour les vues qui
doivent distinguer les deux cas.
"""

from rest_framework.permissions import BasePermission, IsAuthenticated

from .models import UserRole


class IsCandidate(BasePermission):
    """
    Autorise uniquement les candidats authentifiés.
    - Anonyme          → 401 (pas de token)
    - Connecté mais mauvais rôle → 403
    """

    message = "Seuls les candidats peuvent effectuer cette action."

    def has_permission(self, request, view):
        # Étape 1 : l'utilisateur est-il authentifié ?
        # Si non → retourne False AVEC authenticate_header → DRF émet 401
        if not request.user or not request.user.is_authenticated:
            return False
        # Étape 2 : est-il candidat ?
        return request.user.role == UserRole.CANDIDATE

    def authenticate_header(self, request):
        """
        Présence de cette méthode → DRF retourne 401 au lieu de 403
        quand has_permission retourne False pour un anonyme.
        """
        return "Bearer realm=\"api\""


class IsRecruiter(BasePermission):
    """Autorise uniquement les recruteurs authentifiés."""

    message = "Seuls les recruteurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == UserRole.RECRUITER

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""


class IsAdminUser(BasePermission):
    """Autorise uniquement les admins authentifiés."""

    message = "Seuls les administrateurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == UserRole.ADMIN

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""


class IsOwnerOrAdmin(BasePermission):
    """
    Autorise le propriétaire de l'objet OU un admin.
    Utilisé sur les profils et ressources personnelles.
    """

    message = "Vous n'avez pas la permission d'accéder à cette ressource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, "user"):
            owner = obj.user
        else:
            owner = obj
        return owner == request.user or request.user.role == UserRole.ADMIN


class IsRecruiterOrAdmin(BasePermission):
    """Autorise les recruteurs ET les admins."""

    message = "Seuls les recruteurs ou administrateurs peuvent effectuer cette action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.RECRUITER, UserRole.ADMIN]

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""