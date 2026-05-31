"""
companies/permissions.py

Permissions spécifiques à l'application companies.

Analogie : Dans une entreprise, le registre des sociétés (Kbis)
n'est modifiable que par les personnes habilitées.
- N'importe qui peut consulter la fiche (lecture publique)
- Seul le recruteur fondateur peut la modifier
- L'admin peut tout faire

On importe IsRecruiter et IsAdminUser depuis account pour éviter
la duplication — la source de vérité sur les rôles reste dans account.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from account.models import UserRole


class IsCompanyOwnerOrAdmin(BasePermission):
    """
    Vérifie que l'utilisateur est le créateur de l'entreprise OU un admin.

    SAFE_METHODS = GET, HEAD, OPTIONS → lecture autorisée à tous les connectés.
    Écriture (PUT, PATCH, DELETE) → seulement propriétaire ou admin.

    Analogie : La fiche Wikipédia d'une entreprise est lisible par tous,
    mais seul l'éditeur accrédité (ou un admin) peut la modifier.
    """

    message = "Seul le créateur de l'entreprise ou un administrateur peut effectuer cette action."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Lecture : tout utilisateur connecté peut voir
        if request.method in SAFE_METHODS:
            return True
        # Écriture : propriétaire ou admin
        return obj.created_by == request.user or request.user.role == UserRole.ADMIN


class IsActiveCompany(BasePermission):
    """
    Vérifie que l'entreprise cible est active (statut = active).
    Utilisé pour bloquer les actions sur les entreprises suspendues
    ou en attente (ex: publier une offre).

    Cette permission s'applique sur l'objet Company, pas sur l'User.
    """

    message = "Cette entreprise n'est pas encore active sur la plateforme."

    def has_object_permission(self, request, view, obj):
        # obj est une Company
        return obj.is_active