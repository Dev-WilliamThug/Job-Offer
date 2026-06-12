from django.shortcuts import render

# Create your views here.
"""
jobs/views.py

Analogie : Ces vues sont les guichets d'une agence d'emploi.
- Guichet public     : consulter le tableau des offres disponibles
- Guichet recruteur  : déposer, modifier, gérer ses offres
- Guichet candidat   : rechercher des offres selon ses critères
- Guichet admin      : surveiller et modérer toutes les offres
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsAdminUser, IsCandidate, IsRecruiter
from companies.models import CompanyStatus
from companies.permissions import IsActiveCompany
from .models import JobOffer, JobStatus
from .permissions import IsJobOwnerOrAdmin
from .serializers import (
    AdminJobOfferSerializer,
    JobOfferDetailSerializer,
    JobOfferListSerializer,
    JobOfferWriteSerializer,
    JobStatusSerializer,
)


# ──────────────────────────────────────────────────────────
# Lecture publique
# ──────────────────────────────────────────────────────────

class JobOfferListView(generics.ListAPIView):
    """
    GET /api/jobs/
    Liste toutes les offres publiées et non expirées.
    Accessible sans authentification.

    Filtres disponibles via query params :
    ?search=        recherche dans titre + description
    ?location=      filtre par ville/lieu
    ?contract_type= filtre par type de contrat
    ?experience=    filtre par niveau d'expérience
    ?work_mode=     filtre par mode de travail
    ?company=       filtre par nom d'entreprise
    """
    serializer_class   = JobOfferListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = JobOffer.objects.filter(
            status=JobStatus.PUBLISHED,
            company__status=CompanyStatus.ACTIVE,  # offres des entreprises actives seulement
        ).select_related("company", "recruiter")

        params = self.request.query_params

        search = params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(requirements__icontains=search)
            )

        if loc := params.get("location"):
            qs = qs.filter(location__icontains=loc)

        if ct := params.get("contract_type"):
            qs = qs.filter(contract_type=ct)

        if exp := params.get("experience"):
            qs = qs.filter(experience_level=exp)

        if wm := params.get("work_mode"):
            qs = qs.filter(work_mode=wm)

        if company := params.get("company"):
            qs = qs.filter(company__name__icontains=company)

        return qs


class JobOfferDetailView(generics.RetrieveAPIView):
    """
    GET /api/jobs/<slug>/
    Détail d'une offre publiée. Accessible publiquement.
    """
    serializer_class   = JobOfferDetailSerializer
    permission_classes = [AllowAny]
    lookup_field       = "slug"

    def get_queryset(self):
        return JobOffer.objects.filter(
            status=JobStatus.PUBLISHED
        ).select_related("company", "recruiter")


# ──────────────────────────────────────────────────────────
# Gestion recruteur (CRUD offres)
# ──────────────────────────────────────────────────────────

class JobOfferCreateView(generics.CreateAPIView):
    """
    POST /api/jobs/create/
    Crée une nouvelle offre.

    R2 : Seuls les recruteurs peuvent créer des offres (IsRecruiter).
    Le recruteur est automatiquement enregistré depuis request.user.
    """
    serializer_class   = JobOfferWriteSerializer
    permission_classes = [IsRecruiter]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(
            {
                "message": "Offre créée avec succès.",
                "job": JobOfferDetailSerializer(job, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class JobOfferUpdateView(generics.UpdateAPIView):
    """
    PUT/PATCH /api/jobs/<slug>/edit/
    Modifie une offre.

    R3 : Un recruteur ne modifie QUE ses offres (IsJobOwnerOrAdmin).
    """
    serializer_class   = JobOfferWriteSerializer
    permission_classes = [IsJobOwnerOrAdmin]
    lookup_field       = "slug"
    queryset           = JobOffer.objects.all()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        return Response(JobOfferDetailSerializer(job, context={"request": request}).data)


class JobOfferDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/jobs/<slug>/delete/
    Supprime une offre. Réservé au recruteur propriétaire ou à l'admin.
    """
    permission_classes = [IsJobOwnerOrAdmin]
    lookup_field       = "slug"
    queryset           = JobOffer.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Offre supprimée avec succès."},
            status=status.HTTP_204_NO_CONTENT
        )


class JobStatusUpdateView(APIView):
    """
    PATCH /api/jobs/<slug>/status/
    Change le statut d'une offre (draft ↔ published → closed).

    Séparé de la modification générale pour plus de clarté :
    "publier" est une action métier explicite, pas juste un changement de champ.
    """
    permission_classes = [IsJobOwnerOrAdmin]

    def patch(self, request, slug):
        job = get_object_or_404(JobOffer, slug=slug)
        self.check_object_permissions(request, job)

        serializer = JobStatusSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": f"Statut mis à jour : {job.get_status_display()}",
                "status": job.status,
            }
        )


class MyJobOffersView(generics.ListAPIView):
    """
    GET /api/jobs/mine/
    Liste les offres créées par le recruteur connecté.
    Tous statuts confondus (drafts + publiées + clôturées).
    """
    serializer_class   = JobOfferDetailSerializer
    permission_classes = [IsRecruiter]

    def get_queryset(self):
        return JobOffer.objects.filter(
            recruiter=self.request.user
        ).select_related("company").order_by("-created_at")


class CompanyJobOffersView(generics.ListAPIView):
    """
    GET /api/jobs/company/<company_slug>/
    Liste toutes les offres publiées d'une entreprise donnée.
    Utile pour la page entreprise côté Angular.
    """
    serializer_class   = JobOfferListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        company_slug = self.kwargs["company_slug"]
        return JobOffer.objects.filter(
            company__slug=company_slug,
            status=JobStatus.PUBLISHED,
        ).select_related("company")


# ──────────────────────────────────────────────────────────
# Administration
# ──────────────────────────────────────────────────────────

class AdminJobOfferListView(generics.ListAPIView):
    """
    GET /api/jobs/admin/
    Liste toutes les offres (tous statuts) — admin seulement.
    Filtre optionnel : ?status=published
    """
    serializer_class   = AdminJobOfferSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = JobOffer.objects.all().select_related("company", "recruiter")
        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)
        return qs


class AdminJobOfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/jobs/admin/<pk>/
    Consultation, modification ou suppression d'une offre — admin seulement.
    """
    serializer_class   = AdminJobOfferSerializer
    permission_classes = [IsAdminUser]
    queryset           = JobOffer.objects.all()