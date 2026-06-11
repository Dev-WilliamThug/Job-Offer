"""
applications/permissions.py
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from account.models import UserRole


class IsApplicationOwner(BasePermission):
    """
    R4 : Un candidat ne peut voir et gérer QUE ses propres candidatures.
    """

    message = "Vous ne pouvez accéder qu'à vos propres candidatures."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.candidate == request.user or request.user.role == UserRole.ADMIN

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""


class IsJobRecruiterOrAdmin(BasePermission):
    """
    Autorise uniquement le recruteur propriétaire de l'offre ou un admin.
    """

    message = "Vous n'avez accès qu'aux candidatures de vos propres offres."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return (
            obj.job_offer.recruiter == request.user
            or request.user.role == UserRole.ADMIN
        )

    def authenticate_header(self, request):
        return "Bearer realm=\"api\""