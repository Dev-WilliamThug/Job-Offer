"""
companies/views.py

Analogie : Ces vues sont les guichets d'un registre du commerce.
- Guichet 1 (public)    : consulter la liste des entreprises
- Guichet 2 (recruteur) : créer/modifier sa fiche entreprise
- Guichet 3 (candidat)  : suivre une entreprise
- Guichet 4 (admin)     : valider, suspendre, gérer tout
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsAdminUser, IsCandidate, IsRecruiter
from .models import Company, CompanyFollower, CompanyStatus
from .permissions import IsActiveCompany, IsCompanyOwnerOrAdmin
from .serializers import (
    AdminCompanyStatusSerializer,
    CompanyCreateSerializer,
    CompanyDetailSerializer,
    CompanyFollowerSerializer,
    CompanyListSerializer,
    CompanyUpdateSerializer,
)


# ──────────────────────────────────────────────
# Vues publiques (lecture)
# ──────────────────────────────────────────────

class CompanyListView(generics.ListAPIView):
    """
    GET /api/companies/
    Liste toutes les entreprises ACTIVES.
    Accessible sans authentification (vitrine publique).
    """
    serializer_class = CompanyListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Company.objects.filter(status=CompanyStatus.ACTIVE)

        # Filtres optionnels via query params
        # ex: /api/companies/?city=Paris&sector=Tech
        city    = self.request.query_params.get("city")
        sector  = self.request.query_params.get("sector")
        search  = self.request.query_params.get("search")

        if city:
            qs = qs.filter(city__icontains=city)
        if sector:
            qs = qs.filter(sector__icontains=sector)
        if search:
            qs = qs.filter(name__icontains=search)

        return qs


class CompanyDetailView(generics.RetrieveAPIView):
    """
    GET /api/companies/<slug>/
    Détail d'une entreprise active. Accessible publiquement.
    """
    serializer_class = CompanyDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Company.objects.filter(status=CompanyStatus.ACTIVE)

    def get_serializer_context(self):
        # On passe request pour que get_is_followed puisse l'utiliser
        return {"request": self.request}


# ──────────────────────────────────────────────
# Vues recruteur (CRUD entreprise)
# ──────────────────────────────────────────────

class CompanyCreateView(generics.CreateAPIView):
    """
    POST /api/companies/create/
    Crée une nouvelle entreprise.
    Réservé aux recruteurs (IsRecruiter).
    Statut initial : PENDING (validation admin requise).
    """
    serializer_class = CompanyCreateSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        return Response(
            {
                "message": "Entreprise créée. Elle sera visible après validation par un administrateur.",
                "company": CompanyDetailSerializer(company, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CompanyUpdateView(generics.UpdateAPIView):
    """
    PUT/PATCH /api/companies/<slug>/edit/
    Modifie une entreprise.
    Seul le créateur ou un admin peut modifier (IsCompanyOwnerOrAdmin).
    """
    serializer_class = CompanyUpdateSerializer
    permission_classes = [IsAuthenticated, IsCompanyOwnerOrAdmin]
    lookup_field = "slug"
    queryset = Company.objects.all()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        return Response(CompanyDetailSerializer(company, context={"request": request}).data)


class CompanyDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/companies/<slug>/delete/
    Supprime une entreprise.
    Réservé au créateur ou à l'admin.
    """
    permission_classes = [IsAuthenticated, IsCompanyOwnerOrAdmin]
    lookup_field = "slug"
    queryset = Company.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Entreprise supprimée avec succès."},
            status=status.HTTP_204_NO_CONTENT
        )


class MyCompaniesView(generics.ListAPIView):
    """
    GET /api/companies/mine/
    Renvoie toutes les entreprises créées par le recruteur connecté.
    """
    serializer_class = CompanyListSerializer
    permission_classes = [IsAuthenticated, IsRecruiter]

    def get_queryset(self):
        return Company.objects.filter(created_by=self.request.user)


# ──────────────────────────────────────────────
# Suivi d'entreprise (candidats)
# ──────────────────────────────────────────────

class FollowCompanyView(APIView):
    """
    POST   /api/companies/<slug>/follow/  → s'abonner
    DELETE /api/companies/<slug>/follow/  → se désabonner

    Seuls les candidats peuvent suivre une entreprise.
    """
    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request, slug):
        company = get_object_or_404(Company, slug=slug, status=CompanyStatus.ACTIVE)
        _, created = CompanyFollower.objects.get_or_create(
            user=request.user, company=company
        )
        if not created:
            return Response(
                {"message": "Vous suivez déjà cette entreprise."},
                status=status.HTTP_200_OK
            )
        return Response(
            {"message": f"Vous suivez maintenant {company.name}."},
            status=status.HTTP_201_CREATED
        )

    def delete(self, request, slug):
        company = get_object_or_404(Company, slug=slug)
        deleted, _ = CompanyFollower.objects.filter(
            user=request.user, company=company
        ).delete()
        if not deleted:
            return Response(
                {"message": "Vous ne suiviez pas cette entreprise."},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            {"message": f"Vous ne suivez plus {company.name}."},
            status=status.HTTP_200_OK
        )


class MyFollowedCompaniesView(generics.ListAPIView):
    """
    GET /api/companies/following/
    Retourne la liste des entreprises suivies par le candidat connecté.
    """
    serializer_class = CompanyFollowerSerializer
    permission_classes = [IsAuthenticated, IsCandidate]

    def get_queryset(self):
        return CompanyFollower.objects.filter(user=self.request.user).select_related("company")


# ──────────────────────────────────────────────
# Vues Admin
# ──────────────────────────────────────────────

class AdminCompanyListView(generics.ListAPIView):
    """
    GET /api/companies/admin/
    Liste toutes les entreprises (tous statuts) — admin seulement.
    """
    serializer_class = CompanyDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = Company.objects.all().select_related("created_by")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_context(self):
        return {"request": self.request}


class AdminCompanyStatusView(APIView):
    """
    PATCH /api/companies/admin/<pk>/status/
    Change le statut d'une entreprise (pending → active → suspended).
    Réservé à l'admin.

    Analogie : le tampon officiel du greffier du tribunal de commerce
    qui valide ou rejette l'immatriculation.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        company = get_object_or_404(Company, pk=pk)
        serializer = AdminCompanyStatusSerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": f"Statut de '{company.name}' mis à jour : {company.get_status_display()}",
                "company": CompanyDetailSerializer(company, context={"request": request}).data,
            }
        )