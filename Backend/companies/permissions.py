"""
companies/permissions.py
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from account.models import UserRole


class IsCompanyOwnerOrAdmin(BasePermission):
    """
    Autorise la modification d'une entreprise uniquement à son créateur
    ou à un administrateur. Implémente R3.
    """

    message = "Seul le créateur de cette entreprise ou un administrateur peut la modifier."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.created_by == request.user or request.user.role == UserRole.ADMIN

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""


class IsActiveCompany(BasePermission):
    """
    Vérifie que l'entreprise associée est en statut ACTIVE.
    Utilisée dans jobs/ pour bloquer la publication si l'entreprise
    est encore PENDING ou SUSPENDED.
    """

    message = "Votre entreprise doit être active pour effectuer cette action."

    def has_object_permission(self, request, view, obj):
        return obj.is_active

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""