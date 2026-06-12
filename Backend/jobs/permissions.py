"""
jobs/permissions.py

Permissions spécifiques à l'application jobs.

Analogie : Une offre d'emploi est comme un article de blog professionnel.
- Tout le monde peut le lire (public).
- Seul l'auteur peut le modifier (IsJobOwner).
- L'admin peut tout gérer.

On importe les permissions de rôle depuis accounts/ — la source
de vérité sur les rôles reste centralisée là-bas.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from account.models import UserRole


class IsJobOwnerOrAdmin(BasePermission):
    """
    Autorise la modification/suppression d'une offre uniquement si
    l'utilisateur est le recruteur qui l'a créée OU un admin.

    Implémente la Règle R3 : un recruteur ne modifie QUE ses offres.

    has_permission : vérifie que l'utilisateur est connecté.
    has_object_permission : vérifie qu'il est bien le propriétaire de l'offre.
    """

    message = "Seul le recruteur auteur de cette offre ou un administrateur peut la modifier."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Lecture → tout utilisateur connecté
        if request.method in SAFE_METHODS:
            return True
        # Écriture → propriétaire (recruiter) ou admin
        return obj.recruiter == request.user or request.user.role == UserRole.ADMIN

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""


class IsOpenForApplication(BasePermission):
    """
    Vérifie qu'une offre est encore ouverte aux candidatures.
    Utilisée dans applications/views.py.

    Implémente la Règle R5 : une offre expirée ne peut plus
    accepter de candidatures.

    obj est ici un JobOffer — on vérifie sa propriété is_open.
    """

    message = "Cette offre est clôturée ou expirée. Les candidatures ne sont plus acceptées."

    def has_object_permission(self, request, view, obj):
        return obj.is_open